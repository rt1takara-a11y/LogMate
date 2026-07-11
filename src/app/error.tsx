"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-sm text-muted-foreground">
        予期しないエラーが発生しました。
      </p>
      {error.message && (
        <p className="max-w-md text-xs text-muted-foreground">{error.message}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        もう一度試す
      </button>
    </div>
  );
}
