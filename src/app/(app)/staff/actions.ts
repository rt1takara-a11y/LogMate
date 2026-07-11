"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto/apiKey";
import { generateChatCompletion } from "@/lib/ai";
import type { AiProvider } from "@/lib/ai/types";
import { buildStaffGrowthPrompt } from "@/lib/rag/prompt";
import { staffSchema, type StaffInput } from "@/lib/validations/staff";

export type StaffActionState = { error: string | null; staffId?: string };

export async function createStaff(input: StaffInput): Promise<StaffActionState> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { data: staff, error } = await supabase
    .from("staff")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      memo: parsed.data.memo || null,
      strengths: parsed.data.strengths || null,
      weaknesses: parsed.data.weaknesses || null,
    })
    .select("id")
    .single();

  if (error || !staff) {
    return { error: "スタッフの登録に失敗しました。" };
  }

  revalidatePath("/staff");
  return { error: null, staffId: staff.id };
}

export async function regenerateGrowthSummary(
  staffId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const [{ data: staff }, { data: aiSettings }] = await Promise.all([
    supabase.from("staff").select("id, name").eq("id", staffId).maybeSingle(),
    supabase
      .from("user_ai_settings")
      .select("provider, model, encrypted_api_key")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!staff) return { error: "スタッフが見つかりません。" };
  if (!aiSettings) {
    return { error: "設定画面でAI providerとAPIキーを登録してください。" };
  }

  const { data: staffLogs } = await supabase
    .from("staff_logs")
    .select("created_at, good_point, improvement, memo")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: true });

  if (!staffLogs || staffLogs.length === 0) {
    return { error: "このスタッフの記録がまだありません。" };
  }

  const apiKey = decryptApiKey(aiSettings.encrypted_api_key);
  const provider = aiSettings.provider as AiProvider;

  const prompt = buildStaffGrowthPrompt({
    staffName: staff.name,
    notes: staffLogs.map((log) => ({
      date: log.created_at.slice(0, 10),
      goodPoint: log.good_point,
      improvement: log.improvement,
      memo: log.memo,
    })),
  });

  let summary: string;
  try {
    summary = await generateChatCompletion(provider, {
      apiKey,
      model: aiSettings.model ?? undefined,
      messages: prompt,
    });
  } catch {
    return { error: "生成に失敗しました。APIキーをご確認ください。" };
  }

  await supabase
    .from("staff")
    .update({
      growth_summary: summary,
      growth_summary_updated_at: new Date().toISOString(),
    })
    .eq("id", staffId);

  revalidatePath(`/staff/${staffId}`);
  return { error: null };
}
