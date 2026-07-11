import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddNoteForm } from "./AddNoteForm";

export default async function CustomerDetailPage({
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

  const [{ data: customer }, { data: notes }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, profile_notes, visit_pattern, last_visit_date")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("customer_notes")
      .select("id, visit_date, note")
      .eq("customer_id", id)
      .order("visit_date", { ascending: false }),
  ]);

  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{customer.name}</h1>
        {(customer.profile_notes || customer.visit_pattern) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[customer.visit_pattern, customer.profile_notes].filter(Boolean).join(" / ")}
          </p>
        )}
        {customer.last_visit_date && (
          <p className="mt-1 text-xs text-muted-foreground">
            最終来店: {customer.last_visit_date}
          </p>
        )}
      </div>

      <AddNoteForm customerId={customer.id} />

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">来店メモ</h2>
        {(notes ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">まだメモがありません。</p>
        )}
        {(notes ?? []).map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="mb-1 text-xs text-muted-foreground">{n.visit_date}</p>
            <p className="whitespace-pre-wrap text-foreground">{n.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
