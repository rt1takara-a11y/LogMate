"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer } from "./actions";

export function CustomerCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [profileNotes, setProfileNotes] = useState("");
  const [visitPattern, setVisitPattern] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCustomer({ name, profileNotes, visitPattern });
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setProfileNotes("");
      setVisitPattern("");
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
        常連客を登録
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
        value={visitPattern}
        onChange={(e) => setVisitPattern(e.target.value)}
        placeholder="来店傾向（例: 毎週土曜日）"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={profileNotes}
        onChange={(e) => setProfileNotes(e.target.value)}
        placeholder="特徴・好み（例: ブラックコーヒー、花が好き、娘さんが受験）"
        rows={3}
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
