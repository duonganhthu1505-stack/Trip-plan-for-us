/**
 * sync v2 self-test — `npx tsx scripts/sync-selftest.ts`
 *
 * Pure logic only: no browser, no network, no Firebase project. It locks in the
 * promises of sync v2:
 *   - the cloud is the single source of truth (an empty remote list stays empty),
 *   - conflicts are decided with the server timestamp, never the device clock,
 *   - writes are field-level merges, so two devices editing two different fields
 *     at the same time both keep their edit,
 *   - a stale editor can never delete a row the other device just added.
 */

import assert from 'node:assert/strict';
import {
  TRIP_MERGE_FIELDS,
  baselineFromRemote,
  coverHashOf,
  deletableRemoteIds,
  diffTripInfoFields,
  dirtyTripFields,
  fingerprint,
  fullTripFields,
  getClientMillis,
  getServerMillis,
  isTripDirty,
  mergeItemLists,
  mergeTripInfoFieldLevel,
  normalizeTripFieldsForFirestore,
  planTripSync,
  splitTripInfo,
  toMillis,
} from '../src/utils/syncCore';
import type { ServiceOption, TripInfo } from '../src/types';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passed++;
    console.log('PASS -', name);
  } else {
    failed++;
    console.log('FAIL -', name);
    if (detail !== undefined) console.log('       ->', JSON.stringify(detail));
  }
}

function checkEqual(name: string, actual: unknown, expected: unknown): void {
  try {
    assert.deepEqual(actual, expected);
    check(name, true);
  } catch {
    check(name, false, { actual, expected });
  }
}

const trip = (overrides: Partial<TripInfo> = {}): TripInfo => ({
  id: 'trip-1',
  name: 'Đà Lạt 2026',
  destination: 'Đà Lạt',
  startDate: '2026-11-20',
  endDate: '2026-11-23',
  travelers: 2,
  travelerNames: 'Anh & Em',
  transport: 'Máy bay',
  hotel: 'Homestay',
  coverImage: 'data:image/jpeg;base64,OLD-COVER',
  notes: 'mong chờ!',
  plannedBudget: 5000000,
  status: 'Planning',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-10T00:00:00.000Z',
  ...overrides,
});

const service = (id: string, name: string): ServiceOption => ({
  id,
  tripId: 'trip-1',
  category: 'Hotel',
  name,
  isChosen: false,
});

/* ================================================================== *
 * 1. Timestamps — the device clock is never the answer
 * ================================================================== */

checkEqual(
  'toMillis() reads a Firestore Timestamp',
  toMillis({ seconds: 1758000000, nanoseconds: 500000000 }),
  1758000000_500
);
checkEqual('toMillis() reads a Timestamp-like object', toMillis({ toMillis: () => 4242 }), 4242);
checkEqual('toMillis() reads an ISO string', toMillis('2026-09-19T00:00:00.000Z'), Date.parse('2026-09-19T00:00:00.000Z'));
checkEqual('toMillis() passes numbers through', toMillis(1726700000000), 1726700000000);
checkEqual('toMillis() reads a Date', toMillis(new Date(1000)), 1000);
check('toMillis() returns null for a pending serverTimestamp() sentinel', toMillis(null) === null && toMillis(undefined) === null);
check('toMillis() returns null for garbage', toMillis('not-a-date') === null);
checkEqual(
  'getServerMillis() reads the Firestore server stamp',
  getServerMillis({ serverUpdatedAt: { seconds: 100, nanoseconds: 0 } }),
  100000
);
checkEqual('getClientMillis() reads the client ISO stamp', getClientMillis({ updatedAt: '1970-01-01T00:00:02.000Z' }), 2000);

/* ================================================================== *
 * 2. Fingerprints and trip field split
 * ================================================================== */

check('fingerprint() is stable for identical content', fingerprint('abc') === fingerprint('abc'));
check('fingerprint() differs for different content', fingerprint('abc') !== fingerprint('abd'));
checkEqual('fingerprint() of nothing is "0:0"', fingerprint(''), '0:0');
checkEqual('splitTripInfo() keeps the cover out of the merged fields', 'coverImage' in splitTripInfo(trip()).fields, false);
checkEqual('splitTripInfo() returns all merge fields', Object.keys(splitTripInfo(trip()).fields).sort(), [...TRIP_MERGE_FIELDS].sort());

