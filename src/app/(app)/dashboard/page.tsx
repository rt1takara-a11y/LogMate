import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogCalendar } from "@/components/dashboard/LogCalendar";
import { InsightsCard } from "./InsightsCard";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekString() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayString();
  const weekStart = startOfWeekString();

  const { month: monthQuery } = await searchParams;
  const monthParam = monthQuery && MONTH_RE.test(monthQuery) ? monthQuery : today.slice(0, 7);
  const monthStart = `${monthParam}-01`;
  const monthEndDate = new Date(`${monthStart}T00:00:00Z`);
  monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
  monthEndDate.setUTCDate(0);
  const monthEnd = monthEndDate.toISOString().slice(0, 10);

  const [
    { data: todayLog },
    { count: weekLogCount },
    { data: openTodos },
    { data: recentLogs },
    { data: monthLogs },
    { data: latestInsights },
  ] = await Promise.all([
    supabase
      .from("logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("log_date", weekStart)
      .lte("log_date", today),
    supabase
      .from("todos")
      .select("id, title, due_date")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("logs")
      .select("log_date, insights")
      .eq("user_id", user.id)
      .not("insights", "is", null)
      .order("log_date", { ascending: false })
      .limit(5),
    supabase
      .from("logs")
      .select("log_date")
      .eq("user_id", user.id)
      .gte("log_date", monthStart)
      .lte("log_date", monthEnd),
    supabase
      .from("ai_insights")
      .select("insights, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const recentInsights = (recentLogs ?? []).filter((log) => log.insights);
  const logDates = new Set((monthLogs ?? []).map((l) => l.log_date));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">ダッシュボード</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {today} 今日も一日お疲れさまでした。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InsightsCard
          insights={(latestInsights?.insights as string[] | undefined) ?? null}
          generatedAt={latestInsights?.created_at ? latestInsights.created_at.slice(0, 10) : null}
        />

        <LogCalendar monthParam={monthParam} logDates={logDates} today={today} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardLabel>今日のログ</CardLabel>
          {todayLog ? (
            <p className="text-sm text-foreground">
              記録済みです。
              <Link href={`/logs/${today}`} className="ml-1 text-primary">
                内容を見る
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                まだ今日のログがありません。
              </p>
              <Link
                href="/logs/new"
                className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
              >
                ログを書く
              </Link>
            </div>
          )}
        </Card>

        <Card>
          <CardLabel>今週のログ数</CardLabel>
          <p className="text-2xl font-semibold text-foreground">
            {weekLogCount ?? 0}
            <span className="ml-1 text-sm font-normal text-muted-foreground">件</span>
          </p>
        </Card>

        <Card>
          <CardLabel>今月の振り返り</CardLabel>
          <p className="text-sm text-muted-foreground">
            月次レポートは
            <Link href="/reports" className="mx-1 text-primary">
              レポート
            </Link>
            から生成できます。
          </p>
        </Card>

        <Card>
          <CardLabel>最近のTODO</CardLabel>
          {openTodos && openTodos.length > 0 ? (
            <ul className="space-y-1.5 text-sm text-foreground">
              {openTodos.map((todo) => (
                <li key={todo.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{todo.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">未完了のTODOはありません。</p>
          )}
          <Link href="/todos" className="mt-2 inline-block text-xs text-primary">
            すべて見る
          </Link>
        </Card>
      </div>

      <Card>
        <CardLabel>最近の気付き</CardLabel>
        {recentInsights.length > 0 ? (
          <ul className="space-y-2 text-sm text-foreground">
            {recentInsights.map((log) => (
              <li key={log.log_date}>
                <span className="mr-2 text-xs text-muted-foreground">
                  {log.log_date}
                </span>
                {log.insights}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">まだ気付きの記録がありません。</p>
        )}
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-medium text-muted-foreground">
      {children}
    </h2>
  );
}
