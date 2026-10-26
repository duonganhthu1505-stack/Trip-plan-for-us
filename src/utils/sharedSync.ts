import type { AppData } from '../types';

const TOKEN_KEY = 'our_travel_planner_shared_session_v1';

export function getSharedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setSharedToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch {}
}
async function request(init?: RequestInit, query = '') {
  const response = await fetch('/api/sync' + query, {
    ...init,
    headers: { 'content-type': 'application/json', ...(getSharedToken() ? { authorization: `Bearer ${getSharedToken()}` } : {}), ...(init?.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error || 'SYNC_ERROR') as Error & { state?: any };
    error.state = body?.state;
    throw error;
  }
  return body;
}
export async function loginSharedPassword(password: string) {
  const body = await request({ method: 'POST', body: JSON.stringify({ action: 'login', password }) });
  if (!body.token) return false;
  setSharedToken(body.token);
  return true;
}
export function logoutSharedSession() { setSharedToken(null); }
export async function fetchSharedState(): Promise<{ data: AppData; revision: number } | null> {
  const body = await request({ method: 'GET' });
  return body.state ?? null;
}
export async function saveSharedState(data: AppData, revision: number) {
  const body = await request({ method: 'PUT', body: JSON.stringify({ data, revision }) });
  return Number(body.revision || revision);
}
export async function changeSharedPassword(newPassword: string) {
  const body = await request({ method: 'POST', body: JSON.stringify({ action: 'change-password', newPassword }) });
  if (body.token) setSharedToken(body.token);
}
export function clearSharedSession() { setSharedToken(null); }

/** Only journal content is shared. Trip selection and login labels stay local. */
export function sharedDataFingerprint(data: AppData): string {
  return JSON.stringify({
    version: data.version,
    trips: data.trips || {},
    allowedEmails: data.allowedEmails || [],
  });
}

export function toSharedPayload(data: AppData): AppData {
  return { ...data, activeTripId: null, userEmail: null };
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Three-way merge for the existing shared store. Only changes made since the
 * last acknowledged revision are reapplied to a newer remote revision.
 * Conflicting edits to the same field keep this device's pending value;
 * unrelated trips, items and fields are preserved from both devices.
 */
function mergeThreeWay(base: any, remote: any, local: any): any {
  if (sameValue(local, base)) return remote;
  if (sameValue(remote, base)) return local;
  if (sameValue(local, remote)) return local;
  if (local === undefined) return undefined;
  if (remote === undefined) return local;

  if (Array.isArray(remote) && Array.isArray(local)) {
    const baseArray = Array.isArray(base) ? base : [];
    const values = [...baseArray, ...remote, ...local];
    const hasIds = values.some((value) => isRecord(value) && typeof value.id === 'string');
    const allCompatible = values.every((value) => isRecord(value) && typeof value.id === 'string');
    if (hasIds && allCompatible) {
      const byId = (items: any[]) => new Map(items.map((item) => [item.id, item]));
      const baseById = byId(baseArray);
      const remoteById = byId(remote);
      const localById = byId(local);
      const order = [
        ...local.map((item) => item.id),
        ...remote.map((item) => item.id),
        ...baseArray.map((item) => item.id),
      ];
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const id of order) {
        if (seen.has(id)) continue;
        seen.add(id);
        const value = mergeThreeWay(baseById.get(id), remoteById.get(id), localById.get(id));
        if (value !== undefined) merged.push(value);
      }
      return merged;
    }
    return local;
  }

  if (isRecord(remote) && isRecord(local)) {
    const baseRecord = isRecord(base) ? base : {};
    const keys = new Set([...Object.keys(baseRecord), ...Object.keys(remote), ...Object.keys(local)]);
    const merged: Record<string, unknown> = {};
    for (const key of keys) {
      const value = mergeThreeWay(baseRecord[key], remote[key], local[key]);
      if (value !== undefined) merged[key] = value;
    }
    return merged;
  }

  return local;
}

export function mergeSharedDataThreeWay(base: AppData, remote: AppData, local: AppData): AppData {
  return {
    ...local,
    trips: mergeThreeWay(base.trips || {}, remote.trips || {}, local.trips || {}),
    allowedEmails: mergeThreeWay(base.allowedEmails || [], remote.allowedEmails || [], local.allowedEmails || []),
  };
}

/** Best-effort keepalive write. The dirty marker remains until reload verifies it. */
export function flushSharedState(data: AppData, revision: number): boolean {
  try {
    const body = JSON.stringify({ data, revision });
    if (new Blob([body]).size > 60_000) return false;
    void request({ method: 'PUT', body, keepalive: true }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/** Reapply only edits relative to a known server baseline. Unknown caches are
 * quarantined; edits made during the initial fetch have a known local baseline. */
export function reconcileSharedStartup(base: AppData | null, remote: AppData, local: AppData, starting: AppData) {
  const data = mergeSharedDataThreeWay(base || starting, remote, local);
  return {
    data,
    preserveLocalCopy: !base && sharedDataFingerprint(starting) !== sharedDataFingerprint(remote),
  };
}

export interface SharedVersion {
  id: string;
  revision: number;
  createdAt: string | null;
  restoredFrom: string | null;
  current: boolean;
  trips: string[];
}
export async function fetchSharedHistory(): Promise<SharedVersion[]> {
  return (await request(undefined, '?history=1')).versions;
}
export async function fetchSharedVersion(id: string): Promise<{ data: AppData }> {
  return (await request(undefined, '?version=' + encodeURIComponent(id))).version;
}
export async function restoreSharedVersion(id: string, revision: number): Promise<{ data: AppData; revision: number }> {
  return (await request({ method: 'PUT', body: JSON.stringify({ restoreVersion: id, revision }) })).state;
}
