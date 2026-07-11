"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { createTodo, toggleTodo, suggestDueDate } from "./actions";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  ai_suggested_due_date: string | null;
  created_at: string;
};

const STALE_DAYS = 21;

function isStale(todo: Todo): boolean {
  if (todo.completed) return false;
  const ageMs = Date.now() - new Date(todo.created_at).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setError(null);
    startTransition(async () => {
      const result = await createTodo(title);
      if (result.error) {
        setError(result.error);
      } else {
        setNewTitle("");
        router.refresh();
      }
    });
  }

  function handleToggle(id: string, completed: boolean) {
    startTransition(async () => {
      await toggleTodo(id, completed);
      router.refresh();
    });
  }

  function handleSuggest(todo: Todo) {
    setSuggestingId(todo.id);
    setError(null);
    startTransition(async () => {
      const result = await suggestDueDate(todo.id, todo.title);
      if (result.error) setError(result.error);
      setSuggestingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="新しいTODOを追加"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending || !newTitle.trim()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          追加
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">未完了</h2>
        {open.length === 0 && (
          <p className="text-sm text-muted-foreground">未完了のTODOはありません。</p>
        )}
        {open.map((todo) => (
          <div
            key={todo.id}
            className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
              isStale(todo) ? "border-danger/40 bg-danger/5" : "border-border bg-card"
            }`}
          >
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleToggle(todo.id, true)}
                className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border align-middle text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Check size={12} />
              </button>
              <span className="text-sm text-foreground">{todo.title}</span>
              {isStale(todo) && (
                <span className="ml-2 text-xs text-danger">
                  {STALE_DAYS}日以上未完了です
                </span>
              )}
              {todo.ai_suggested_due_date && (
                <p className="ml-7 mt-0.5 text-xs text-muted-foreground">
                  AI提案期限: {todo.ai_suggested_due_date}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleSuggest(todo)}
              disabled={suggestingId === todo.id}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              <Sparkles size={12} />
              {suggestingId === todo.id ? "提案中…" : "AIに期限を提案"}
            </button>
          </div>
        ))}
      </section>

      {completed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">完了済み</h2>
          {completed.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3"
            >
              <span className="text-sm text-muted-foreground line-through">
                {todo.title}
              </span>
              <button
                type="button"
                onClick={() => handleToggle(todo.id, false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                戻す
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
