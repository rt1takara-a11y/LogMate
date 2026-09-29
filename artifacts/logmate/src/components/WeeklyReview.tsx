import type { ReactElement } from 'react';
import { ArrowUpRight, BookOpen, ChevronRight, FileText, HardDrive, NotebookPen } from 'lucide-react';
import { Link } from 'wouter';
import type { Note } from '../lib/logbook';
import type { DecisionFollowup, ManualCandidate, WeeklyChange, WeeklyReviewSummary, WeeklyThemeInsight } from '../lib/insights';
import './weekly-review.css';

type Source = { id: string; body: string; date: string; href: string; period?: string };

function dateText(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date);
}

const noteSource = (note: Note, period?: string): Source => ({
  id: note.id, body: note.body, date: note.createdAt, href: `/timeline#note-${note.id}`, period,
});

function SourceLink({ href, children, testId }: { href: string; children: React.ReactNode; testId?: string }) {
  return <Link href={href} className="wr-source-link" data-testid={testId}>{children}<ArrowUpRight aria-hidden="true" /></Link>;
}

function Evidence({ examples, testId, label = '元の記録を確かめる' }: { examples: Source[]; testId: string; label?: string }) {
  if (!examples.length) return <p className="wr-evidence-preview">この項目に紐づく記録はありません。</p>;
  return <div className="wr-evidence">
    <details>
      <summary data-testid={`toggle-evidence-${testId}`}>{label} <span>({examples.length})</span><ChevronRight aria-hidden="true" /></summary>
      <ul className="wr-evidence-list">
        {examples.map((example, index) => <li key={`${example.period ?? 'record'}-${example.id}-${index}`} data-testid={`evidence-${testId}-${example.id}`}>
          <div className="wr-evidence-meta">{example.period && <span>{example.period}</span>}<time dateTime={example.date}>{dateText(example.date)}</time></div>
          <p>{example.body}</p>
          <SourceLink href={example.href} testId={`link-evidence-${testId}-${example.id}`}>元の記録を開く</SourceLink>
        </li>)}
      </ul>
    </details>
  </div>;
}

function Empty({ title, description, href, linkText, testId }: {
  title: string; description: string; href?: string; linkText?: string; testId: string;
}) {
  return <div className="wr-empty" data-testid={`state-empty-${testId}`}>
    <strong>{title}</strong><p>{description}</p>
    {href && linkText && <Link href={href} data-testid={`link-${testId}`}>{linkText}<ArrowUpRight aria-hidden="true" /></Link>}
  </div>;
}

function SectionHeading({ kicker, title, count, id }: { kicker: string; title: string; count: number; id: string }) {
  return <div className="wr-section-heading">
    <div><span className="wr-kicker">{kicker}</span><h2 id={id}>{title}</h2></div>
    <span data-testid={`count-${id}`}>{count} 件</span>
  </div>;
}

function Comparison({ previous, current, delta, previousLabel = '前の7日間' }: { previous: number; current: number; delta?: number; previousLabel?: string }) {
  const difference = delta ?? current - previous;
  return <div className="wr-comparison" aria-label={`${previousLabel} ${previous} 件、直近7日間 ${current} 件`}>
    <span>{previousLabel} <strong>{previous} 件</strong></span>
    <span aria-hidden="true" className="wr-comparison-arrow">→</span>
    <span>直近7日間 <strong>{current} 件</strong></span>
    <span className="wr-delta">{difference === 0 ? '同数' : `${difference > 0 ? '+' : ''}${difference} 件`}</span>
  </div>;
}

