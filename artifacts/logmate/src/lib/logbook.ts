import { useCallback, useEffect, useRef, useState } from 'react';
import { backupNeedsReview, deriveBackupKey, newSalt, openBackup, parseEncryptedBackup, sealBackup } from './encrypted-backup';

export const CATEGORIES = ['気づき', '失敗', 'スタッフ', '顧客', '売上', '商品', 'オペレーション', 'アイデア'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Note = {
  id: string;
  body: string;
  category: Category | string;
  createdAt: string;
  updatedAt: string;
};
export type Decision = {
  id: string;
  title: string;
  reason: string;
  outcome: string;
  createdAt: string;
  updatedAt: string;
};
export type Direction = {
  id: string;
  title: string;
  kind: 'value' | 'goal';
  detail: string;
  createdAt: string;
  updatedAt: string;
};
export type ManualItem = {
  id: string;
  title: string;
  body: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};
export type Logbook = {
  notes: Note[];
  decisions: Decision[];
  directions: Direction[];
  manual: ManualItem[];
};

const empty = (): Logbook => ({ notes: [], decisions: [], directions: [], manual: [] });
const LEGACY_DB = 'logmate-local';
const STORE_NAME = 'logbook';
const KEY = 'current';
const BACKUP_KEY = 'encrypted-backup';
const BACKUP_ENABLED_KEY = 'backup-enabled';
const now = () => new Date().toISOString();
const text = (value: unknown): value is string => typeof value === 'string';
const validDate = (value: unknown) => text(value) && Number.isFinite(Date.parse(value));

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('このブラウザは端末内保存に対応していません。'));
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('保存領域を開けませんでした。'));
    request.onblocked = () => reject(new Error('別のタブが保存領域を使用中です。タブを閉じて再度お試しください。'));
  });
}

async function transaction<T>(name: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb(name);
  return new Promise<T>((resolve, reject) => {
    let result: T;
    const tx = db.transaction(STORE_NAME, mode);
    const request = operation(tx.objectStore(STORE_NAME));
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('保存に失敗しました。')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('保存が中断されました。')); };
  });
}

async function writeEntries(name: string, values: Record<string, unknown>, remove: string[] = []): Promise<void> {
  const db = await openDb(name);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const [key, value] of Object.entries(values)) store.put(value, key);
    for (const key of remove) store.delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('保存に失敗しました。')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('保存が中断されました。')); };
  });
}

function validate(input: unknown): Logbook {
  if (!input || typeof input !== 'object') throw new Error('読み込めるLogmateデータではありません。');
  const value = input as Record<string, unknown>;
  const data = value.data && typeof value.data === 'object' ? value.data as Record<string, unknown> : value;
  for (const key of ['notes', 'decisions', 'directions', 'manual']) {
    if (!Array.isArray(data[key]) || data[key].length > 100000) throw new Error(`データの形式が正しくありません: ${key}`);
  }
  const required = (item: unknown, fields: string[]) =>
    item !== null && typeof item === 'object' && fields.every(field => text((item as Record<string, unknown>)[field]));
  const base = (item: unknown) => required(item, ['id', 'createdAt', 'updatedAt']) &&
    validDate((item as Note).createdAt) && validDate((item as Note).updatedAt);
  if (!(data.notes as unknown[]).every(item => base(item) && required(item, ['body', 'category'])) ||
      !(data.decisions as unknown[]).every(item => base(item) && required(item, ['title', 'reason', 'outcome'])) ||
      !(data.directions as unknown[]).every(item => base(item) && required(item, ['title', 'detail']) && ['value', 'goal'].includes((item as Direction).kind)) ||
      !(data.manual as unknown[]).every(item => base(item) && required(item, ['title', 'body', 'source']))) {
    throw new Error('一部の記録の形式が正しくありません。');
  }
  for (const key of ['notes', 'decisions', 'directions', 'manual']) {
    const ids = (data[key] as { id: string }[]).map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error('重複した記録IDがあります。');
  }
  return { notes: data.notes as Note[], decisions: data.decisions as Decision[], directions: data.directions as Direction[], manual: data.manual as ManualItem[] };
}

