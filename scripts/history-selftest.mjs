import assert from 'node:assert/strict';
import { commitState, historyId, listHistory, readHistory, RETENTION_MS } from '../netlify/lib/shared-history.mjs';

// Model the storage contract, including conditional writes and failures.
class Store {
  records = new Map();
  sequence = 0;
  failArchive = false;
  async setJSON(key, data, options = {}) {
    if (key.startsWith('history/') && this.failArchive) throw new Error('archive unavailable');
    const old = this.records.get(key);
    if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false };
    this.records.set(key, { data: structuredClone(data), metadata: options.metadata, etag: String(++this.sequence) });
    return { modified: true };
  }
  async get(key) { return structuredClone(this.records.get(key)?.data || null); }
  async delete(key) { this.records.delete(key); }
  async *list({ prefix }) { yield { blobs: [...this.records.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) }; }
  current() {
    const row = this.records.get('shared-data');
    return row ? { data: structuredClone(row.data), ...row.metadata, etag: row.etag } : null;
  }
}
const store = new Store();
const first = { version: '1', trips: { a: { tripInfo: { name: 'First trip' } } }, allowedEmails: [] };
await commitState(store, null, first);
const v1 = store.current();
assert.equal((await listHistory(store, v1)).length, 1, 'Current accepted version is immediately visible');
await commitState(store, v1, { ...first, trips: {} });
const v2 = store.current();
assert.deepEqual((await readHistory(store, historyId(v1), v2)).data, first, 'Prior content survives replacement');
assert.deepEqual((await listHistory(store, v2)).map(v => v.revision), [2, 1]);
const old = await readHistory(store, historyId(v1), v2);
await commitState(store, v2, old.data, old.id);
const v3 = store.current();
assert.equal(v3.revision, 3, 'Restore creates a fresh revision');
assert.equal(v3.restoredFrom, old.id);
assert.deepEqual((await listHistory(store, v3)).map(v => v.revision), [3, 2, 1], 'Restore retains intervening history');
const staleWrite = await commitState(store, v2, { ...first, trips: {} });
assert.equal(staleWrite.modified, false, 'Stale device cannot overwrite a newer revision');
assert.equal(store.current().revision, 3);
store.failArchive = true;
await assert.rejects(commitState(store, v3, { ...first, trips: {} }));
assert.equal(store.current().revision, 3, 'Archive failure prevents overwrite');
store.failArchive = false;
const expired = { id: '99-' + 'a'.repeat(64), revision: 99, data: first, createdAt: new Date(Date.now() - RETENTION_MS - 1000).toISOString() };
await store.setJSON('history/' + expired.id, expired);
assert.equal(await readHistory(store, expired.id, v3), null, 'Expired snapshots cannot be restored');
await listHistory(store, v3);
assert.equal(await store.get('history/' + expired.id), null, 'Expired snapshot is pruned');
assert.equal(await readHistory(store, '../auth-meta', v3), null, 'History ids cannot access unrelated records');
// Even a current version last edited months ago remains recoverable after replacement.
const older = new Store();
await older.setJSON('shared-data', first, { metadata: { revision: 1, updatedAt: new Date(0).toISOString() } });
const olderCurrent = older.current();
await commitState(older, olderCurrent, { ...first, trips: {} });
assert.ok(await readHistory(older, historyId(olderCurrent), older.current()), 'Retention starts when a version is replaced');
console.log('History checks passed: archival, restore, concurrency, failure, expiry and id validation.');