/* ================================================================== *
 * 3. Field-level diffs — "write only what changed"
 * ================================================================== */

const baseTrip = trip();
const baseFields = splitTripInfo(baseTrip).fields;

checkEqual('diffTripInfoFields() is empty when nothing changed', diffTripInfoFields(baseFields, baseFields), {});
checkEqual(
  'diffTripInfoFields() returns only the changed field',
  Object.keys(diffTripInfoFields(baseFields, { ...baseFields, name: 'Đà Lạt — chuyến mới' })),
  ['name']
);
checkEqual(
  'diffTripInfoFields() treats 5000000 and "5000000" as equal',
  diffTripInfoFields(baseFields, { ...baseFields, plannedBudget: '5000000' }),
  {}
);
checkEqual(
  'normalizeTripFieldsForFirestore() fills the values firestore.rules requires',
  normalizeTripFieldsForFirestore({ name: '   ', destination: '', status: 'Nope', travelers: 0 }),
  { name: 'Untitled Journey', destination: 'Unknown', status: 'Planning', travelers: 2 }
);
checkEqual(
  'fullTripFields() returns a complete, rule-safe document',
  Object.keys(fullTripFields(trip())).length,
  TRIP_MERGE_FIELDS.length
);

/* ================================================================== *
 * 4. Dirty detection
 * ================================================================== */

const baseline = baselineFromRemote(
  // A raw Firestore document holds the server stamp as a Timestamp object.
  { ...baseTrip, serverUpdatedAt: { seconds: 1000, nanoseconds: 0 } } as unknown as Partial<TripInfo>,
  baseTrip.coverImage
);
checkEqual('baselineFromRemote() records the server stamp', baseline.serverUpdatedAt, 1000000);
checkEqual('baselineFromRemote() records the cover hash', baseline.coverHash, coverHashOf(baseTrip));
check('isTripDirty() is true without a baseline (never uploaded)', isTripDirty(trip(), undefined));
check('isTripDirty() is false for an untouched trip', !isTripDirty(trip(), baseline));
check('isTripDirty() notices a text edit', isTripDirty(trip({ hotel: 'Khách sạn mới' }), baseline));
check('isTripDirty() notices a cover change', isTripDirty(trip({ coverImage: 'data:image/jpeg;base64,NEW-COVER' }), baseline));
checkEqual(
  'dirtyTripFields() sends only the edited field',
  dirtyTripFields(trip({ hotel: 'Khách sạn mới' }), baseline),
  { hotel: 'Khách sạn mới' }
);

/* ================================================================== *
 * 5. The scenario from the hand-off checklist:
 *    A renames the trip while B changes the cover — both must survive.
 * ================================================================== */

const localAfterRename = trip({ name: 'Đà Lạt 2026 (tên mới)', serverUpdatedAt: 900000 });
const cloudAfterCoverChange = trip({
  coverImage: 'data:image/jpeg;base64,COVER-FROM-B',
  serverUpdatedAt: 1000000,
});
const mergedBoth = mergeTripInfoFieldLevel(localAfterRename, cloudAfterCoverChange, baseline);

checkEqual('merge keeps the rename made on this device', mergedBoth.name, 'Đà Lạt 2026 (tên mới)');
checkEqual('merge keeps the cover uploaded by the other device', mergedBoth.coverImage, 'data:image/jpeg;base64,COVER-FROM-B');
checkEqual('merge keeps untouched cloud values', mergedBoth.hotel, cloudAfterCoverChange.hotel);
checkEqual('merge keeps the newest server stamp', mergedBoth.serverUpdatedAt, 1000000);

const localAfterCoverChange = trip({ coverImage: 'data:image/jpeg;base64,COVER-FROM-A', serverUpdatedAt: 900000 });
const cloudAfterRename = trip({ name: 'Tên do thiết bị B đặt', serverUpdatedAt: 1000000 });
const mergedOther = mergeTripInfoFieldLevel(localAfterCoverChange, cloudAfterRename, baseline);
checkEqual('merge keeps the local cover when this device changed it', mergedOther.coverImage, 'data:image/jpeg;base64,COVER-FROM-A');
checkEqual('merge adopts the rename made on the other device', mergedOther.name, 'Tên do thiết bị B đặt');

