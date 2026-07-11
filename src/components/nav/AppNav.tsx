"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookPen,
  MessageCircle,
  FileText,
  Users,
  Heart,
  ListChecks,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/logs/new", label: "ログ作成", icon: NotebookPen },
  { href: "/chat", label: "AIチャット", icon: MessageCircle },
  { href: "/reports", label: "レポート", icon: FileText },
  { href: "/staff", label: "スタッフ", icon: Users },
  { href: "/customers", label: "常連客", icon: Heart },
  { href: "/todos", label: "TODO", icon: ListChecks },
  { href: "/settings", label: "設定", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors sm:rounded-lg ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
