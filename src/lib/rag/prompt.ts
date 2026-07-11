import type { AiMessage } from "@/lib/ai/types";

type LogRow = {
  log_date: string;
  event: string | null;
  good_things: string | null;
  improvements: string | null;
  insights: string | null;
  sales: number | null;
  customer_count: number | null;
};

type TodoRow = { title: string; due_date: string | null };
type StaffRow = {
  name: string;
  strengths: string | null;
  weaknesses: string | null;
  growth_summary: string | null;
};

function formatLogDigest(log: LogRow): string {
  const parts = [
    log.event && `出来事: ${log.event}`,
    log.good_things && `良かったこと: ${log.good_things}`,
    log.improvements && `改善点: ${log.improvements}`,
    log.insights && `気付き: ${log.insights}`,
    log.sales != null && `売上: ${log.sales}`,
    log.customer_count != null && `来客数: ${log.customer_count}`,
  ].filter(Boolean);
  return `[${log.log_date}] ${parts.join(" / ") || "記録なし"}`;
}

function formatLogsBlock(logs: LogRow[]): string {
  if (logs.length === 0) return "（該当するログはありません）";
  return logs.map(formatLogDigest).join("\n");
}

function formatTodosBlock(todos: TodoRow[]): string {
  if (todos.length === 0) return "（未完了のTODOはありません）";
  return todos
    .map((t) => `- ${t.title}${t.due_date ? `（期限: ${t.due_date}）` : ""}`)
    .join("\n");
}

function formatStaffBlock(staff: StaffRow[]): string {
  if (staff.length === 0) return "（登録されているスタッフはいません）";
  return staff
    .map((s) => {
      const parts = [
        s.strengths && `得意: ${s.strengths}`,
        s.weaknesses && `苦手: ${s.weaknesses}`,
        s.growth_summary && `成長記録: ${s.growth_summary}`,
      ].filter(Boolean);
      return `- ${s.name}${parts.length ? `（${parts.join(" / ")}）` : ""}`;
    })
    .join("\n");
}

const CHAT_SYSTEM_PROMPT = `あなたは小規模事業者専属の経営パートナーAIです。飲食店・美容院・花屋・カフェなどのオーナーの日々の経営ログを踏まえて、具体的で実行しやすいアドバイスを行います。

必ず守ること:
- 回答の根拠となる過去ログがある場合は、必ず日付を引用してください（例:「7月3日のログによると…」）。
- 断定的すぎる助言は避け、ログから読み取れる傾向として提示してください。
- 日本語の、温かみがありつつ簡潔な文体で回答してください。
- ログに情報がない場合は、憶測せずその旨を伝えてください。`;

export function buildChatPrompt(params: {
  recentLogs: LogRow[];
  keywordLogs: LogRow[];
  openTodos: TodoRow[];
  staff: StaffRow[];
  latestReportSummary?: string | null;
  chatHistory: AiMessage[];
}): AiMessage[] {
  const contextBlock = `# 直近のログ
${formatLogsBlock(params.recentLogs)}

# 質問に関連しそうな過去ログ
${formatLogsBlock(params.keywordLogs)}

# 未完了のTODO
${formatTodosBlock(params.openTodos)}

# スタッフ情報
${formatStaffBlock(params.staff)}

# 直近のレポート要約
${params.latestReportSummary ?? "（まだレポートはありません）"}`;

  return [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    { role: "system", content: contextBlock },
    ...params.chatHistory,
  ];
}

export function buildDailyReportPrompt(params: {
  todayLog: LogRow;
  yesterdayLog: LogRow | null;
}): AiMessage[] {
  const system = `あなたは経営パートナーAIです。以下の本日のログ（と可能であれば前日のログ）をもとに、日次レポートをJSON形式で生成してください。
出力は必ず次のJSON形式のみ（説明文やコードブロック記法は不要）:
{"summary": "今日のまとめ", "goodPoints": "良かった点", "improvements": "改善点", "adviceForTomorrow": "明日への具体的なアドバイス"}`;

  const user = `# 本日のログ
${formatLogDigest(params.todayLog)}

# 前日のログ
${params.yesterdayLog ? formatLogDigest(params.yesterdayLog) : "（前日のログはありません）"}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildWeeklyReportPrompt(params: {
  weekLogs: LogRow[];
  staff: StaffRow[];
}): AiMessage[] {
  const system = `あなたは経営パートナーAIです。以下の1週間分のログをもとに、週次レポートをJSON形式で生成してください。
出力は必ず次のJSON形式のみ:
{"successes": "今週の成功", "challenges": "今週の課題", "topTopics": "よく出た話題", "staffEvaluation": "スタッフ評価", "nextWeekActions": "来週やるべきこと"}`;

  const user = `# 今週のログ
${formatLogsBlock(params.weekLogs)}

# スタッフ情報
${formatStaffBlock(params.staff)}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildMonthlyReportPrompt(params: {
  monthLogs: LogRow[];
  staff: StaffRow[];
}): AiMessage[] {
  const system = `あなたは経営パートナーAIです。以下の1か月分のログをもとに、月次レポートをJSON形式で生成してください。ログ全体を読み通し、繰り返し現れるパターン（例: 天候と売上の関係、曜日傾向、リピーター動向など）があれば trends 配列に短い文で列挙してください。
出力は必ず次のJSON形式のみ:
{"successFactors": "成功要因", "failureFactors": "失敗要因", "improvementPoints": "改善ポイント", "aiSuggestions": "AIからの提案", "nextMonthGoals": "来月の目標", "trends": ["傾向1", "傾向2"]}`;

  const user = `# 今月のログ
${formatLogsBlock(params.monthLogs)}

# スタッフ情報
${formatStaffBlock(params.staff)}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildStaffGrowthPrompt(params: {
  staffName: string;
  notes: { date: string; goodPoint: string | null; improvement: string | null; memo: string | null }[];
}): AiMessage[] {
  const system = `あなたは経営パートナーAIです。スタッフの過去のメモを読み、成長の様子を短い日本語の文章で要約してください。出力はプレーンテキストの1〜3文のみ。`;

  const notesBlock = params.notes
    .map((n) => {
      const parts = [
        n.goodPoint && `良かった点: ${n.goodPoint}`,
        n.improvement && `改善点: ${n.improvement}`,
        n.memo && `コメント: ${n.memo}`,
      ].filter(Boolean);
      return `[${n.date}] ${parts.join(" / ") || "記録なし"}`;
    })
    .join("\n");

  const user = `# ${params.staffName} さんの記録\n${notesBlock || "（記録がありません）"}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildTodoDueDatePrompt(params: {
  todoTitle: string;
  recentLogs: LogRow[];
  today: string;
}): AiMessage[] {
  const system = `あなたは経営パートナーAIです。以下のTODOについて、直近のログの文脈を踏まえた妥当な期限日を1つ提案してください。
出力は必ず次のJSON形式のみ:
{"suggestedDate": "YYYY-MM-DD", "reason": "提案理由（1文）"}`;

  const user = `今日の日付: ${params.today}
TODO: ${params.todoTitle}

# 直近のログ
${formatLogsBlock(params.recentLogs)}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
