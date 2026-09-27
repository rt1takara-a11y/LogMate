import { Link } from 'wouter';
import type { PatternInsight } from '../lib/insights';
import './insights.css';

export default function PatternsDashboard({ patterns, noteCount }: { patterns: PatternInsight[]; noteCount: number }) {
  return <div className="insights-page" data-testid="patterns-dashboard">
    <div className="section-intro">
      <div><div className="eyebrow">03 / LOGMATE JOURNAL</div><h1 className="page-title">変化の手がかり</h1>
        <p className="page-subtitle">近い表現のメモを端末内でまとめ、週ごとの変化を見渡します。</p></div>
    </div>
    <div className="insights-explainer">文章の分かち書き・言い換え語・文字の似かたを組み合わせた、端末内の近似分析です。意味を完全に理解するAIではありません。異なる話題がまとまったり、近い話題が分かれたりする場合があります。各グループの元の記録をご確認ください。</div>
    {patterns.length ? <div className="insight-theme-list">
      {patterns.map((theme, index) => <article className="paper insight-theme" key={theme.id} data-testid={`pattern-theme-${theme.id}`}>
        <div className="insight-theme-heading">
          <div><span className="section-kicker">THEME {String(index + 1).padStart(2, '0')}</span><h2>{theme.label}</h2><span className="insight-meta">{theme.count} 件の近いメモ{theme.problemCount ? ` · 困りごとの表現 ${theme.problemCount} 件` : ''}</span></div>
          <span className={`insight-trend ${theme.trendTone}`} data-testid={`trend-${theme.id}`}>{theme.trendLabel}</span>
        </div>
        <div className="insight-weeks" role="img" aria-label={`${theme.label}の週ごとの記録件数: ${theme.weekLabels.map((week, i) => `${week} ${theme.weeklyCounts[i]}件`).join('、')}`}>
          {theme.weeklyCounts.map((count, i) => <div className="insight-week" key={theme.weekLabels[i]}>
            <strong>{count || ''}</strong><div className="insight-track"><span style={{ height: count ? `${Math.max(12, count / Math.max(1, ...theme.weeklyCounts) * 100)}%` : '0%' }} /></div>
            <small>{theme.weekLabels[i]}</small>
          </div>)}
        </div>
        <details className="insight-evidence"><summary data-testid={`toggle-pattern-evidence-${theme.id}`}>元になった記録を見る</summary>
          {theme.examples.map(note => <p key={note.id} data-testid={`pattern-example-${note.id}`}><time>{new Date(note.createdAt).toLocaleDateString('ja-JP')}</time>{note.body}</p>)}
        </details>
      </article>)}
    </div> : <div className="paper insight-empty" data-testid="state-empty-patterns">
      <h2>{noteCount ? 'まだ近い記録のまとまりはありません' : '傾向は、記録から生まれます'}</h2>
      <p>似た話題のメモが複数あると、週ごとの増減がここに現れます。架空の分析は表示しません。</p>
      <Link href="/" className="btn btn-primary" data-testid="link-patterns-today">メモを書く</Link>
    </div>}
    <p className="insight-footnote">直近8週間のメモを、月曜日から始まる週ごとに集計。今週は進行中のため、前週より少なく見える場合があります。原文は外部へ送信しません。</p>
  </div>;
}