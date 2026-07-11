"use client";

import { useState, useTransition } from "react";
import { saveAiSettings } from "./actions";
import type { AiProvider } from "@/lib/ai/types";

export function SettingsForm({
  currentProvider,
  currentModel,
  hasKeyConfigured,
}: {
  currentProvider: AiProvider | null;
  currentModel: string | null;
  hasKeyConfigured: boolean;
}) {
  const [provider, setProvider] = useState<AiProvider>(currentProvider ?? "anthropic");
  const [model, setModel] = useState(currentModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveAiSettings({ provider, model: model || undefined, apiKey });
      if (result.error) {
        setMessage({ text: result.error, isError: true });
      } else {
        setMessage({ text: "設定を保存しました。", isError: false });
        setApiKey("");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div>
        <span className="mb-2 block text-sm font-medium text-foreground">
          AI provider
        </span>
        <div className="flex gap-2">
          {(["anthropic", "openai"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setProvider(option)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                provider === option
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {option === "anthropic" ? "Claude (Anthropic)" : "OpenAI"}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-foreground">
          モデル名（任意・空欄で既定モデル）
        </span>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={provider === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini"}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-primary"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-foreground">
          APIキー{hasKeyConfigured && "（設定済み・変更する場合のみ入力）"}
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasKeyConfigured ? "••••••••••••••••" : "sk-..."}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-primary"
        />
      </label>

      {message && (
        <p className={`text-sm ${message.isError ? "text-danger" : "text-accent"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || (!hasKeyConfigured && apiKey.length === 0)}
        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
