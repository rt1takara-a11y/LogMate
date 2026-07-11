import type { SupabaseClient } from "@supabase/supabase-js";

// All queries below rely on Row Level Security to scope results to the
// session's user — no manual user_id filtering is needed as long as
// `supabase` was created with the caller's auth cookies (see lib/supabase/server.ts).

export async function getRecentLogs(supabase: SupabaseClient, limit = 20) {
  const { data } = await supabase
    .from("logs")
    .select(
      "log_date, event, good_things, improvements, insights, sales, customer_count",
    )
    .order("log_date", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getLogsInRange(
  supabase: SupabaseClient,
  start: string,
  end: string,
) {
  const { data } = await supabase
    .from("logs")
    .select(
      "log_date, event, good_things, improvements, insights, sales, customer_count",
    )
    .gte("log_date", start)
    .lte("log_date", end)
    .order("log_date", { ascending: true });
  return data ?? [];
}

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .replace(/[。、,.!?！?「」『』\n]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
        .slice(0, 8),
    ),
  );
}

export async function searchLogsByKeyword(
  supabase: SupabaseClient,
  query: string,
  limit = 10,
) {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  const orFilter = keywords
    .map(
      (keyword) =>
        `event.ilike.%${keyword}%,good_things.ilike.%${keyword}%,improvements.ilike.%${keyword}%,insights.ilike.%${keyword}%`,
    )
    .join(",");

  const { data } = await supabase
    .from("logs")
    .select(
      "log_date, event, good_things, improvements, insights, sales, customer_count",
    )
    .or(orFilter)
    .order("log_date", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getOpenTodos(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("todos")
    .select("id, title, due_date, created_at")
    .eq("completed", false)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getStaleTodos(supabase: SupabaseClient, days = 21) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data } = await supabase
    .from("todos")
    .select("id, title, created_at")
    .eq("completed", false)
    .lt("created_at", cutoff.toISOString());
  return data ?? [];
}

export async function getStaffSummaries(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("staff")
    .select("id, name, strengths, weaknesses, growth_summary")
    .order("name");
  return data ?? [];
}

export async function getLatestReport(
  supabase: SupabaseClient,
  reportType: "daily" | "weekly" | "monthly",
) {
  const { data } = await supabase
    .from("reports")
    .select("period_start, period_end, content")
    .eq("report_type", reportType)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
