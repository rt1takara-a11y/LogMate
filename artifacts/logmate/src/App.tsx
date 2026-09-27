import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { jaJP } from '@clerk/localizations';
import { BookOpen, CalendarDays, CalendarRange, ChartNoAxesColumn, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Download, FileText, HardDrive, Lightbulb, LockKeyhole, LogOut, NotebookPen, PenLine, Plus, Search, Settings2, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { useLogbook, CATEGORIES } from '@/lib/logbook';
import { buildInsights } from '@/lib/insights';
import WeeklyReview from '@/components/WeeklyReview';
import PatternsDashboard from '@/components/PatternsDashboard';
import DecisionReviewPanel from '@/components/DecisionReviewPanel';
import DirectionInsights from '@/components/DirectionInsights';
import ManualCandidates from '@/components/ManualCandidates';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'bottom' as const,
  },
  variables: {
    colorPrimary: '#293251',
    colorForeground: '#293251',
    colorMutedForeground: '#626879',
    colorBackground: '#fcfaf4',
    colorInput: '#f8f5ec',
    colorInputForeground: '#293251',
    colorDanger: '#9d4b47',
    colorNeutral: '#d7d1c3',
    fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif",
    borderRadius: '7px',
  },
  elements: {
    rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
    cardBox: { width: '440px', maxWidth: '100%', background: '#fcfaf4', border: '1px solid #ded9cc', borderRadius: '8px', boxShadow: '0 18px 45px rgba(41,50,81,.06)', overflow: 'hidden' },
    card: { background: 'transparent', border: 0, boxShadow: 'none' },
    footer: { background: 'transparent', border: 0, boxShadow: 'none' },
    headerTitle: { color: '#293251', fontFamily: "'Noto Serif JP', serif" },
    headerSubtitle: { color: '#626879' },
    socialButtonsBlockButtonText: { color: '#293251' },
    formFieldLabel: { color: '#293251' },
    footerActionLink: { color: '#9d574b', fontWeight: 700 },
    footerActionText: { color: '#626879' },
    dividerText: { color: '#626879' },
    identityPreviewEditButton: { color: '#9d574b' },
    formFieldSuccessText: { color: '#326b54' },
    alertText: { color: '#9d4b47' },
    logoBox: { justifyContent: 'center' },
    logoImage: { width: '155px', height: 'auto', maxHeight: '65px' },
    socialButtonsBlockButton: { background: '#f8f5ec', borderColor: '#d7d1c3', color: '#293251' },
    formButtonPrimary: { background: '#293251', color: '#fcfaf4', boxShadow: 'none' },
    formFieldInput: { background: '#f8f5ec', borderColor: '#d7d1c3', color: '#293251' },
    footerAction: { background: 'transparent' },
    dividerLine: { background: '#ded9cc' },
    alert: { background: '#f8eee7' },
    otpCodeFieldInput: { background: '#f8f5ec', color: '#293251' },
    formFieldRow: { color: '#293251' },
    main: { color: '#293251' },
  },
};

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
  { href: '/weekly-review', label: '週次レビュー', en: 'Weekly Review', icon: CalendarRange },
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

