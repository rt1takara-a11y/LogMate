import type { Decision, Direction, Logbook, Note } from './logbook';

export type ThemeInsight = {
  id: string;
  label: string;
  count: number;
  examples: Note[];
};

export type WeeklyThemeInsight = ThemeInsight & {
  previousCount: number;
  delta: number;
  previousExamples: Note[];
};

export type WeeklyChange = {
  id: string;
  label: string;
  previousCount: number;
  currentCount: number;
  examples: Note[];
  previousExamples: Note[];
  description: string;
};

export type DecisionFollowup = {
  decision: Decision;
  before: number;
  after: number;
  comparisonDays: number;
  beforeExamples: Note[];
  afterExamples: Note[];
  description: string;
};

export type ManualCandidate = {
  id: string;
  title: string;
  body: string;
  source: string;
  sourceCount: number;
  examples: { id: string; date: string; body: string }[];
  reason: string;
  lastSeenAt: string;
};

export type WeeklyReviewSummary = {
  from: string;
  through: string;
  entryCount: number;
  noteCount: number;
  decisionCount: number;
  frequentThemes: WeeklyThemeInsight[];
  recurringProblems: WeeklyThemeInsight[];
  positiveChanges: Note[];
  improvingChanges: WeeklyChange[];
  worseningChanges: WeeklyChange[];
  decisions: Decision[];
  decisionFollowups: DecisionFollowup[];
  directionSignals: { direction: Direction; match: DirectionMatch }[];
  unresolved: Note[];
  successNotes: Note[];
  manualCandidates: ManualCandidate[];
  highlights: { text: string; href: string }[];
};

export type PatternInsight = ThemeInsight & {
  weeklyCounts: number[];
  weekLabels: string[];
  trendLabel: string;
  trendTone: 'rising' | 'falling' | 'steady';
  problemCount: number;
};

export type DirectionMatch = {
  id: string;
  date: string;
  text: string;
  kind: 'note' | 'decision';
  prompt: 'contrast' | 'related';
};

export type DecisionContext = {
  dueAt: string;
  due: boolean;
  before: number;
  after: number;
  comparisonDays: number;
  relatedAfter: Note[];
};

const DAY = 86_400_000;
const ISSUE = /問題|課題|失敗|困っ|難し|できなかった|できていない|ミス|クレーム|遅れ|不足|品切れ|欠品|在庫が足り|売り切れ|トラブル|悪化|減ってしま|うまくいかな/i;
const POSITIVE = /改善|良くな|よくな|解決|減った|増えた|順調|成功|できた|うまくいった|好評|喜ばれ|達成/i;
const RESOLVED = /解決|改善|うまくいった|直した|修正した|落ち着いた|できた/i;
const NEGATED = /できなかった|できていない|できず|できない|解決していない|改善していない|改善しなかった|良くならな|うまくいかな|失敗した|まだ問題/i;
// A bare "increased/decreased" does not indicate whether the change helped.
const IMPROVEMENT = /改善|良くな|よくな|解決|順調|できた/i;
const SUCCESS = /成功|好評|喜ばれ|達成|うまくいった|できた/i;
const WORSENING = /悪化|増えてしま|増え続け|ひどくな|減ってしま|さらに遅れ/i;
const OPPOSITES = [
  ['増や', '減ら'], ['続け', 'やめ'], ['続け', '中止'],
  ['丁寧', '省略'], ['重視', '後回し'], ['早く', '遅れ'],
] as const;
const TOPICS = [
  { label: '接客・顧客', words: ['接客', 'お客様', '顧客', '来店', 'サービス', '対応', 'お客さん'] },
  { label: 'スタッフ・勤務', words: ['スタッフ', '従業員', '店員', 'シフト', '勤務', '教育', '引き継ぎ', '採用'] },
  { label: '売上・集客', words: ['売上', '売り上げ', '客単価', '販売', '集客', '販促', 'リピート'] },
  { label: '商品・在庫', words: ['商品', '在庫', '仕入', '品切れ', '発注', '欠品'] },
  { label: '店舗運営', words: ['オペレーション', '作業', '待ち時間', '動線', '開店', '閉店', '業務'] },
  { label: '予約', words: ['予約', 'キャンセル', '予約枠'] },
  { label: '調理・提供', words: ['仕込み', '調理', '提供', '厨房', 'キッチン'] },
  { label: '利益・コスト', words: ['原価', '利益', '粗利', 'コスト', '費用', '経費'] },
  { label: '発信・評判', words: ['sns', '口コミ', 'レビュー', '投稿', '告知'] },
] as const;
const CONCEPTS = [
  { label: '在庫・欠品', words: ['品切れ', '欠品', '在庫不足', '在庫が足り', '在庫がない', '売り切れ'] },
  { label: '待ち時間', words: ['待ち時間', 'お待たせ', '待たせ', '行列'] },
  { label: '引き継ぎ', words: ['引き継ぎ', '申し送り', '共有漏れ'] },
  { label: '予約キャンセル', words: ['キャンセル', '予約の取り消し', '予約を取り消'] },
  { label: '発注', words: ['発注', '注文忘れ', '仕入れ忘れ'] },
  { label: '人員不足', words: ['人手不足', '人員不足', 'スタッフが足り', 'シフトが埋まら'] },
] as const;
const STOP_WORDS = new Set(['こと', 'ため', 'よう', '今日', '昨日', '明日', '今週', '先週', 'これ', 'それ', 'する', 'した', 'して', 'ある', 'いる', 'ない', 'です', 'ます', 'だった', 'もっと', 'また', 'そして', 'から', 'まで', 'ました', 'について', 'という']);

