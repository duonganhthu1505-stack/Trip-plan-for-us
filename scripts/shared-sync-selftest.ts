import assert from 'node:assert/strict';
import type { AppData } from '../src/types';
import { reconcileSharedStartup, sharedDataFingerprint } from '../src/utils/sharedSync';

const state = (notes: string[], title = 'Trip') => ({
  version: 1, trips: { trip: { tripInfo: { id: 'trip', name: title }, notes: notes.map(id => ({ id, content: id })) } },
  allowedEmails: [], activeTripId: 'trip', userEmail: null,
}) as unknown as AppData;
const base = state(['old']);
const phone = state(['old', 'phone']);
// Opening a stale laptop, even with a spurious dirty flag, must not undo phone edits.
assert.equal(sharedDataFingerprint(reconcileSharedStartup(base, phone, base, base).data), sharedDataFingerprint(phone));
// Legacy cache without a baseline is quarantined instead of uploaded.
const unknown = reconcileSharedStartup(null, phone, base, base);
assert.equal(sharedDataFingerprint(unknown.data), sharedDataFingerprint(phone));
assert.equal(unknown.preserveLocalCopy, true);
// Genuine offline edits merge with new phone records.
const laptop = state(['old'], 'Laptop edit');
const merged = reconcileSharedStartup(base, phone, laptop, laptop).data;
assert.equal((merged.trips.trip.tripInfo as any).name, 'Laptop edit');
assert.deepEqual(merged.trips.trip.notes.map(n => n.id), ['old', 'phone']);
// Server deletions must not be resurrected by an unchanged cached copy.
assert.deepEqual(reconcileSharedStartup(base, state([]), base, base).data.trips.trip.notes, []);
// Edits made during the startup request are preserved without replaying stale fields.
const duringFetch = reconcileSharedStartup(null, phone, laptop, base).data;
assert.equal((duringFetch.trips.trip.tripInfo as any).name, 'Laptop edit');
assert.deepEqual(duringFetch.trips.trip.notes.map(n => n.id), ['old', 'phone']);
console.log('Shared startup sync regression checks passed.');