function Journal({ userId }: { userId: string }) {
  const log = useLogbook(userId);
  const { signOut } = useClerk();
  const { user } = useUser();
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
  const [passphrase, setPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const delay = 3_600_000 - (Date.now() % 3_600_000) + 1000;
    const timer = window.setTimeout(() => setClock(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [clock]);
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
  const insights = useMemo(() => buildInsights(data, new Date(clock)), [data, clock]);
  const { patterns, manualCandidates: candidates, weekly } = insights;
  const filteredNotes = notes.filter(note => (!filter || note.category === filter) && (!search.trim() || `${note.body} ${note.category}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const openNote = (n: Note) => setEditor({ kind:'note', id:n.id, initial:{ body:n.body, category:n.category } });
  const page = NAV.find(n => n.href === location);
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark"><BookOpen size={18} strokeWidth={1.8}/></span><span className="brand-word">logmate<span style={{color:'#e6a58f'}}>.</span></span></Link>
      <p className="brand-caption">THE OWNER'S FIELD NOTES</p>
      <div className="nav-label">YOUR NOTEBOOK</div>
       <nav className="nav-list" aria-label="メインナビゲーション">{NAV.slice(0,7).map((item,i) => <Link key={item.href} href={item.href} className={`nav-link ${location===item.href?'active':''}`} data-testid={`link-${item.en.toLowerCase().replace(' ', '-')}`}><item.icon /><span>{item.label}</span><span className="nav-number">0{i+1}</span></Link>)}</nav>
       <div className="sidebar-bottom"><Link href="/settings" className={`nav-link ${location==='/settings'?'active':''}`} data-testid="link-settings"><Settings2 /><span>プライバシー・設定</span></Link><div className="sidebar-privacy"><strong>この記録は、この端末に。</strong>Clerkは本人確認のみ。記録は自動共有されません。</div></div>
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
             <section className="weekly-peek" data-testid="card-weekly-peek"><div><div className="section-kicker">THIS WEEK / FROM YOUR NOTES</div><h2>今週の気づき</h2><p data-testid="text-weekly-peek">{weekly.entryCount ? `直近7日間に ${weekly.entryCount} 件の記録。${weekly.frequentThemes[0] ? `よく現れた話題は「${weekly.frequentThemes[0].label}」です。` : '今週の記録を見返しましょう。'}` : '今週はまだ記録がありません。小さな気づきから始めましょう。'}</p></div><Link href="/weekly-review" className="btn btn-primary" data-testid="link-weekly-review">週次レビューを見る <ChevronRight size={16}/></Link></section>
             <section className="recent-section"><div className="section-head"><div><div className="section-kicker">RECENT ENTRIES</div><h2 className="section-title">最近の記録</h2></div><Link href="/timeline" className="text-link" data-testid="link-all-notes">すべて見る <ChevronRight size={14}/></Link></div>{notes.length ? <NoteRows notes={notes.slice(0,4)} onEdit={openNote} onDelete={n=>askDelete('note',n.id)}/> : <Empty icon={NotebookPen} title="まだ記録はありません" description="今日の気づきを一つ書くところから、あなたの店のログが始まります。"/>}</section>
          </>}</Route>
           <Route path="/timeline"><Heading index="02" title="記録をたどる" subtitle="日々の気づきと判断を、時系列で読み返せる場所。言葉やカテゴリで絞り込めます。"/><div className="toolbar"><div className="searchbox"><Search/><input data-testid="input-search-notes" type="search" placeholder="記録を検索" value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="select-wrap"><select data-testid="select-filter-category" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="カテゴリで絞り込む"><option value="">すべてのカテゴリ</option>{[...new Set([...CATEGORIES, ...notes.map(n=>n.category).filter(Boolean)])].map(c=><option key={c} value={c}>{c}</option>)}</select><ChevronDown/></span></div><div className="section-head"><h2 className="section-title">これまでの記録</h2><span className="section-hint">{filteredNotes.length + (filter ? 0 : decisions.filter(d=>`${d.title} ${d.reason} ${d.outcome}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).length)} 件</span></div>{filteredNotes.length || (!filter && decisions.some(d=>`${d.title} ${d.reason} ${d.outcome}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))) ? <TimelineEvents notes={filteredNotes} decisions={filter ? [] : decisions.filter(d=>`${d.title} ${d.reason} ${d.outcome}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))} onEditNote={openNote} onDeleteNote={n=>askDelete('note',n.id)} onEditDecision={d=>setEditor({kind:'decision',id:d.id,initial:d})} onDeleteDecision={d=>askDelete('decision',d.id)}/> : <Empty icon={Search} title={notes.length || decisions.length?'該当する記録はありません':'まだ記録はありません'} description={notes.length || decisions.length?'検索する言葉やカテゴリを変えてみてください。':'今日のページで最初の気づきを記録しましょう。'} action={!notes.length && !decisions.length?<Link href="/" className="btn btn-primary" data-testid="link-first-note">今日のページへ</Link>:undefined}/>}</Route>
          <Route path="/patterns"><PatternsDashboard patterns={patterns} noteCount={notes.length}/></Route>
          <Route path="/decisions">
            <Heading index="04" title="判断の記録" subtitle="何を決め、なぜ決めたか。その後の記録と評価を時系列で残します。" action={<button className="btn btn-primary" data-testid="button-add-decision" onClick={()=>setEditor({kind:'decision'})}><Plus/>判断を記録</button>}/>
            <div style={{marginTop:32}}>{decisions.length ? decisions.map(d=><article className="paper record-card" key={d.id} data-testid={`decision-${d.id}`}>
              <div className="record-top"><div><h3 className="record-title">{d.title}</h3><p className="record-date">{dateText(d.createdAt)}</p></div><div className="record-toolbar"><button className="icon-btn" aria-label="判断を編集" data-testid={`button-edit-decision-${d.id}`} onClick={()=>setEditor({kind:'decision',id:d.id,initial:d})}><PenLine/></button><button className="icon-btn danger" aria-label="判断を削除" data-testid={`button-delete-decision-${d.id}`} onClick={()=>askDelete('decision',d.id)}><Trash2/></button></div></div>
              <div className="record-field"><label>決めた理由</label><p>{d.reason || '理由はまだ記録されていません。'}</p></div>
              <div className="record-field"><label>その後の結果</label><p>{d.outcome || '結果はまだ記録されていません。あとから追記できます。'}</p></div>
              <DecisionReviewPanel decision={d} notes={notes} busy={busy} onReview={(effect,note)=>run(()=>log.addDecisionReview(d.id,effect,note),'振り返りを保存しました。')}/>
            </article>) : <Empty icon={Compass} title="まだ判断の記録はありません" description="小さな決定も、理由と一緒に残すとあとから役立ちます。" action={<button className="btn btn-primary" data-testid="button-first-decision" onClick={()=>setEditor({kind:'decision'})}>最初の判断を記録</button>}/>}</div>
          </Route>
           <Route path="/direction">
             <Heading index="05" title="店の向かう先" subtitle="大切にしたい価値観と、これから目指すこと。最近の行動と並べて見返せます。" action={<button className="btn btn-primary" data-testid="button-add-direction" onClick={()=>setEditor({kind:'direction'})}><Plus/>方針を追加</button>}/>
             <div className="direction-banner"><Compass/><div><strong>迷ったとき、ここに戻る。</strong><p>関係しそうな記録は、決めつけずに見比べるためのヒントです。</p></div></div>
             {directions.length ? <>
               <div className="block-grid" style={{marginTop:0}}>{directions.map(d=><article className="paper record-card" style={{marginTop:0}} key={d.id} data-testid={`direction-${d.id}`}>
                 <div className="record-top"><div><span className={`pill ${d.kind==='goal'?'goal':''}`}>{d.kind==='goal'?'目標':'大切にすること'}</span><h3 className="record-title">{d.title}</h3></div>
                   <div className="record-toolbar"><button className="icon-btn" aria-label="方針を編集" data-testid={`button-edit-direction-${d.id}`} onClick={()=>setEditor({kind:'direction',id:d.id,initial:d})}><PenLine/></button><button className="icon-btn danger" aria-label="方針を削除" data-testid={`button-delete-direction-${d.id}`} onClick={()=>askDelete('direction',d.id)}><Trash2/></button></div></div>
                 <div className="record-field"><p>{d.detail || '詳しい内容はまだありません。'}</p></div>
                 <DirectionInsights direction={d} data={data}/>
               </article>)}</div><DirectionReview notes={notes} decisions={decisions}/>
             </> : <Empty icon={Lightbulb} title="店の方針を、言葉にしてみましょう" description="「こんな店でありたい」という価値観や、具体的な目標を書き留められます。" action={<button className="btn btn-primary" data-testid="button-first-direction" onClick={()=>setEditor({kind:'direction'})}>方針を追加</button>}/>}
           </Route>
          <Route path="/manual">
            <Heading index="06" title="店のマニュアル" subtitle="繰り返す問題や、役立った判断を「次に使える知恵」として残します。" action={<button className="btn btn-primary" data-testid="button-add-manual" onClick={()=>setEditor({kind:'manual'})}><Plus/>項目を追加</button>}/>
            <section style={{marginTop:35}}><div className="section-head"><div><div className="section-kicker">SUGGESTED FROM YOUR LOG</div><h2 className="section-title">記録からの候補</h2></div><span className="section-hint">{candidates.length} 件</span></div>
              <ManualCandidates candidates={candidates} onAdopt={candidate=>setEditor({kind:'manual',initial:candidate})}/>
            </section>
            <section style={{marginTop:43}}><div className="section-head"><div><div className="section-kicker">YOUR PLAYBOOK</div><h2 className="section-title">保存したマニュアル</h2></div><span className="section-hint">{manuals.length} 件</span></div>
              {manuals.length ? manuals.map(m=><article className="paper record-card" key={m.id} data-testid={`manual-${m.id}`}><div className="record-top"><div><h3 className="record-title">{m.title}</h3><p className="record-date">{dateText(m.createdAt)} {m.source && `・${m.source}`}</p></div><div className="record-toolbar"><button className="icon-btn" aria-label="マニュアルを編集" data-testid={`button-edit-manual-${m.id}`} onClick={()=>setEditor({kind:'manual',id:m.id,initial:m})}><PenLine/></button><button className="icon-btn danger" aria-label="マニュアルを削除" data-testid={`button-delete-manual-${m.id}`} onClick={()=>askDelete('manual',m.id)}><Trash2/></button></div></div><div className="record-field"><p>{m.body}</p></div></article>) : <Empty icon={BookOpen} title="マニュアルはまだありません" description="実際に役立ったやり方を、自分の言葉で残しておけます。"/>}
            </section>
          </Route>
          <Route path="/weekly-review"><WeeklyReview summary={weekly} onAdopt={candidate=>setEditor({kind:'manual',initial:candidate})}/></Route>
           <Route path="/settings">
             <Heading index="07" title="プライバシーと設定" subtitle="記録とバックアップの扱いは、あなたが決められます。"/>
             <section className="paper settings-panel">
               <div className="section-kicker">YOUR SPACE</div><h3>記録は、この端末に。</h3>
                <p>Clerkはログインと本人確認を扱います。メモ本文などの記録はこのブラウザのアカウント別領域に保存され、運営サーバーへは送られません。Noah's Nalogや外部AIへも自動共有されません。暗号化スナップショットもこの端末内だけに保存され、他の端末へは暗号化ファイルを手動で移してください。</p>
                <p>記録本体は端末内では暗号化されません。共用のブラウザプロフィールや端末の管理者は保存領域にアクセスできるため、共用端末では別のブラウザプロフィールをご利用ください。ブラウザのデータを消すと記録と端末内スナップショットも失われます。</p>
               <div className="setting-row"><HardDrive size={17}/><span>記録の保存先</span><strong>このブラウザ内</strong></div>
               <div className="setting-row"><ShieldCheck size={17}/><span>ログイン・本人確認</span><strong>Clerk</strong></div>
               <div className="setting-row"><FileText size={17}/><span>現在の記録</span><strong data-testid="text-record-count">{notes.length + decisions.length + directions.length + manuals.length} 件</strong></div>
             </section>
             <section className="paper settings-panel">
               <div className="section-kicker">ENCRYPTED SNAPSHOT</div><h3>暗号化バックアップ</h3>
                <p>ONにするとパスフレーズで暗号化したスナップショットをこの端末に作成します。解除中は編集に合わせて更新されます。再読み込み後はパスフレーズで再解除が必要です。ロック中の編集はバックアップされず、解除時に差分を確認します。パスフレーズを忘れると復元できません。</p>
                <div className="privacy-status" data-testid="status-backup"><LockKeyhole size={21}/><div><strong>{!log.backupEnabled ? 'OFF' : log.backupStatus === 'review' ? 'ON · 差分を確認' : log.backupUnlocked ? 'ON · 解除中' : 'ON · ロック中'}</strong><span>{!log.backupEnabled ? '暗号化バックアップは無効です' : log.backupStatus === 'review' ? '端末の記録と暗号化スナップショットが異なります。どちらを残すか選んでください' : log.backupStatus === 'saving' ? '暗号化スナップショットを保存中' : log.backupStatus === 'error' ? 'バックアップに問題があります' : log.backupUnlocked ? 'この端末で暗号化スナップショットを利用できます' : 'パスフレーズを入力して解除してください'}</span></div></div>
               {log.backupError && <p className="privacy-error" role="alert" data-testid="status-backup-error">{log.backupError}</p>}
                {log.backupStatus === 'review' && <div className="privacy-warning">
                  <p>解除済みのスナップショットはまだ上書きされていません。端末の記録が空・古い場合は復元を選んでください。今の記録を残す場合は、スナップショットの更新を選んでください。</p>
                  <div className="settings-actions">
                    <button className="btn btn-primary" disabled={busy} data-testid="button-recover-local" onClick={()=>setConfirm({message:'暗号化スナップショットから記録を復元します。現在のこのアカウントの記録は置き換わります。続けますか？',action:log.recoverLocalBackup})}>スナップショットから復元</button>
                    <button className="btn btn-outline" disabled={busy} data-testid="button-update-local-backup" onClick={()=>setConfirm({message:'現在の記録で暗号化スナップショットを上書きします。古いスナップショットの内容は失われます。続けますか？',action:log.updateLocalBackup})}>現在の記録で更新</button>
                  </div>
                </div>}
               {(!log.backupEnabled || !log.backupUnlocked) && <div className="privacy-passphrase"><label htmlFor="backup-passphrase">バックアップ用パスフレーズ</label><input id="backup-passphrase" data-testid="input-backup-passphrase" type="password" autoComplete="off" value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="忘れないパスフレーズを入力"/></div>}
               <div className="settings-actions">
                 {!log.backupEnabled ? <button className="btn btn-primary" data-testid="button-enable-backup" disabled={busy || !passphrase.trim()} onClick={()=>void (async()=>{if(await run(()=>log.enableBackup(passphrase),'暗号化バックアップを有効にしました。'))setPassphrase('')})()}><LockKeyhole/>バックアップをON</button> : <>
                   {!log.backupUnlocked && <button className="btn btn-primary" data-testid="button-unlock-backup" disabled={busy || !passphrase.trim()} onClick={()=>void (async()=>{if(await run(()=>log.unlockBackup(passphrase),'バックアップを解除しました。'))setPassphrase('')})()}><LockKeyhole/>解除する</button>}
                   <button className="btn btn-outline" data-testid="button-disable-backup" disabled={busy} onClick={()=>setConfirm({message:'暗号化バックアップをOFFにしますか？この端末の暗号化スナップショットは削除されます。記録本体は残ります。',action:log.disableBackup})}>バックアップをOFF</button>
                 </>}
               </div>
             </section>
             <section className="paper settings-panel">
               <div className="section-kicker">PORTABILITY</div><h3>暗号化ファイルを持ち出す・戻す</h3>
                <p>解除中のスナップショットを暗号化 .json ファイルとして保存できます。差分確認中は更新前の内容が書き出されます。別の端末への移動は自分でファイルを転送してください。復元は同じアカウントとパスフレーズでのみ行え、現在の記録を置き換えます。平文での書き出し・読み込みはできません。</p>
               <div className="settings-actions">
                  <button className="btn btn-primary" data-testid="button-export-data" disabled={busy || !log.backupUnlocked || !['saved', 'review'].includes(log.backupStatus)} onClick={()=>void run(log.exportEncryptedBackup,'暗号化ファイルをダウンロードしました。')}><Download/>暗号化 .json を保存</button>
                 <button className="btn btn-outline" data-testid="button-import-data" disabled={busy || !restorePassphrase.trim()} onClick={()=>fileRef.current?.click()}><Upload/>暗号化 .json を復元</button>
                 <input ref={fileRef} type="file" accept=".json,application/json" style={{display:'none'}} data-testid="input-import-file" onChange={e=>{const file=e.target.files?.[0]; if(file){const secret=restorePassphrase; setConfirm({message:`「${file.name}」で現在の記録をすべて置き換えます。同じアカウントのファイルとパスフレーズが必要です。続けますか？`,action:()=>log.restoreEncryptedBackup(file,secret)});}e.target.value='';}}/>
               </div>
               <div className="privacy-passphrase"><label htmlFor="restore-passphrase">復元用パスフレーズ（ファイル選択前に入力）</label><input id="restore-passphrase" data-testid="input-restore-passphrase" type="password" autoComplete="off" value={restorePassphrase} onChange={e=>setRestorePassphrase(e.target.value)} placeholder="暗号化ファイルのパスフレーズ"/></div>
             </section>
             {log.legacyAvailable && <section className="paper settings-panel">
               <div className="section-kicker">LEGACY DATA</div><h3>以前の匿名記録を取り込む</h3>
               <p>このブラウザに旧版の匿名記録があります。自動では取り込みません。取り込むと現在のアカウントの全記録を置き換えます。旧版の匿名データ自体は削除されません。</p>
               <div className="privacy-warning">共用端末の匿名記録には、他の人が書いた内容が含まれている可能性があります。自分の記録であることを確認してください。</div>
               <button className="btn btn-outline" data-testid="button-import-legacy" disabled={busy} onClick={()=>setConfirm({message:'旧版の匿名記録をこのアカウントに取り込みますか？現在の記録はすべて置き換わります。匿名データは残ります。自分の記録であることを確認してください。',action:log.importLegacyData})}><Upload/>確認して取り込む</button>
             </section>}
             <section className="paper settings-panel">
               <div className="section-kicker">ACCOUNT</div><h3>アカウント</h3>
               <div className="account-row"><p data-testid="text-account-email">{user?.primaryEmailAddress?.emailAddress ?? 'ログイン中'}</p><button className="btn btn-outline" data-testid="button-logout" onClick={()=>void signOut({redirectUrl:basePath || '/'})}><LogOut/>ログアウト</button></div>
             </section>
             <section className="paper settings-panel">
               <div className="section-kicker">DANGER ZONE</div><h3>このアカウントのローカルデータを削除</h3>
               <p>現在のアカウントの、このブラウザ内の記録とバックアップ設定・暗号化スナップショットを削除します。他のアカウントや旧版の匿名記録には影響しません。取り消しできません。</p>
               <button className="btn btn-outline" style={{color:'#a34f48',borderColor:'#d8b9b3'}} data-testid="button-clear-data" disabled={busy} onClick={()=>setConfirm({message:'このアカウントの記録、バックアップ設定、暗号化スナップショットをこのブラウザから完全に削除します。元には戻せません。続けますか？',action:log.clearAll})}><Trash2/>このアカウントのデータを削除</button>
             </section>
           </Route>
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
function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className="public-brand" data-testid="link-public-home"><img src={`${basePath}/logo.svg`} alt="" /><span style={light?{color:'#f7f0e4'}:undefined}>logmate<span style={{color:'#c98670'}}>.</span></span></Link>;
}

