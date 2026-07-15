"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthActionState } from "../login/actions";

const initialState: AuthActionState = { error: null };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          パスワードの再設定
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          登録済みのメールアドレスに、再設定用のリンクをお送りします。
        </p>
      </div>

      {state.success ? (
        <p className="rounded-xl bg-muted p-4 text-sm text-foreground">
          メールを送信しました。届いたメール内のリンクから、新しいパスワードを設定してください。
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">メールアドレス</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {pending ? "送信中…" : "再設定リンクを送る"}
          </button>
        </form>
      )}

      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ログイン画面に戻る
      </Link>
    </div>
  );
}
