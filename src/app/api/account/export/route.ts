import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // RLS scopes every query to the signed-in user, so no manual user_id filter
  // is needed. The encrypted API key is intentionally excluded.
  const [profile, logs, staff, staffLogs, todos, customers, customerNotes, reports, chat] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("logs").select("*").order("log_date"),
      supabase.from("staff").select("*").order("created_at"),
      supabase.from("staff_logs").select("*").order("created_at"),
      supabase.from("todos").select("*").order("created_at"),
      supabase.from("customers").select("*").order("created_at"),
      supabase.from("customer_notes").select("*").order("visit_date"),
      supabase.from("reports").select("*").order("period_start"),
      supabase.from("chat_messages").select("*").order("created_at"),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    logs: logs.data ?? [],
    staff: staff.data ?? [],
    staffLogs: staffLogs.data ?? [],
    todos: todos.data ?? [],
    customers: customers.data ?? [],
    customerNotes: customerNotes.data ?? [],
    reports: reports.data ?? [],
    chatMessages: chat.data ?? [],
  };

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="logmate-export-${today}.json"`,
    },
  });
}
