import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GrowthSummaryButton } from "./GrowthSummaryButton";

export default async function StaffDetailPage({
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

  const [{ data: staff }, { data: logs }] = await Promise.all([
    supabase
      .from("staff")
      .select(
        "id, name, memo, strengths, weaknesses, growth_summary, growth_summary_updated_at",
      )
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("staff_logs")
      .select("created_at, good_point, improvement, memo")
      .eq("staff_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!staff) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{staff.name}</h1>
        {(staff.strengths || staff.weaknesses) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[staff.strengths && `得意: ${staff.strengths}`, staff.weaknesses && `苦手: ${staff.weaknesses}`]
              .filter(Boolean)
              .join(" / ")}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium text-muted-foreground">成長記録</h2>
          <GrowthSummaryButton staffId={staff.id} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {staff.growth_summary ?? "まだ成長サマリーが生成されていません。"}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">記録履歴</h2>
        {(logs ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">まだ記録がありません。</p>
        )}
        {(logs ?? []).map((log, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="mb-1 text-xs text-muted-foreground">
              {log.created_at.slice(0, 10)}
            </p>
            <div className="space-y-0.5 text-foreground">
              {log.good_point && <p>良かった点: {log.good_point}</p>}
              {log.improvement && <p>改善点: {log.improvement}</p>}
              {log.memo && <p>コメント: {log.memo}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
