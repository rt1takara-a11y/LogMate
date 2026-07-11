import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  DailyReportContent,
  WeeklyReportContent,
  MonthlyReportContent,
} from "@/lib/reports/types";

const TYPE_LABEL: Record<string, string> = {
  daily: "日次レポート",
  weekly: "週次レポート",
  monthly: "月次レポート",
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: report } = await supabase
    .from("reports")
    .select("report_type, period_start, period_end, content")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (!report) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {TYPE_LABEL[report.report_type] ?? report.report_type}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {report.period_start}
          {report.period_end !== report.period_start && ` 〜 ${report.period_end}`}
        </p>
      </div>

      {report.report_type === "daily" && (
        <DailyView content={report.content as DailyReportContent} />
      )}
      {report.report_type === "weekly" && (
        <WeeklyView content={report.content as WeeklyReportContent} />
      )}
      {report.report_type === "monthly" && (
        <MonthlyView content={report.content as MonthlyReportContent} />
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 text-xs font-medium text-muted-foreground">{title}</h2>
      <p className="whitespace-pre-wrap text-sm text-foreground">{body}</p>
    </div>
  );
}

function DailyView({ content }: { content: DailyReportContent }) {
  return (
    <div className="space-y-3">
      <Section title="今日のまとめ" body={content.summary} />
      <Section title="良かった点" body={content.goodPoints} />
      <Section title="改善点" body={content.improvements} />
      <Section title="明日へのアドバイス" body={content.adviceForTomorrow} />
    </div>
  );
}

function WeeklyView({ content }: { content: WeeklyReportContent }) {
  return (
    <div className="space-y-3">
      <Section title="今週の成功" body={content.successes} />
      <Section title="今週の課題" body={content.challenges} />
      <Section title="よく出た話題" body={content.topTopics} />
      <Section title="スタッフ評価" body={content.staffEvaluation} />
      <Section title="来週やるべきこと" body={content.nextWeekActions} />
    </div>
  );
}

function MonthlyView({ content }: { content: MonthlyReportContent }) {
  return (
    <div className="space-y-3">
      <Section title="成功要因" body={content.successFactors} />
      <Section title="失敗要因" body={content.failureFactors} />
      <Section title="改善ポイント" body={content.improvementPoints} />
      <Section title="AIからの提案" body={content.aiSuggestions} />
      <Section title="来月の目標" body={content.nextMonthGoals} />
      {content.trends?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-xs font-medium text-muted-foreground">傾向分析</h2>
          <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
            {content.trends.map((trend, i) => (
              <li key={i}>{trend}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
