import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-sm text-muted-foreground">ページが見つかりませんでした。</p>
      <Link
        href="/dashboard"
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        ダッシュボードに戻る
      </Link>
    </div>
  );
}
