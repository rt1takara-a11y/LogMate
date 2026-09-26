import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { backupNeedsReview, deriveBackupKey, newSalt, openBackup, parseEncryptedBackup, sealBackup } from '../src/lib/encrypted-backup.ts';

const userId = 'user_example';
const passphrase = 'a-long-private-passphrase';
const data = {
  notes: [{ id: 'note-1', body: 'private journal text', category: '気づき', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }],
  decisions: [], directions: [], manual: [],
};

test('encrypted backup round-trips without plaintext in the file', async () => {
  const salt = newSalt();
  const key = await deriveBackupKey(passphrase, salt);
  const backup = await sealBackup(data, userId, key, salt);
  assert.equal(JSON.stringify(backup).includes(data.notes[0].body), false);
  const opened = await openBackup(parseEncryptedBackup(backup, userId), userId, passphrase);
  assert.deepEqual(opened.payload, { format: 'logmate', version: 1, data });
});

test('other accounts, wrong passphrases, and tampered files cannot restore', async () => {
  const salt = newSalt();
  const key = await deriveBackupKey(passphrase, salt);
  const backup = await sealBackup(data, userId, key, salt);
  assert.throws(() => parseEncryptedBackup(backup, 'user_other'), /別のアカウント/);
  await assert.rejects(openBackup(backup, userId, 'wrong'), /パスフレーズが違う/);
  const corrupted = { ...backup, ciphertext: backup.ciphertext.slice(0, -4) + 'AAAA' };
  await assert.rejects(openBackup(corrupted, userId, passphrase), /パスフレーズが違う/);
});

test('missing or stale primary journal requires review before snapshot replacement', () => {
  assert.equal(backupNeedsReview(data, data), false);
  assert.equal(backupNeedsReview({ notes: [], decisions: [], directions: [], manual: [] }, data), true);
  assert.equal(backupNeedsReview({ ...data, notes: [{ ...data.notes[0], body: 'older text' }] }, data), true);
});