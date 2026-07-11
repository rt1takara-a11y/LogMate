"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto/apiKey";
import { generateChatCompletion } from "@/lib/ai";
import type { AiProvider } from "@/lib/ai/types";
import { parseAiJson } from "@/lib/ai/parseJson";
import { getLogsInRange, getStaffSummaries } from "@/lib/rag/retrieve";
import {
  buildDailyReportPrompt,
  buildWeeklyReportPrompt,
  buildMonthlyReportPrompt,
} from "@/lib/rag/prompt";
import type {
  ReportType,
  DailyReportContent,
  WeeklyReportContent,
  MonthlyReportContent,
} from "@/lib/reports/types";

export type ReportActionState = { error: string | null; reportId?: string };

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthRange(monthStart: string): { start: string; end: string } {
  const d = new Date(`${monthStart}T00:00:00Z`);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function generateReport(
  reportType: ReportType,
  periodStart: string,
): Promise<ReportActionState> {
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
  const model = aiSettings.model ?? undefined;

  let periodEnd: string;
  let content: DailyReportContent | WeeklyReportContent | MonthlyReportContent;

  try {
    if (reportType === "daily") {
      periodEnd = periodStart;
      const [todayLogs, yesterdayLogs] = await Promise.all([
        getLogsInRange(supabase, periodStart, periodStart),
        getLogsInRange(supabase, addDays(periodStart, -1), addDays(periodStart, -1)),
      ]);
      if (todayLogs.length === 0) {
        return { error: "この日のログがまだありません。" };
      }
      const prompt = buildDailyReportPrompt({
        todayLog: todayLogs[0],
        yesterdayLog: yesterdayLogs[0] ?? null,
      });
      const text = await generateChatCompletion(provider, { apiKey, model, messages: prompt });
      content = parseAiJson<DailyReportContent>(text);
    } else if (reportType === "weekly") {
      periodEnd = addDays(periodStart, 6);
      const [weekLogs, staff] = await Promise.all([
        getLogsInRange(supabase, periodStart, periodEnd),
        getStaffSummaries(supabase),
      ]);
      if (weekLogs.length === 0) {
        return { error: "この週のログがまだありません。" };
      }
      const prompt = buildWeeklyReportPrompt({ weekLogs, staff });
      const text = await generateChatCompletion(provider, { apiKey, model, messages: prompt });
      content = parseAiJson<WeeklyReportContent>(text);
    } else {
      const range = monthRange(periodStart);
      periodStart = range.start;
      periodEnd = range.end;
      const [monthLogs, staff] = await Promise.all([
        getLogsInRange(supabase, range.start, range.end),
        getStaffSummaries(supabase),
      ]);
      if (monthLogs.length === 0) {
        return { error: "この月のログがまだありません。" };
      }
      const prompt = buildMonthlyReportPrompt({ monthLogs, staff });
      const text = await generateChatCompletion(provider, { apiKey, model, messages: prompt });
      content = parseAiJson<MonthlyReportContent>(text);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "レポート生成に失敗しました。",
    };
  }

  const { data: report, error: saveError } = await supabase
    .from("reports")
    .upsert(
      {
        user_id: user.id,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        content,
      },
      { onConflict: "user_id,report_type,period_start" },
    )
    .select("id")
    .single();

  if (saveError || !report) {
    return { error: "レポートの保存に失敗しました。" };
  }

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { error: null, reportId: report.id };
}