function Landing() {
  return <div className="public-shell">
    <header className="public-header"><Brand/><nav className="public-links" aria-label="アカウント"><Link href="/sign-in" data-testid="link-landing-sign-in">ログイン</Link><Link href="/sign-up" className="btn btn-primary" data-testid="link-landing-sign-up">使いはじめる <ChevronRight size={14}/></Link></nav></header>
    <main>
      <section className="public-hero"><div><div className="eyebrow">THE OWNER'S FIELD NOTES</div><h1>店のことを、<br/><em>自分の言葉</em>で<br/>残していく。</h1><p>気づいたこと、迷ったこと、決めたこと。忙しい毎日の中でこぼれてしまう小さな記録が、あなたの店の道しるべになります。</p><div className="public-actions"><Link href="/sign-up" className="btn btn-primary" data-testid="link-hero-sign-up">使いはじめる <ChevronRight size={16}/></Link><Link href="/sign-in" className="btn btn-outline" data-testid="link-hero-sign-in">すでにアカウントをお持ちの方</Link></div></div><div className="public-art" aria-hidden="true"><div className="public-paper"><small>FIELD NOTE / 001</small><h3>今日、お客さんの<br/>ひと言が残った。</h3><div className="public-rule"/><p>何気ない会話にも、次のヒントがある。忘れないうちに書いておこう。</p><small>YOUR SHOP, YOUR STORY.</small></div></div></section>
      <section className="public-feature-band"><div className="section-kicker">A NOTEBOOK FOR THE EVERYDAY</div><h2>思いつきを、店の知恵に。</h2><div className="public-features"><div className="public-feature"><span>01 / CAPTURE</span><h3>まず、書きとめる。</h3><p>整った文章は必要ありません。今日の出来事や違和感を、あなたの言葉のまま記録できます。</p></div><div className="public-feature"><span>02 / REFLECT</span><h3>あとから、見返す。</h3><p>時系列とカテゴリで記録をたどり、よく現れる話題や変化の手がかりを見つけます。</p></div><div className="public-feature"><span>03 / KEEP</span><h3>次に、活かす。</h3><p>判断の理由や店の方針、積み重ねたやり方を、いつでも戻れる場所に。</p></div></div></section>
    </main>
    <footer className="public-footer"><span>© Logmate · 静かな、店のノート。</span><span>Clerkが本人確認を担当。記録はこの端末に保存され、外部AIやNoah's Nalogへ自動共有されません。</span></footer>
  </div>;
}

