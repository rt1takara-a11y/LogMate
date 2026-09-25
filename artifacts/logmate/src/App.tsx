import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { BookOpen, CalendarDays, ChartNoAxesColumn, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Download, FileText, HardDrive, Lightbulb, LockKeyhole, NotebookPen, PenLine, Plus, Search, Settings2, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { useLogbook, CATEGORIES, derivePatterns, deriveManualCandidates } from '@/lib/logbook';

type Data = ReturnType<typeof useLogbook>['data'];
type Note = Data['notes'][number];
type Decision = Data['decisions'][number];
type Direction = Data['directions'][number];
type Manual = Data['manual'][number];
type Kind = 'note' | 'decision' | 'direction' | 'manual';
type Draft = { body: string; category: string; title: string; reason: string; outcome: string; kind: 'value' | 'goal'; detail: string; source: string };
type Editor = { kind: Kind; id?: string; initial?: Partial<Draft> };
type Confirm = { message: string; action: () => Promise<void> };

const NAV = [
  { href: '/', label: '今日', en: 'Today', icon: NotebookPen },
  { href: '/timeline', label: 'タイムライン', en: 'Timeline', icon: CalendarDays },
  { href: '/patterns', label: 'パターン', en: 'Patterns', icon: ChartNoAxesColumn },
  { href: '/decisions', label: '判断', en: 'Decisions', icon: Compass },
  { href: '/direction', label: '方針', en: 'Direction', icon: Lightbulb },
  { href: '/manual', label: 'マニュアル', en: 'Manual', icon: BookOpen },
  { href: '/settings', label: '設定', en: 'Privacy', icon: Settings2 },
];
const dateText = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
const sorted = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

function Empty({ icon: Icon = FileText, title, description, action }: { icon?: typeof FileText; title: string; description: string; action?: ReactNode }) {
  return <div className="empty" data-testid="state-empty"><Icon /><h3>{title}</h3><p>{description}</p>{action && <div style={{ marginTop: 19 }}>{action}</div>}</div>;
}
function Heading({ index, title, subtitle, action }: { index: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="section-intro"><div><div className="eyebrow">{index} / LOGMATE JOURNAL</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>;
}
function NoteRows({ notes, onEdit, onDelete }: { notes: Note[]; onEdit: (n: Note) => void; onDelete: (n: Note) => void }) {
  return <div className="entry-list">{notes.map(note => <article className="entry" key={note.id} data-testid={`note-${note.id}`}>
    <time className="entry-date">{dateText(note.createdAt)}</time>
    <div className="entry-body-wrap"><p className="entry-body">{note.body}</p>{note.category && <span className="tag">{note.category}</span>}</div>
    <div className="entry-actions"><button className="icon-btn" aria-label="メモを編集" title="編集" data-testid={`button-edit-note-${note.id}`} onClick={() => onEdit(note)}><PenLine /></button><button className="icon-btn danger" aria-label="メモを削除" title="削除" data-testid={`button-delete-note-${note.id}`} onClick={() => onDelete(note)}><Trash2 /></button></div>
  </article>)}</div>;
}

function TimelineEvents({ notes, decisions, onEditNote, onDeleteNote, onEditDecision, onDeleteDecision }: {
  notes: Note[]; decisions: Decision[];
  onEditNote: (note: Note) => void; onDeleteNote: (note: Note) => void;
  onEditDecision: (decision: Decision) => void; onDeleteDecision: (decision: Decision) => void;
}) {
  const events = [
    ...notes.map(item => ({ type: 'note' as const, item })),
    ...decisions.map(item => ({ type: 'decision' as const, item })),
  ].sort((a, b) => Date.parse(b.item.createdAt) - Date.parse(a.item.createdAt));
  return <div className="entry-list">{events.map(event => event.type === 'note'
    ? <NoteRows key={event.item.id} notes={[event.item]} onEdit={onEditNote} onDelete={onDeleteNote}/>
    : <article className="entry" key={event.item.id}>
      <time className="entry-date">{dateText(event.item.createdAt)}</time>
      <div className="entry-body-wrap"><span className="tag">判断</span><p className="entry-body">{event.item.title}</p><p className="record-date">{event.item.reason}</p></div>
      <div className="entry-actions"><button className="icon-btn" aria-label="判断を編集" onClick={() => onEditDecision(event.item)}><PenLine/></button><button className="icon-btn danger" aria-label="判断を削除" onClick={() => onDeleteDecision(event.item)}><Trash2/></button></div>
    </article>)}</div>;
}

function DirectionReview({ notes, decisions }: { notes: Note[]; decisions: Decision[] }) {
  const recent = [
    ...notes.map(item => ({ id: item.id, date: item.createdAt, label: 'メモ', body: item.body })),
    ...decisions.map(item => ({ id: item.id, date: item.createdAt, label: '判断', body: item.title })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  return <div className="comparison"><h3>最近の行動と照らし合わせる</h3>
    <p>上に書いた方針と、直近の記録を並べて確かめてください。ズレの判定は自動で決めず、ご自身の判断に委ねています。</p>
    {recent.length ? <div className="review-list">{recent.map(item => <div className="review-item" key={`${item.label}-${item.id}`}><span className="tag">{item.label}</span><time>{dateText(item.date)}</time><p>{item.body}</p></div>)}</div> : <p>日々のメモや判断が増えると、ここで方針と一緒に最近の記録を見返せます。</p>}
  </div>;
}

function Journal() {
  const log = useLogbook();
  const { data, loading, saveStatus, error } = log;
  const [location] = useLocation();
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3600); };
  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try { await action(); notify(success); return true; }
    catch (err) { notify(err instanceof Error ? err.message : '操作を完了できませんでした。'); return false; }
    finally { setBusy(false); }
  };
  const submitMemo = async (event: FormEvent) => {
    event.preventDefault();
    if (!memo.trim()) return;
    setSavingMemo(true);
    const done = await run(() => log.addNote({ body: memo.trim(), category }), 'メモを記録しました。');
    if (done) { setMemo(''); setCategory(''); }
    setSavingMemo(false);
  };
  const askDelete = (kind: Kind, id: string) => {
    const labels = { note: 'このメモ', decision: 'この判断', direction: 'この方針', manual: 'このマニュアル' };
    const actions = { note: log.deleteNote, decision: log.deleteDecision, direction: log.deleteDirection, manual: log.deleteManual };
    setConfirm({ message: `${labels[kind]}を削除しますか？この操作は取り消せません。`, action: () => actions[kind](id) });
  };
  const notes = sorted(data.notes);
  const decisions = sorted(data.decisions);
  const directions = sorted(data.directions);
  const manuals = sorted(data.manual);
  const patterns = derivePatterns(data.notes);
  const candidates = deriveManualCandidates(data.notes, data.decisions, data.manual);
  const filteredNotes = notes.filter(note => (!filter || note.category === filter) && (!search.trim() || `${note.body} ${note.category}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const openNote = (n: Note) => setEditor({ kind:'note', id:n.id, initial:{ body:n.body, category:n.category } });
  const page = NAV.find(n => n.href === location);
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark"><BookOpen size={18} strokeWidth={1.8}/></span><span className="brand-word">logmate<span style={{color:'#e6a58f'}}>.</span></span></Link>
      <p className="brand-caption">THE OWNER'S FIELD NOTES</p>
      <div className="nav-label">YOUR NOTEBOOK</div>
      <nav className="nav-list" aria-label="メインナビゲーション">{NAV.slice(0,6).map((item,i) => <Link key={item.href} href={item.href} className={`nav-link ${location===item.href?'active':''}`} data-testid={`link-${item.en.toLowerCase()}`}><item.icon /><span>{item.label}</span><span className="nav-number">0{i+1}</span></Link>)}</nav>
      <div className="sidebar-bottom"><Link href="/settings" className={`nav-link ${location==='/settings'?'active':''}`} data-testid="link-settings"><Settings2 /><span>プライバシー・設定</span></Link><div className="sidebar-privacy"><strong>この記録は、この端末に。</strong>クラウド送信なし。あなたの言葉はあなたの手元に。</div></div>
    </aside>
    <main className="main">
       <header className="topbar"><span className="breadcrumb">LOGMATE <span style={{margin:'0 9px',opacity:.4}}>/</span> {page?.en.toUpperCase() ?? 'JOURNAL'}</span><div className="top-right"><span><span className="status-dot" />{loading ? '読み込み中' : saveStatus === 'saving' ? '保存中' : saveStatus === 'error' ? '保存エラー' : 'この端末に保存済み'}</span><HardDrive size={14}/></div></header>
      <div className="content">
        {error && <div className="error-banner" data-testid="status-error"><CircleHelp size={16}/>{String(error)}</div>}
        {loading ? <><div className="skeleton" style={{height:120}}/><div className="skeleton" style={{height:260,marginTop:40}}/><div className="skeleton"/></> :
        <Switch>
          <Route path="/">{<>
            <section className="hero"><div className="eyebrow">A QUIETER WAY TO RUN YOUR SHOP</div><h1 className="hero-title">毎日のメモから、<br/><em>店の変化</em>が見えてくる。</h1><p className="hero-subtitle">Logmateは、オーナーの気づき・判断・失敗・アイデアを、店の改善につなげるローカルファースト経営ログ。</p></section>
            <div className="today-grid"><section><div className="section-head"><div><div className="section-kicker">01 — CAPTURE</div><h2 className="section-title">今日、気づいたこと</h2></div><span className="section-hint">{dateText(new Date().toISOString())}</span></div>
              <form className="paper composer" onSubmit={submitMemo}><textarea data-testid="input-today-memo" value={memo} onChange={e=>setMemo(e.target.value)} placeholder="お客さんのひと言、試してみたこと、うまくいかなかったこと。何でも、ここに。" aria-label="今日のメモ"/><div className="composer-foot"><span className="select-wrap"><select data-testid="select-today-category" aria-label="カテゴリ" value={category} onChange={e=>setCategory(e.target.value)}><option value="">カテゴリなし</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select><ChevronDown /></span><button className="btn btn-primary" data-testid="button-save-memo" disabled={!memo.trim() || savingMemo} type="submit"><Plus/>記録する</button></div></form>
            </section><aside className="side-note"><ShieldCheck className="small-icon" size={25} strokeWidth={1.5}/><h3>書くだけで、十分です。</h3><p>整った文章でなくても大丈夫。小さな違和感や発見が、あとから店の判断を支える材料になります。</p><div className="rule"><HardDrive size={14}/>メモはこの端末のみに保存されます</div></aside></div>
            <section className="recent-section"><div className="section-head"><div><div className="section-kicker">RECENT ENTRIES</div><h2 className="section-title">最近の記録</h2></div><Link href="/timeline" className="text-link" data-testid="link-all-notes">すべて見る <ChevronRight size={14}/></Link></div>{notes.length ? <NoteRows notes={notes.slice(0,4)} onEdit={openNote} onDelete={n=>askDelete('note',n.id)}/> : <Empty icon={NotebookPen} title="まだ記録はありません" description="今日の気づきを一つ書くところから、あなたの店のログが始まります。"/>}</section>
          </>}</Route>
           <Route path="/timeline"><Heading index="02" title="記録をたどる" subtitle="日々の気づきと判断を、時系列で読み返せる場所。言葉やカテゴリで絞り込めます。"/><div className="toolbar"><div className="searchbox"><Search/><input data-testid="input-search-notes" type="search" placeholder="記録を検索" value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="select-wrap"><select data-testid="select-filter-category" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="カテゴリで絞り込む"><option value="">すべてのカテゴリ</option>{[...new Set([...CATEGORIES, ...notes.map(n=>n.category).filter(Boolean)])].map(c=><option key={c} value={c}>{c}</option>)}</select><ChevronDown/></span></div><div className="section-head"><h2 className="section-title">これまでの記録</h2><span className="section-hint">{filteredNotes.length + (filter ? 0 : decisions.filter(d=>`${d.title} ${d.reason} ${d.outcome}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).length)} 件</span></div>{filteredNotes.length || (!filter && decisions.some(d=>`${d.title} ${d.reason} ${d.outcome}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))) ? <TimelineEvents notes={filteredNotes} decisions={filter ? [] : decisions.filter(d=>`${d.title} ${d.reason} ${d.outcome}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))} onEditNote={openNote} onDeleteNote={n=>askDelete('note',n.id)} onEditDecision={d=>setEditor({kind:'decision',id:d.id,initial:d})} onDeleteDecision={d=>askDelete('decision',d.id)}/> : <Empty icon={Search} title={notes.length || decisions.length?'該当する記録はありません':'まだ記録はありません'} description={notes.length || decisions.length?'検索する言葉やカテゴリを変えてみてください。':'今日のページで最初の気づきを記録しましょう。'} action={!notes.length && !decisions.length?<Link href="/" className="btn btn-primary" data-testid="link-first-note">今日のページへ</Link>:undefined}/>}</Route>
          <Route path="/patterns"><Heading index="03" title="変化の手がかり" subtitle="記録の中から見える傾向。推測ではなく、書き残した内容だけをもとに表示します。"/><div className="metric-strip"><div className="metric"><strong>{notes.length}</strong><span>件のメモ</span></div><div className="metric"><strong>{patterns.categoryCounts.length}</strong><span>使われたカテゴリ</span></div></div>{notes.length ? <div className="block-grid"><section className="paper analysis-card wide"><div className="section-kicker">FREQUENCY</div><h3>よく書いていること</h3><p className="card-desc">カテゴリ別の記録数。カテゴリを付けたメモを集計しています。</p>{patterns.categoryCounts.length ? patterns.categoryCounts.map(item=><div className="bar-row" key={item.category}><span>{item.category}</span><div className="bar-track"><div className="bar-fill" style={{width:`${100*item.count/Math.max(...patterns.categoryCounts.map(x=>x.count))}%`}}/></div><strong>{item.count}</strong></div>) : <p className="muted-message">カテゴリ付きのメモが増えると、ここに傾向が表示されます。</p>}</section>
            <SignalCard title="繰り返し現れる課題" subtitle="複数の記録に登場したテーマ" items={patterns.recurring.map(x=>({label:x.label, value:`${x.count}件`}))} empty="繰り返し見つかったテーマは、まだありません。"/>
            <SignalCard title="増えている話題" subtitle="最近の記録と、それ以前を比較" items={patterns.growing.map(x=>({label:x.label,value:`${x.previous} → ${x.recent}`}))} empty="増加傾向を示せる記録は、まだありません。"/>
            <SignalCard title="改善の兆し" subtitle="記録から読み取れる前向きな変化" items={patterns.improving.map(x=>({label:x.label,value:`${x.count}件`}))} empty="改善の兆しを示せる記録は、まだありません。"/>
            <section className="paper analysis-card"><div className="section-kicker">A NOTE ON PATTERNS</div><h3>数字は、結論ではありません。</h3><p className="card-desc" style={{marginTop:12}}>ここにあるのは、あなたが書いた記録から拾った手がかりです。実際の状況と照らし合わせて、次の一歩を考えるために使ってください。</p></section>
          </div> : <div style={{marginTop:30}}><Empty icon={ChartNoAxesColumn} title="傾向は、記録から生まれます" description="メモが増えると、繰り返す話題やカテゴリの傾向がここに現れます。架空の分析は表示しません。" action={<Link href="/" className="btn btn-primary" data-testid="link-patterns-today">メモを書く</Link>}/></div>}</Route>
          <Route path="/decisions"><Heading index="04" title="判断の記録" subtitle="何を決め、なぜ決めたか。結果もあとから書き足して、次の判断につなげます。" action={<button className="btn btn-primary" data-testid="button-add-decision" onClick={()=>setEditor({kind:'decision'})}><Plus/>判断を記録</button>}/><div style={{marginTop:32}}>{decisions.length ? decisions.map(d=><article className="paper record-card" key={d.id} data-testid={`decision-${d.id}`}><div className="record-top"><div><h3 className="record-title">{d.title}</h3><p className="record-date">{dateText(d.createdAt)}</p></div><div className="record-toolbar"><button className="icon-btn" aria-label="判断を編集" data-testid={`button-edit-decision-${d.id}`} onClick={()=>setEditor({kind:'decision',id:d.id,initial:d})}><PenLine/></button><button className="icon-btn danger" aria-label="判断を削除" data-testid={`button-delete-decision-${d.id}`} onClick={()=>askDelete('decision',d.id)}><Trash2/></button></div></div><div className="record-field"><label>決めた理由</label><p>{d.reason || '理由はまだ記録されていません。'}</p></div><div className="record-field"><label>その後の結果</label><p>{d.outcome || '結果はまだ記録されていません。あとから追記できます。'}</p></div></article>) : <Empty icon={Compass} title="まだ判断の記録はありません" description="小さな決定も、理由と一緒に残すとあとから役立ちます。" action={<button className="btn btn-primary" data-testid="button-first-decision" onClick={()=>setEditor({kind:'decision'})}>最初の判断を記録</button>}/>}</div></Route>
           <Route path="/direction"><Heading index="05" title="店の向かう先" subtitle="大切にしたい価値観と、これから目指すこと。日々の行動と並べて見返せます。" action={<button className="btn btn-primary" data-testid="button-add-direction" onClick={()=>setEditor({kind:'direction'})}><Plus/>方針を追加</button>}/><div className="direction-banner"><Compass/><div><strong>迷ったとき、ここに戻る。</strong><p>方針は正解を決めるものではなく、判断の軸を思い出すためのものです。</p></div></div>{directions.length ? <><div className="block-grid" style={{marginTop:0}}>{directions.map(d=><article className="paper record-card" style={{marginTop:0}} key={d.id} data-testid={`direction-${d.id}`}><div className="record-top"><div><span className={`pill ${d.kind==='goal'?'goal':''}`}>{d.kind==='goal'?'目標':'大切にすること'}</span><h3 className="record-title">{d.title}</h3></div><div className="record-toolbar"><button className="icon-btn" aria-label="方針を編集" data-testid={`button-edit-direction-${d.id}`} onClick={()=>setEditor({kind:'direction',id:d.id,initial:d})}><PenLine/></button><button className="icon-btn danger" aria-label="方針を削除" data-testid={`button-delete-direction-${d.id}`} onClick={()=>askDelete('direction',d.id)}><Trash2/></button></div></div><div className="record-field"><p>{d.detail || '詳しい内容はまだありません。'}</p></div></article>)}</div><DirectionReview notes={notes} decisions={decisions}/></> : <Empty icon={Lightbulb} title="店の方針を、言葉にしてみましょう" description="「こんな店でありたい」という価値観や、具体的な目標を書き留められます。" action={<button className="btn btn-primary" data-testid="button-first-direction" onClick={()=>setEditor({kind:'direction'})}>方針を追加</button>}/>}</Route>
          <Route path="/manual"><Heading index="06" title="店のマニュアル" subtitle="繰り返す問題や、定着した判断を「次に使える知恵」として残します。" action={<button className="btn btn-primary" data-testid="button-add-manual" onClick={()=>setEditor({kind:'manual'})}><Plus/>項目を追加</button>}/><section style={{marginTop:35}}><div className="section-head"><div><div className="section-kicker">SUGGESTED FROM YOUR LOG</div><h2 className="section-title">記録からの候補</h2></div><span className="section-hint">{candidates.length} 件</span></div>{candidates.length ? candidates.map((candidate,i)=><div className="candidate" key={`${candidate.title}-${i}`}><div><h3>{candidate.title}</h3><p>{candidate.body}</p><span className="tag" style={{marginTop:10}}>{candidate.source}</span></div><button className="btn btn-soft" data-testid={`button-adopt-candidate-${i}`} onClick={()=>setEditor({kind:'manual',initial:candidate})}>編集して採用 <ChevronRight/></button></div>) : <Empty icon={Sparkles} title="今は候補がありません" description="同じ課題が繰り返し記録されたり、判断が積み重なると、マニュアルの候補がここに表示されます。"/>}</section><section style={{marginTop:43}}><div className="section-head"><div><div className="section-kicker">YOUR PLAYBOOK</div><h2 className="section-title">保存したマニュアル</h2></div><span className="section-hint">{manuals.length} 件</span></div>{manuals.length ? manuals.map(m=><article className="paper record-card" key={m.id} data-testid={`manual-${m.id}`}><div className="record-top"><div><h3 className="record-title">{m.title}</h3><p className="record-date">{dateText(m.createdAt)} {m.source && `・${m.source}`}</p></div><div className="record-toolbar"><button className="icon-btn" aria-label="マニュアルを編集" data-testid={`button-edit-manual-${m.id}`} onClick={()=>setEditor({kind:'manual',id:m.id,initial:m})}><PenLine/></button><button className="icon-btn danger" aria-label="マニュアルを削除" data-testid={`button-delete-manual-${m.id}`} onClick={()=>askDelete('manual',m.id)}><Trash2/></button></div></div><div className="record-field"><p>{m.body}</p></div></article>) : <Empty icon={BookOpen} title="マニュアルはまだありません" description="実際に役立ったやり方を、自分の言葉で残しておけます。"/>}</section></Route>
           <Route path="/settings"><Heading index="07" title="プライバシーと設定" subtitle="記録の扱いは、いつでもあなたが決められます。保存先とデータの操作をここで確認できます。"/><section className="paper settings-panel"><div className="section-kicker">LOCAL FIRST</div><h3>記録はこの端末の中に。</h3><p>Logmateの記録は、このブラウザのIndexedDBに保存されます。メモ本文や個人情報をアプリのサーバーへ送信しません。同期、暗号化、自動バックアップはありません。共用端末では他の利用者も同じブラウザのデータを見られる可能性があります。ブラウザのデータを消すと記録も失われるため、必要に応じてJSONファイルを書き出してください。</p><div className="setting-row"><HardDrive size={17}/><span>保存先</span><strong>このブラウザ内</strong></div><div className="setting-row"><ShieldCheck size={17}/><span>クラウドAI</span><strong className="off">OFF・利用不可</strong></div><div className="setting-row"><FileText size={17}/><span>保存中の記録</span><strong>{notes.length + decisions.length + directions.length + manuals.length} 件</strong></div></section>
            <section className="paper settings-panel"><div className="section-kicker">PORTABILITY</div><h3>持ち出す・戻す</h3><p>JSON形式で書き出せます。読み込みは現在の全データを置き換えます。大切な記録は、取り込み前に一度書き出してください。</p><div className="settings-actions"><button className="btn btn-primary" data-testid="button-export-data" onClick={()=>{try {log.exportData(); notify('JSONを書き出しました。');} catch(e) {notify(e instanceof Error?e.message:'書き出しに失敗しました。');}}}><Download/>JSONを書き出す</button><button className="btn btn-outline" data-testid="button-import-data" onClick={()=>fileRef.current?.click()}><Upload/>JSONを読み込む</button><input ref={fileRef} type="file" accept=".json,application/json" style={{display:'none'}} data-testid="input-import-file" onChange={e=>{const file=e.target.files?.[0]; if(file) setConfirm({message:`「${file.name}」を読み込むと現在の全データが置き換わります。先に書き出しましたか？`,action:()=>log.importData(file)}); e.target.value='';}}/></div></section>
            <section className="paper settings-panel"><div className="section-kicker">DANGER ZONE</div><h3>すべてのデータを削除</h3><p>このブラウザ内のメモ、判断、方針、マニュアルをすべて削除します。取り消しできません。必要なら先にJSONを書き出してください。</p><button className="btn btn-outline" style={{color:'#a34f48',borderColor:'#d8b9b3'}} data-testid="button-clear-data" onClick={()=>setConfirm({message:'すべての記録を完全に削除しますか？この操作は取り消せません。',action:log.clearAll})}><Trash2/>すべて削除</button></section></Route>
          <Route><Empty icon={CircleHelp} title="ページが見つかりません" description="指定されたページはありません。" action={<Link href="/" className="btn btn-primary" data-testid="link-not-found-home">今日のページへ</Link>}/></Route>
        </Switch>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="モバイルナビゲーション">{NAV.map(item=><Link key={item.href} href={item.href} className={location===item.href?'active':''} data-testid={`mobile-link-${item.en.toLowerCase()}`}><item.icon/><span>{item.label}</span></Link>)}</nav>
    {editor && <EditorDialog editor={editor} busy={busy} onClose={()=>setEditor(null)} onSave={async values=>{
      const {kind,id}=editor;
      const action = kind==='note' ? () => id ? log.updateNote(id,{body:values.body.trim(),category:values.category}) : log.addNote({body:values.body.trim(),category:values.category})
      : kind==='decision' ? () => id ? log.updateDecision(id,{title:values.title.trim(),reason:values.reason.trim(),outcome:values.outcome.trim()}) : log.addDecision({title:values.title.trim(),reason:values.reason.trim(),outcome:values.outcome.trim()})
      : kind==='direction' ? () => id ? log.updateDirection(id,{title:values.title.trim(),kind:values.kind,detail:values.detail.trim()}) : log.addDirection({title:values.title.trim(),kind:values.kind,detail:values.detail.trim()})
      : () => id ? log.updateManual(id,{title:values.title.trim(),body:values.body.trim(),source:values.source.trim()}) : log.addManual({title:values.title.trim(),body:values.body.trim(),source:values.source.trim()});
      if(await run(action,id?'変更を保存しました。':'記録を保存しました。')) setEditor(null);
    }}/>}
     {confirm && <div className="dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirm(null)}}><div className="dialog" role="alertdialog" aria-modal="true" aria-label="操作の確認"><div className="dialog-head"><h2>操作の確認</h2><button className="icon-btn" aria-label="閉じる" data-testid="button-close-confirm" onClick={()=>setConfirm(null)}><X/></button></div><p style={{fontSize:13,lineHeight:1.8,color:'#636879'}}>{confirm.message}</p><div className="dialog-actions"><button className="btn btn-soft" data-testid="button-cancel-delete" onClick={()=>setConfirm(null)}>キャンセル</button><button className="btn btn-danger" data-testid="button-confirm-delete" disabled={busy} onClick={async()=>{if(await run(confirm.action,'操作が完了しました。'))setConfirm(null)}}><Check/>続ける</button></div></div></div>}
    {notice && <div className="toast-note" role="status" data-testid="status-notice"><Check size={14} style={{display:'inline',marginRight:8}}/>{notice}</div>}
  </div>;
}
function SignalCard({title,subtitle,items,empty}:{title:string;subtitle:string;items:{label:string;value:string}[];empty:string}) {
  return <section className="paper analysis-card"><h3>{title}</h3><p className="card-desc">{subtitle}</p>{items.length?<div className="signal-list">{items.map((item,i)=><span className="signal" key={`${item.label}-${i}`}>{item.label}<strong>{item.value}</strong></span>)}</div>:<p className="muted-message">{empty}</p>}</section>;
}
function EditorDialog({editor,busy,onClose,onSave}:{editor:Editor;busy:boolean;onClose:()=>void;onSave:(values:Draft)=>Promise<void>}) {
  const [values,setValues] = useState<Draft>({body:editor.initial?.body ?? '',category:editor.initial?.category ?? '',title:editor.initial?.title ?? '',reason:editor.initial?.reason ?? '',outcome:editor.initial?.outcome ?? '',kind:editor.initial?.kind ?? 'value',detail:editor.initial?.detail ?? '',source:editor.initial?.source ?? ''});
  const change = (key:keyof Draft,value:string) => setValues(prev=>({...prev,[key]:value}));
  const labels = {note:'メモ',decision:'判断',direction:'方針',manual:'マニュアル'};
  const valid = editor.kind==='note' ? !!values.body.trim() : !!values.title.trim() && (editor.kind!=='manual'||!!values.body.trim());
  const field = (label:string,key:keyof Draft,textarea=false,placeholder='') => <div className="field"><label htmlFor={`field-${key}`}>{label}</label>{textarea?<textarea id={`field-${key}`} data-testid={`input-${key}`} placeholder={placeholder} value={values[key]} onChange={e=>change(key,e.target.value)}/>:<input id={`field-${key}`} data-testid={`input-${key}`} placeholder={placeholder} value={values[key]} onChange={e=>change(key,e.target.value)}/>}</div>;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="dialog" role="dialog" aria-modal="true" aria-label={`${labels[editor.kind]}を${editor.id?'編集':'追加'}`}><div className="dialog-head"><div><div className="section-kicker">YOUR LOGBOOK</div><h2>{labels[editor.kind]}を{editor.id?'編集':'追加'}</h2></div><button className="icon-btn" aria-label="閉じる" data-testid="button-close-editor" onClick={onClose}><X/></button></div><form onSubmit={e=>{e.preventDefault();if(valid)void onSave(values)}}>
     {editor.kind==='note' && <>{field('メモ *','body',true,'今日、気づいたこと') }<div className="field"><label htmlFor="field-category">カテゴリ（任意）</label><select id="field-category" data-testid="select-edit-category" value={values.category} onChange={e=>change('category',e.target.value)}><option value="">カテゴリなし</option>{CATEGORIES.map(c=><option value={c} key={c}>{c}</option>)}{values.category && !CATEGORIES.some(c=>c===values.category) && <option value={values.category}>{values.category}</option>}</select></div></>}
    {editor.kind==='decision' && <>{field('決めたこと *','title',false,'どんな判断をしましたか？')}{field('決めた理由','reason',true,'なぜそう決めましたか？')}{field('その後の結果','outcome',true,'あとから書き足せます')}</>}
    {editor.kind==='direction' && <><div className="field"><label htmlFor="field-kind">種類</label><select id="field-kind" data-testid="select-direction-kind" value={values.kind} onChange={e=>change('kind',e.target.value)}><option value="value">大切にすること</option><option value="goal">目標</option></select></div>{field('タイトル *','title',false,'店として大切にしたいこと')}{field('詳しい内容','detail',true,'具体的に書き留める')}</>}
    {editor.kind==='manual' && <>{field('項目名 *','title',false,'手順や考え方の名前')}{field('内容 *','body',true,'次に使えるよう、具体的に')}{field('出典・きっかけ','source',false,'この項目を作った理由')}</>}
    <div className="dialog-actions"><button type="button" className="btn btn-soft" data-testid="button-cancel-editor" onClick={onClose}>キャンセル</button><button type="submit" className="btn btn-primary" data-testid="button-save-editor" disabled={!valid||busy}><Check/>保存する</button></div></form></div></div>;
}
function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Journal/></WouterRouter>;
}
export default App;