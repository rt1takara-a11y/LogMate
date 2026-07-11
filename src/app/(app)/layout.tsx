import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/login/actions";
import { AppNav } from "@/components/nav/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-background sm:flex">
      <aside className="border-b border-border bg-card px-4 py-4 sm:w-56 sm:shrink-0 sm:border-b-0 sm:border-r sm:px-3 sm:py-6">
        <div className="mb-4 px-1 sm:mb-6">
          <p className="text-lg font-semibold text-foreground">LogMate</p>
          {profile?.business_name && (
            <p className="truncate text-xs text-muted-foreground">
              {profile.business_name}
            </p>
          )}
        </div>
        <AppNav />
        <form action={signOut} className="mt-6 hidden sm:block">
          <button
            type="submit"
            className="w-full rounded-lg px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ログアウト
          </button>
        </form>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
