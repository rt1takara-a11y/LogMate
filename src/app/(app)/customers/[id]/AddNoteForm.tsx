"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCustomerNote } from "../actions";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function AddNoteForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [visitDate, setVisitDate] = useState(todayString());
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCustomerNote({ customerId, visitDate, note });
      if (result.error) {
        setError(result.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">来店日</label>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="今回の会話・様子など（例: お孫さんの受験の話をされていた）"
        rows={2}
        required
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "保存中…" : "メモを追加"}
      </button>
    </form>
  );
}
