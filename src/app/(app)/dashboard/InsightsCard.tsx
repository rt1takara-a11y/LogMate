"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { generateInsights } from "./actions";

export function InsightsCard({
  insights,
  generatedAt,
}: {
  insights: string[] | null;
  generatedAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateInsights();
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles size={14} className="text-primary" />
          AIが気づいたこと
        </h2>
        <button
          type="button"
          onClick={onClick}
          disabled={isPending}
          className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:border-primary disabled:opacity-60"
        >
          {isPending ? "分析中…" : "気付きを更新"}
        </button>
      </div>

      {insights && insights.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-foreground">
          {insights.map((insight, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary">•</span>
              {insight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          「気付きを更新」を押すと、AIが過去のログから傾向を探して教えてくれます。
        </p>
      )}
      {generatedAt && (
        <p className="mt-2 text-xs text-muted-foreground">{generatedAt} 時点</p>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
