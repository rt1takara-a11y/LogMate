import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateString(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function LogCalendar({
  monthParam,
  logDates,
  today,
}: {
  /** "YYYY-MM" for the month currently displayed */
  monthParam: string;
  /** set of "YYYY-MM-DD" strings that have a log */
  logDates: Set<string>;
  /** "YYYY-MM-DD" for today */
  today: string;
}) {
  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed

  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay();

  const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));
  const prevMonthParam = `${prevMonthDate.getUTCFullYear()}-${pad2(prevMonthDate.getUTCMonth() + 1)}`;
  const nextMonthParam = `${nextMonthDate.getUTCFullYear()}-${pad2(nextMonthDate.getUTCMonth() + 1)}`;

  const cells: { day: number | null; date: string | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, date: null });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, date: dateString(year, month, day) });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground">
          {year}年{month + 1}月
        </h2>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard?month=${prevMonthParam}`}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="前の月"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={`/dashboard?month=${nextMonthParam}`}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="次の月"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.day || !cell.date) return <div key={i} />;
          const hasLog = logDates.has(cell.date);
          const isToday = cell.date === today;
          return (
            <Link
              key={cell.date}
              href={`/logs/${cell.date}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                isToday
                  ? "border border-primary font-medium text-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <span>{cell.day}</span>
              {hasLog && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
