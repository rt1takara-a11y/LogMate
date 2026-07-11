"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto/apiKey";
import { generateChatCompletion } from "@/lib/ai";
import type { AiProvider } from "@/lib/ai/types";
import { parseAiJson } from "@/lib/ai/parseJson";
import { getLogsInRange, getStaffSummaries } from "@/lib/rag/retrieve";
import { buildInsightsPrompt } from "@/lib/rag/prompt";
import type { InsightsContent } from "@/lib/insights/types";

const LOOKBACK_DAYS = 60;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoString(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function generateInsights(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { data: aiSettings } = await supabase
    .from("user_ai_settings")
    .select("provider, model, encrypted_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!aiSettings) {
    return { error: "設定画面でAI providerとAPIキーを登録してください。" };
  }

  const periodStart = daysAgoString(LOOKBACK_DAYS);
  const periodEnd = todayString();

  const [logs, staff] = await Promise.all([
    getLogsInRange(supabase, periodStart, periodEnd),
    getStaffSummaries(supabase),
  ]);

  if (logs.length < 3) {
    return { error: "ログがまだ少ないため、傾向を分析できません。もう少し記録をためてから試してください。" };
  }

  const apiKey = decryptApiKey(aiSettings.encrypted_api_key);
  const provider = aiSettings.provider as AiProvider;
  const prompt = buildInsightsPrompt({ logs, staff });

  let content: InsightsContent;
  try {
    const text = await generateChatCompletion(provider, {
      apiKey,
      model: aiSettings.model ?? undefined,
      messages: prompt,
    });
    content = parseAiJson<InsightsContent>(text);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "気付きの生成に失敗しました。",
    };
  }

  const { error: saveError } = await supabase.from("ai_insights").insert({
    user_id: user.id,
    insights: content.insights ?? [],
    period_start: periodStart,
    period_end: periodEnd,
  });

  if (saveError) {
    return { error: "気付きの保存に失敗しました。" };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
