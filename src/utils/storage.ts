import { AppData, TripBundle } from '../types';
import { ALLOWED_EMAILS } from './constants';
import { computeTripStatus } from './dateHelpers';
import type { User } from 'firebase/auth';

const STORAGE_KEY = 'our_travel_planner_data_v1';
const AUTH_KEY = 'our_travel_planner_auth_v1';
const INITIALIZED_KEY = 'our_travel_planner_initialized_v1';

// Fallback cloud seeding: the UI already writes changes to Firestore through App.tsx.
// This extra layer makes sure data that only exists in one browser/localStorage
// (for example an older phone session) is also pushed to the shared Firestore journal.
// It deliberately keeps the existing email-only login UX unchanged.
let cloudSeedTimer: ReturnType<typeof setTimeout> | null = null;
const lastSeededTripSignatures = new Map<string, string>();

function stableCloudValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableCloudValue);
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    Object.keys(value)
      .filter((key) => !['updatedAt', 'ownerId', 'ownerEmail'].includes(key))
      .sort()
      .forEach((key) => {
        result[key] = stableCloudValue(value[key]);
      });
    return result;
  }
  return value;
}

function tripSignature(bundle: TripBundle): string {
  try {
    return JSON.stringify(stableCloudValue(bundle));
  } catch {
    return '';
  }
}

function scheduleCloudSeed(data: AppData): void {
  const email = getAuthEmail();
  if (!email || !data.trips || Object.keys(data.trips).length === 0) return;

  if (cloudSeedTimer) clearTimeout(cloudSeedTimer);
  cloudSeedTimer = setTimeout(async () => {
    try {
      const { uploadFullTripBundle, getIsGlobalQuotaExhausted } = await import('./firestoreService');
      if (getIsGlobalQuotaExhausted()) return;

      // The current app intentionally uses the authorized email as its local user identity.
      // Firestore stores one shared trip collection, so every allowed device sees the same data.
      const localUser = { uid: email, email } as User;
      const entries = Object.entries(data.trips) as [string, TripBundle][];

      for (const [tripId, bundle] of entries) {
        const signature = tripSignature(bundle);
        if (!signature || lastSeededTripSignatures.get(tripId) === signature) continue;

        try {
          await uploadFullTripBundle(bundle, localUser);
          lastSeededTripSignatures.set(tripId, signature);
        } catch (err) {
          // Keep local data intact. App.tsx will show offline state when its normal sync fails.
          console.warn('Background shared-cloud seed failed for trip', tripId, err);
        }
      }
    } catch (err) {
      console.warn('Background shared-cloud seed unavailable:', err);
    }
  }, 1200);
}

export function getInitialAppData(): AppData {
  return {
    version: '1.0.0',
    activeTripId: null,
    trips: {},
    userEmail: null,
    allowedEmails: ALLOWED_EMAILS
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const hasBeenInitialized = localStorage.getItem(INITIALIZED_KEY);

    // First visit / private browsing / new device: start clean.
    // Real trips will be loaded from Firebase after the user signs in.
    if (!raw && !hasBeenInitialized) {
      const initial = getInitialAppData();
      saveAppData(initial);
      localStorage.setItem(INITIALIZED_KEY, 'true');
      return initial;
    }

    if (!raw) {
      return getInitialAppData();
    }

    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.trips) {
      parsed.trips = {};
    }

    // Filter out any locally deleted trip IDs so they never reappear
    try {
      const deletedRaw = localStorage.getItem('our_travel_planner_deleted_trips_v1');
      if (deletedRaw) {
        const deletedIds: string[] = JSON.parse(deletedRaw);
        for (const dId of deletedIds) {
          if (parsed.trips[dId]) {
            delete parsed.trips[dId];
          }
        }
      }
    } catch {
      // Ignore
    }

    // Ensure all remaining trips have updated status based on current date
    Object.keys(parsed.trips).forEach((id) => {
      const bundle = parsed.trips[id];
      if (bundle?.tripInfo) {
        bundle.tripInfo.status = computeTripStatus(bundle.tripInfo.startDate, bundle.tripInfo.endDate);
      }
    });

    if (parsed.activeTripId && !parsed.trips[parsed.activeTripId]) {
      parsed.activeTripId = Object.keys(parsed.trips)[0] || null;
    }

    // Ensure allowedEmails array exists
    if (!parsed.allowedEmails || !Array.isArray(parsed.allowedEmails)) {
      parsed.allowedEmails = ALLOWED_EMAILS;
    }

    return parsed;
  } catch (err) {
    console.error('Failed to load travel planner data from LocalStorage:', err);
    return getInitialAppData();
  }
}

export function saveAppData(data: AppData): void {
  try {
    const raw = JSON.stringify(data);
    if (raw.length < 3_000_000) {
      localStorage.setItem(STORAGE_KEY, raw);
      scheduleCloudSeed(data);
      return;
    }

    // When trips contain heavy HD photos, strip them from LocalStorage (5MB cap)
    // because full HD photos are already safely preserved in high-capacity IndexedDB!
    const safeData: AppData = {
      ...data,
      trips: Object.fromEntries(
        Object.entries(data.trips || {}).map(([tId, bundle]) => [
          tId,
          {
            ...bundle,
            notes: (bundle.notes || []).map((n) => ({
              ...n,
              images: Array.isArray(n.images) && n.images.some((img) => img.length > 50_000)
                ? []
                : n.images
            }))
          }
        ])
      )
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    scheduleCloudSeed(safeData);
  } catch (err) {
    console.warn('LocalStorage quota limit reached, saving metadata only (IndexedDB retains HD photos):', err);
    try {
      const fallbackData: AppData = {
        ...data,
        trips: Object.fromEntries(
          Object.entries(data.trips || {}).map(([tId, bundle]) => [
            tId,
            {
              ...bundle,
              notes: (bundle.notes || []).map((n) => ({ ...n, images: [] }))
            }
          ])
        )
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackData));
      scheduleCloudSeed(fallbackData);
    } catch {
      // Ignore
    }
  }
}

export function getAuthEmail(): string | null {
  try {
    return localStorage.getItem(AUTH_KEY) || null;
  } catch {
    return null;
  }
}

export function setAuthEmail(email: string | null): void {
  try {
    if (email) {
      localStorage.setItem(AUTH_KEY, email);
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    // Ignore storage issues
  }
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