function AuthPage({ mode }: { mode: 'in' | 'up' }) {
  return <div className="auth-layout"><aside className="auth-side"><Brand light/><div><div className="section-kicker">YOUR PRIVATE FIELD NOTES</div><h1>{mode==='in'?'おかえりなさい。':'ここから、\n店の記録を。'}</h1></div><p>小さな気づきも、忘れないために。<br/>あなたのノートは、あなたの手元に。</p></aside><main className="auth-main">{mode==='in'
    ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/journal`} />
    : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/journal`} />}
    <p>Clerkが本人確認を扱います。記録はこの端末に保存され、外部AIへ自動共有されません。</p></main></div>;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <div className="public-shell"><div className="content"><div className="skeleton" style={{height:80}}/><div className="skeleton" style={{height:300}}/></div></div>;
  return isSignedIn ? <Redirect to="/journal"/> : <Landing/>;
}

function ProtectedJournal() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return <div className="public-shell"><div className="content"><div className="skeleton" style={{height:80}}/><div className="skeleton" style={{height:300}}/></div></div>;
  if (!user) return <Redirect to="/"/>;
  return <WouterRouter base="/journal"><Journal key={user.id} userId={user.id}/></WouterRouter>;
}

function AppRoutes() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    localization={{
      ...jaJP,
      signIn: { ...jaJP.signIn, start: { ...jaJP.signIn?.start, title: 'おかえりなさい', subtitle: 'あなたのノートにログイン' } },
      signUp: { ...jaJP.signUp, start: { ...jaJP.signUp?.start, title: 'Logmateをはじめる', subtitle: 'あなたの店の記録を、ここから' } },
    }}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    routerPush={(to)=>setLocation(stripBase(to))}
    routerReplace={(to)=>setLocation(stripBase(to),{replace:true})}
  >
    <Switch>
      <Route path="/" component={HomeRoute}/>
      <Route path="/sign-in/*?">{()=> <AuthPage mode="in"/>}</Route>
      <Route path="/sign-up/*?">{()=> <AuthPage mode="up"/>}</Route>
      <Route path="/journal/*?" component={ProtectedJournal}/>
      <Route><div className="public-shell"><header className="public-header"><Brand/></header><div className="content"><Empty icon={CircleHelp} title="ページが見つかりません" description="指定されたページはありません。" action={<Link href="/" className="btn btn-primary">ホームに戻る</Link>}/></div></div></Route>
    </Switch>
  </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><AppRoutes/></WouterRouter>;
}
export default App;