function ThemeRows({ items, prefix }: { items: WeeklyThemeInsight[]; prefix: string }) {
  return <div className="wr-theme-list">
    {items.map((item, index) => <article className="wr-theme-row" key={item.id} data-testid={`theme-${prefix}-${item.id}`}>
      <span className="wr-theme-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <div>
        <h3 className="wr-theme-title">{item.label}<span className="wr-theme-count" data-testid={`count-${prefix}-${item.id}`}>{item.count} 件</span></h3>
        <Comparison previous={item.previousCount} current={item.count} delta={item.delta} />
      </div>
      <div className="wr-evidence">
        {item.examples[0] && <p className="wr-evidence-preview" data-testid={`example-${prefix}-${item.id}`}><SourceLink href={`/timeline#note-${item.examples[0].id}`}>{item.examples[0].body}</SourceLink></p>}
        <Evidence examples={[...item.examples.map(note => noteSource(note, '直近7日間')), ...item.previousExamples.map(note => noteSource(note, '前の7日間'))]} testId={`${prefix}-${item.id}`} />
      </div>
    </article>)}
  </div>;
}

function ChangeRows({ items, prefix }: { items: WeeklyChange[]; prefix: string }) {
  return <div className="wr-sheet wr-sheet--tint">{items.map(item => <article className="wr-sheet-item" key={item.id} data-testid={`${prefix}-change-${item.id}`}>
    <h3>{item.label}</h3>
    <Comparison previous={item.previousCount} current={item.currentCount} />
    <p>{item.description}</p>
    <Evidence examples={[...item.examples.map(note => noteSource(note, '直近7日間')), ...item.previousExamples.map(note => noteSource(note, '前の7日間'))]} testId={`${prefix}-change-${item.id}`} />
  </article>)}</div>;
}

function Followup({ item }: { item: DecisionFollowup }) {
  const decision = item.decision;
  return <article className="wr-followup" data-testid={`decision-followup-${decision.id}`}>
    <div className="wr-followup-head"><span className="wr-label">過去の判断 · {dateText(decision.createdAt)}</span><SourceLink href={`/decisions#decision-${decision.id}`} testId={`link-followup-decision-${decision.id}`}>{decision.title}</SourceLink></div>
    <Comparison previous={item.before} current={item.after} previousLabel={`判断前${item.comparisonDays}日間`} />
    <p className="wr-followup-window">判断直前の{item.comparisonDays}日間と、今回の直近7日間を比較しています。判断直後の期間とは限りません。</p>
    <p>{item.description}</p>
    <Evidence
      examples={[...item.beforeExamples.map(note => noteSource(note, '判断の前')), ...item.afterExamples.map(note => noteSource(note, '直近7日間'))]}
      testId={`followup-${decision.id}`}
      label="前後の関連メモを見る"
    />
  </article>;
}