type Vector = Map<string, number>;
type Cluster = { members: Note[]; centroid: Vector };

function add(vector: Vector, key: string, weight: number) {
  vector.set(key, (vector.get(key) ?? 0) + weight);
}

function featureVector(text: string): Vector {
  const normalized = text.normalize('NFKC').toLocaleLowerCase();
  const vector: Vector = new Map();
  for (const topic of TOPICS) {
    if (topic.words.some(word => normalized.includes(word))) add(vector, `topic:${topic.label}`, 0.35);
  }
  for (const concept of CONCEPTS) {
    if (concept.words.some(word => normalized.includes(word))) add(vector, `concept:${concept.label}`, 2.4);
  }
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
    for (const part of segmenter.segment(normalized)) {
      const word = part.segment.trim();
      if (part.isWordLike && word.length > 1 && !STOP_WORDS.has(word)) add(vector, `word:${word}`, 0.8);
    }
  }
  // Short character n-grams keep related Japanese phrasing comparable without
  // loading a remote model or sending the text outside the browser.
  const compact = normalized.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 180);
  for (let i = 0; i < compact.length - 1; i++) {
    const gram = compact.slice(i, i + 2);
    if (!STOP_WORDS.has(gram)) add(vector, `gram:${gram}`, 0.13);
  }
  return vector;
}

function similarity(a: Vector, b: Vector): number {
  let dot = 0, aa = 0, bb = 0;
  for (const [key, value] of a) {
    aa += value * value;
    dot += value * (b.get(key) ?? 0);
  }
  for (const value of b.values()) bb += value * value;
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

export function relatedness(a: string, b: string): number {
  return similarity(featureVector(a), featureVector(b));
}

function isIssue(note: Note): boolean {
  return !isResolved(note.body) && (note.category === '失敗' || ISSUE.test(note.body));
}

function isPositive(note: Note): boolean {
  return POSITIVE.test(note.body) && !NEGATED.test(note.body);
}

function isImprovement(note: Note): boolean {
  return isPositive(note) && !isIssue(note) && IMPROVEMENT.test(note.body);
}

function isSuccess(note: Note): boolean {
  return isPositive(note) && !isIssue(note) && SUCCESS.test(note.body);
}

function isResolved(body: string): boolean {
  return RESOLVED.test(body) && !NEGATED.test(body);
}

function clusterNotes(notes: Note[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const note of [...notes].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))) {
    const vector = featureVector(note.body);
    let best = -1;
    let score = 0.3;
    for (let i = 0; i < clusters.length; i++) {
      const current = similarity(vector, clusters[i].centroid);
      if (current > score) { score = current; best = i; }
    }
    if (best < 0) clusters.push({ members: [note], centroid: vector });
    else {
      const cluster = clusters[best];
      cluster.members.push(note);
      for (const [key, weight] of vector) add(cluster.centroid, key, weight);
    }
  }
  return clusters;
}

