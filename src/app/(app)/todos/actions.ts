"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto/apiKey";
import { generateChatCompletion } from "@/lib/ai";
import { parseAiJson } from "@/lib/ai/parseJson";
import type { AiProvider } from "@/lib/ai/types";
import { buildTodoDueDatePrompt } from "@/lib/rag/prompt";
import { getRecentLogs } from "@/lib/rag/retrieve";

export async function createTodo(title: string): Promise<{ error: string | null }> {
  const trimmed = title.trim();
  if (!trimmed) return { error: "TODOを入力してください。" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { error } = await supabase
    .from("todos")
    .insert({ user_id: user.id, title: trimmed });

  if (error) return { error: "TODOの追加に失敗しました。" };

  revalidatePath("/todos");
  return { error: null };
}

export async function toggleTodo(
  todoId: string,
  completed: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { error } = await supabase
    .from("todos")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", todoId);

  if (error) return { error: "更新に失敗しました。" };

  revalidatePath("/todos");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function suggestDueDate(
  todoId: string,
  todoTitle: string,
): Promise<{ error: string | null; suggestedDate?: string; reason?: string }> {
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

  const apiKey = decryptApiKey(aiSettings.encrypted_api_key);
  const provider = aiSettings.provider as AiProvider;
  const recentLogs = await getRecentLogs(supabase, 10);
  const today = new Date().toISOString().slice(0, 10);

  const prompt = buildTodoDueDatePrompt({ todoTitle, recentLogs, today });

  let result: { suggestedDate: string; reason: string };
  try {
    const text = await generateChatCompletion(provider, {
      apiKey,
      model: aiSettings.model ?? undefined,
      messages: prompt,
    });
    result = parseAiJson(text);
  } catch {
    return { error: "提案の生成に失敗しました。" };
  }

  await supabase
    .from("todos")
    .update({ ai_suggested_due_date: result.suggestedDate })
    .eq("id", todoId);

  revalidatePath("/todos");
  return { error: null, suggestedDate: result.suggestedDate, reason: result.reason };
}
