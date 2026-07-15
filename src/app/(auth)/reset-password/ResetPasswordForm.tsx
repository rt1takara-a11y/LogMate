"use client";

import { useActionState } from "react";
import { updatePassword, type AuthActionState } from "../login/actions";

const initialState: AuthActionState = { error: null };

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          新しいパスワード
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          新しいパスワードを設定してください。
        </p>
      </div>

      <form action={action} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-foreground">
            新しいパスワード（8文字以上）
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "更新中…" : "パスワードを更新"}
        </button>
      </form>
    </div>
  );
}
