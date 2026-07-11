"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateReport } from "./actions";
import type { ReportType } from "@/lib/reports/types";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekString() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function startOfMonthString() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

const OPTIONS: { type: ReportType; label: string; periodStart: () => string }[] = [
  { type: "daily", label: "本日のレポートを生成", periodStart: todayString },
  { type: "weekly", label: "今週のレポートを生成", periodStart: startOfWeekString },
  { type: "monthly", label: "今月のレポートを生成", periodStart: startOfMonthString },
];

export function ReportGenerator() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingType, setPendingType] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate(type: ReportType, periodStart: string) {
    setError(null);
    setPendingType(type);
    startTransition(async () => {
      const result = await generateReport(type, periodStart);
      if (result.error) {
        setError(result.error);
      } else if (result.reportId) {
        router.push(`/reports/${result.reportId}`);
        router.refresh();
      }
      setPendingType(null);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            disabled={isPending}
            onClick={() => handleGenerate(option.type, option.periodStart())}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:border-primary disabled:opacity-60"
          >
            {isPending && pendingType === option.type ? "生成中…" : option.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
