import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            リンクの有効期限が切れています
          </h1>
          <p className="text-sm text-muted-foreground">
            再設定リンクの有効期限が切れているか、無効です。もう一度お試しください。
          </p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            再設定メールを送る
          </Link>
        </div>
      )}
    </main>
  );
}
