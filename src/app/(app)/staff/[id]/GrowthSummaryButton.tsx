"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateGrowthSummary } from "../actions";

export function GrowthSummaryButton({ staffId }: { staffId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateGrowthSummary(staffId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="rounded-full border border-border px-4 py-1.5 text-xs text-foreground hover:border-primary disabled:opacity-60"
      >
        {isPending ? "生成中…" : "成長サマリーを更新"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
