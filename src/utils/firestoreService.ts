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
  writeBatch
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
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
  mergeTripInfoFieldLevel,
  normalizeTripFieldsForFirestore,
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
 * Upload a whole TripBundle: trip document (field-level merge), cover image and
 * every subcollection. Used for a brand-new trip or a duplicated trip.
 *
 * Each part goes through the same guarded savers as a normal user save, so an
 * upload can never delete cloud rows this device has not seen.
 */
export async function uploadFullTripBundle(bundle: TripBundle, user: User): Promise<void> {
  const tripId = bundle.tripInfo.id;
  const tripPath = `trips/${tripId}`;
  try {
    // 1. Trip document + cover (only the fields this device changed are written)
    await saveTripInfoToFirestore(bundle.tripInfo, user);

    // 2. Subcollections — `undefined` means "never loaded here", keep the cloud
    //    copy untouched; an empty array is a real, intentional empty list.
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
 * Save / Update Trip Info — sync v2, field-level merge.
 *
 * Only the fields this device actually changed since the last known cloud
 * state are written, each write carries a Firestore server timestamp, and the
 * cover image goes to its own `meta/cover` document. Two devices editing two
 * different fields (e.g. A renames the trip while B changes the cover) keep
 * both edits instead of overwriting each other.
 */
export async function saveTripInfoToFirestore(trip: TripInfo, user: User): Promise<void> {
  const path = `trips/${trip.id}`;
  try {
    const baseline = getTripBaseline(trip.id);
    const { fields, cover } = splitTripInfo(trip);

    // No baseline yet => the cloud has never seen this trip: send everything.
    const writes = normalizeTripFieldsForFirestore(
      baseline ? diffTripInfoFields(baseline.fields, fields) : fullTripFields(trip)
    );
    const coverChanged = fingerprint(cover) !== (baseline?.coverHash ?? '0:0');
    const hasFieldWrites = Object.keys(writes).length > 0;

    if (!hasFieldWrites && !coverChanged) return;

    const batch = writeBatch(db);
    if (hasFieldWrites) {
      batch.set(
        doc(db, 'trips', trip.id),
        sanitizePayload({
          id: trip.id,
          ownerId: user.uid,
          ownerEmail: user.email || '',
          createdAt: trip.createdAt || new Date().toISOString(),
          // Kept for display/back-compat only: it is never used to resolve a
          // conflict (the device clock is not trustworthy).
          updatedAt: trip.updatedAt || new Date().toISOString(),
          ...writes,
          serverUpdatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }
    if (coverChanged) {
      batch.set(
        doc(db, 'trips', trip.id, 'meta', COVER_META_DOC_ID),
        coverPayload(trip.id, cover, user),
        { merge: true }
      );
    }
    await batch.commit();

    recordKnownRemoteTripId(trip.id);
    rememberTripBaseline(trip.id, {
      fields: { ...(baseline?.fields ?? {}), ...writes },
      coverHash: coverChanged ? fingerprint(cover) : baseline?.coverHash ?? '0:0',
      serverUpdatedAt: baseline?.serverUpdatedAt ?? null,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/** Store only the trip cover (kept out of the trip document on purpose). */
export async function saveTripCoverToFirestore(tripId: string, cover: string, user: User): Promise<void> {
  const path = `trips/${tripId}/meta/${COVER_META_DOC_ID}`;
  try {
    await setDoc(doc(db, 'trips', tripId, 'meta', COVER_META_DOC_ID), coverPayload(tripId, cover, user), {
      merge: true
    });
    const baseline = getTripBaseline(tripId);
    if (baseline) {
      rememberTripBaseline(tripId, { ...baseline, coverHash: fingerprint(cover) });
    }
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
export async function deleteNoteFromFirestore(tripId: string, noteId: string, user?: User): Promise<void> {
  const path = `trips/${tripId}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Explicitly delete a Service document from Firestore
 */
export async function deleteServiceFromFirestore(tripId: string, serviceId: string, user?: User): Promise<void> {
  const path = `trips/${tripId}/services/${serviceId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'services', serviceId));
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
  'services'
] as const;

export type TripSubcollection = (typeof TRIP_SUBCOLLECTIONS)[number];

/** Cover images live in their own document, so a photo never clobbers text edits. */
export const COVER_META_DOC_ID = 'cover';

const TRIP_BASELINE_STORAGE_KEY = 'our_travel_planner_remote_baseline_v2';
const KNOWN_SUBCOLLECTION_IDS_KEY = 'our_travel_planner_known_subcollection_ids_v1';
const PENDING_ITEM_UPLOADS_KEY = 'our_travel_planner_pending_item_uploads_v1';

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

export function markPendingItemUploads(
  tripId: string,
  subcollection: TripSubcollection,
  ids: string[]
): void {
  if (ids.length === 0) return;
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
    notes: mergeListWithCloud(tripId, 'notes', local.notes, remote.notes),
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
    next.notes = mergeListWithCloud(tripId, 'notes', trip.notes, partial.notes);
  }
  if (partial.services !== undefined) {
    next.services = mergeListWithCloud(tripId, 'services', trip.services, partial.services);
  }
  return next;
}

/**
 * Save Activities for a trip
 */
export async function syncActivitiesToFirestore(tripId: string, activities: Activity[], user: User): Promise<void> {
  const path = `trips/${tripId}/activities`;
  try {
    const newIds = new Set(activities.map((a) => a.id));
    markPendingItemUploads(tripId, 'activities', Array.from(newIds));
    // Only rows this device has already seen and the user removed here may be
    // deleted — a row the other device added meanwhile is never destroyed.
    const deletable = new Set(deletableRemoteIds(getKnownSubcollectionIds(tripId, 'activities'), newIds));

    const batch = writeBatch(db);
    for (const id of deletable) {
      batch.delete(doc(db, 'trips', tripId, 'activities', id));
    }
    // Set or update current
    for (const a of activities) {
      const aRef = doc(db, 'trips', tripId, 'activities', a.id);
      batch.set(aRef, sanitizePayload({
        id: a.id,
        tripId,
        ownerId: user.uid,
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
      }), { merge: true });
    }
    await batch.commit();
    recordSubcollectionIds(tripId, 'activities', Array.from(newIds));
    clearPendingItemUploads(tripId, 'activities');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save Budget Items for a trip
 */
export async function syncBudgetItemsToFirestore(tripId: string, items: BudgetItem[], user: User): Promise<void> {
  const path = `trips/${tripId}/budget_items`;
  try {
    const newIds = new Set(items.map((b) => b.id));
    markPendingItemUploads(tripId, 'budget_items', Array.from(newIds));
    const deletable = new Set(deletableRemoteIds(getKnownSubcollectionIds(tripId, 'budget_items'), newIds));

    const batch = writeBatch(db);
    for (const id of deletable) {
      batch.delete(doc(db, 'trips', tripId, 'budget_items', id));
    }
    for (const b of items) {
      const bRef = doc(db, 'trips', tripId, 'budget_items', b.id);
      batch.set(bRef, sanitizePayload({
        id: b.id,
        tripId,
        ownerId: user.uid,
        activityId: b.activityId || '',
        category: b.category,
        item: b.item,
        quantity: Number(b.quantity) || 1,
        unit: b.unit,
        plannedCost: Number(b.plannedCost) || 0,
        actualCost: Number(b.actualCost) || 0,
        notes: b.notes || '',
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }
    await batch.commit();
    recordSubcollectionIds(tripId, 'budget_items', Array.from(newIds));
    clearPendingItemUploads(tripId, 'budget_items');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save Places for a trip
 */
export async function syncPlacesToFirestore(tripId: string, places: Place[], user: User): Promise<void> {
  const path = `trips/${tripId}/places`;
  try {
    const newIds = new Set(places.map((p) => p.id));
    markPendingItemUploads(tripId, 'places', Array.from(newIds));
    const deletable = new Set(deletableRemoteIds(getKnownSubcollectionIds(tripId, 'places'), newIds));

    const batch = writeBatch(db);
    for (const id of deletable) {
      batch.delete(doc(db, 'trips', tripId, 'places', id));
    }
    for (const p of places) {
      const pRef = doc(db, 'trips', tripId, 'places', p.id);
      batch.set(pRef, sanitizePayload({
        id: p.id,
        tripId,
        ownerId: user.uid,
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
      }), { merge: true });
    }
    await batch.commit();
    recordSubcollectionIds(tripId, 'places', Array.from(newIds));
    clearPendingItemUploads(tripId, 'places');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save Checklist Items for a trip
 */
export async function syncChecklistToFirestore(tripId: string, items: ChecklistItem[], user: User): Promise<void> {
  const path = `trips/${tripId}/checklist`;
  try {
    const newIds = new Set(items.map((c) => c.id));
    markPendingItemUploads(tripId, 'checklist', Array.from(newIds));
    const deletable = new Set(deletableRemoteIds(getKnownSubcollectionIds(tripId, 'checklist'), newIds));

    const batch = writeBatch(db);
    for (const id of deletable) {
      batch.delete(doc(db, 'trips', tripId, 'checklist', id));
    }
    for (const c of items) {
      const cRef = doc(db, 'trips', tripId, 'checklist', c.id);
      batch.set(cRef, sanitizePayload({
        id: c.id,
        tripId,
        ownerId: user.uid,
        category: c.category,
        title: c.title,
        completed: Boolean(c.completed),
        notes: c.notes || '',
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }
    await batch.commit();
    recordSubcollectionIds(tripId, 'checklist', Array.from(newIds));
    clearPendingItemUploads(tripId, 'checklist');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save Notes for a trip
 */
export async function syncNotesToFirestore(tripId: string, notes: JournalNote[], user: User): Promise<void> {
  const path = `trips/${tripId}/notes`;
  try {
    const newIds = new Set(notes.map((n) => n.id));
    markPendingItemUploads(tripId, 'notes', Array.from(newIds));
    const deletable = new Set(deletableRemoteIds(getKnownSubcollectionIds(tripId, 'notes'), newIds));

    const batch = writeBatch(db);
    for (const id of deletable) {
      batch.delete(doc(db, 'trips', tripId, 'notes', id));
    }
    for (const n of notes) {
      const nRef = doc(db, 'trips', tripId, 'notes', n.id);
      batch.set(nRef, sanitizePayload({
        id: n.id,
        tripId,
        ownerId: user.uid,
        title: n.title,
        category: n.category,
        content: n.content,
        images: Array.isArray(n.images) ? n.images : [],
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }
    await batch.commit();
    recordSubcollectionIds(tripId, 'notes', Array.from(newIds));
    clearPendingItemUploads(tripId, 'notes');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save Services for a trip — persists the full list, including deletions:
 * remote docs this device saw and the user removed are deleted, while services
 * added by the other device in the meantime stay untouched.
 */
export async function syncServicesToFirestore(tripId: string, services: ServiceOption[], user: User): Promise<void> {
  const path = `trips/${tripId}/services`;
  try {
    const newIds = new Set(services.map((s) => s.id));
    markPendingItemUploads(tripId, 'services', Array.from(newIds));
    // Delete removed services so deletions persist to Firestore — but only the
    // ones this device saw before, never a service added by the other device.
    const deletable = new Set(deletableRemoteIds(getKnownSubcollectionIds(tripId, 'services'), newIds));

    const batch = writeBatch(db);
    for (const id of deletable) {
      batch.delete(doc(db, 'trips', tripId, 'services', id));
    }
    // Set or update current services
    for (const s of services) {
      const sRef = doc(db, 'trips', tripId, 'services', s.id);
      batch.set(sRef, sanitizePayload({
        id: s.id,
        tripId,
        ownerId: user.uid,
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
        // Outfit-only fields (category 'Outfit')
        outfitItems: Array.isArray(s.outfitItems) ? s.outfitItems : [],
        assignedSlots: Array.isArray(s.assignedSlots) ? s.assignedSlots : [],
        shopName: s.shopName || '',
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }
    await batch.commit();
    recordSubcollectionIds(tripId, 'services', Array.from(newIds));
    clearPendingItemUploads(tripId, 'services');
  } catch (error) {
    markPendingItemUploads(tripId, 'services', services.map((s) => s.id));
    handleFirestoreError(error, OperationType.WRITE, path);
  }
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
 * Real-time listener for all trips belonging to current user
 */
export function subscribeToUserTrips(
  user: User,
  onTripsUpdated: (trips: TripInfo[], metadata: { hasPendingWrites: boolean }) => void,
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
      onTripsUpdated(trips, { hasPendingWrites: snapshot.metadata.hasPendingWrites });
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
export async function saveRemoteAllowedEmails(emails: string[], userEmail: string): Promise<void> {
  if (userEmail.trim().toLowerCase() !== 'duonganhthu1505@gmail.com') {
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

