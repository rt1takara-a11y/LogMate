import type { Logbook } from './logbook';

export type EncryptedBackup = {
  format: 'logmate-encrypted';
  version: 1;
  ownerId: string;
  createdAt: string;
  kdf: 'PBKDF2-SHA256';
  iterations: 600000;
  salt: string;
  cipher: 'AES-256-GCM';
  iv: string;
  ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let encoded = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    encoded += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(encoded);
}

function fromBase64(value: string, expectedLength?: number): Uint8Array {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length > 40 * 1024 * 1024) {
    throw new Error('暗号化ファイルの形式が正しくありません。');
  }
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0));
  if (expectedLength !== undefined && bytes.length !== expectedLength) throw new Error('暗号化ファイルの形式が正しくありません。');
  return bytes;
}

export function parseEncryptedBackup(input: unknown, userId: string): EncryptedBackup {
  if (!input || typeof input !== 'object') throw new Error('Logmateの暗号化バックアップではありません。');
  const value = input as Partial<EncryptedBackup>;
  if (value.format !== 'logmate-encrypted' || value.version !== 1 || value.kdf !== 'PBKDF2-SHA256' ||
      value.iterations !== 600000 || value.cipher !== 'AES-256-GCM' ||
      typeof value.ownerId !== 'string' || typeof value.createdAt !== 'string' ||
      typeof value.salt !== 'string' || typeof value.iv !== 'string' || typeof value.ciphertext !== 'string') {
    throw new Error('対応していない暗号化バックアップです。');
  }
  if (value.ownerId !== userId) throw new Error('このバックアップは別のアカウントのものです。');
  fromBase64(value.salt, 16);
  fromBase64(value.iv, 12);
  if (fromBase64(value.ciphertext).length < 16) throw new Error('暗号化ファイルの形式が正しくありません。');
  return value as EncryptedBackup;
}

export async function deriveBackupKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!passphrase) throw new Error('パスフレーズを入力してください。');
  const input = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 600000, hash: 'SHA-256' },
    input,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function newSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function backupNeedsReview(primary: Logbook, snapshot: Logbook): boolean {
  return JSON.stringify(primary) !== JSON.stringify(snapshot);
}

export async function sealBackup(data: Logbook, userId: string, key: CryptoKey, salt: Uint8Array): Promise<EncryptedBackup> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const createdAt = new Date().toISOString();
  const plaintext = encoder.encode(JSON.stringify({ format: 'logmate', version: 1, data }));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(`logmate-backup-v1:${userId}`) },
    key,
    plaintext,
  );
  return {
    format: 'logmate-encrypted', version: 1, ownerId: userId, createdAt,
    kdf: 'PBKDF2-SHA256', iterations: 600000, salt: toBase64(salt),
    cipher: 'AES-256-GCM', iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function openBackup(backup: EncryptedBackup, userId: string, passphrase: string): Promise<{ payload: unknown; key: CryptoKey; salt: Uint8Array }> {
  const checked = parseEncryptedBackup(backup, userId);
  const salt = fromBase64(checked.salt, 16);
  const key = await deriveBackupKey(passphrase, salt);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(checked.iv, 12) as BufferSource, additionalData: encoder.encode(`logmate-backup-v1:${userId}`) },
      key,
      fromBase64(checked.ciphertext) as BufferSource,
    );
    return { payload: JSON.parse(decoder.decode(plaintext)) as unknown, key, salt };
  } catch {
    throw new Error('パスフレーズが違うか、バックアップが破損しています。');
  }
}