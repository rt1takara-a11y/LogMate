import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerCreateForm } from "./CustomerCreateForm";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, profile_notes, visit_pattern, last_visit_date")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">常連客ノート</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          好みや会話の内容を記録しておくと、次の来店時にAIが思い出させてくれます。
        </p>
      </div>

      <CustomerCreateForm />

      <div className="space-y-2">
        {(customers ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">まだ常連客が登録されていません。</p>
        )}
        {(customers ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="block rounded-xl border border-border bg-card p-4 hover:border-primary"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              {c.last_visit_date && (
                <p className="text-xs text-muted-foreground">
                  最終来店: {c.last_visit_date}
                </p>
              )}
            </div>
            {(c.profile_notes || c.visit_pattern) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[c.visit_pattern, c.profile_notes].filter(Boolean).join(" / ")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