export default function WeeklyReview({ summary, onAdopt }: { summary: WeeklyReviewSummary; onAdopt: (candidate: ManualCandidate) => void }): ReactElement {
  const hasEntries = summary.entryCount > 0;
  const improvementEvidenceIds = new Set(summary.improvingChanges.flatMap(item => item.examples.map(note => note.id)));
  const explicitImprovements = summary.positiveChanges.filter(note => !improvementEvidenceIds.has(note.id));

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

    <div className="wr-overview" aria-label="直近7日間の記録数">
      <div className="wr-stat"><span>直近7日間の記録</span><strong data-testid="count-weekly-entries">{summary.entryCount}</strong><small>件の記録</small><Link href="/timeline" className="wr-overview-link">元の記録をたどる <ArrowUpRight size={12} aria-hidden="true"/></Link></div>
      <div className="wr-stat"><span>日々のメモ</span><strong data-testid="count-weekly-notes">{summary.noteCount}</strong><small>件の気づき</small></div>
      <div className="wr-stat"><span>残した判断</span><strong data-testid="count-weekly-decisions">{summary.decisionCount}</strong><small>件の決定</small></div>
      <div className="wr-overview-note"><HardDrive aria-hidden="true" /><p><strong>あなたの記録から、端末内で。</strong>比較は前の7日間と直近7日間の記録数です。記録する頻度は、店の業績を示すものではありません。</p></div>
    </div>
    {!hasEntries && <Empty testId="weekly-overview" title="この7日間の記録は、まだありません。" description="記録がない間は、推測で内容を埋めません。小さな気づきから始められます。" href="/" linkText="今日のメモを書く" />}

    <section className="wr-section" aria-labelledby="wr-themes">
      <SectionHeading kicker="01 / WHAT RETURNED" title="よく書いた話題 · 上位3つ" count={Math.min(3, summary.frequentThemes.length)} id="wr-themes" />
      <p className="wr-lead">この期間のメモで頻繁に現れた話題です。件数の増減は、話題の出方の手がかりです。</p>
      {summary.frequentThemes.length ? <ThemeRows items={summary.frequentThemes.slice(0, 3)} prefix="frequent" /> : <Empty testId="frequent-themes" title="目立つ話題は、まだありません。" description="話題を拾えるメモが増えると、元の記録と一緒に並びます。" />}
    </section>

    <section className="wr-section" aria-labelledby="wr-problems">
      <SectionHeading kicker="02 / STILL APPEARING" title="繰り返し現れた課題" count={summary.recurringProblems.length} id="wr-problems" />
      {summary.recurringProblems.length ? <div className="wr-sheet wr-sheet--tint">{summary.recurringProblems.map(problem => <article className="wr-sheet-item" key={problem.id} data-testid={`problem-${problem.id}`}>
        <h3>{problem.label}<span className="wr-theme-count" data-testid={`count-problem-${problem.id}`}>{problem.count} 件</span></h3>
        <Comparison previous={problem.previousCount} current={problem.count} delta={problem.delta} />
        {problem.examples[0] && <p className="wr-evidence-preview" data-testid={`example-problem-${problem.id}`}><SourceLink href={`/timeline#note-${problem.examples[0].id}`}>{problem.examples[0].body}</SourceLink></p>}
        <Evidence examples={[...problem.examples.map(note => noteSource(note, '直近7日間')), ...problem.previousExamples.map(note => noteSource(note, '前の7日間'))]} testId={`problem-${problem.id}`} />
      </article>)}</div> : <Empty testId="recurring-problems" title="繰り返す課題は見つかっていません。" description="同じ困りごとが複数記録されると、ここで見返せます。見当たらないことは、問題がないという判定ではありません。" />}
    </section>

    <section className="wr-section" aria-labelledby="wr-positive">
      <SectionHeading kicker="03 / SIGNS OF IMPROVEMENT" title="改善しているかもしれない変化" count={summary.improvingChanges.length + explicitImprovements.length} id="wr-positive" />
      <p className="wr-lead">関連する記録が減った話題と、よい変化を明記したメモです。改善の原因や成果を断定しません。</p>
      {summary.improvingChanges.length > 0 && <ChangeRows items={summary.improvingChanges} prefix="improving" />}
      {explicitImprovements.length > 0 && <div className="wr-sheet wr-explicit-notes">{explicitImprovements.map(note => <article className="wr-sheet-item" key={note.id} data-testid={`positive-note-${note.id}`}>
        <span className="wr-label">メモに書かれた手応え</span><time dateTime={note.createdAt}>{dateText(note.createdAt)}</time>
        <p><SourceLink href={`/timeline#note-${note.id}`} testId={`link-positive-note-${note.id}`}>{note.body}</SourceLink></p>
        {note.category && <span className="wr-label">{note.category}</span>}
      </article>)}</div>}
      {!summary.improvingChanges.length && !explicitImprovements.length && <Empty testId="positive-changes" title="改善の手がかりは、まだありません。" description="比較できる記録や手応えを書いたメモが見つかれば、ここに元の言葉で並びます。" />}
    </section>

    <section className="wr-section" aria-labelledby="wr-worsening">
      <SectionHeading kicker="04 / WHAT NEEDS ATTENTION" title="悪化・増加の手がかり" count={summary.worseningChanges.length} id="wr-worsening" />
      <p className="wr-lead">関連する困りごとのメモが増えた話題、または悪化を明記したメモです。件数の増加と実際の悪化は別のこととして読み解いてください。</p>
      {summary.worseningChanges.length ? <ChangeRows items={summary.worseningChanges} prefix="worsening" /> : <Empty testId="worsening-changes" title="増加の手がかりは見つかっていません。" description="前の7日間と比べられる関連メモがあれば、この欄に表示します。" />}
    </section>

    <section className="wr-section" aria-labelledby="wr-decisions">
      <SectionHeading kicker="05 / CHOICES MADE" title="今週、決めたこと" count={summary.decisions.length} id="wr-decisions" />
      {summary.decisions.length ? <div className="wr-sheet">{summary.decisions.map(decision => <article className="wr-sheet-item" key={decision.id} data-testid={`weekly-decision-${decision.id}`}>
        <time dateTime={decision.createdAt}>{dateText(decision.createdAt)}</time>
        <h3><SourceLink href={`/decisions#decision-${decision.id}`} testId={`link-weekly-decision-${decision.id}`}>{decision.title}</SourceLink></h3>
        {decision.reason && <p><span className="wr-label">理由</span><br />{decision.reason}</p>}
        <p><span className="wr-label">その後</span><br />{decision.outcome || '結果はまだ記録されていません。'}</p>
      </article>)}</div> : <Empty testId="weekly-decisions" title="この期間の判断は、まだありません。" description="理由と一緒に残した判断を、後から確かめるための欄です。" href="/decisions" linkText="判断の記録を見る" />}
    </section>

    <section className="wr-section wr-followups-section" aria-labelledby="wr-followups">
      <SectionHeading kicker="06 / BEFORE & AFTER" title="過去の判断と、その前後の記録" count={summary.decisionFollowups.length} id="wr-followups" />
      <p className="wr-lead">判断に関連しそうなメモの前後比較。件数だけでは判断の効果や因果関係は分かりません。</p>
      {summary.decisionFollowups.length ? <div className="wr-followup-list">{summary.decisionFollowups.map(item => <Followup key={item.decision.id} item={item} />)}</div> : <Empty testId="decision-followups" title="前後を比べられる判断は、まだありません。" description="過去の判断に関係しそうなメモが記録されると、判断の前後に分けて確認できます。" />}
    </section>

    <section className="wr-section" aria-labelledby="wr-unresolved">
      <SectionHeading kicker="07 / TO REVISIT" title="まだ気になること" count={summary.unresolved.length} id="wr-unresolved" />
      <p className="wr-section-explainer">困りごとに触れた記録です。解決済みかどうかは自動判定していません。</p>
      {summary.unresolved.length ? <div className="wr-sheet wr-sheet--tint">{summary.unresolved.map(note => <article className="wr-sheet-item wr-pending" key={note.id} data-testid={`unresolved-note-${note.id}`}>
        <time dateTime={note.createdAt}>{dateText(note.createdAt)}</time><p><SourceLink href={`/timeline#note-${note.id}`} testId={`link-unresolved-note-${note.id}`}>{note.body}</SourceLink></p>
        {note.category && <span className="wr-label">{note.category}</span>}
      </article>)}</div> : <Empty testId="unresolved" title="気になる記録は見つかっていません。" description="解決の有無を断定する欄ではありません。困りごとが見つかれば、ここに置いておきます。" />}
    </section>

    <section className="wr-section" aria-labelledby="wr-success">
      <SectionHeading kicker="08 / WHAT WORKED" title="今週のうまくいったこと" count={summary.successNotes.length} id="wr-success" />
      {summary.successNotes.length ? <div className="wr-sheet">{summary.successNotes.map(note => <article className="wr-sheet-item" key={note.id} data-testid={`success-note-${note.id}`}>
        <time dateTime={note.createdAt}>{dateText(note.createdAt)}</time>
        <p><SourceLink href={`/timeline#note-${note.id}`} testId={`link-success-note-${note.id}`}>{note.body}</SourceLink></p>
        {note.category && <span className="wr-label">{note.category}</span>}
      </article>)}</div> : <Empty testId="success-notes" title="成功を記したメモは、まだありません。" description="うまくいったことを書き残したメモが見つかれば、元の言葉で並びます。" />}
    </section>

    <section className="wr-section wr-section--manual" aria-labelledby="wr-manual">
      <SectionHeading kicker="09 / KEEP FOR NEXT TIME" title="マニュアルに残す候補" count={summary.manualCandidates.length} id="wr-manual" />
      <p className="wr-lead">繰り返す記録や判断から、次に使えそうなものを並べました。採用する前に、ご自身の言葉に直してください。</p>
      {summary.manualCandidates.length ? <div className="wr-candidates">{summary.manualCandidates.map(candidate => {
        const fromDecision = candidate.source.startsWith('判断:');
        return <article className="wr-candidate" key={candidate.id} data-testid={`manual-candidate-${candidate.id}`}>
          <div>
            <div className="wr-candidate-meta"><span aria-hidden="true" />{candidate.source} · 根拠 <span className="wr-candidate-source-count" data-testid={`count-candidate-evidence-${candidate.id}`}>{candidate.sourceCount} 件</span></div>
            <h3>{candidate.title}</h3><p>{candidate.body}</p>
            <p className="wr-candidate-reason" data-testid={`reason-candidate-${candidate.id}`}>{candidate.reason}</p>
            <Evidence examples={candidate.examples.map(example => ({ id: example.id, date: example.date, body: example.body, href: fromDecision ? `/decisions#decision-${example.id}` : `/timeline#note-${example.id}` }))} testId={`candidate-${candidate.id}`} />
          </div>
          <button type="button" className="wr-adopt" data-testid={`button-adopt-candidate-${candidate.id}`} onClick={() => onAdopt(candidate)}>編集して採用 <BookOpen aria-hidden="true" /></button>
        </article>;
      })}</div> : <Empty testId="manual-candidates" title="今は候補がありません。" description="繰り返す課題や成功、効果ありと振り返った判断が見つかると候補になります。自動でマニュアルには追加しません。" href="/manual" linkText="マニュアルを見る" />}
    </section>

    <section className="wr-section" aria-labelledby="wr-direction">
      <SectionHeading kicker="10 / THE DIRECTION" title="方針と照らし合わせる" count={summary.directionSignals.length} id="wr-direction" />
      <p className="wr-lead">最近の記録と方針の言葉が重なる箇所です。一致やズレの確定ではなく、読み返すための手がかりです。</p>
      {summary.directionSignals.length ? <div className="wr-sheet">{summary.directionSignals.map(({ direction, match }, index) => <article className="wr-sheet-item wr-direction-item" key={`${direction.id}-${match.kind}-${match.id}-${index}`} data-testid={`direction-signal-${direction.id}-${match.id}`}>
        <span className="wr-label">{match.prompt === 'contrast' ? '違いがあるかもしれない' : '関連があるかもしれない'}</span>
        <h3><SourceLink href={`/direction#direction-${direction.id}`} testId={`link-direction-${direction.id}-${match.id}`}>{direction.title}</SourceLink></h3>
        <p className="wr-direction-match"><time dateTime={match.date}>{dateText(match.date)}</time> · {match.kind === 'decision' ? '判断' : 'メモ'}</p>
        <p><SourceLink href={match.kind === 'decision' ? `/decisions#decision-${match.id}` : `/timeline#note-${match.id}`} testId={`link-direction-match-${direction.id}-${match.id}`}>{match.text}</SourceLink></p>
      </article>)}</div> : <Empty testId="direction-signals" title="方針に関連する記録は見つかっていません。" description="方針と最近の記録を照らし合わせられるとき、ここに手がかりを並べます。" href="/direction" linkText="方針を見る" />}
    </section>

    <footer className="wr-footer" data-testid="text-review-method">
      <FileText aria-hidden="true" />
      <p>この振り返りは、端末内での簡易的な集計・語句の手がかりです。前の7日間と直近7日間は移動する期間です。記録の頻度は店の業績ではなく、増減や関連性も因果・効果の証明ではありません。拾い漏れや読み違いを、元の記録と照らし合わせてください。<br /><Link href="/timeline" data-testid="link-review-timeline" className="text-link">すべての記録をたどる <NotebookPen aria-hidden="true" /></Link></p>
    </footer>
  </div>;
}