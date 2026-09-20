import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AppData,
  TripInfo,
  Activity,
  BudgetItem,
  Place,
  ChecklistItem,
  JournalNote,
  ServiceOption,
  TripBundle
} from '../types';
import {
  BaselineMap,
  bundlePushTargets,
  PlannedUpload,
  TripBaseline,
  TripMergeFields,
  coverHashOf,
  deletableRemoteIds,
  diffTripInfoFields,
  fingerprint,
  fullTripFields,
  getServerMillis,
  mergeItemLists,
  mergeNotesWithCloud,
  mergeTripInfoFieldLevel,
  normalizeTripFieldsForFirestore,
  notePhotoIdsFromLedger,
  orphanPhotoIds,
  planNotePhotos,
  shouldPushList,
  type PlannedPhoto,
  splitTripInfo
} from './syncCore';
// Helper to remove undefined fields which Firestore rejects
function sanitizePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean as Partial<T>;
}

/**
 * Upload an entire TripBundle (trip + all subcollections) in batches.
 * Used during first-time sync of local data or trip duplication.
 */
export async function uploadFullTripBundle(bundle: TripBundle, user: User): Promise<void> {
  const tripId = bundle.tripInfo.id;
  const tripPath = `trips/${tripId}`;
  try {
    await saveTripInfoToFirestore(bundle.tripInfo, user);
    if (Array.isArray(bundle.itinerary)) await syncActivitiesToFirestore(tripId, bundle.itinerary, user);
    if (Array.isArray(bundle.budget)) await syncBudgetItemsToFirestore(tripId, bundle.budget, user);
    if (Array.isArray(bundle.places)) await syncPlacesToFirestore(tripId, bundle.places, user);
    if (Array.isArray(bundle.checklist)) await syncChecklistToFirestore(tripId, bundle.checklist, user);
    if (Array.isArray(bundle.notes)) await syncNotesToFirestore(tripId, bundle.notes, user);
    if (Array.isArray(bundle.services)) await syncServicesToFirestore(tripId, bundle.services, user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, tripPath);
  }
}

/**
 * Save / Update Trip Info
 */
