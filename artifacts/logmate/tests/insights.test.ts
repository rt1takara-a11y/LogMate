import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildInsights, decisionContext, directionMatches, relatedness } from '../src/lib/insights.ts';
import type { Decision, Logbook, Note } from '../src/lib/logbook.ts';

const now = new Date('2026-09-27T12:00:00.000Z');
const note = (id: string, body: string, createdAt: string, category = ''): Note =>
  ({ id, body, category, createdAt, updatedAt: createdAt });
const empty = (): Logbook => ({ notes: [], decisions: [], directions: [], manual: [] });

test('local similarity connects related Japanese wording without conflating unrelated entries', () => {
  assert.ok(relatedness('在庫が足りない', '商品が品切れした') > 0.3);
  assert.ok(relatedness('スタッフの引き継ぎで困った', '従業員への申し送りが難しい') > 0.3);
  assert.ok(relatedness('在庫が足りない', 'スタッフの引き継ぎで困った') < 0.3);
  assert.ok(relatedness('接客でお客様からクレームがあった', '接客で待ち時間が長くなった') < 0.3);
});

test('rolling weekly review aggregates local evidence and excludes old records', () => {
  const data = empty();
  data.notes = [
    note('n1', '在庫が足りず品切れで困った', '2026-09-24T08:00:00.000Z', '失敗'),
    note('n2', '商品が欠品してお客様に迷惑をかけた', '2026-09-25T08:00:00.000Z', '失敗'),
    note('n3', 'スタッフの引き継ぎが改善できた', '2026-09-26T08:00:00.000Z', 'スタッフ'),
    note('old', '先月のメモ', '2026-08-01T08:00:00.000Z'),
  ];
  data.decisions = [{
    id: 'd1', title: '在庫の確認を増やす', reason: '品切れを減らしたい',
    outcome: '', createdAt: '2026-09-26T09:00:00.000Z', updatedAt: '2026-09-26T09:00:00.000Z',
  }];
  const { weekly } = buildInsights(data, now);
  assert.equal(weekly.noteCount, 3);
  assert.equal(weekly.decisionCount, 1);
  assert.equal(weekly.entryCount, 4);
  assert.equal(weekly.positiveChanges[0].id, 'n3');
  assert.equal(weekly.decisions[0].id, 'd1');
  assert.ok(weekly.recurringProblems.some(theme => theme.count === 2));
  assert.ok(weekly.unresolved.some(item => item.id === 'n1'));
  assert.ok(weekly.manualCandidates.some(candidate => candidate.sourceCount >= 2 && candidate.examples.length));
  assert.ok(!weekly.frequentThemes.some(theme => theme.examples.some(example => example.id === 'old')));
});

test('three consecutive week-over-week increases are labelled from real counts', () => {
  const data = empty();
  const weeks = [
    ['2026-08-31T08:00:00.000Z', 1],
    ['2026-09-07T08:00:00.000Z', 2],
    ['2026-09-14T08:00:00.000Z', 3],
    ['2026-09-21T08:00:00.000Z', 4],
  ] as const;
  data.notes = weeks.flatMap(([date, count]) =>
    Array.from({ length: count }, (_, i) => note(`${date}-${i}`, '商品の在庫が足りない問題', date, '失敗')));
  const { patterns } = buildInsights(data, now);
  assert.equal(patterns[0].trendLabel, '3週間連続で増加');
  assert.deepEqual(patterns[0].weeklyCounts.slice(-4), [1, 2, 3, 4]);
});

test('old decisions still work; positive review history makes a manual candidate', () => {
  const data = empty();
  const decision: Decision = {
    id: 'old-decision', title: '接客を丁寧にする', reason: 'お客様の対応を改善したい',
    outcome: '好評だった', createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z',
    reviewHistory: [{ id: 'review1', effect: 'positive', note: '効果を確認', reviewedAt: '2026-09-26T08:00:00.000Z' }],
  };
  data.decisions = [
    decision,
    { ...decision, id: 'legacy', reviewHistory: undefined },
    { ...decision, id: 'reversed', reviewHistory: [
      ...decision.reviewHistory!,
      { id: 'review2', effect: 'negative', note: '後に効果がなかった', reviewedAt: '2026-09-27T08:00:00.000Z' },
    ] },
  ];
  const result = buildInsights(data, now);
  assert.ok(result.weekly.manualCandidates.some(candidate => candidate.source === '判断: old-decision'));
  assert.ok(result.manualCandidates.some(candidate => candidate.source === '判断: legacy'));
  assert.ok(!result.manualCandidates.some(candidate => candidate.source === '判断: reversed'));
  assert.match(result.manualCandidates.find(candidate => candidate.source === '判断: old-decision')!.examples[0].body, /振り返り: 効果あり/);
  assert.equal(decisionContext(data.decisions[1], data.notes, now).after, 0);
});

test('old repeated issues remain manual candidates without polluting this week', () => {
  const data = empty();
  data.notes = [
    note('old1', '在庫が足りず品切れになった', '2026-01-04T08:00:00.000Z'),
    note('old2', '商品が欠品して在庫が足りない', '2026-01-05T08:00:00.000Z'),
  ];
  const result = buildInsights(data, now);
  assert.equal(result.weekly.entryCount, 0);
  assert.ok(result.manualCandidates.some(candidate => candidate.sourceCount === 2));
});

test('negated improvements do not erase issues or count as progress', () => {
  const data = empty();
  data.notes = [
    note('issue', '在庫不足で困った', '2026-09-25T08:00:00.000Z'),
    note('failed', '在庫の問題を改善できなかった', '2026-09-26T08:00:00.000Z'),
    note('complaint', '接客でお客様からクレームがあった', '2026-09-26T09:00:00.000Z'),
    note('waiting', '接客で待ち時間が長くなった', '2026-09-26T10:00:00.000Z'),
  ];
  const { weekly } = buildInsights(data, now);
  assert.ok(weekly.unresolved.some(item => item.id === 'issue'));
  assert.ok(weekly.unresolved.some(item => item.id === 'failed'));
  assert.ok(!weekly.positiveChanges.some(item => item.id === 'failed'));
  assert.ok(!weekly.recurringProblems.some(theme => theme.examples.some(item => item.id === 'complaint')));
});

test('direction prompts comparisons rather than declaring a judgment', () => {
  const data = empty();
  data.notes = [note('n1', '接客をやめて対応を後回しにした', '2026-09-25T08:00:00.000Z')];
  data.directions = [{
    id: 'goal1', title: '接客を続けて丁寧に対応する', detail: 'お客様を大切にする',
    kind: 'goal', createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z',
  }];
  const matches = directionMatches(data.directions[0], data, now);
  assert.equal(matches[0]?.id, 'n1');
  assert.equal(matches[0]?.prompt, 'contrast');
});