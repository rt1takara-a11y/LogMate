"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "ログインが必要です。" };
  }

  // Deleting the auth user cascades to every table via ON DELETE CASCADE
  // on the user_id / id foreign keys (see supabase/migrations/0001_init.sql).
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: "アカウントの削除に失敗しました。時間をおいて再度お試しください。" };
  }

  await supabase.auth.signOut();
  redirect("/login");
}
