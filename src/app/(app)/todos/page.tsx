import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TodoList } from "./TodoList";

export default async function TodosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: todos } = await supabase
    .from("todos")
    .select("id, title, completed, due_date, ai_suggested_due_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">TODO</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ログ作成時に追加したTODOもここに表示されます。
        </p>
      </div>
      <TodoList todos={todos ?? []} />
    </div>
  );
}
