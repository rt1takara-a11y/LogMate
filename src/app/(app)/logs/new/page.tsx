import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogForm } from "@/components/log/LogForm";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const logDate = todayString();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        今日のログ
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{logDate}</p>
      <LogForm
        userId={user.id}
        logDate={logDate}
        staffOptions={staff ?? []}
      />
    </div>
  );
}
