/**
 * syncCore — pure, dependency-free helpers that power "sync v2".
 *
 * Rules of the game (v2):
 *  1. The cloud is the single source of truth. A record that came back from
 *     Firestore always wins over the local copy, including when it is *empty*
 *     (an empty list means "deleted on the other device", never "fall back to
 *     whatever this device still has cached").
 *  2. Conflict resolution never trusts the device clock. Every write stamps
 *     `serverUpdatedAt` with the Firestore server timestamp; local copies keep
 *     the resolved value as `serverUpdatedAt` (ms since epoch).
 *  3. Writes are field-level merges, not full-document overwrites. We remember
 *     the last known cloud values in a `TripBaseline`; on save we push only the
 *     fields this device actually changed, so two devices editing different
 *     fields at the same time keep both edits.
 *  4. The (potentially huge) cover image lives in its own meta document
 *     `trips/{tripId}/meta/cover`, so the trip document stays small and a cover
 *     upload can never clobber a text edit.
 *
 * Everything in this module is a plain function so it can be unit tested
 * without a browser, a network, or a Firebase project (`scripts/sync-selftest.ts`).
 */

import { TripInfo, TripStatus } from '../types';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type TimestampLike =
  | number
  | string
  | Date
  | { seconds: number; nanoseconds?: number }
  | { toMillis: () => number }
  | null
  | undefined;

/** The trip fields that are merged field-by-field (the cover image is excluded). */
export const TRIP_MERGE_FIELDS = [
  'name',
  'destination',
  'startDate',
  'endDate',
  'travelers',
  'travelerNames',
  'transport',
  'hotel',
  'notes',
  'plannedBudget',
  'status',
] as const;

export type TripMergeField = (typeof TRIP_MERGE_FIELDS)[number];
export type TripMergeFields = Partial<Record<TripMergeField, unknown>>;

/** Last cloud values this device knows about for one trip. */
export interface TripBaseline {
  fields: TripMergeFields;
  coverHash: string;
  serverUpdatedAt: number | null;
}

export type BaselineMap = Record<string, TripBaseline | undefined>;

export interface PlannedUpload {
  id: string;
  /** Only the fields this device changed since the last known cloud state. */
  fields: TripMergeFields;
  cover: string;
  coverChanged: boolean;
  /** The cloud has never seen this trip: push the whole bundle, not a delta. */
  isNew: boolean;
}

export interface TripSyncPlan {
  /** Trips (or trip fields) that must be pushed to the cloud. */
  uploads: PlannedUpload[];
  /** Cloud copies to adopt verbatim — the cloud is the truth. */
  adopt: TripInfo[];
  /** Field-level merges: cloud values, plus the fields this device changed. */
  merged: TripInfo[];
  /** Local drafts that the cloud says were deleted on another device. */
  dropLocal: string[];
}

export interface TripSyncInput {
  localTrips: TripInfo[];
  remoteTrips: TripInfo[];
  baselines: BaselineMap;
  knownRemoteIds?: Iterable<string>;
  deletedIds?: Iterable<string>;
}

/* ------------------------------------------------------------------ *
 * Timestamps
 * ------------------------------------------------------------------ */

/**
 * Normalise anything the app may hold as a timestamp into milliseconds.
 * Handles Firestore Timestamps (`{seconds, nanoseconds}` / `{toMillis()}`),
 * `Date`, ISO strings and plain numbers. Returns `null` when the value is
 * missing or unusable (e.g. a still-pending `serverTimestamp()` sentinel).
 */
export function toMillis(value: TimestampLike): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    if (!value.trim()) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === 'object') {
    const candidate = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof candidate.toMillis === 'function') {
      try {
        const ms = candidate.toMillis();
        return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
      } catch {
        return null;
      }
    }
    if (typeof candidate.seconds === 'number') {
      const nanos = typeof candidate.nanoseconds === 'number' ? candidate.nanoseconds : 0;
      return candidate.seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }

  return null;
}

