export type ReportType = "daily" | "weekly" | "monthly";

export interface DailyReportContent {
  summary: string;
  goodPoints: string;
  improvements: string;
  adviceForTomorrow: string;
}

export interface WeeklyReportContent {
  successes: string;
  challenges: string;
  topTopics: string;
  staffEvaluation: string;
  nextWeekActions: string;
}

export interface MonthlyReportContent {
  successFactors: string;
  failureFactors: string;
  improvementPoints: string;
  aiSuggestions: string;
  nextMonthGoals: string;
  trends: string[];
}

export type ReportContent =
  | DailyReportContent
  | WeeklyReportContent
  | MonthlyReportContent;
