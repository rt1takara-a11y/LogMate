import type { ReactElement } from 'react';
import { ArrowUpRight, BookOpen, ChevronRight, FileText, HardDrive, NotebookPen } from 'lucide-react';
import { Link } from 'wouter';
import type { ManualCandidate, ThemeInsight, WeeklyReviewSummary } from '../lib/insights';
import './weekly-review.css';

type EvidenceItem = { id: string; body: string; date?: string; createdAt?: string };

function dateText(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date);
}

function Evidence({ examples, testId, label = '根拠となる記録を見る' }: { examples: EvidenceItem[]; testId: string; label?: string }) {
  if (!examples.length) return <p className="wr-evidence-preview">引用できる記録はありません。</p>;
  return <div className="wr-evidence">
    <details>
      <summary data-testid={`toggle-evidence-${testId}`}>{label}<ChevronRight aria-hidden="true" /></summary>
      <ul className="wr-evidence-list">
        {examples.map(example => <li key={example.id} data-testid={`evidence-${testId}-${example.id}`}>
          <time dateTime={example.date ?? example.createdAt}>{dateText(example.date ?? example.createdAt ?? '')}</time>
          <p>{example.body}</p>
        </li>)}
      </ul>
    </details>
  </div>;
}

function Empty({ title, description, href, linkText, testId }: {
  title: string;
  description: string;
  href?: string;
  linkText?: string;
  testId: string;
}) {
  return <div className="wr-empty" data-testid={`state-empty-${testId}`}>
    <strong>{title}</strong>
    <p>{description}</p>
    {href && linkText && <Link href={href} data-testid={`link-${testId}`}>{linkText}<ArrowUpRight aria-hidden="true" /></Link>}
  </div>;
}

function SectionHeading({ kicker, title, count, id }: { kicker: string; title: string; count: number; id: string }) {
  return <div className="wr-section-heading">
    <div><span className="wr-kicker">{kicker}</span><h2 id={id}>{title}</h2></div>
    <span data-testid={`count-${id}`}>{count} 件</span>
  </div>;
}

function ThemeRows({ items, prefix }: { items: ThemeInsight[]; prefix: string }) {
  return <div className="wr-theme-list">
    {items.map((item, index) => <article className="wr-theme-row" key={item.id} data-testid={`theme-${prefix}-${item.id}`}>
      <span className="wr-theme-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <h3 className="wr-theme-title">{item.label}<span className="wr-theme-count" data-testid={`count-${prefix}-${item.id}`}>{item.count} 件</span></h3>
      <div className="wr-evidence">
        {item.examples.length > 0 && <p className="wr-evidence-preview" data-testid={`example-${prefix}-${item.id}`}>{item.examples[0].body}</p>}
        <Evidence examples={item.examples} testId={`${prefix}-${item.id}`} />
      </div>
    </article>)}
  </div>;
}