function clusterLabel(cluster: Cluster): string {
  const concept = [...cluster.centroid]
    .filter(([key]) => key.startsWith('concept:'))
    .sort((a, b) => b[1] - a[1])[0];
  if (concept) return concept[0].slice(8);
  const topic = [...cluster.centroid]
    .filter(([key]) => key.startsWith('topic:'))
    .sort((a, b) => b[1] - a[1])[0];
  if (topic) return topic[0].slice(6);
  const word = [...cluster.centroid]
    .filter(([key]) => key.startsWith('word:') && key.length > 7)
    .sort((a, b) => b[1] - a[1])[0];
  return word ? word[0].slice(5) : `${cluster.members[0].body.trim().slice(0, 14)}…`;
}

function theme(cluster: Cluster, notes = cluster.members): ThemeInsight {
  return {
    id: cluster.members[0].id,
    label: clusterLabel(cluster),
    count: notes.length,
    examples: [...notes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3),
  };
}

function weeklyTheme(cluster: Cluster, current: Note[], previous: Note[]): WeeklyThemeInsight {
  return {
    ...theme(cluster, current),
    previousCount: previous.length,
    delta: current.length - previous.length,
    previousExamples: [...previous].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3),
  };
}

function startOfWeek(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function weekStarts(now: Date): Date[] {
  const monday = startOfWeek(now);
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() - (7 - index) * 7);
    return date;
  });
}

function buildPatterns(clusters: Cluster[], now: Date): PatternInsight[] {
  const starts = weekStarts(now);
  return clusters.filter(cluster => cluster.members.length >= 2).map(cluster => {
    const weeklyCounts = starts.map((start, i) => {
      const end = i === starts.length - 1 ? now.getTime() + 1 : starts[i + 1].getTime();
      return cluster.members.filter(note => Date.parse(note.createdAt) >= start.getTime() && Date.parse(note.createdAt) < end).length;
    });
    const counts = weeklyCounts;
    const risingThreeWeeks = counts[7] > counts[6] && counts[6] > counts[5] && counts[5] > counts[4];
    const fallingRecently = counts[7] < counts[6] && counts[6] > 0;
    return {
      ...theme(cluster),
      weeklyCounts,
      weekLabels: starts.map(date => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(date)),
      trendLabel: risingThreeWeeks ? '3週間連続で増加' : fallingRecently ? '最近減少' : counts[7] > counts[6] ? '今週増加' : '大きな変化なし',
      trendTone: risingThreeWeeks || counts[7] > counts[6] ? 'rising' as const : fallingRecently ? 'falling' as const : 'steady' as const,
      problemCount: cluster.members.filter(isIssue).length,
    };
  }).sort((a, b) => b.count - a.count);
}

