import { useState, type FormEvent } from 'react';
import type { Decision, DecisionReview, Note } from '../lib/logbook';
import { decisionContext } from '../lib/insights';
import './insights.css';

const labels: Record<DecisionReview['effect'], string> = { positive: '効果あり', unknown: 'わからない', negative: '効果なし' };

export default function DecisionReviewPanel({ decision, notes, busy, onReview }: {
  decision: Decision;
  notes: Note[];
  busy: boolean;
  onReview: (effect: DecisionReview['effect'], note: string) => Promise<boolean>;
}) {
  const [effect, setEffect] = useState<DecisionReview['effect']>('unknown');
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const context = decisionContext(decision, notes);
  const history = [...(decision.reviewHistory ?? [])].reverse();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      if (await onReview(effect, comment)) { setEffect('unknown'); setComment(''); }
    } finally { setPending(false); }
  };
  return <section className="decision-review" aria-label={`${decision.title}の振り返り`} data-testid={`decision-review-${decision.id}`}>
    <div className="decision-review-head"><div><span className="section-kicker">FOLLOW UP</span><h4>判断のその後を見返す</h4></div>
      <span className={context.due && !history.length ? 'review-due' : 'review-muted'}>
        {context.due && !history.length ? '振り返りの目安が来ています' : `目安: ${new Date(context.dueAt).toLocaleDateString('ja-JP')}`}
      </span>
    </div>
    <p>判断の前後、それぞれ{context.comparisonDays}日間に近い表現のメモ: <strong data-testid={`decision-change-${decision.id}`}>{context.before} 件 → {context.after} 件</strong></p>
    <p className="review-muted">件数だけで効果は決められません。関連しそうな記録を読んで、ご自身で評価してください。</p>
    {context.relatedAfter.length ? <details className="insight-evidence"><summary data-testid={`toggle-decision-logs-${decision.id}`}>判断後の関連メモを確認</summary>
      {context.relatedAfter.map(note => <p key={note.id}><time>{new Date(note.createdAt).toLocaleDateString('ja-JP')}</time>{note.body}</p>)}
    </details> : <p className="review-muted">判断後の関連メモはまだ見つかっていません。</p>}
    <form onSubmit={submit} className="decision-review-form">
      <label htmlFor={`review-effect-${decision.id}`}>今回の評価</label>
      <select id={`review-effect-${decision.id}`} data-testid={`select-review-effect-${decision.id}`} value={effect} onChange={event => setEffect(event.target.value as DecisionReview['effect'])}>
        <option value="unknown">わからない</option><option value="positive">効果あり</option><option value="negative">効果なし</option>
      </select>
      <label htmlFor={`review-note-${decision.id}`}>判断した理由・その後の様子（任意）</label>
      <textarea id={`review-note-${decision.id}`} data-testid={`input-review-note-${decision.id}`} value={comment} onChange={event => setComment(event.target.value)} placeholder="後から見返せるように一言残す" />
      <button type="submit" className="btn btn-soft" data-testid={`button-save-review-${decision.id}`} disabled={busy || pending}>{pending ? '保存中…' : '振り返りを記録'}</button>
    </form>
    {history.length > 0 && <div className="decision-history"><h4>振り返りの履歴</h4>
      {history.map(review => <div key={review.id} className="decision-history-item" data-testid={`decision-review-history-${review.id}`}>
        <time>{new Date(review.reviewedAt).toLocaleDateString('ja-JP')}</time>
        <strong>{labels[review.effect]}</strong>{review.note && <p>{review.note}</p>}
      </div>)}
    </div>}
  </section>;
}