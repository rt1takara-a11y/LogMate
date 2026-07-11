"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptApiKey } from "@/lib/crypto/apiKey";
import { aiSettingsSchema, type AiSettingsInput } from "@/lib/validations/settings";

export type SettingsActionState = { error: string | null; success?: boolean };

export async function saveAiSettings(
  input: AiSettingsInput,
): Promise<SettingsActionState> {
  const parsed = aiSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  let encryptedApiKey: string;
  if (parsed.data.apiKey) {
    encryptedApiKey = encryptApiKey(parsed.data.apiKey);
  } else {
    const { data: existing } = await supabase
      .from("user_ai_settings")
      .select("encrypted_api_key")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      return { error: "APIキーを入力してください。" };
    }
    encryptedApiKey = existing.encrypted_api_key;
  }

  const { error } = await supabase.from("user_ai_settings").upsert(
    {
      user_id: user.id,
      provider: parsed.data.provider,
      model: parsed.data.model || null,
      encrypted_api_key: encryptedApiKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: "保存に失敗しました。もう一度お試しください。" };
  }

  revalidatePath("/settings");
  return { error: null, success: true };
}
