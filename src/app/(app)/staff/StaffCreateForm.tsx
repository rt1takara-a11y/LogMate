"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaff } from "./actions";

export function StaffCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStaff({ name, memo, strengths, weaknesses });
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setMemo("");
      setStrengths("");
      setWeaknesses("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        スタッフを登録
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前"
        required
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        value={strengths}
        onChange={(e) => setStrengths(e.target.value)}
        placeholder="得意なこと"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        value={weaknesses}
        onChange={(e) => setWeaknesses(e.target.value)}
        placeholder="苦手なこと"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="メモ"
        rows={2}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "登録中…" : "登録"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-2 text-sm text-muted-foreground"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
