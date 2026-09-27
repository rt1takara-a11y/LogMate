import type { Direction, Logbook } from '../lib/logbook';
import { directionMatches } from '../lib/insights';
import './insights.css';

export default function DirectionInsights({ direction, data }: { direction: Direction; data: Logbook }) {
  const matches = directionMatches(direction, data);
  return <div className="direction-insights" data-testid={`direction-insights-${direction.id}`}>
    <span className="section-kicker">DIRECTION & DAILY LOG</span>
    <h4>方針と、最近の行動を見比べる</h4>
    {matches.length ? <>
      <p>近い言葉や対照的な表現がある記録です。一致や矛盾を断定するものではありません。</p>
      {matches.map(item => <div className="direction-match" key={`${item.kind}-${item.id}`} data-testid={`direction-match-${direction.id}-${item.id}`}>
        <span>{item.prompt === 'contrast' ? '異なる表現のヒント' : '近い話題'} · {item.kind === 'note' ? 'メモ' : '判断'} · {new Date(item.date).toLocaleDateString('ja-JP')}</span>
        <p>{item.text}</p>
        <strong>この2つを一度見比べてみませんか。</strong>
      </div>)}
    </> : <p>直近21日間に関連しそうな記録はまだ見つかっていません。方針と日々の行動を、ご自身の目で見返してください。</p>}
  </div>;
}