export function useLogbook(userId: string) {
  const dbName = `logmate-user-${encodeURIComponent(userId)}`;
  const [data, setData] = useState<Logbook>(empty);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saving');
  const [error, setError] = useState<string | null>(null);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupUnlocked, setBackupUnlocked] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'off' | 'locked' | 'saving' | 'saved' | 'review' | 'error'>('off');
  const [backupError, setBackupError] = useState<string | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const keyRef = useRef<{ key: CryptoKey; salt: Uint8Array } | null>(null);
  const pendingSnapshotRef = useRef<Logbook | null>(null);
  const reviewRef = useRef(false);
  const enabledRef = useRef(false);
  const dataRef = useRef(data);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    Promise.all([
      transaction<unknown>(dbName, 'readonly', store => store.get(KEY)),
      transaction<unknown>(dbName, 'readonly', store => store.get(BACKUP_ENABLED_KEY)),
    ]).then(([raw, backupOn]) => {
      if (!active) return;
      const loaded = raw === undefined ? empty() : validate(raw);
      dataRef.current = loaded;
      setData(loaded);
      enabledRef.current = backupOn === true;
      setBackupEnabled(backupOn === true);
      setBackupStatus(backupOn === true ? 'locked' : 'off');
      setSaveStatus('saved');
    }).catch(cause => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : '保存データを読み込めませんでした。');
      setSaveStatus('error');
    }).finally(() => { if (active) setLoading(false); });
    transaction<unknown>(LEGACY_DB, 'readonly', store => store.get(KEY)).then(raw => {
      if (active && raw !== undefined) {
        validate(raw);
        setLegacyAvailable(true);
      }
    }).catch(() => { /* Legacy records remain untouched if unavailable. */ });
    return () => { active = false; keyRef.current = null; pendingSnapshotRef.current = null; };
  }, [dbName]);

  const persist = useCallback((next: Logbook, erase = false) => {
    setSaveStatus('saving');
    setError(null);
    const job = queue.current.catch(() => undefined).then(async () => {
      if (erase) {
        await writeEntries(dbName, {}, [KEY, BACKUP_KEY, BACKUP_ENABLED_KEY]);
        keyRef.current = null;
        pendingSnapshotRef.current = null;
        reviewRef.current = false;
        enabledRef.current = false;
        setBackupEnabled(false);
        setBackupUnlocked(false);
        setBackupStatus('off');
        setBackupError(null);
        return;
      }
      if (enabledRef.current && keyRef.current && !reviewRef.current) {
        setBackupStatus('saving');
        try {
          const encrypted = await sealBackup(next, userId, keyRef.current.key, keyRef.current.salt);
          await writeEntries(dbName, { [KEY]: next, [BACKUP_KEY]: encrypted });
          setBackupStatus('saved');
          setBackupError(null);
        } catch (cause) {
          setBackupStatus('error');
          setBackupError(cause instanceof Error ? cause.message : '暗号化バックアップの更新に失敗しました。');
          throw cause;
        }
      } else {
        await writeEntries(dbName, { [KEY]: next });
      }
    });
    queue.current = job;
    return job.then(() => { if (dataRef.current === next) setSaveStatus('saved'); }).catch(cause => {
      setSaveStatus('error');
      setError(cause instanceof Error ? cause.message : '端末内への保存に失敗しました。');
      throw cause;
    });
  }, [dbName, userId]);

  const change = useCallback((update: (current: Logbook) => Logbook) => {
    if (loading || saveStatus === 'error') return Promise.reject(new Error('保存領域を利用できません。'));
    const next = update(dataRef.current);
    dataRef.current = next;
    setData(next);
    return persist(next);
  }, [loading, saveStatus, persist]);

  const addNote = (input: Pick<Note, 'body' | 'category'>) =>
    change(current => ({ ...current, notes: [{ ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() }, ...current.notes] }));
  const updateNote = (id: string, patch: Partial<Pick<Note, 'body' | 'category'>>) =>
    change(current => ({ ...current, notes: current.notes.map(item => item.id === id ? { ...item, ...patch, updatedAt: now() } : item) }));
  const deleteNote = (id: string) =>
    change(current => ({ ...current, notes: current.notes.filter(item => item.id !== id) }));
  const addDecision = (input: Pick<Decision, 'title' | 'reason' | 'outcome'>) =>
    change(current => ({ ...current, decisions: [{ ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() }, ...current.decisions] }));
  const updateDecision = (id: string, patch: Partial<Pick<Decision, 'title' | 'reason' | 'outcome'>>) =>
    change(current => ({ ...current, decisions: current.decisions.map(item => item.id === id ? { ...item, ...patch, updatedAt: now() } : item) }));
  const deleteDecision = (id: string) =>
    change(current => ({ ...current, decisions: current.decisions.filter(item => item.id !== id) }));
  const addDirection = (input: Pick<Direction, 'title' | 'kind' | 'detail'>) =>
    change(current => ({ ...current, directions: [{ ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() }, ...current.directions] }));
  const updateDirection = (id: string, patch: Partial<Pick<Direction, 'title' | 'kind' | 'detail'>>) =>
    change(current => ({ ...current, directions: current.directions.map(item => item.id === id ? { ...item, ...patch, updatedAt: now() } : item) }));
  const deleteDirection = (id: string) =>
    change(current => ({ ...current, directions: current.directions.filter(item => item.id !== id) }));
  const addManual = (input: Pick<ManualItem, 'title' | 'body' | 'source'>) =>
    change(current => ({ ...current, manual: [{ ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() }, ...current.manual] }));
  const updateManual = (id: string, patch: Partial<Pick<ManualItem, 'title' | 'body' | 'source'>>) =>
    change(current => ({ ...current, manual: current.manual.map(item => item.id === id ? { ...item, ...patch, updatedAt: now() } : item) }));
  const deleteManual = (id: string) =>
    change(current => ({ ...current, manual: current.manual.filter(item => item.id !== id) }));

  const enableBackup = async (passphrase: string) => {
    if (loading || saveStatus === 'error') throw new Error('保存領域を利用できません。');
    if (passphrase.length < 12) throw new Error('パスフレーズは12文字以上にしてください。');
    await queue.current;
    const salt = newSalt();
    const key = await deriveBackupKey(passphrase, salt);
    setBackupStatus('saving');
    try {
      const encrypted = await sealBackup(dataRef.current, userId, key, salt);
      await writeEntries(dbName, { [BACKUP_ENABLED_KEY]: true, [BACKUP_KEY]: encrypted });
      keyRef.current = { key, salt };
      pendingSnapshotRef.current = null;
      reviewRef.current = false;
      enabledRef.current = true;
      setBackupEnabled(true);
      setBackupUnlocked(true);
      setBackupStatus('saved');
      setBackupError(null);
    } catch (cause) {
      setBackupStatus('error');
      setBackupError(cause instanceof Error ? cause.message : 'バックアップを有効にできませんでした。');
      throw cause;
    }
  };
  const unlockBackup = async (passphrase: string) => {
    await queue.current;
    if (!enabledRef.current) throw new Error('バックアップはOFFです。');
    const raw = await transaction<unknown>(dbName, 'readonly', store => store.get(BACKUP_KEY));
    const opened = await openBackup(parseEncryptedBackup(raw, userId), userId, passphrase);
    const snapshot = validate(opened.payload);
    keyRef.current = { key: opened.key, salt: opened.salt };
    setBackupUnlocked(true);
    if (backupNeedsReview(dataRef.current, snapshot)) {
      pendingSnapshotRef.current = snapshot;
      reviewRef.current = true;
      setBackupStatus('review');
      setBackupError(null);
      return;
    }
    pendingSnapshotRef.current = null;
    reviewRef.current = false;
    setBackupStatus('saved');
    setBackupError(null);
  };
  const recoverLocalBackup = async () => {
    if (!reviewRef.current || !pendingSnapshotRef.current) throw new Error('復元できるスナップショットがありません。');
    const snapshot = pendingSnapshotRef.current;
    await change(() => snapshot);
    pendingSnapshotRef.current = null;
    reviewRef.current = false;
    setBackupStatus('saved');
  };
  const updateLocalBackup = async () => {
    if (!reviewRef.current || !keyRef.current) throw new Error('比較が必要なスナップショットがありません。');
    await queue.current;
    setBackupStatus('saving');
    try {
      const encrypted = await sealBackup(dataRef.current, userId, keyRef.current.key, keyRef.current.salt);
      await writeEntries(dbName, { [BACKUP_KEY]: encrypted });
      pendingSnapshotRef.current = null;
      reviewRef.current = false;
      setBackupStatus('saved');
      setBackupError(null);
    } catch (cause) {
      setBackupStatus('review');
      setBackupError(cause instanceof Error ? cause.message : 'バックアップの更新に失敗しました。');
      throw cause;
    }
  };
  const disableBackup = async () => {
    await queue.current;
    await writeEntries(dbName, {}, [BACKUP_KEY, BACKUP_ENABLED_KEY]);
    keyRef.current = null;
    pendingSnapshotRef.current = null;
    reviewRef.current = false;
    enabledRef.current = false;
    setBackupEnabled(false);
    setBackupUnlocked(false);
    setBackupStatus('off');
    setBackupError(null);
  };
  const exportEncryptedBackup = async () => {
    if (!enabledRef.current || !keyRef.current || !['saved', 'review'].includes(backupStatus)) {
      throw new Error('バックアップを有効にし、パスフレーズで解除してください。');
    }
    await queue.current;
    const raw = await transaction<unknown>(dbName, 'readonly', store => store.get(BACKUP_KEY));
    const encrypted = parseEncryptedBackup(raw, userId);
    const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logmate-encrypted-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const restoreEncryptedBackup = async (file: File, passphrase: string) => {
    if (file.size > 30 * 1024 * 1024) throw new Error('30MB以下の暗号化ファイルを選択してください。');
    const raw: unknown = JSON.parse(await file.text());
    const opened = await openBackup(parseEncryptedBackup(raw, userId), userId, passphrase);
    const next = validate(opened.payload);
    // If backups were enabled, rotate the in-memory encryption key to the
    // restored passphrase so the local snapshot cannot be left stale.
    if (enabledRef.current) {
      keyRef.current = { key: opened.key, salt: opened.salt };
      pendingSnapshotRef.current = null;
      reviewRef.current = false;
      setBackupUnlocked(true);
    }
    await change(() => next);
  };
  const importLegacyData = async () => {
    const raw = await transaction<unknown>(LEGACY_DB, 'readonly', store => store.get(KEY));
    if (raw === undefined) throw new Error('以前の記録が見つかりません。');
    await change(() => validate(raw));
    // Keep anonymous data intact: another account may need to claim it.
  };
  const clearAll = async () => {
    if (loading || saveStatus === 'error') throw new Error('保存領域を利用できません。');
    const next = empty();
    dataRef.current = next;
    setData(next);
    await persist(next, true);
  };
  return { data, loading, saveStatus, error, backupEnabled, backupUnlocked, backupStatus, backupError, legacyAvailable, enableBackup, unlockBackup, recoverLocalBackup, updateLocalBackup, disableBackup, exportEncryptedBackup, restoreEncryptedBackup, importLegacyData, addNote, updateNote, deleteNote, addDecision, updateDecision, deleteDecision, addDirection, updateDirection, deleteDirection, addManual, updateManual, deleteManual, clearAll };
}

