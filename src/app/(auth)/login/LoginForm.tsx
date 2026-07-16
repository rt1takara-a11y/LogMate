"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    initialState,
  );

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">LogMate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          毎日の経営ログを、AIの相談相手に。
        </p>
      </div>

      <div className="flex rounded-full border border-border bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full py-1.5 transition-colors ${
            mode === "signin"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full py-1.5 transition-colors ${
            mode === "signup"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          新規登録
        </button>
      </div>

      {mode === "signin" ? (
        <form action={signInAction} className="space-y-3">
          <Field label="メールアドレス" name="email" type="email" required />
          <Field label="パスワード" name="password" type="password" required />
          {signInState.error && (
            <p className="text-sm text-danger">{signInState.error}</p>
          )}
          <button
            type="submit"
            disabled={signInPending}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {signInPending ? "ログイン中…" : "ログイン"}
          </button>
          <Link
            href="/forgot-password"
            className="block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            パスワードをお忘れの方
          </Link>
        </form>
      ) : signUpState.success ? (
        <p className="rounded-xl bg-muted p-4 text-sm text-foreground">
          確認メールを送信しました。メール内のリンクからご登録を完了してください。
        </p>
      ) : (
        <form action={signUpAction} className="space-y-3">
          <Field label="屋号・店舗名" name="businessName" type="text" required />
          <Field label="メールアドレス" name="email" type="email" required />
          <Field
            label="パスワード（8文字以上）"
            name="password"
            type="password"
            required
          />
          {signUpState.error && (
            <p className="text-sm text-danger">{signUpState.error}</p>
          )}
          <button
            type="submit"
            disabled={signUpPending}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {signUpPending ? "登録中…" : "アカウントを作成"}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-muted-foreground">
        続行することで、
        <Link href="/terms" className="underline hover:text-foreground">
          利用規約
        </Link>
        と
        <Link href="/privacy" className="underline hover:text-foreground">
          プライバシーポリシー
        </Link>
        に同意したものとみなされます。
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
