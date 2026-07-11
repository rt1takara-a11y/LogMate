import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaffCreateForm } from "./StaffCreateForm";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, strengths, weaknesses")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">スタッフ管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          スタッフを登録すると、ログ作成時にスタッフ別メモを記録できます。
        </p>
      </div>

      <StaffCreateForm />

      <div className="space-y-2">
        {(staff ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">まだスタッフが登録されていません。</p>
        )}
        {(staff ?? []).map((s) => (
          <Link
            key={s.id}
            href={`/staff/${s.id}`}
            className="block rounded-xl border border-border bg-card p-4 hover:border-primary"
          >
            <p className="text-sm font-medium text-foreground">{s.name}</p>
            {(s.strengths || s.weaknesses) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[s.strengths && `得意: ${s.strengths}`, s.weaknesses && `苦手: ${s.weaknesses}`]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