/* ================================================================== *
 * 6. Reconciliation plan
 * ================================================================== */

const remoteOnly = planTripSync({
  localTrips: [],
  remoteTrips: [trip({ id: 'trip-cloud' })],
  baselines: {},
});
checkEqual('plan adopts a trip that only exists in the cloud', remoteOnly.adopt.map((t) => t.id), ['trip-cloud']);

const newLocal = planTripSync({ localTrips: [trip({ id: 'trip-new' })], remoteTrips: [], baselines: {} });
checkEqual('plan uploads a genuinely new local trip', newLocal.uploads.map((u) => u.id), ['trip-new']);
check('new trip upload is marked as a full bundle', newLocal.uploads[0]?.isNew === true);

const ghostLocal = planTripSync({
  localTrips: [trip({ id: 'trip-deleted-elsewhere' })],
  remoteTrips: [],
  baselines: {},
  knownRemoteIds: ['trip-deleted-elsewhere'],
});
checkEqual('plan drops a local trip the cloud no longer has', ghostLocal.dropLocal, ['trip-deleted-elsewhere']);
check('a dropped trip is not uploaded again', ghostLocal.uploads.length === 0);

const cleanBoth = planTripSync({
  localTrips: [trip()],
  remoteTrips: [trip()],
  baselines: { 'trip-1': baseline },
});
check('clean trip: nothing to upload, cloud copy adopted', cleanBoth.uploads.length === 0 && cleanBoth.adopt.length === 1);

const dirtyBoth = planTripSync({
  localTrips: [trip({ hotel: 'Khách sạn mới' })],
  remoteTrips: [trip({ name: 'Tên khác từ thiết bị kia' })],
  baselines: { 'trip-1': baseline },
});
checkEqual('dirty trip: pushes only the locally changed field', dirtyBoth.uploads[0]?.fields, { hotel: 'Khách sạn mới' });
checkEqual('dirty trip: keeps the cloud value for the other field', dirtyBoth.merged[0]?.name, 'Tên khác từ thiết bị kia');

const deletedPlan = planTripSync({
  localTrips: [trip()],
  remoteTrips: [trip()],
  baselines: { 'trip-1': baseline },
  deletedIds: ['trip-1'],
});
checkEqual('plan honours deletions', deletedPlan.dropLocal, ['trip-1']);
check('deleted trip is not adopted back', deletedPlan.adopt.length === 0);

/* ================================================================== *
 * 7. List merging — cloud wins, an empty cloud list stays empty
 * ================================================================== */

const cloudWins = mergeItemLists([service('s1', 'Local name')], [service('s1', 'Cloud name')], []);
checkEqual('list merge: the cloud row wins', cloudWins.items.map((s) => s.name), ['Cloud name']);

const emptyCloud = mergeItemLists([service('s1', 'Đã xoá trên máy kia')], [], []);
checkEqual('list merge: an empty cloud list is NOT a fallback to local', emptyCloud.items.length, 0);
checkEqual('list merge: the dropped row is reported', emptyCloud.dropped, ['s1']);

const pendingKept = mergeItemLists([service('s1', 'Vừa thêm, chưa up')], [], ['s1']);
checkEqual('list merge: a row whose upload is pending survives', pendingKept.items.map((s) => s.id), ['s1']);

const mixed = mergeItemLists(
  [service('s1', 'Cloud version'), service('s2', 'Pending row'), service('s3', 'Stale row')],
  [service('s1', 'Cloud wins')],
  ['s2']
);
checkEqual('list merge: cloud rows + pending rows, nothing else', mixed.items.map((s) => s.id).sort(), ['s1', 's2']);

/* ================================================================== *
 * 8. Deletion safety — a stale editor cannot delete a new row
 * ================================================================== */

checkEqual(
  'deletableRemoteIds() only returns rows this device had seen',
  deletableRemoteIds(['s1', 's2'], ['s2']),
  ['s1']
);
checkEqual(
  'deletableRemoteIds() never deletes a row added by the other device',
  deletableRemoteIds(['s1'], ['s1', 's2-added-elsewhere']),
  []
);
checkEqual(
  'deletableRemoteIds() is empty when nothing was removed',
  deletableRemoteIds(['s1', 's2'], ['s1', 's2']),
  []
);

/* ================================================================== *
 * Result
 * ================================================================== */

console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