const TOPICS: { label: string; words: string[] }[] = [
  { label: '接客・顧客', words: ['接客', 'お客様', '顧客', '来店', 'クレーム'] },
  { label: 'スタッフ', words: ['スタッフ', 'シフト', '教育', '引き継ぎ', '採用'] },
  { label: '売上・集客', words: ['売上', '客数', '集客', '販促', 'リピート'] },
  { label: '商品・在庫', words: ['商品', '在庫', '仕入', '品切れ', '発注'] },
  { label: '店舗運営', words: ['オペレーション', '作業', '待ち時間', '動線', '開店', '閉店'] },
];
const positiveWords = ['改善', '良くな', 'よくな', '解決', '減った', '増えた', '順調', '成功', 'できた'];
const issueWords = ['問題', '課題', '失敗', '困っ', '不足', '遅れ', 'クレーム', 'ミス'];
const matchedTopics = (body: string) => TOPICS.filter(topic => topic.words.some(word => body.includes(word))).map(topic => topic.label);

export function derivePatterns(notes: Note[]) {
  const counts = new Map<string, number>();
  for (const note of notes) {
    if (note.category) counts.set(note.category, (counts.get(note.category) ?? 0) + 1);
  }
  const categoryCounts = [...counts].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  const topicCounts = new Map<string, number>();
  const growth = new Map<string, { recent: number; previous: number }>();
  const improving = new Map<string, number>();
  const today = Date.now();
  for (const note of notes) {
    const age = (today - Date.parse(note.createdAt)) / 86400000;
    const topics = matchedTopics(note.body);
    if (!topics.length && (note.category === '失敗' || issueWords.some(word => note.body.includes(word)))) topics.push('その他の課題');
    for (const label of topics) {
      if (issueWords.some(word => note.body.includes(word)) || note.category === '失敗') topicCounts.set(label, (topicCounts.get(label) ?? 0) + 1);
      if (age >= 0 && age < 28) {
        const entry = growth.get(label) ?? { recent: 0, previous: 0 };
        if (age < 14) entry.recent++; else entry.previous++;
        growth.set(label, entry);
      }
      if (positiveWords.some(word => note.body.includes(word))) improving.set(label, (improving.get(label) ?? 0) + 1);
    }
  }
  return {
    categoryCounts,
    recurring: [...topicCounts].filter(([, count]) => count >= 2).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    growing: [...growth].filter(([, value]) => value.recent > value.previous && value.recent >= 2).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.recent - a.recent),
    improving: [...improving].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };
}

export function deriveManualCandidates(notes: Note[], decisions: Decision[], manual: ManualItem[]) {
  const candidates: { title: string; body: string; source: string }[] = [];
  const patterns = derivePatterns(notes);
  for (const recurring of patterns.recurring) {
    candidates.push({ title: `${recurring.label}への対応を整理する`, body: `${recurring.label}に関する課題が${recurring.count}件記録されています。対応手順や確認事項をここに整理してください。`, source: `繰り返す課題: ${recurring.label}` });
  }
  for (const decision of decisions) {
    if (!decision.outcome.trim()) continue;
    candidates.push({ title: decision.title, body: `判断の理由: ${decision.reason}\n結果: ${decision.outcome}\n\n次回のための手順をここに整理してください。`, source: `判断: ${decision.id}` });
  }
  return candidates.filter(candidate => !manual.some(item => item.source === candidate.source || item.title === candidate.title));
}