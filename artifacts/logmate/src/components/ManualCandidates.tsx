import type { ManualCandidate } from '../lib/insights';
import './insights.css';

export default function ManualCandidates({ candidates, onAdopt }: { candidates: ManualCandidate[]; onAdopt: (candidate: ManualCandidate) => void }) {
  return <div className="manual-candidates" data-testid="manual-candidates">
    {candidates.length ? candidates.map(candidate => <article className="candidate" key={candidate.id} data-testid={`manual-candidate-${candidate.id}`}>
      <div>
        <h3>{candidate.title}</h3>
        <p>{candidate.reason} · 元になった記録 {candidate.sourceCount} 件</p>
        <span className="tag">{candidate.source}</span>
        <details className="insight-evidence"><summary data-testid={`toggle-manual-evidence-${candidate.id}`}>代表的な事例と草案を確認</summary>
          {candidate.examples.map(example => <p key={example.id}><time>{new Date(example.date).toLocaleDateString('ja-JP')}</time>{example.body}</p>)}
          <p className="manual-draft"><strong>草案</strong><br />{candidate.body}</p>
        </details>
      </div>
      <button className="btn btn-soft" data-testid={`button-adopt-candidate-${candidate.id}`} onClick={() => onAdopt(candidate)}>編集して採用</button>
    </article>) : <p className="muted-message">今は候補がありません。繰り返す課題、良かった変化、効果ありと評価された判断が増えると表示されます。</p>}
    <p className="insight-footnote">候補は端末内の記録から機械的に作成しています。採用前に内容を必ず確認してください。Noah's Nalogへの自動送信は行いません。</p>
  </div>;
}