function makeManualCandidates(clusters: Cluster[], data: Logbook): ManualCandidate[] {
  const candidates: ManualCandidate[] = [];
  for (const cluster of clusters) {
    const label = clusterLabel(cluster);
    const problems = cluster.members.filter(isIssue);
    const successes = cluster.members.filter(isSuccess);
    for (const [kind, sourceNotes] of [['issue', problems], ['success', successes]] as const) {
      if (sourceNotes.length < 2) continue;
      const recent = [...sourceNotes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const title = kind === 'issue' ? `${label}への対応を整理する` : `${label}でうまくいった方法を残す`;
      const source = kind === 'issue' ? `繰り返す課題: ${label}` : `成功の記録: ${label}`;
      candidates.push({
        id: `${kind}-${cluster.members[0].id}`, title, source,
        sourceCount: sourceNotes.length, lastSeenAt: recent[0].createdAt,
        reason: kind === 'issue' ? '似た問題が複数回記録されています' : '良かった変化が複数回記録されています',
        examples: recent.slice(0, 2).map(note => ({ id: note.id, date: note.createdAt, body: note.body })),
        body: kind === 'issue'
          ? `【起きていること】\n${recent[0].body}\n\n【確認すること】\n何が共通しているか、発生条件を確認する。\n\n【次回の対応】\n試して有効だった手順を記入する。`
          : `【うまくいったこと】\n${recent[0].body}\n\n【再現するために】\n共通した条件と手順を確認して記入する。`,
      });
    }
  }
  for (const decision of data.decisions) {
    const latest = decision.reviewHistory?.at(-1);
    if (latest ? latest.effect !== 'positive' : !decision.outcome.trim()) continue;
    const positivelyReviewed = latest?.effect === 'positive';
    candidates.push({
      id: `decision-${decision.id}`,
      title: `${decision.title}の進め方`,
      source: `判断: ${decision.id}`,
      sourceCount: 1,
      lastSeenAt: latest?.reviewedAt ?? decision.updatedAt,
      reason: positivelyReviewed ? '効果ありと振り返った判断です' : '結果が記録された判断です（効果は未評価）',
      examples: [
        { id: decision.id, date: latest?.reviewedAt ?? decision.createdAt, body: `判断: ${decision.title}${decision.outcome ? `／結果: ${decision.outcome}` : ''}${positivelyReviewed ? `／振り返り: 効果あり${latest?.note ? `（${latest.note}）` : ''}` : ''}` },
      ],
      body: `【判断】\n${decision.title}\n\n【理由】\n${decision.reason || '振り返って記入する'}\n\n【結果】\n${decision.outcome || latest?.note || '効果ありと評価'}\n\n【次回の手順】\n再現できる条件と対応を確認して記入する。`,
    });
  }
  return candidates.filter(candidate => !data.manual.some(item =>
    item.source === candidate.source || item.title === candidate.title,
  )).sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
}

export function buildInsights(data: Logbook, now = new Date()) {
  const from = new Date(now.getTime() - 7 * DAY);
  const previousFrom = from.getTime() - 7 * DAY;
  const earliestWeek = weekStarts(now)[0].getTime();
  const relevant = data.notes.filter(note => {
    const date = Date.parse(note.createdAt);
    return date >= earliestWeek && date <= now.getTime();
  });
  const clusters = clusterNotes(relevant);
  const recentNotes = data.notes.filter(note => {
    const date = Date.parse(note.createdAt);
    return date >= from.getTime() && date <= now.getTime();
  });
  const decisions = data.decisions.filter(item => {
    const date = Date.parse(item.createdAt);
    return date >= from.getTime() && date <= now.getTime();
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const relevantClusters = clusters.map(cluster => {
    const recent = cluster.members.filter(item => Date.parse(item.createdAt) >= from.getTime());
    const previous = cluster.members.filter(item => {
      const date = Date.parse(item.createdAt);
      return date >= previousFrom && date < from.getTime();
    });
    return { cluster, recent, previous };
  }).filter(({ recent }) => recent.length);
  const manualCandidates = makeManualCandidates(clusterNotes(data.notes), data);
  // There is no explicit resolved state on notes; avoid silently dropping
  // issues based on later positive-sounding phrases.
  const unresolved = recentNotes.filter(isIssue)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);
  const improvingChanges: WeeklyChange[] = relevantClusters.flatMap(({ cluster, recent, previous }) => {
    const before = previous.filter(isIssue);
    const after = recent.filter(isIssue);
    const positive = recent.filter(isImprovement);
    if (!before.length || after.length >= before.length || !positive.length) return [];
    return [{
      id: cluster.members[0].id, label: clusterLabel(cluster),
      previousCount: before.length, currentCount: after.length,
      examples: positive.slice(0, 3), previousExamples: before.slice(0, 3),
      description: '関連する困りごとの記録は減り、改善に触れた記録があります。実際の改善は元の記録で確認してください。',
    }];
  }).sort((a, b) => b.previousCount - b.currentCount - (a.previousCount - a.currentCount)).slice(0, 3);
  const worseningChanges: WeeklyChange[] = relevantClusters.flatMap(({ cluster, recent, previous }) => {
    const before = previous.filter(isIssue);
    const after = recent.filter(isIssue);
    const explicit = after.some(note => WORSENING.test(note.body));
    if (!after.length || (!explicit && (after.length < 2 || after.length <= before.length))) return [];
    return [{
      id: cluster.members[0].id, label: clusterLabel(cluster),
      previousCount: before.length, currentCount: after.length,
      examples: [...after].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3),
      previousExamples: before.slice(0, 3),
      description: after.length > before.length
        ? '関連する困りごとの記録が前の7日間より増えています。記録頻度の変化かもしれません。'
        : '悪化に触れた記録があります。件数だけでは状態を判断できません。',
    }];
  }).sort((a, b) => b.currentCount - a.currentCount).slice(0, 3);
  // Compare equal 7-day windows: the seven days before an older decision
  // and the current review window. These are references, not a causal test.
  const decisionFollowups: DecisionFollowup[] = data.decisions.filter(decision => {
    const date = Date.parse(decision.createdAt);
    return date < from.getTime() && date <= now.getTime();
  }).flatMap(decision => {
    const query = `${decision.title} ${decision.reason}`.trim();
    if (!query) return [];
    const decidedAt = Date.parse(decision.createdAt);
    const before = data.notes.filter(note => {
      const date = Date.parse(note.createdAt);
      return date >= decidedAt - 7 * DAY && date < decidedAt && relatedness(query, note.body) >= 0.3;
    });
    const after = recentNotes.filter(note =>
      Date.parse(note.createdAt) > decidedAt && relatedness(query, note.body) >= 0.3);
    if (!after.length) return [];
    return [{
      decision, before: before.length, after: after.length, comparisonDays: 7,
      beforeExamples: [...before].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3),
      afterExamples: [...after].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3),
      description: after.length > before.length ? '関連する記録が増えた可能性'
        : after.length < before.length ? '関連する記録が減った可能性' : '関連する記録は同数',
    }];
  }).sort((a, b) => b.after - a.after).slice(0, 3);
  const directionSignals = data.directions.flatMap(direction => directionMatches(direction, data, now)
    .filter(match => Date.parse(match.date) >= from.getTime())
    .filter(match => match.prompt === 'contrast' ||
      relatedness(`${direction.title} ${direction.detail}`, match.text) >= 0.45)
    .map(match => ({ direction, match }))).slice(0, 3);
  const weeklyManualCandidates = manualCandidates.filter(candidate => {
    if (Date.parse(candidate.lastSeenAt) < from.getTime()) return false;
    if (!candidate.source.startsWith('判断: ')) return true;
    const decision = data.decisions.find(item => `判断: ${item.id}` === candidate.source);
    return decision?.reviewHistory?.at(-1)?.effect === 'positive';
  }).slice(0, 5);
  const frequentThemes = relevantClusters.map(({ cluster, recent, previous }) =>
    weeklyTheme(cluster, recent, previous)).sort((a, b) => b.count - a.count).slice(0, 3);
  const recurringProblems = relevantClusters.map(({ cluster, recent, previous }) => {
    const problems = recent.filter(isIssue);
    return problems.length >= 2 ? weeklyTheme(cluster, problems, previous.filter(isIssue)) : null;
  }).filter((value): value is WeeklyThemeInsight => value !== null).sort((a, b) => b.count - a.count).slice(0, 5);
  const highlights: WeeklyReviewSummary['highlights'] = [];
  if (worseningChanges[0]) highlights.push({
    text: worseningChanges[0].currentCount > worseningChanges[0].previousCount
      ? `${worseningChanges[0].label}の困りごとの記録が増えた可能性（${worseningChanges[0].previousCount}→${worseningChanges[0].currentCount}件）`
      : `${worseningChanges[0].label}について悪化に触れた記録があります（件数は${worseningChanges[0].previousCount}→${worseningChanges[0].currentCount}件）`,
    href: '/weekly-review#wr-worsening',
  });
  if (improvingChanges[0]) highlights.push({
    text: `${improvingChanges[0].label}に改善の兆しが記録されています`,
    href: '/weekly-review#wr-positive',
  });
  if (recurringProblems[0] && highlights.length < 3) highlights.push({
    text: `${recurringProblems[0].label}の困りごとが${recurringProblems[0].count}件、繰り返し記録されました`,
    href: '/weekly-review#wr-problems',
  });
  if (directionSignals[0] && highlights.length < 3) highlights.push({
    text: `${directionSignals[0].direction.title}と最近の記録を照らし合わせられます`,
    href: '/weekly-review#wr-direction',
  });
  if (decisionFollowups[0] && highlights.length < 3) highlights.push({
    text: `${decisionFollowups[0].decision.title}の後の関連記録を見返せます`,
    href: '/weekly-review#wr-followups',
  });
  if (frequentThemes[0] && highlights.length < 3 &&
    !highlights.some(item => item.text.includes(frequentThemes[0].label))) highlights.push({
    text: `${frequentThemes[0].label}に関する記録が${frequentThemes[0].count}件ありました`,
    href: '/weekly-review#wr-themes',
  });
  const successNotes = recentNotes.filter(isSuccess).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  if (successNotes[0] && highlights.length < 3) highlights.push({
    text: '良かった出来事が記録されています',
    href: '/weekly-review#wr-success',
  });
  if (decisions[0] && highlights.length < 3) highlights.push({
    text: `${decisions[0].title}という判断を記録しました`,
    href: '/weekly-review#wr-decisions',
  });
  if (recentNotes.length && !highlights.length) highlights.push({
    text: '記録した気づきを振り返れます',
    href: '/weekly-review#wr-themes',
  });
  const weekly: WeeklyReviewSummary = {
    from: from.toISOString(), through: now.toISOString(),
    entryCount: recentNotes.length + decisions.length,
    noteCount: recentNotes.length, decisionCount: decisions.length,
    frequentThemes, recurringProblems,
    positiveChanges: recentNotes.filter(isImprovement).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
    improvingChanges, worseningChanges,
    decisions, decisionFollowups, directionSignals, unresolved,
    successNotes,
    manualCandidates: weeklyManualCandidates,
    highlights: highlights.slice(0, 3),
  };
  return { weekly, patterns: buildPatterns(clusters, now), manualCandidates };
}

