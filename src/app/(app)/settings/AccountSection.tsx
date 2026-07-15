"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./account-actions";

export function AccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      // On success the action redirects, so we only get here on failure.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-md space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">
          データのエクスポート
        </h2>
        <p className="text-sm text-muted-foreground">
          ログ・スタッフ・常連客・レポートなど、保存されているデータをJSON形式でダウンロードできます。
        </p>
        <a
          href="/api/account/export"
          className="inline-block rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:border-primary"
        >
          データをダウンロード
        </a>
      </section>

      <section className="space-y-2 rounded-xl border border-danger/40 bg-danger/5 p-4">
        <h2 className="text-sm font-medium text-danger">アカウントの削除</h2>
        <p className="text-sm text-muted-foreground">
          アカウントを削除すると、すべてのログ・スタッフ・常連客・レポート等が完全に削除されます。この操作は取り消せません。
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full border border-danger px-5 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            アカウントを削除
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="mb-1 block text-foreground">
                確認のため「削除」と入力してください
              </span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="削除"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-danger"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDelete}
                disabled={confirmText !== "削除" || isPending}
                className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-danger-foreground disabled:opacity-50"
              >
                {isPending ? "削除中…" : "完全に削除する"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                  setError(null);
                }}
                className="rounded-full px-5 py-2 text-sm text-muted-foreground"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