/** Reads the server-stamped timestamp (ms) off any record, or `null`. */
export function getServerMillis(record: { serverUpdatedAt?: unknown } | null | undefined): number | null {
  if (!record) return null;
  return toMillis(record.serverUpdatedAt as TimestampLike);
}

/** Reads the client ISO timestamp (ms) off any record, or `null`. */
export function getClientMillis(record: { updatedAt?: unknown } | null | undefined): number | null {
  if (!record) return null;
  return toMillis(record.updatedAt as TimestampLike);
}

/* ------------------------------------------------------------------ *
 * Fingerprints (cheap content identity, used for dirty checks)
 * ------------------------------------------------------------------ */

/** Stable, fast fingerprint of a (possibly huge) string. */
export function fingerprint(value: string | null | undefined): string {
  const text = value ?? '';
  if (!text) return '0:0';
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    // djb2 — cheap enough to run over a 600 KB cover string on every save.
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

/* ------------------------------------------------------------------ *
 * Trip info <-> Firestore shape
 * ------------------------------------------------------------------ */

export function splitTripInfo(info: TripInfo): { fields: TripMergeFields; cover: string } {
  const fields: TripMergeFields = {};
  for (const key of TRIP_MERGE_FIELDS) {
    const value = (info as unknown as Record<string, unknown>)[key];
    if (value !== undefined) fields[key] = value;
  }
  return { fields, cover: typeof info.coverImage === 'string' ? info.coverImage : '' };
}

export function coverHashOf(info: Partial<TripInfo> | null | undefined): string {
  return fingerprint(typeof info?.coverImage === 'string' ? info.coverImage : '');
}

/** Snapshot of the last values we know are stored in the cloud. */
export function baselineFromRemote(
  remote: Partial<TripInfo> | null | undefined,
  cover: string | null | undefined
): TripBaseline {
  const fields: TripMergeFields = {};
  if (remote) {
    for (const key of TRIP_MERGE_FIELDS) {
      const value = (remote as unknown as Record<string, unknown>)[key];
      if (value !== undefined) fields[key] = value;
    }
  }
  return {
    fields,
    coverHash: fingerprint(cover ?? ''),
    serverUpdatedAt: getServerMillis(remote as { serverUpdatedAt?: unknown } | undefined),
  };
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const norm = (v: unknown) => (v === undefined || v === null ? '' : v);
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (typeof na === 'number' || typeof nb === 'number') {
    const num = (v: unknown) => (v === undefined || v === null || v === '' ? 0 : Number(v));
    const x = num(a);
    const y = num(b);
    return Number.isFinite(x) && Number.isFinite(y) && x === y;
  }
  return false;
}

/**
 * Fields whose value differs between the last known cloud state and `next`.
 * Used both to decide "is this device dirty?" and to write only what changed.
 */
export function diffTripInfoFields(baseline: TripMergeFields | undefined, next: TripMergeFields): TripMergeFields {
  const changed: TripMergeFields = {};
  const base = baseline ?? {};
  for (const key of TRIP_MERGE_FIELDS) {
    const before = base[key];
    const after = next[key];
    if (after === undefined) continue;
    if (!sameValue(before, after)) changed[key] = after;
  }
  return changed;
}

const VALID_STATUS: TripStatus[] = ['Planning', 'Upcoming', 'Ongoing', 'Completed'];

/**
 * The deployed security rules require `name`/`destination` to be non-empty and
 * `status` to be a known enum, so a dirty field that was cleared by the user is
 * written with a safe placeholder instead of making the whole write fail.
 */
export function normalizeTripFieldsForFirestore(fields: TripMergeFields): TripMergeFields {
  const clean: TripMergeFields = { ...fields };
  if ('name' in clean) clean.name = String(clean.name ?? '').trim() || 'Untitled Journey';
  if ('destination' in clean) clean.destination = String(clean.destination ?? '').trim() || 'Unknown';
  if ('status' in clean) {
    const status = String(clean.status ?? '') as TripStatus;
    clean.status = VALID_STATUS.includes(status) ? status : 'Planning';
  }
  if ('travelers' in clean) {
    const travelers = Number(clean.travelers);
    clean.travelers = Number.isFinite(travelers) && travelers >= 1 ? travelers : 2;
  }
  if ('plannedBudget' in clean) {
    const budget = Number(clean.plannedBudget);
    clean.plannedBudget = Number.isFinite(budget) ? budget : 0;
  }
  return clean;
}

/** Everything this device would have to push when the cloud never saw the trip. */
export function fullTripFields(info: TripInfo): TripMergeFields {
  return normalizeTripFieldsForFirestore(splitTripInfo(info).fields);
}

/* ------------------------------------------------------------------ *
 * Dirty / conflict decisions
 * ------------------------------------------------------------------ */

export function isTripDirty(local: TripInfo, baseline: TripBaseline | undefined): boolean {
  if (!baseline) return true;
  const { fields, cover } = splitTripInfo(local);
  if (fingerprint(cover) !== baseline.coverHash) return true;
  return Object.keys(diffTripInfoFields(baseline.fields, fields)).length > 0;
}

export function dirtyTripFields(local: TripInfo, baseline: TripBaseline | undefined): TripMergeFields {
  const { fields } = splitTripInfo(local);
  if (!baseline) return normalizeTripFieldsForFirestore(fields);
  return normalizeTripFieldsForFirestore(diffTripInfoFields(baseline.fields, fields));
}

/**
 * Cloud document + the fields this device changed on top of it.
 * Without a baseline the local copy is authoritative (it has never been
 * pushed), so the local values win until they reach the server.
 */
export function mergeTripInfoFieldLevel(
  local: TripInfo,
  remote: TripInfo,
  baseline: TripBaseline | undefined
): TripInfo {
  if (!baseline) {
    return { ...local, serverUpdatedAt: remote.serverUpdatedAt ?? local.serverUpdatedAt };
  }

  const { fields: localFields, cover: localCover } = splitTripInfo(local);
  const dirty = diffTripInfoFields(baseline.fields, localFields);

  const merged: TripInfo = { ...remote };
  for (const [key, value] of Object.entries(dirty)) {
    (merged as unknown as Record<string, unknown>)[key] = value;
  }

  // Cover image: keep the local one only when this device changed it.
  merged.coverImage = fingerprint(localCover) !== baseline.coverHash ? localCover : remote.coverImage || '';

  // Identity fields always follow the cloud document when they are identical.
  merged.id = remote.id;
  merged.createdAt = remote.createdAt || local.createdAt;
  merged.serverUpdatedAt = remote.serverUpdatedAt ?? local.serverUpdatedAt;

  return merged;
}

/* ------------------------------------------------------------------ *
 * Reconciliation plan
 * ------------------------------------------------------------------ */

/**
 * Decides, for every trip, what this device should do:
 *  - push the fields it changed (never the whole document),
 *  - adopt the cloud copy,
 *  - or drop a local draft the cloud says was deleted elsewhere.
 */
export function planTripSync(input: TripSyncInput): TripSyncPlan {
  const { localTrips, remoteTrips, baselines } = input;
  const knownRemoteIds = new Set(input.knownRemoteIds ?? []);
  const deletedIds = new Set(input.deletedIds ?? []);

  const plan: TripSyncPlan = { uploads: [], adopt: [], merged: [], dropLocal: [] };
  const remoteById = new Map(remoteTrips.map((trip) => [trip.id, trip]));

  for (const local of localTrips) {
    if (!local || !local.id) continue;

    // The trip was deleted (here or on the other device) — it must not come back.
    if (deletedIds.has(local.id)) {
      plan.dropLocal.push(local.id);
      remoteById.delete(local.id);
      continue;
    }

    const remote = remoteById.get(local.id);

    if (!remote) {
      // A trip this device already saw in the cloud and that is now gone was
      // deleted on another device: cloud wins, drop the local copy.
      if (knownRemoteIds.has(local.id)) {
        plan.dropLocal.push(local.id);
        continue;
      }
      // Otherwise it is genuinely new: push it in full.
      plan.uploads.push({
        id: local.id,
        fields: fullTripFields(local),
        cover: local.coverImage || '',
        coverChanged: Boolean(local.coverImage),
        isNew: true,
      });
      continue;
    }

    remoteById.delete(local.id);

    const baseline = baselines[local.id];
    if (!isTripDirty(local, baseline)) {
      plan.adopt.push(remote);
      continue;
    }

    const fields = dirtyTripFields(local, baseline);
    plan.uploads.push({
      id: local.id,
      fields,
      cover: local.coverImage || '',
      coverChanged: fingerprint(local.coverImage || '') !== (baseline?.coverHash ?? '0:0'),
      isNew: false,
    });
    plan.merged.push(mergeTripInfoFieldLevel(local, remote, baseline));
  }

  // Trips that exist only in the cloud are simply adopted.
  for (const remote of remoteById.values()) {
    if (deletedIds.has(remote.id)) continue;
    plan.adopt.push(remote);
  }

  return plan;
}

/* ------------------------------------------------------------------ *
 * List merging (activities, budget, places, checklist, notes, services)
 * ------------------------------------------------------------------ */

export interface MergeListResult<T> {
  /** Cloud rows verbatim, plus the local-only rows that are still pending upload. */
  items: T[];
  /** Local-only rows that survived because an upload is still pending. */
  pending: T[];
  /** Ids of local-only rows that were dropped because the cloud deleted them. */
  dropped: string[];
}

/**
 * Cloud wins for every id that exists remotely — even when the remote list is
 * empty (that means "everything was deleted on the other device").
 * A local-only row survives only while its upload is still pending; otherwise
 * it is a row the cloud already knows about and deleted.
 */
export function mergeItemLists<T extends { id: string }>(
  localItems: T[] | null | undefined,
  remoteItems: T[] | null | undefined,
  pendingIds: Iterable<string> = []
): MergeListResult<T> {
  const remote = Array.isArray(remoteItems) ? remoteItems : [];
  const pending = new Set(pendingIds);
  const remoteIds = new Set(remote.map((item) => item && item.id).filter(Boolean) as string[]);

  const items: T[] = [...remote];
  const keptPending: T[] = [];
  const dropped: string[] = [];

  for (const item of Array.isArray(localItems) ? localItems : []) {
    if (!item || !item.id) continue;
    if (remoteIds.has(item.id)) continue; // cloud row wins
    if (pending.has(item.id)) {
      items.push(item);
      keptPending.push(item);
    } else {
      dropped.push(item.id);
    }
  }

  return { items, pending: keptPending, dropped };
}

/**
 * Which remote rows may be deleted by a full-list save.
 * Only rows this device has actually seen and that are missing from the new
 * list were deleted on purpose — rows added by the other device in the
 * meantime are never destroyed by a stale editor.
 */
export function deletableRemoteIds(
  knownRemoteIds: Iterable<string>,
  nextIds: Iterable<string>
): string[] {
  const next = new Set(nextIds);
  const known = new Set(knownRemoteIds);
  const result: string[] = [];
  for (const id of known) {
    if (!next.has(id)) result.push(id);
  }
  return result;
}


/** Pure retry gate used by the background pending-write queue. */
export function shouldRetryPendingWrite(pending: boolean, online: boolean, inFlight: boolean): boolean {
  return pending && online && !inFlight;
}

/** Parse the persisted pending-write queue. Invalid/legacy values become an empty queue. */
export function parsePendingTripIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
  } catch {
    return [];
  }
}

/** Add one trip to the pending-write queue without duplicates. */
export function addPendingTripId(ids: Iterable<string>, tripId: string): string[] {
  const next = new Set(Array.from(ids).filter(Boolean));
  if (tripId) next.add(tripId);
  return Array.from(next);
}

/** Remove only the trip that was successfully retried. */
export function removePendingTripId(ids: Iterable<string>, tripId: string): string[] {
  return Array.from(ids).filter((id) => id !== tripId);
}