export function decisionContext(decision: Decision, notes: Note[], now = new Date()): DecisionContext {
  const decidedAt = Date.parse(decision.createdAt);
  const comparisonDays = Math.max(1, Math.min(14, Math.ceil((now.getTime() - decidedAt) / DAY)));
  const elapsed = comparisonDays * DAY;
  const query = `${decision.title} ${decision.reason}`.trim();
  const matched = notes.filter(note => relatedness(query, note.body) >= 0.3);
  return {
    dueAt: new Date(decidedAt + 7 * DAY).toISOString(),
    due: now.getTime() >= decidedAt + 7 * DAY,
    before: matched.filter(note => Date.parse(note.createdAt) >= decidedAt - elapsed && Date.parse(note.createdAt) < decidedAt).length,
    after: matched.filter(note => Date.parse(note.createdAt) > decidedAt && Date.parse(note.createdAt) <= Math.min(now.getTime(), decidedAt + elapsed)).length,
    comparisonDays,
    relatedAfter: matched.filter(note => Date.parse(note.createdAt) > decidedAt && Date.parse(note.createdAt) <= Math.min(now.getTime(), decidedAt + 28 * DAY))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3),
  };
}

export function directionMatches(direction: Direction, data: Logbook, now = new Date()): DirectionMatch[] {
  const from = now.getTime() - 21 * DAY;
  const base = `${direction.title} ${direction.detail}`;
  const sources = [
    ...data.notes.map(note => ({ id: note.id, date: note.createdAt, text: note.body, kind: 'note' as const })),
    ...data.decisions.map(decision => ({ id: decision.id, date: decision.createdAt, text: `${decision.title} ${decision.reason}`, kind: 'decision' as const })),
  ].filter(item => Date.parse(item.date) >= from && Date.parse(item.date) <= now.getTime());
  return sources.map(item => {
    const score = relatedness(base, item.text);
    const sameTopic = TOPICS.some(topic =>
      topic.words.some(word => base.toLocaleLowerCase().includes(word)) &&
      topic.words.some(word => item.text.toLocaleLowerCase().includes(word)),
    );
    const contrast = sameTopic && OPPOSITES.some(([a, b]) =>
      (base.includes(a) && item.text.includes(b)) || (base.includes(b) && item.text.includes(a)),
    );
    return { ...item, score, prompt: contrast ? 'contrast' as const : 'related' as const };
  }).filter(item => item.score >= 0.3 || item.prompt === 'contrast')
    .sort((a, b) => (b.prompt === 'contrast' ? 1 : 0) - (a.prompt === 'contrast' ? 1 : 0) || b.score - a.score)
    .slice(0, 3).map(({ score: _score, ...item }) => item);
}