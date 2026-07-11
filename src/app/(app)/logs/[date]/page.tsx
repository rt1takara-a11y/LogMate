import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogForm } from "@/components/log/LogForm";
import type { LogInput } from "@/lib/validations/log";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function LogByDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: staff }, { data: log }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("logs")
      .select(
        "id, event, good_things, improvements, insights, sales, customer_count, photo_paths",
      )
      .eq("user_id", user.id)
      .eq("log_date", date)
      .maybeSingle(),
  ]);

  let defaultValues: Partial<LogInput> | undefined;

  if (log) {
    const [{ data: todos }, { data: staffLogs }] = await Promise.all([
      supabase.from("todos").select("title").eq("log_id", log.id),
      supabase
        .from("staff_logs")
        .select("staff_id, good_point, improvement, memo")
        .eq("log_id", log.id),
    ]);

    defaultValues = {
      event: log.event ?? "",
      goodThings: log.good_things ?? "",
      improvements: log.improvements ?? "",
      insights: log.insights ?? "",
      sales: log.sales,
      customerCount: log.customer_count,
      photoPaths: log.photo_paths ?? [],
      todos: (todos ?? []).map((t) => ({ title: t.title })),
      staffNotes: (staffLogs ?? []).map((s) => ({
        staffId: s.staff_id,
        goodPoint: s.good_point ?? "",
        improvement: s.improvement ?? "",
        memo: s.memo ?? "",
      })),
    };
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {log ? "ログを編集" : "ログを作成"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{date}</p>
      <LogForm
        userId={user.id}
        logDate={date}
        staffOptions={staff ?? []}
        defaultValues={defaultValues}
      />
    </div>
  );
}
