import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportGenerator } from "./ReportGenerator";

const TYPE_LABEL: Record<string, string> = {
  daily: "日次",
  weekly: "週次",
  monthly: "月次",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reports } = await supabase
    .from("reports")
    .select("id, report_type, period_start, period_end, created_at")
    .order("period_start", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">レポート</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ボタンを押すと、AIがログをもとにレポートを生成します。
        </p>
      </div>

      <ReportGenerator />

      <div className="space-y-2">
        {(reports ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">まだレポートがありません。</p>
        )}
        {(reports ?? []).map((report) => (
          <Link
            key={report.id}
            href={`/reports/${report.id}`}
            className="block rounded-xl border border-border bg-card p-4 hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {TYPE_LABEL[report.report_type] ?? report.report_type}レポート
              </span>
              <span className="text-xs text-muted-foreground">
                {report.period_start}
                {report.period_end !== report.period_start && ` 〜 ${report.period_end}`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