export default function WeeklyReview({ summary, onAdopt }: { summary: WeeklyReviewSummary; onAdopt: (candidate: ManualCandidate) => void }): ReactElement {
  const hasEntries = summary.entryCount > 0;

  return <div className="weekly-review" data-testid="weekly-review">
    <header className="wr-opening">
      <div>
        <span className="wr-kicker">WEEKLY REVIEW / THE OWNER'S FIELD NOTES</span>
        <h1>この7日間を、見渡す。</h1>
        <p>書き残したことを並べて、店の変化を自分の目で確かめる時間。</p>
      </div>
      <div className="wr-period" data-testid="text-review-period" aria-label={`集計期間 ${dateText(summary.from)}から${dateText(summary.through)}まで`}>
        <span>ROLLING 7 DAYS</span>
        <strong><time dateTime={summary.from}>{dateText(summary.from)}</time><br />— <time dateTime={summary.through}>{dateText(summary.through)}</time></strong>
      </div>
    </header>

    <div className="wr-overview" aria-label="7日間の記録数">
      <div className="wr-stat"><span>記録したこと</span><strong data-testid="count-weekly-entries">{summary.entryCount}</strong><small>件の記録</small></div>
      <div className="wr-stat"><span>日々のメモ</span><strong data-testid="count-weekly-notes">{summary.noteCount}</strong><small>件の気づき</small></div>
      <div className="wr-stat"><span>残した判断</span><strong data-testid="count-weekly-decisions">{summary.decisionCount}</strong><small>件の決定</small></div>
      <div className="wr-overview-note"><HardDrive aria-hidden="true" /><p><strong>あなたの記録から、端末内で。</strong>このページは保存された記録をもとに、この端末で整理しています。</p></div>
    </div>

    {!hasEntries && <Empty
      testId="weekly-overview"
      title="この7日間の記録は、まだありません。"
      description="書き始めた日から、ここに店の一週間が少しずつ見えてきます。記録がない間は、推測で内容を埋めません。"
      href="/"
      linkText="今日のメモを書く"
    />}

    <section className="wr-section" aria-labelledby="wr-themes">
      <SectionHeading kicker="01 / WHAT RETURNED" title="よく書いた話題" count={summary.frequentThemes.length} id="wr-themes" />
      <p className="wr-lead">この期間のメモに現れた話題。件数と元の言葉を一緒に見返せます。</p>
      {summary.frequentThemes.length
        ? <ThemeRows items={summary.frequentThemes} prefix="frequent" />
        : <Empty testId="frequent-themes" title="目立つ話題は、まだありません。" description="話題を拾えるメモが増えると、ここに件数と実際の記録が並びます。" />}
    </section>

    <div className="wr-columns">
      <section className="wr-section" aria-labelledby="wr-problems">
        <SectionHeading kicker="02 / STILL APPEARING" title="繰り返し現れた課題" count={summary.recurringProblems.length} id="wr-problems" />
        {summary.recurringProblems.length
          ? <div className="wr-sheet wr-sheet--tint">{summary.recurringProblems.map(problem => <article className="wr-sheet-item" key={problem.id} data-testid={`problem-${problem.id}`}>
            <h3>{problem.label} <span className="wr-theme-count" data-testid={`count-problem-${problem.id}`}>{problem.count} 件</span></h3>
            {problem.examples.length > 0 && <p className="wr-evidence-preview" data-testid={`example-problem-${problem.id}`}>{problem.examples[0].body}</p>}
            <Evidence examples={problem.examples} testId={`problem-${problem.id}`} />
          </article>)}</div>
          : <Empty testId="recurring-problems" title="繰り返す課題は見つかっていません。" description="同じ話題の困りごとが複数記録されると、ここで見返せます。見当たらないことは、問題がないという判定ではありません。" />}
      </section>
      <section className="wr-section" aria-labelledby="wr-positive">
        <SectionHeading kicker="03 / SMALL SHIFTS" title="よい変化のメモ" count={summary.positiveChanges.length} id="wr-positive" />
        {summary.positiveChanges.length
          ? <div className="wr-sheet">{summary.positiveChanges.map(note => <article className="wr-sheet-item" key={note.id} data-testid={`positive-note-${note.id}`}>
            <time dateTime={note.createdAt}>{dateText(note.createdAt)}</time>
            <p>{note.body}</p>
            {note.category && <span className="wr-label">{note.category}</span>}
          </article>)}</div>
          : <Empty testId="positive-changes" title="よい変化の記録は、まだありません。" description="改善や手応えを書き残したメモがあれば、ここに原文のまま並びます。" />}
      </section>
    </div>

    <div className="wr-columns">
      <section className="wr-section" aria-labelledby="wr-decisions">
        <SectionHeading kicker="04 / CHOICES MADE" title="今週、決めたこと" count={summary.decisions.length} id="wr-decisions" />
        {summary.decisions.length
          ? <div className="wr-sheet">{summary.decisions.map(decision => <article className="wr-sheet-item" key={decision.id} data-testid={`weekly-decision-${decision.id}`}>
            <time dateTime={decision.createdAt}>{dateText(decision.createdAt)}</time>
            <h3>{decision.title}</h3>
            {decision.reason && <p><span className="wr-label">理由</span><br />{decision.reason}</p>}
            <p><span className="wr-label">その後</span><br />{decision.outcome || '結果はまだ記録されていません。'}</p>
          </article>)}</div>
          : <Empty testId="weekly-decisions" title="この期間の判断は、まだありません。" description="理由と一緒に残した判断を、後から確かめるための欄です。" href="/decisions" linkText="判断の記録を見る" />}
      </section>
      <section className="wr-section" aria-labelledby="wr-unresolved">
        <SectionHeading kicker="05 / TO REVISIT" title="まだ気になること" count={summary.unresolved.length} id="wr-unresolved" />
        <p className="wr-section-explainer">困りごとに触れた記録です。解決済みかどうかは自動判定していません。</p>
        {summary.unresolved.length
          ? <div className="wr-sheet wr-sheet--tint">{summary.unresolved.map(note => <article className="wr-sheet-item wr-pending" key={note.id} data-testid={`unresolved-note-${note.id}`}>
            <time dateTime={note.createdAt}>{dateText(note.createdAt)}</time>
            <p>{note.body}</p>
            {note.category && <span className="wr-label">{note.category}</span>}
          </article>)}</div>
          : <Empty testId="unresolved" title="気になる記録は見つかっていません。" description="解決の有無を断定する欄ではありません。書き残した困りごとが見つかれば、ここに置いておきます。" />}
      </section>
    </div>

    <section className="wr-section wr-section--manual" aria-labelledby="wr-manual">
      <SectionHeading kicker="06 / KEEP FOR NEXT TIME" title="マニュアルに残す候補" count={summary.manualCandidates.length} id="wr-manual" />
      <p className="wr-lead">繰り返す記録や判断から、次に使えそうなものを並べました。採用する前に、ご自身の言葉に直してください。</p>
      {summary.manualCandidates.length
        ? <div className="wr-candidates">{summary.manualCandidates.map(candidate => <article className="wr-candidate" key={candidate.id} data-testid={`manual-candidate-${candidate.id}`}>
          <div>
            <div className="wr-candidate-meta"><span aria-hidden="true" />{candidate.source} · 根拠 <span className="wr-candidate-source-count" data-testid={`count-candidate-evidence-${candidate.id}`}>{candidate.sourceCount} 件</span></div>
            <h3>{candidate.title}</h3>
            <p>{candidate.body}</p>
            <p className="wr-candidate-reason" data-testid={`reason-candidate-${candidate.id}`}>{candidate.reason}</p>
            <Evidence examples={candidate.examples} testId={`candidate-${candidate.id}`} label="元の記録を確かめる" />
          </div>
          <button type="button" className="wr-adopt" data-testid={`button-adopt-candidate-${candidate.id}`} onClick={() => onAdopt(candidate)}>編集して採用 <BookOpen aria-hidden="true" /></button>
        </article>)}</div>
        : <Empty testId="manual-candidates" title="今は候補がありません。" description="繰り返し出てきた課題や、結果まで書いた判断が見つかると候補になります。自動でマニュアルには追加しません。" href="/manual" linkText="マニュアルを見る" />}
    </section>

    <footer className="wr-footer" data-testid="text-review-method">
      <FileText aria-hidden="true" />
      <p>この振り返りは、直近7日間の記録に対する端末内の簡易的な集計・語句の手がかりです。確かなAIの判断や診断ではありません。拾い漏れや読み違いもありえます。実際の店の様子と照らし合わせて、採用するかどうかはご自身で決めてください。<br /><Link href="/timeline" data-testid="link-review-timeline" className="text-link">すべての記録をたどる <NotebookPen aria-hidden="true" /></Link></p>
    </footer>
  </div>;
}