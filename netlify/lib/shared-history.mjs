import { createHash } from 'node:crypto';

export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export function historyId(state) {
  return `${state.revision}-${createHash('sha256').update(JSON.stringify(state.data)).digest('hex')}`;
}
export function historyEntry(state, now = Date.now()) {
  return {
    id: historyId(state), revision: state.revision, data: state.data,
    createdAt: state.updatedAt || null, archivedAt: new Date(now).toISOString(),
    restoredFrom: state.restoredFrom || null,
  };
}
export function isExpired(entry, now = Date.now()) {
  return Date.parse(entry.archivedAt || entry.createdAt) < now - RETENTION_MS;
}
export function summary(entry, currentId) {
  return {
    id: entry.id, revision: entry.revision, createdAt: entry.createdAt,
    restoredFrom: entry.restoredFrom, current: entry.id === currentId,
    trips: Object.values(entry.data.trips || {}).map(trip => trip.tripInfo?.name || trip.tripInfo?.destination || trip.tripInfo?.id || 'Chuyến đi'),
  };
}
export async function archiveState(store, state) {
  if (!state) return;
  const entry = historyEntry(state);
  // Archive the committed state BEFORE replacing it. If archival fails, saving stops.
  await store.setJSON(`history/${entry.id}`, entry, { onlyIfNew: true });
}
export async function readHistory(store, id, current) {
  if (!/^\d+-[a-f0-9]{64}$/.test(id)) return null;
  if (current && historyId(current) === id) return historyEntry(current);
  const entry = await store.get(`history/${id}`, { type: 'json', consistency: 'strong' });
  return entry && !isExpired(entry) ? entry : null;
}
export async function listHistory(store, current) {
  const currentEntry = current ? historyEntry(current) : null;
  const entries = new Map();
  // Bounded parallel reads per page; expired copies are removed on history access.
  for await (const page of store.list({ prefix: 'history/', paginate: true })) {
    for (let i = 0; i < page.blobs.length; i += 10) {
      await Promise.all(page.blobs.slice(i, i + 10).map(async ({ key }) => {
        const entry = await store.get(key, { type: 'json', consistency: 'strong' });
        if (!entry) return;
        if (entry.id !== currentEntry?.id && isExpired(entry)) {
          await store.delete(key);
        } else entries.set(entry.id, summary(entry, currentEntry?.id));
      }));
    }
  }
  if (currentEntry) entries.set(currentEntry.id, summary(currentEntry, currentEntry.id));
  return [...entries.values()].sort((a, b) => b.revision - a.revision);
}

export async function commitState(store, current, data, restoredFrom) {
  await archiveState(store, current);
  const revision = current ? current.revision + 1 : 1;
  const updatedAt = new Date().toISOString();
  const metadata = { revision, updatedAt, ...(restoredFrom ? { restoredFrom } : {}) };
  const write = await store.setJSON('shared-data', data, {
    metadata,
    ...(current ? { onlyIfMatch: current.etag } : { onlyIfNew: true }),
  });
  return { modified: write.modified, revision, data };
}
