import type { Decision, Direction, Logbook, Note } from './logbook';

export type ThemeInsight = {
  id: string;
  label: string;
  count: number;
  examples: Note[];
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
  frequentThemes: ThemeInsight[];
  recurringProblems: ThemeInsight[];
  positiveChanges: Note[];
  decisions: Decision[];
  unresolved: Note[];
  manualCandidates: ManualCandidate[];
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
    const successes = cluster.members.filter(isPositive);
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
    return { cluster, recent };
  }).filter(({ recent }) => recent.length);
  const manualCandidates = makeManualCandidates(clusterNotes(data.notes), data);
  // There is no explicit resolved state on notes; avoid silently dropping
  // issues based on later positive-sounding phrases.
  const unresolved = recentNotes.filter(isIssue)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);
  const weekly: WeeklyReviewSummary = {
    from: from.toISOString(), through: now.toISOString(),
    entryCount: recentNotes.length + decisions.length,
    noteCount: recentNotes.length, decisionCount: decisions.length,
    frequentThemes: relevantClusters.map(({ cluster, recent }) => theme(cluster, recent)).sort((a, b) => b.count - a.count).slice(0, 5),
    recurringProblems: relevantClusters.map(({ cluster, recent }) => {
      const problems = recent.filter(isIssue);
      return problems.length >= 2 ? theme(cluster, problems) : null;
    }).filter((value): value is ThemeInsight => value !== null).sort((a, b) => b.count - a.count).slice(0, 5),
    positiveChanges: recentNotes.filter(isPositive).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
    decisions, unresolved,
    manualCandidates: manualCandidates.filter(candidate => Date.parse(candidate.lastSeenAt) >= from.getTime()).slice(0, 5),
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