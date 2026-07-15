import Link from "next/link";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← LogMate
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">最終更新日: {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
          {children}
        </div>
      </div>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium text-foreground">{heading}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}
