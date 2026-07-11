import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto/apiKey";
import { streamChatCompletion } from "@/lib/ai";
import type { AiMessage, AiProvider } from "@/lib/ai/types";
import {
  getRecentLogs,
  searchLogsByKeyword,
  getOpenTodos,
  getStaffSummaries,
  getLatestReport,
} from "@/lib/rag/retrieve";
import { buildChatPrompt } from "@/lib/rag/prompt";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "メッセージを入力してください。" }, { status: 400 });
  }

  const { data: aiSettings } = await supabase
    .from("user_ai_settings")
    .select("provider, model, encrypted_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!aiSettings) {
    return NextResponse.json(
      { error: "設定画面でAI providerとAPIキーを登録してください。" },
      { status: 400 },
    );
  }

  const apiKey = decryptApiKey(aiSettings.encrypted_api_key);
  const provider = aiSettings.provider as AiProvider;

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  const { data: historyRows } = await supabase
    .from("chat_messages")
    .select("role, content")
    .order("created_at", { ascending: true })
    .limit(40);

  const chatHistory: AiMessage[] = (historyRows ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content,
  }));

  const [recentLogs, keywordLogs, openTodos, staff, latestWeeklyReport] =
    await Promise.all([
      getRecentLogs(supabase, 20),
      searchLogsByKeyword(supabase, message),
      getOpenTodos(supabase),
      getStaffSummaries(supabase),
      getLatestReport(supabase, "weekly"),
    ]);

  const promptMessages = buildChatPrompt({
    recentLogs,
    keywordLogs,
    openTodos,
    staff,
    latestReportSummary: latestWeeklyReport
      ? JSON.stringify(latestWeeklyReport.content)
      : null,
    chatHistory,
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamChatCompletion(provider, {
          apiKey,
          model: aiSettings.model ?? undefined,
          messages: promptMessages,
        })) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        const fallback = "\n\n(エラーが発生しました。APIキーやモデル設定をご確認ください。)";
        fullText += fallback;
        controller.enqueue(encoder.encode(fallback));
      } finally {
        if (fullText.trim()) {
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: fullText,
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
