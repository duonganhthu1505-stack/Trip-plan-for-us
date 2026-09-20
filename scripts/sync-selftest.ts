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
  bundlePushTargets,
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
  mergeNotesWithCloud,
  mergeTripInfoFieldLevel,
  notePhotoId,
  notePhotoIdsFromLedger,
  shouldPushList,
  orphanPhotoIds,
  planNotePhotos,
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
 * 9. Journal photos — one document per photo
 *
 * A note document is capped at 1 MiB, so photos live in their own documents.
 * These checks lock in the promises that fix "the other phone never sees my
 * photo": the note keeps an aligned id/preview array, a photo that has not been
 * uploaded keeps its original on the device that has it, and a photo that IS on
 * the cloud stops weighing down local storage.
 * ================================================================== */

const photo = (marker: string) => `data:image/jpeg;base64,${marker}`;

// A photo id is derived from the note + the image, so the same picture always
// maps to the same document: a retry never creates a duplicate.
checkEqual(
  'notePhotoId() is stable for the same photo',
  notePhotoId('note-1', photo('abc')),
  notePhotoId('note-1', photo('abc'))
);
check(
  'notePhotoId() differs between two photos',
  notePhotoId('note-1', photo('abc')) !== notePhotoId('note-1', photo('abd'))
);

const freshNote = {
  id: 'note-1',
  images: [photo('one'), photo('two')],
  photoIds: [] as string[],
  photoThumbs: [] as string[]
};

const freshPlan = planNotePhotos(freshNote, []);
checkEqual('a new note uploads every photo', freshPlan.uploads.length, 2);
checkEqual('an unuploaded photo gets an empty id (array stays aligned)', freshPlan.photoIds[0], notePhotoId('note-1', photo('one')));
check(
  'the id/preview arrays match the number of photos',
  freshPlan.photoIds.length === 2 && freshPlan.photoThumbs.length === 2
);

// Once the photo is on the cloud it is not uploaded again.
const knownId = notePhotoId('note-1', photo('one'));
const secondPlan = planNotePhotos(freshNote, [knownId]);
checkEqual('an uploaded photo is not uploaded a second time', secondPlan.uploads.length, 1);
checkEqual('an uploaded photo is not uploaded a second time (which one)', secondPlan.uploads[0].order, 1);
checkEqual('the already-uploaded id is kept in the note', secondPlan.photoIds[0], knownId);

// A note whose payload was trimmed from local storage keeps whatever the cloud had.
const trimmedNote = {
  id: 'note-2',
  images: ['', photo('two')],
  photoIds: ['note-2__known', ''],
  photoThumbs: ['thumb-a', '']
};
const trimmedPlan = planNotePhotos(trimmedNote, ['note-2__known']);
checkEqual('a trimmed photo is never re-uploaded from an empty payload', trimmedPlan.uploads.length, 1);
checkEqual('a trimmed photo keeps its cloud id', trimmedPlan.photoIds[0], 'note-2__known');
checkEqual('a trimmed photo keeps its preview', trimmedPlan.photoThumbs[0], 'thumb-a');

// The cloud row wins for text, but an unuploaded photo is never thrown away.
const localNote = {
  id: 'note-1',
  title: 'Ban đầu',
  content: 'của máy này',
  images: [photo('one'), photo('two')],
  photoIds: ['', ''],
  photoThumbs: ['t1', 't2']
};
const cloudNote = {
  id: 'note-1',
  title: 'Sửa trên máy kia',
  content: 'nội dung mới',
  photoIds: ['', ''],
  photoThumbs: ['t1', 't2']
};
const merged = mergeNotesWithCloud(
  [localNote],
  [cloudNote as any],
  ['note-1'],
  []
);
checkEqual('cloud text wins in the merge', merged.items[0].title, 'Sửa trên máy kia');
checkEqual(
  'a photo that never reached the cloud is kept on this device',
  merged.items[0].images?.[0],
  photo('one')
);

// Once the photo is on the cloud the heavy local copy is dropped.
const mergedUploaded = mergeNotesWithCloud(
  [localNote],
  [{ ...cloudNote, photoIds: ['note-1__a', ''] } as any],
  ['note-1'],
  []
);
checkEqual(
  'an uploaded photo is dropped from local storage',
  mergedUploaded.items[0].images?.[0],
  ''
);
checkEqual(
  'the photo that is still missing keeps its local copy',
  mergedUploaded.items[0].images?.[1],
  photo('two')
);

// Notes that only exist on this device stay while their upload is pending.
const mergedPending = mergeNotesWithCloud([localNote], [], ['note-1']);
checkEqual('a pending note is not deleted by a cloud snapshot', mergedPending.items.length, 1);
const mergedNotPending = mergeNotesWithCloud([localNote], [], []);
checkEqual('a note the cloud never had and that is not pending is dropped', mergedNotPending.items.length, 0);

// Housekeeping: photos no note points at any more.
checkEqual(
  'orphanPhotoIds() finds a photo whose note was deleted',
  orphanPhotoIds(['note1__a', 'note1__b'], ['note1__b']),
  ['note1__a']
);
checkEqual(
  'orphanPhotoIds() keeps every photo that is still referenced',
  orphanPhotoIds(['note1__a'], ['note1__a']),
  []
);


// A note deleted on one phone must take its photos with it even when the OTHER
// phone uploaded them (this device's own ledger would not know those ids).
checkEqual(
  'notePhotoIdsFromLedger() finds the photos of one note',
  notePhotoIdsFromLedger('note-1', ['note-1__a', 'note-2__b', 'note-1__c']),
  ['note-1__a', 'note-1__c']
);
checkEqual(
  'notePhotoIdsFromLedger() ignores ids that belong elsewhere',
  notePhotoIdsFromLedger('note-9', ['note-1__a']),
  []
);
checkEqual(
  'notePhotoIdsFromLedger() is empty when the ledger is empty',
  notePhotoIdsFromLedger('note-1', []),
  []
);


// Deleting the LAST row of a list while the app had no Google session: there is
// no row id left to flag, so the deletion itself has to be remembered — otherwise
// the cloud keeps the old rows and they reappear on the other device.
check(
  'shouldPushList(): an emptied list with a collection flag is still pushed',
  shouldPushList(0, [], true)
);
check(
  'shouldPushList(): an emptied list with nothing flagged is not pushed',
  !shouldPushList(0, [], false)
);
check(
  'shouldPushList(): pending rows are pushed even without the flag',
  shouldPushList(3, ['a'], false)
);
check(
  'shouldPushList(): a list with rows but nothing pending is not pushed',
  !shouldPushList(3, [], false)
);
check(
  'shouldPushList(): the flag alone is enough (empty list, empty pending)',
  shouldPushList(0, new Set<string>(), true)
);

const replacementTargets = bundlePushTargets({
  itinerary: [{ id: 'activity-1' }],
  budget: [],
  places: [{ id: 'place-1' }],
  checklist: [],
  notes: [{ id: 'note-1' }],
  services: []
});
checkEqual(
  'bundlePushTargets(): returns every replaceable collection',
  replacementTargets.map((target) => target.subcollection),
  ['activities', 'budget_items', 'places', 'checklist', 'notes', 'services']
);
checkEqual(
  'bundlePushTargets(): preserves ids for pending rows',
  replacementTargets.find((target) => target.subcollection === 'notes')?.ids,
  ['note-1']
);
checkEqual(
  'bundlePushTargets(): preserves an intentionally empty list',
  replacementTargets.find((target) => target.subcollection === 'checklist')?.ids,
  []
);

/* ================================================================== *
 * Result
 * ================================================================== */

console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