export async function saveTripInfoToFirestore(trip: TripInfo, user: User): Promise<void> {
  const path = `trips/${trip.id}`;
  try {
    const baseline = getTripBaseline(trip.id);
    const { fields, cover } = splitTripInfo(trip);
    const writes = normalizeTripFieldsForFirestore(
      baseline ? diffTripInfoFields(baseline.fields, fields) : fullTripFields(trip)
    );
    const coverChanged = fingerprint(cover) !== (baseline?.coverHash ?? '0:0');
    if (Object.keys(writes).length === 0 && !coverChanged) return;
    const batch = writeBatch(db);
    if (Object.keys(writes).length > 0) {
      batch.set(doc(db, 'trips', trip.id), sanitizePayload({
        id: trip.id,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        createdAt: trip.createdAt || new Date().toISOString(),
        updatedAt: trip.updatedAt || new Date().toISOString(),
        ...writes,
        serverUpdatedAt: serverTimestamp()
      }), { merge: true });
    }
    if (coverChanged) {
      batch.set(doc(db, 'trips', trip.id, 'meta', COVER_META_DOC_ID), coverPayload(trip.id, cover, user), { merge: true });
    }
    await batch.commit();
    recordKnownRemoteTripId(trip.id);
    rememberTripBaseline(trip.id, {
      fields: { ...(baseline?.fields ?? {}), ...writes },
      coverHash: coverChanged ? fingerprint(cover) : baseline?.coverHash ?? '0:0',
      serverUpdatedAt: baseline?.serverUpdatedAt ?? null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveTripCoverToFirestore(tripId: string, cover: string, user: User): Promise<void> {
  const path = `trips/${tripId}/meta/${COVER_META_DOC_ID}`;
  try {
    await setDoc(doc(db, 'trips', tripId, 'meta', COVER_META_DOC_ID), coverPayload(tripId, cover, user), { merge: true });
    const baseline = getTripBaseline(tripId);
    if (baseline) rememberTripBaseline(tripId, { ...baseline, coverHash: fingerprint(cover) });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a Trip and all its subcollections, permanently recording deletion
 */
export async function deleteTripFromFirestore(tripId: string, user: User): Promise<void> {
  const path = `trips/${tripId}`;
  try {
    // Record deletion locally immediately
    recordDeletedTripId(tripId);
    forgetKnownRemoteTripId(tripId);
    forgetTripBaseline(tripId);
    // Delete subcollections first
    const subcollections = [...TRIP_SUBCOLLECTIONS, 'meta'];
    for (const sub of subcollections) {
      try {
        const subRef = collection(db, 'trips', tripId, sub);
        const snap = await getDocs(subRef);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (subErr) {
        console.warn(`Error deleting subcollection ${sub} for trip ${tripId}:`, subErr);
      }
    }

    // Delete root trip doc
    await deleteDoc(doc(db, 'trips', tripId));

    // Try to record deleted trip ID in Firestore app_config so other devices know it's deleted
    try {
      const deletedRef = doc(db, 'app_config', 'deleted_trips');
      const snap = await getDoc(deletedRef);
      const existing = snap.exists() && Array.isArray(snap.data()?.ids) ? snap.data()?.ids : [];
      if (!existing.includes(tripId)) {
        await setDoc(deletedRef, { ids: [...existing, tripId], updatedAt: new Date().toISOString() }, { merge: true });
      }
    } catch {
      // Non-blocking if app_config isn't writable
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Explicitly delete an Activity document from Firestore
 */
export async function deleteActivityFromFirestore(tripId: string, activityId: string, user?: User): Promise<void> {
  const path = `trips/${tripId}/activities/${activityId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'activities', activityId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Explicitly delete a Budget item document from Firestore
 */
export async function deleteBudgetItemFromFirestore(tripId: string, itemId: string, user?: User): Promise<void> {
  const path = `trips/${tripId}/budget_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'budget_items', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Explicitly delete a Place document from Firestore
 */
export async function deletePlaceFromFirestore(tripId: string, placeId: string, user?: User): Promise<void> {
  const path = `trips/${tripId}/places/${placeId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'places', placeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Explicitly delete a Checklist item document from Firestore
 */
export async function deleteChecklistItemFromFirestore(tripId: string, itemId: string, user?: User): Promise<void> {
  const path = `trips/${tripId}/checklist/${itemId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'checklist', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
/**
 * Explicitly delete a Note document from Firestore
 */
export async function deleteNoteFromFirestore(
  tripId: string,
  noteId: string,
  user?: User,
  /**
   * The photo ids listed by the note that is being deleted. Passing them means a
   * note is cleaned up completely even when the other device uploaded the
   * photos: the prefix only finds photos this device happens to know about.
   */
  notePhotoIds: string[] = []
): Promise<void> {
  const path = `trips/${tripId}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'notes', noteId));

    // The photos of a deleted note live in their own documents, so they have to
    // go as well — otherwise they would stay on the cloud (and in every device's
    // photo wall) forever.
    const fromLedger = notePhotoIdsFromLedger(noteId, getKnownSubcollectionIds(tripId, 'photos'));
    const photoIds = Array.from(
      new Set([...notePhotoIds.filter((id) => id && id.startsWith(`${noteId}\_\_`)), ...fromLedger])
    );
    if (photoIds.length > 0) await deletePhotoDocs(tripId, photoIds);
    // Nothing is waiting to be uploaded for a note that no longer exists.
    clearPendingItemUploads(tripId, 'photos', photoIds);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

const DELETED_TRIPS_STORAGE_KEY = 'our_travel_planner_deleted_trips_v1';

export function getDeletedTripIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_TRIPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedTripId(tripId: string): void {
  try {
    const existing = getDeletedTripIds();
    if (!existing.includes(tripId)) {
      localStorage.setItem(DELETED_TRIPS_STORAGE_KEY, JSON.stringify([...existing, tripId]));
    }
  } catch {
    // Ignore storage issues
  }
}

export function isTripDeletedLocally(tripId: string): boolean {
  const list = getDeletedTripIds();
  return list.includes(tripId);
}

/**
 * Ledger of trip IDs this device has actually seen on the server.
 *
 * It is what makes the local/remote reconciliation deterministic:
 *  - a local trip that was NEVER on the server is genuinely new  -> upload it
 *  - a local trip that WAS on the server and is now gone was deleted
 *    by another device -> drop it locally instead of resurrecting it
 */
const KNOWN_REMOTE_TRIPS_STORAGE_KEY = 'our_travel_planner_known_remote_trips_v1';

export function getKnownRemoteTripIds(): string[] {
  try {
    const raw = localStorage.getItem(KNOWN_REMOTE_TRIPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordKnownRemoteTripId(tripId: string): void {
  try {
    const existing = getKnownRemoteTripIds();
    if (!existing.includes(tripId)) {
      localStorage.setItem(KNOWN_REMOTE_TRIPS_STORAGE_KEY, JSON.stringify([...existing, tripId]));
    }
  } catch {
    // Ignore storage issues
  }
}

export function forgetKnownRemoteTripId(tripId: string): void {
  try {
    const next = getKnownRemoteTripIds().filter((id) => id !== tripId);
    localStorage.setItem(KNOWN_REMOTE_TRIPS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage issues
  }
}

export async function getRemoteDeletedTripIds(): Promise<string[]> {
  try {
    const deletedRef = doc(db, 'app_config', 'deleted_trips');
    const snap = await getDoc(deletedRef);
    if (snap.exists() && Array.isArray(snap.data()?.ids)) {
      return snap.data()?.ids as string[];
    }
    return [];
  } catch (err) {
    return [];
  }
}
/* ==================================================================== *
 * Sync v2 infrastructure
 *
 * The cloud is the single source of truth. To write that truth back without
 * destroying the other device's concurrent edits we need three small local
 * ledgers (all optional: a browser without localStorage simply re-syncs):
 *
 *  - baselines            : last cloud values we know for each trip. Powers
 *                           field-level diffs ("write only what changed").
 *  - known subcollection  : row ids this device has already seen in the cloud,
 *                           so a full-list save can tell a real deletion apart
 *                           from a row the other device added meanwhile.
 *  - pending uploads      : row ids this device added but has not managed to
 *                           push yet, so a "cloud wins" merge never drops them.
 * ==================================================================== */

export const TRIP_SUBCOLLECTIONS = [
  'activities',
  'budget_items',
  'places',
  'checklist',
  'notes',
  'services',
  'photos'
] as const;

export type TripSubcollection = (typeof TRIP_SUBCOLLECTIONS)[number];

/** Cover images live in their own document, so a photo never clobbers text edits. */
export const COVER_META_DOC_ID = 'cover';

const TRIP_BASELINE_STORAGE_KEY = 'our_travel_planner_remote_baseline_v2';
const KNOWN_SUBCOLLECTION_IDS_KEY = 'our_travel_planner_known_subcollection_ids_v1';
const PENDING_ITEM_UPLOADS_KEY = 'our_travel_planner_pending_item_uploads_v1';
/** Collection-level "this list changed and still has to be pushed" flags. */
const PENDING_COLLECTION_WRITES_KEY = 'our_travel_planner_pending_collection_writes_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage issues (private mode, quota)
  }
}

export function getTripBaselines(): BaselineMap {
  return readJson<BaselineMap>(TRIP_BASELINE_STORAGE_KEY, {});
}

export function getTripBaseline(tripId: string): TripBaseline | undefined {
  return getTripBaselines()[tripId];
}

export function rememberTripBaseline(tripId: string, baseline: TripBaseline): void {
  const all = getTripBaselines();
  all[tripId] = baseline;
  writeJson(TRIP_BASELINE_STORAGE_KEY, all);
}

export function forgetTripBaseline(tripId: string): void {
  const all = getTripBaselines();
  delete all[tripId];
  writeJson(TRIP_BASELINE_STORAGE_KEY, all);
}

type SubcollectionIdLedger = Record<string, Record<string, string[]>>;

function readSubcollectionLedger(key: string): SubcollectionIdLedger {
  return readJson<SubcollectionIdLedger>(key, {});
}

export function recordSubcollectionIds(
  tripId: string,
  subcollection: TripSubcollection | 'meta',
  ids: string[]
): void {
  const ledger = readSubcollectionLedger(KNOWN_SUBCOLLECTION_IDS_KEY);
  ledger[tripId] = ledger[tripId] || {};
  ledger[tripId][subcollection] = Array.from(new Set(ids));
  writeJson(KNOWN_SUBCOLLECTION_IDS_KEY, ledger);
}

export function getKnownSubcollectionIds(tripId: string, subcollection: TripSubcollection): string[] {
  const ledger = readSubcollectionLedger(KNOWN_SUBCOLLECTION_IDS_KEY);
  return ledger[tripId]?.[subcollection] ?? [];
}

/** Remember that a whole list (possibly now empty) still has to be pushed. */
export function markPendingCollectionWrite(tripId: string, subcollection: TripSubcollection): void {
  const all = readJson<Record<string, string[]>>(PENDING_COLLECTION_WRITES_KEY, {});
  const current = new Set(all[tripId] ?? []);
  current.add(subcollection);
  all[tripId] = Array.from(current);
  writeJson(PENDING_COLLECTION_WRITES_KEY, all);
}

export function clearPendingCollectionWrite(tripId: string, subcollection: TripSubcollection): void {
  const all = readJson<Record<string, string[]>>(PENDING_COLLECTION_WRITES_KEY, {});
  if (!all[tripId]) return;
  all[tripId] = all[tripId].filter((sub) => sub !== subcollection);
  if (all[tripId].length === 0) delete all[tripId];
  writeJson(PENDING_COLLECTION_WRITES_KEY, all);
}

export function hasPendingCollectionWrite(tripId: string, subcollection: TripSubcollection): boolean {
  const all = readJson<Record<string, string[]>>(PENDING_COLLECTION_WRITES_KEY, {});
  return (all[tripId] ?? []).includes(subcollection);
}

export function markPendingItemUploads(
  tripId: string,
  subcollection: TripSubcollection,
  ids: string[]
): void {
  // An empty list is not "nothing to do": it means every row was removed, and
  // the cloud still has to be told so. There is no id to remember, so the
  // intention is stored at collection level instead.
  if (ids.length === 0) {
    markPendingCollectionWrite(tripId, subcollection);
    return;
  }
  clearPendingCollectionWrite(tripId, subcollection);
  const ledger = readSubcollectionLedger(PENDING_ITEM_UPLOADS_KEY);
  ledger[tripId] = ledger[tripId] || {};
  const existing = new Set(ledger[tripId][subcollection] ?? []);
  ids.forEach((id) => existing.add(id));
  ledger[tripId][subcollection] = Array.from(existing);
  writeJson(PENDING_ITEM_UPLOADS_KEY, ledger);
}

export function getPendingItemUploads(tripId: string, subcollection: TripSubcollection): string[] {
  const ledger = readSubcollectionLedger(PENDING_ITEM_UPLOADS_KEY);
  return ledger[tripId]?.[subcollection] ?? [];
}

export function clearPendingItemUploads(
  tripId: string,
  subcollection: TripSubcollection,
  uploadedIds?: string[]
): void {
  const ledger = readSubcollectionLedger(PENDING_ITEM_UPLOADS_KEY);
  if (!ledger[tripId]?.[subcollection]) return;

  if (!uploadedIds) {
    delete ledger[tripId][subcollection];
  } else {
    const uploaded = new Set(uploadedIds);
    ledger[tripId][subcollection] = ledger[tripId][subcollection].filter((id) => !uploaded.has(id));
  }
  writeJson(PENDING_ITEM_UPLOADS_KEY, ledger);
}

/** Mark every list before importing/resetting a complete bundle. */
export function markBundlePendingForUpload(bundle: TripBundle): void {
  const tripId = bundle.tripInfo.id;
  for (const target of bundlePushTargets(bundle)) {
    markPendingItemUploads(tripId, target.subcollection, target.ids);
  }
}

/** Firestore document data -> local TripInfo (server timestamp becomes ms). */
function toLocalTripInfo(raw: Record<string, any>): TripInfo {
  const info = { ...raw } as TripInfo;
  const serverMs = getServerMillis(raw);
  if (serverMs !== null) info.serverUpdatedAt = serverMs;
  return info;
}

function coverPayload(tripId: string, cover: string, user: User): Record<string, unknown> {
  return sanitizePayload({
    id: COVER_META_DOC_ID,
    tripId,
    ownerId: user.uid,
    coverImage: cover,
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp()
  });
}

/**
 * Push a plan entry produced by `planTripSync`: only the dirty fields plus the
 * cover when this device changed it. Nothing else is written, so an edit made
 * on the other device at the same time survives.
 */
export async function pushPlannedTripUpload(upload: PlannedUpload, user: User): Promise<void> {
  const path = `trips/${upload.id}`;
  const fields = normalizeTripFieldsForFirestore(upload.fields);
  const identity = sanitizePayload({
    id: upload.id,
    ownerId: user.uid,
    ownerEmail: user.email || ''
  });
  const hasFields = Object.keys(fields).length > 0;
  if (!hasFields && !upload.coverChanged) return;

  try {
    const batch = writeBatch(db);
    if (hasFields) {
      batch.set(
        doc(db, 'trips', upload.id),
        sanitizePayload({
          ...identity,
          updatedAt: new Date().toISOString(),
          ...fields,
          serverUpdatedAt: serverTimestamp()
        }),
        { merge: true }
      );
    }
    if (upload.coverChanged) {
      batch.set(doc(db, 'trips', upload.id, 'meta', COVER_META_DOC_ID), coverPayload(upload.id, upload.cover, user), {
        merge: true
      });
    }
    await batch.commit();

    recordKnownRemoteTripId(upload.id);
    // The write is now the cloud's truth: remember exactly those values.
    const previous = getTripBaseline(upload.id);
    rememberTripBaseline(upload.id, {
      fields: { ...(previous?.fields ?? {}), ...fields },
      coverHash: upload.coverChanged ? fingerprint(upload.cover) : previous?.coverHash ?? '0:0',
      serverUpdatedAt: previous?.serverUpdatedAt ?? null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
/* ------------------------------------------------------------------ *
 * Cloud -> local merging
 * ------------------------------------------------------------------ */

function mergeListWithCloud<T extends { id: string }>(
  tripId: string,
  subcollection: TripSubcollection,
  localItems: T[] | undefined,
  remoteItems: T[] | undefined
): T[] {
  // The cloud list wins, including when it is empty: an empty list means the
  // other device deleted those rows — it is NOT a reason to fall back to the
  // stale local copy. Only rows whose upload is still pending are kept.
  return mergeItemLists(localItems, remoteItems, getPendingItemUploads(tripId, subcollection)).items;
}

/**
 * Merge a cloud bundle into the copy this device holds.
 * Text fields keep the local edit while it is not yet uploaded; list rows
 * always follow the cloud except for pending (not yet uploaded) additions.
 */
export function mergeBundleWithCloud(
  local: TripBundle,
  remote: TripBundle,
  baseline: TripBaseline | undefined
): TripBundle {
  const tripId = remote.tripInfo.id;
  return {
    tripInfo: mergeTripInfoFieldLevel(local.tripInfo, remote.tripInfo, baseline),
    itinerary: mergeListWithCloud(tripId, 'activities', local.itinerary, remote.itinerary),
    budget: mergeListWithCloud(tripId, 'budget_items', local.budget, remote.budget),
    places: mergeListWithCloud(tripId, 'places', local.places, remote.places),
    checklist: mergeListWithCloud(tripId, 'checklist', local.checklist, remote.checklist),
    // Notes are merged with the photo-aware merge: the cloud always wins for
    // text, photo ids and previews, but a full-size photo that has not reached
    // the cloud yet is never dropped from the device that took it.
    notes: mergeNotesWithCloud(
      local.notes,
      remote.notes,
      getPendingItemUploads(tripId, 'notes'),
      getPendingItemUploads(tripId, 'photos')
    ).items,
    services: mergeListWithCloud(tripId, 'services', local.services, remote.services),
  };
}
/**
 * Live cover-image updates for the active trip.
 *
 * The cover lives in its own document, so a cover change does not touch the
 * trip document any more — without this listener the other device would only
 * see the new photo after a refresh.
 */
export function subscribeToTripCover(tripId: string, onCoverUpdated: (cover: string) => void): () => void {
  return onSnapshot(
    doc(db, 'trips', tripId, 'meta', COVER_META_DOC_ID),
    (snap) => {
      if (!snap.exists()) return;
      onCoverUpdated(String(snap.data()?.coverImage ?? ''));
    },
    (err) => console.warn(`Cover listener error for trip ${tripId}:`, err)
  );
}

/** Same merge for the live per-collection snapshots of the active trip. */
export function mergeSubcollectionUpdate(
  trip: TripBundle,
  partial: {
    itinerary?: Activity[];
    budget?: BudgetItem[];
    places?: Place[];
    checklist?: ChecklistItem[];
    notes?: JournalNote[];
    services?: ServiceOption[];
  }
): TripBundle {
  const tripId = trip.tripInfo.id;
  const next: TripBundle = { ...trip };
  if (partial.itinerary !== undefined) {
    next.itinerary = mergeListWithCloud(tripId, 'activities', trip.itinerary, partial.itinerary);
  }
  if (partial.budget !== undefined) {
    next.budget = mergeListWithCloud(tripId, 'budget_items', trip.budget, partial.budget);
  }
  if (partial.places !== undefined) {
    next.places = mergeListWithCloud(tripId, 'places', trip.places, partial.places);
  }
  if (partial.checklist !== undefined) {
    next.checklist = mergeListWithCloud(tripId, 'checklist', trip.checklist, partial.checklist);
  }
  if (partial.notes !== undefined) {
    next.notes = mergeNotesWithCloud(
      trip.notes,
      partial.notes,
      getPendingItemUploads(tripId, 'notes'),
      getPendingItemUploads(tripId, 'photos')
    ).items;
  }
  if (partial.services !== undefined) {
    next.services = mergeListWithCloud(tripId, 'services', trip.services, partial.services);
  }
  return next;
}
/* ------------------------------------------------------------------ *
 * Subcollection writes
 * ------------------------------------------------------------------ */

type ItemPayloadBuilder<T> = (item: T, tripId: string, user: User) => Record<string, unknown>;

/**
 * Push a whole subcollection list to Firestore in one batch.
 *
 * This deliberately does NOT read the cloud before writing. The previous
 * version ran `getDocs` first, so a single failed read — quota exhausted (429),
 * permission denied (403) or a flaky phone network — aborted the write before
 * it ever reached `batch.commit()`. The edit stayed on the phone that made it
 * and the other device never saw it: exactly the "I typed it on my phone and my
 * computer never shows it" bug. Deletions no longer need that read either: they
 * are decided from the local ledger of cloud rows this device has already seen
 * (`getKnownSubcollectionIds`), which is also what stops a stale editor from
 * deleting a row the other device just added.
 *
 * Every id is flagged as "pending upload" BEFORE the write and cleared only
 * after the batch commits. While flagged, `mergeItemLists` keeps those rows on
 * this device even when the cloud snapshot does not contain them yet, so a
 * failed upload can never make the row disappear from the phone that typed it.
 * `retryPendingSubcollectionWrites` sends them again later.
 */
async function pushSubcollection<T extends { id: string }>(
  tripId: string,
  subcollection: TripSubcollection,
  items: T[],
  user: User,
  buildPayload: ItemPayloadBuilder<T>
): Promise<void> {
  const path = `trips/${tripId}/${subcollection}`;
  const newIds = Array.from(new Set(items.map((item) => item.id)));
  // Pending first: if anything below throws, the rows are already protected —
  // and the list itself is remembered even when it is now empty (last row
  // deleted), so the cloud still learns about the deletion.
  markPendingCollectionWrite(tripId, subcollection);
  markPendingItemUploads(tripId, subcollection, newIds);

  try {
    const batch = writeBatch(db);
    let operations = 0;

    // Only rows this device has already seen and the user removed here may be
    // deleted — a row added by the other device meanwhile is not in this
    // device's ledger, so it is never destroyed.
    for (const removedId of deletableRemoteIds(getKnownSubcollectionIds(tripId, subcollection), newIds)) {
      batch.delete(doc(db, 'trips', tripId, subcollection, removedId));
      operations++;
    }

    for (const item of items) {
      batch.set(
        doc(db, 'trips', tripId, subcollection, item.id),
        sanitizePayload(buildPayload(item, tripId, user)),
        { merge: true }
      );
      operations++;
    }

    // Nothing to write (an empty list that the cloud never had): skip the commit
    // — Firestore rejects an empty batch — and just clear the flags.
    if (operations > 0) await batch.commit();
    recordSubcollectionIds(tripId, subcollection, newIds);
    clearPendingItemUploads(tripId, subcollection);
    clearPendingCollectionWrite(tripId, subcollection);
  } catch (error) {
    // The cloud did not receive this list: keep every row (and the list itself)
    // flagged so the next snapshot cannot drop anything, and let the retry loop
    // in App.tsx send it again.
    markPendingCollectionWrite(tripId, subcollection);
    markPendingItemUploads(tripId, subcollection, newIds);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
/** Save Activities for a trip */
export async function syncActivitiesToFirestore(tripId: string, activities: Activity[], user: User): Promise<void> {
  await pushSubcollection(tripId, 'activities', activities, user, (a, tid, u) => ({
    id: a.id,
    tripId: tid,
    ownerId: u.uid,
    date: a.date,
    time: a.time,
    title: a.title,
    location: a.location,
    category: a.category,
    plannedCost: Number(a.plannedCost) || 0,
    actualCost: Number(a.actualCost) || 0,
    note: a.note || '',
    mapUrl: a.mapUrl || '',
    order: Number(a.order) || 0,
    updatedAt: new Date().toISOString(),
  }));
}

/** Save Budget Items for a trip */
export async function syncBudgetItemsToFirestore(tripId: string, items: BudgetItem[], user: User): Promise<void> {
  await pushSubcollection(tripId, 'budget_items', items, user, (b, tid, u) => ({
    id: b.id,
    tripId: tid,
    ownerId: u.uid,
    activityId: b.activityId || '',
    category: b.category,
    item: b.item,
    quantity: Number(b.quantity) || 1,
    unit: b.unit,
    plannedCost: Number(b.plannedCost) || 0,
    actualCost: Number(b.actualCost) || 0,
    notes: b.notes || '',
    updatedAt: new Date().toISOString(),
  }));
}

/** Save Places for a trip */
export async function syncPlacesToFirestore(tripId: string, places: Place[], user: User): Promise<void> {
  await pushSubcollection(tripId, 'places', places, user, (p, tid, u) => ({
    id: p.id,
    tripId: tid,
    ownerId: u.uid,
    name: p.name,
    category: p.category,
    address: p.address,
    status: p.status,
    mapUrl: p.mapUrl || '',
    estimatedCost: Number(p.estimatedCost) || 0,
    openingHours: p.openingHours || '',
    notes: p.notes || '',
    imageUrl: p.imageUrl || '',
    updatedAt: new Date().toISOString(),
  }));
}

/** Save Checklist Items for a trip */
export async function syncChecklistToFirestore(tripId: string, items: ChecklistItem[], user: User): Promise<void> {
  await pushSubcollection(tripId, 'checklist', items, user, (c, tid, u) => ({
    id: c.id,
    tripId: tid,
    ownerId: u.uid,
    category: c.category,
    title: c.title,
    completed: Boolean(c.completed),
    notes: c.notes || '',
    updatedAt: new Date().toISOString(),
  }));
}

/* ------------------------------------------------------------------ *
 * Journal photos — one document per photo
 * ------------------------------------------------------------------ */

/** Commit at most this many photos at once (≈1.8 MB, far below the 10 MB cap). */
const PHOTO_UPLOAD_CHUNK = 3;

/**
 * Upload journal photos, one Firestore document each.
 *
 * This is the fix for "I add a photo and the other phone never sees it": photos
 * used to travel inside the note document as base64, and a note is capped at
 * 1 MiB by Firestore, so two ordinary phone photos made the whole write fail and
 * the note never reached the cloud. With one document per photo the original
 * keeps its quality, a heavy picture can only ever fail on its own, and the
 * photos are chunked so a large commit is never rejected for size.
 *
 * Every id is flagged as pending first: a photo that fails here stays visible on
 * this device and is re-sent by the retry queue instead of disappearing.
 */
export async function pushNotePhotos(
  tripId: string,
  uploads: PlannedPhoto[],
  user: User
): Promise<string[]> {
  if (uploads.length === 0) return [];
  const path = `trips/${tripId}/photos`;
  markPendingItemUploads(tripId, 'photos', uploads.map((photo) => photo.id));
  const uploaded: string[] = [];
  for (let start = 0; start < uploads.length; start += PHOTO_UPLOAD_CHUNK) {
    const chunk = uploads.slice(start, start + PHOTO_UPLOAD_CHUNK);
    try {
      const batch = writeBatch(db);
      for (const photo of chunk) {
        batch.set(
          doc(db, 'trips', tripId, 'photos', photo.id),
          sanitizePayload({
            id: photo.id,
            tripId,
            noteId: photo.noteId,
            ownerId: user.uid,
            dataUrl: photo.dataUrl,
            thumb: photo.thumb || '',
            order: photo.order,
            sizeKb: Math.round(((photo.dataUrl.length * 3) / 4) / 1024),
            createdAt: new Date().toISOString()
          }),
          { merge: true }
        );
      }
      await batch.commit();
      const ids = chunk.map((photo) => photo.id);
      recordSubcollectionIds(tripId, 'photos', [
        ...getKnownSubcollectionIds(tripId, 'photos'),
        ...ids
      ]);
      clearPendingItemUploads(tripId, 'photos', ids);
      uploaded.push(...ids);
    } catch (error) {
      // Leave this chunk marked pending: the retry queue will send it again.
      console.warn('Photo upload failed for trip', tripId, error);
    }
  }

  if (uploaded.length === 0 && uploads.length > 0) {
    handleFirestoreError(new Error('Không gửi được ảnh lên Cloud'), OperationType.WRITE, path);
  }
  return uploaded;
}

/** Remove photo documents (a deleted note, or a picture the user removed). */
export async function deletePhotoDocs(tripId: string, photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return;
  for (let start = 0; start < photoIds.length; start += 400) {
    const chunk = photoIds.slice(start, start + 400);
    const batch = writeBatch(db);
    chunk.forEach((id) => batch.delete(doc(db, 'trips', tripId, 'photos', id)));
    await batch.commit();
  }
  recordSubcollectionIds(
    tripId,
    'photos',
    getKnownSubcollectionIds(tripId, 'photos').filter((id) => !photoIds.includes(id))
  );
}
/** Read one original photo back (used when opening it full-screen). */
export async function fetchNotePhoto(tripId: string, photoId: string): Promise<string> {
  const snap = await getDoc(doc(db, 'trips', tripId, 'photos', photoId));
  if (!snap.exists()) return '';
  return String(snap.data()?.dataUrl || '');
}

/** Save Notes for a trip: text + photo ids + previews in the note, originals apart. */
export async function syncNotesToFirestore(tripId: string, notes: JournalNote[], user: User): Promise<void> {
  const path = `trips/${tripId}/notes`;
  const knownPhotoIds = getKnownSubcollectionIds(tripId, 'photos');

  // 1. Which photos still have to travel, and the id/preview arrays for each note.
  const plans = new Map<string, { photoIds: string[]; photoThumbs: string[] }>();
  const uploads: PlannedPhoto[] = [];
  for (const note of notes) {
    const plan = planNotePhotos(note, knownPhotoIds);
    plans.set(note.id, { photoIds: plan.photoIds, photoThumbs: plan.photoThumbs });
    uploads.push(...plan.uploads);
  }

  const keepPhotoIds = new Set<string>();
  plans.forEach(({ photoIds }) => photoIds.forEach((id) => { if (id) keepPhotoIds.add(id); }));

  try {
    // 2. Photos first, so the note below can list the ones that really arrived.
    const uploadedIds = await pushNotePhotos(tripId, uploads, user);
    uploadedIds.forEach((id) => keepPhotoIds.add(id));

    // 3. The note document: text, photo ids and previews. `images` is deleted
    //    from the cloud copy — the payload now lives in the photos.
    const newIds = new Set(notes.map((note) => note.id));
    markPendingCollectionWrite(tripId, 'notes');
    markPendingItemUploads(tripId, 'notes', Array.from(newIds));
    const batch = writeBatch(db);
    let operations = 0;
    for (const removedId of deletableRemoteIds(getKnownSubcollectionIds(tripId, 'notes'), newIds)) {
      batch.delete(doc(db, 'trips', tripId, 'notes', removedId));
      operations++;
    }
    for (const note of notes) {
      const plan = plans.get(note.id) || { photoIds: [], photoThumbs: [] };
      batch.set(
        doc(db, 'trips', tripId, 'notes', note.id),
        sanitizePayload({
          id: note.id,
          tripId,
          ownerId: user.uid,
          title: note.title,
          category: note.category,
          content: note.content,
          photoIds: plan.photoIds,
          photoThumbs: plan.photoThumbs,
          images: deleteField(),
          updatedAt: new Date().toISOString()
        }),
        { merge: true }
      );
      operations++;
    }
    if (operations > 0) await batch.commit();
    recordSubcollectionIds(tripId, 'notes', Array.from(newIds));
    clearPendingItemUploads(tripId, 'notes');
    clearPendingCollectionWrite(tripId, 'notes');

    // 4. Photos nobody points at any more (deleted note, or removed picture).
    const pendingPhotos = getPendingItemUploads(tripId, 'photos');
    const orphans = orphanPhotoIds(getKnownSubcollectionIds(tripId, 'photos'), keepPhotoIds)
      .filter((id) => !pendingPhotos.includes(id));
    if (orphans.length > 0) await deletePhotoDocs(tripId, orphans);

    // Photos still waiting to upload but no longer listed by any note (the note
    // was deleted before the upload finished) would otherwise keep the "Đang
    // chờ gửi" chip on forever, retrying something that can never succeed.
    const stalePending = pendingPhotos.filter((id) => !keepPhotoIds.has(id));
    if (stalePending.length > 0) clearPendingItemUploads(tripId, 'photos', stalePending);
  } catch (error) {
    // Notes stay flagged so the next snapshot cannot drop them from this device.
    markPendingItemUploads(tripId, 'notes', notes.map((note) => note.id));
    markPendingCollectionWrite(tripId, 'notes');
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
/**
 * Save Services for a trip — persists the full list, including deletions:
 * remote docs this device saw and the user removed are deleted, while services
 * added by the other device in the meantime stay untouched.
 */
export async function syncServicesToFirestore(tripId: string, services: ServiceOption[], user: User): Promise<void> {
  await pushSubcollection(tripId, 'services', services, user, (s, tid, u) => ({
    id: s.id,
    tripId: tid,
    ownerId: u.uid,
    category: s.category,
    name: s.name,
    isChosen: Boolean(s.isChosen),
    address: s.address || '',
    distanceToCenter: s.distanceToCenter || '',
    pricePerUnit: Number(s.pricePerUnit) || 0,
    unitLabel: s.unitLabel || '',
    weekendSurcharge: Number(s.weekendSurcharge) || 0,
    deposit: Number(s.deposit) || 0,
    totalEstimate: Number(s.totalEstimate) || 0,
    amenities: Array.isArray(s.amenities) ? s.amenities : [],
    pros: Array.isArray(s.pros) ? s.pros : [],
    cons: Array.isArray(s.cons) ? s.cons : [],
    photos: Array.isArray(s.photos) ? s.photos : [],
    hisNote: s.hisNote || '',
    herNote: s.herNote || '',
    votes: Number(s.votes) || 0,
    contactPhone: s.contactPhone || '',
    linkUrl: s.linkUrl || '',
    googleRating: Math.min(5, Math.max(0, Number(s.googleRating) || 0)),
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
/* ------------------------------------------------------------------ *
 * Failed-upload retry queue
 * ------------------------------------------------------------------ */

/** True when this trip still has rows a previous save failed to upload. */
export function hasPendingSubcollectionWrites(tripId: string): boolean {
  const ledger = readSubcollectionLedger(PENDING_ITEM_UPLOADS_KEY);
  const perTrip = ledger[tripId];
  const rowPending = perTrip
    ? Object.values(perTrip).some((ids) => Array.isArray(ids) && ids.length > 0)
    : false;
  if (rowPending) return true;
  // A list that became empty still counts as pending (see shouldPushList).
  const collections = readJson<Record<string, string[]>>(PENDING_COLLECTION_WRITES_KEY, {});
  return (collections[tripId] ?? []).length > 0;
}

/**
 * A list has to be re-sent when it has pending rows — or when the whole list is
 * flagged, which is how a deletion down to zero rows is remembered.
 */
function rowsWaitingToUpload<T>(tripId: string, subcollection: TripSubcollection, list: T[] | undefined): boolean {
  return shouldPushList(
    list?.length ?? 0,
    getPendingItemUploads(tripId, subcollection),
    hasPendingCollectionWrite(tripId, subcollection)
  );
}

/**
 * Try again to upload everything a previous save failed to send — the rows
 * typed while there was no Google session, or while the network / quota was
 * down. Returns true when nothing is left waiting.
 */
export async function retryPendingSubcollectionWrites(bundle: TripBundle, user: User): Promise<boolean> {
  const tripId = bundle.tripInfo.id;
  const jobs: Promise<void>[] = [];

  if (rowsWaitingToUpload(tripId, 'activities', bundle.itinerary)) {
    jobs.push(syncActivitiesToFirestore(tripId, bundle.itinerary || [], user));
  }
  if (rowsWaitingToUpload(tripId, 'budget_items', bundle.budget)) {
    jobs.push(syncBudgetItemsToFirestore(tripId, bundle.budget || [], user));
  }
  if (rowsWaitingToUpload(tripId, 'places', bundle.places)) {
    jobs.push(syncPlacesToFirestore(tripId, bundle.places || [], user));
  }
  if (rowsWaitingToUpload(tripId, 'checklist', bundle.checklist)) {
    jobs.push(syncChecklistToFirestore(tripId, bundle.checklist || [], user));
  }
  // Notes carry the photo work as well: this re-sends a note that failed to
  // upload AND any photo that never made it, because `syncNotesToFirestore`
  // re-plans both from the same local list.
  const notesPending = rowsWaitingToUpload(tripId, 'notes', bundle.notes);
  const photosPending = getPendingItemUploads(tripId, 'photos').length > 0;
  if (notesPending || (photosPending && (bundle.notes?.length ?? 0) > 0)) {
    jobs.push(syncNotesToFirestore(tripId, bundle.notes || [], user));
  }
  if (rowsWaitingToUpload(tripId, 'services', bundle.services)) {
    jobs.push(syncServicesToFirestore(tripId, bundle.services || [], user));
  }

  if (jobs.length === 0) return true;

  const results = await Promise.allSettled(jobs);
  return results.every((result) => result.status === 'fulfilled');
}
/**
 * Save User Profile & Active Trip
 */
export async function saveUserProfile(user: User, activeTripId: string | null): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, sanitizePayload({
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Traveler',
      activeTripId: activeTripId || '',
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
/**
 * Trim what gets written to this device's local storage.
 *
 * A photo that already reached the cloud does not need its full payload kept in
 * localStorage as well — the copy is fetched from the cloud when the photo is
 * opened. Photos that are still waiting to upload (or were taken while offline)
 * ARE kept, so nothing a person added can be lost by closing the app.
 */
export function sanitizeAppDataForStorage(data: AppData): AppData {
  const trips: AppData['trips'] = {};
  for (const [tripId, bundle] of Object.entries(data.trips)) {
    const notes = bundle.notes;
    if (!notes || notes.length === 0) {
      trips[tripId] = bundle;
      continue;
    }

    const pendingPhotos = new Set(getPendingItemUploads(tripId, 'photos'));
    const trimmedNotes = notes.map((note) => {
      const images = note.images || [];
      if (images.length === 0) return note;

      const ids = note.photoIds || [];
      let changed = false;
      const kept = images.map((image, index) => {
        const id = ids[index];
        // Already on the cloud => drop the heavy copy from local storage.
        if (image && id && !pendingPhotos.has(id)) {
          changed = true;
          return '';
        }
        return image;
      });
      return changed ? { ...note, images: kept } : note;
    });

    trips[tripId] = { ...bundle, notes: trimmedNotes };
  }
  return { ...data, trips };
}

/**
 * Real-time listener for all trips belonging to current user
 */
export function subscribeToUserTrips(
  user: User,
  onTripsUpdated: (trips: TripInfo[]) => void,
  onError?: (err: any) => void
): () => void {
  // We remove the ownerId filter so all authorized users can see all trips (shared journal)
  const q = query(collection(db, 'trips'));
  return onSnapshot(
    q,
    (snapshot) => {
      const trips: TripInfo[] = [];
      snapshot.forEach((docSnap) => {
        const info = toLocalTripInfo(docSnap.data());
        // A document that exists in the cloud is "known remote": if it
        // disappears later it was deleted elsewhere, not never uploaded.
        recordKnownRemoteTripId(info.id);
        trips.push(info);
      });
      // Sort newest first — by server time when available, device time otherwise.
      const sortKey = (trip: TripInfo) =>
        trip.serverUpdatedAt ?? new Date(trip.updatedAt || trip.createdAt).getTime();
      trips.sort((a, b) => sortKey(b) - sortKey(a));
      onTripsUpdated(trips);
    },
    (error) => {
      console.error('Error listening to user trips:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Fetch a complete trip bundle with all subcollections from Firestore
 */
export async function fetchFullTripBundle(tripId: string, tripInfo: TripInfo): Promise<TripBundle> {
  try {
    const [actSnap, bgtSnap, plcSnap, chkSnap, notSnap, svcSnap, coverSnap] = await Promise.all([
      getDocs(collection(db, 'trips', tripId, 'activities')),
      getDocs(collection(db, 'trips', tripId, 'budget_items')),
      getDocs(collection(db, 'trips', tripId, 'places')),
      getDocs(collection(db, 'trips', tripId, 'checklist')),
      getDocs(collection(db, 'trips', tripId, 'notes')),
      getDocs(collection(db, 'trips', tripId, 'services')),
      getDoc(doc(db, 'trips', tripId, 'meta', COVER_META_DOC_ID)),
    ]);
    const itinerary: Activity[] = actSnap.docs.map((d) => d.data() as Activity);
    const budget: BudgetItem[] = bgtSnap.docs.map((d) => d.data() as BudgetItem);
    const places: Place[] = plcSnap.docs.map((d) => d.data() as Place);
    const checklist: ChecklistItem[] = chkSnap.docs.map((d) => d.data() as ChecklistItem);
    const notes: JournalNote[] = notSnap.docs.map((d) => d.data() as JournalNote);
    const services: ServiceOption[] = svcSnap.docs.map((d) => d.data() as ServiceOption);

    // Sort itinerary by date and time
    itinerary.sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.time || '').localeCompare(b.time || '');
    });
    // Remote row ids this device now knows about. A later full-list save uses
    // them to tell a real deletion apart from a row added meanwhile elsewhere.
    recordSubcollectionIds(tripId, 'activities', itinerary.map((a) => a.id));
    recordSubcollectionIds(tripId, 'budget_items', budget.map((b) => b.id));
    recordSubcollectionIds(tripId, 'places', places.map((p) => p.id));
    recordSubcollectionIds(tripId, 'checklist', checklist.map((c) => c.id));
    recordSubcollectionIds(tripId, 'notes', notes.map((n) => n.id));
    recordSubcollectionIds(tripId, 'services', services.map((s) => s.id));

    // The cover image lives in `meta/cover`. Documents written before sync v2
    // kept it inline on the trip document, so that stays as a fallback.
    const remoteCover = coverSnap.exists() ? String(coverSnap.data()?.coverImage ?? '') : '';
    const remoteInfo = toLocalTripInfo(tripInfo as unknown as Record<string, any>);
    remoteInfo.coverImage = remoteCover || remoteInfo.coverImage || '';

    return {
      tripInfo: remoteInfo,
      itinerary,
      budget,
      places,
      checklist,
      notes,
      services,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
  }
}

/**
 * Real-time subscription to subcollections of active trip for instant sync
 */
export function subscribeToTripSubcollections(
  tripId: string,
  onUpdate: (partialData: {
    itinerary?: Activity[];
    budget?: BudgetItem[];
    places?: Place[];
    checklist?: ChecklistItem[];
    notes?: JournalNote[];
    services?: ServiceOption[];
  }) => void
): () => void {
  const unsubActs = onSnapshot(
    collection(db, 'trips', tripId, 'activities'),
    (snap) => {
      const itinerary = snap.docs.map((d) => d.data() as Activity);
      itinerary.sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.time || '').localeCompare(b.time || '');
      });
      recordSubcollectionIds(tripId, 'activities', itinerary.map((a) => a.id));
      onUpdate({ itinerary });
    },
    (err) => console.warn(`Activities listener error for trip ${tripId}:`, err)
  );

  const unsubBgts = onSnapshot(
    collection(db, 'trips', tripId, 'budget_items'),
    (snap) => {
      const budget = snap.docs.map((d) => d.data() as BudgetItem);
      recordSubcollectionIds(tripId, 'budget_items', budget.map((b) => b.id));
      onUpdate({ budget });
    },
    (err) => console.warn(`Budget listener error for trip ${tripId}:`, err)
  );

  const unsubPlcs = onSnapshot(
    collection(db, 'trips', tripId, 'places'),
    (snap) => {
      const places = snap.docs.map((d) => d.data() as Place);
      recordSubcollectionIds(tripId, 'places', places.map((p) => p.id));
      onUpdate({ places });
    },
    (err) => console.warn(`Places listener error for trip ${tripId}:`, err)
  );

  const unsubChks = onSnapshot(
    collection(db, 'trips', tripId, 'checklist'),
    (snap) => {
      const checklist = snap.docs.map((d) => d.data() as ChecklistItem);
      recordSubcollectionIds(tripId, 'checklist', checklist.map((c) => c.id));
      onUpdate({ checklist });
    },
    (err) => console.warn(`Checklist listener error for trip ${tripId}:`, err)
  );

  const unsubNots = onSnapshot(
    collection(db, 'trips', tripId, 'notes'),
    (snap) => {
      const notes = snap.docs.map((d) => d.data() as JournalNote);
      recordSubcollectionIds(tripId, 'notes', notes.map((n) => n.id));
      onUpdate({ notes });
    },
    (err) => console.warn(`Notes listener error for trip ${tripId}:`, err)
  );

  const unsubSvcs = onSnapshot(
    collection(db, 'trips', tripId, 'services'),
    (snap) => {
      const services = snap.docs.map((d) => d.data() as ServiceOption);
      recordSubcollectionIds(tripId, 'services', services.map((s) => s.id));
      onUpdate({ services });
    },
    (err) => console.warn(`Services listener error for trip ${tripId}:`, err)
  );

  return () => {
    unsubActs();
    unsubBgts();
    unsubPlcs();
    unsubChks();
    unsubNots();
    unsubSvcs();
  };
}

/**
 * Retrieve remote allowed emails list from Firestore config.
 */
export async function getRemoteAllowedEmails(): Promise<string[] | null> {
  try {
    const configDocRef = doc(db, 'app_config', 'permissions');
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.allowedEmails)) {
        return data.allowedEmails;
      }
    }
    return null;
  } catch (err) {
    console.warn('Could not read remote allowed emails, falling back to local:', err);
    return null;
  }
}

/**
 * Save remote allowed emails list to Firestore (Admin only: duonganhthu1505@gmail.com).
 */
export async function saveRemoteAllowedEmails(emails: string[], user: User): Promise<void> {
  if (user.email?.trim().toLowerCase() !== 'duonganhthu1505@gmail.com') {
    throw new Error('Chỉ quản trị viên duonganhthu1505@gmail.com mới có quyền phân quyền danh sách email.');
  }

  // Always ensure admin email is in the list
  const uniqueEmails = Array.from(
    new Set(['duonganhthu1505@gmail.com', ...emails.map((e) => e.trim().toLowerCase()).filter(Boolean)])
  );
  const configDocRef = doc(db, 'app_config', 'permissions');
  await setDoc(configDocRef, {
    id: 'permissions',
    allowedEmails: uniqueEmails,
    updatedAt: new Date().toISOString()
  });
}
