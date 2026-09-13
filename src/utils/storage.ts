import { AppData, TripBundle } from '../types';
import { ALLOWED_EMAILS, SAMPLE_TRIP_BUNDLE, SAMPLE_TRIP_ID, SECOND_TRIP_BUNDLE, SECOND_TRIP_ID } from './constants';
import { computeTripStatus } from './dateHelpers';

const STORAGE_KEY = 'our_travel_planner_data_v1';
const AUTH_KEY = 'our_travel_planner_auth_v1';
const INITIALIZED_KEY = 'our_travel_planner_initialized_v1';

export function getInitialAppData(): AppData {
  const defaultTrips: Record<string, TripBundle> = {
    [SAMPLE_TRIP_ID]: SAMPLE_TRIP_BUNDLE,
    [SECOND_TRIP_ID]: SECOND_TRIP_BUNDLE
  };

  return {
    version: '1.0.0',
    activeTripId: SAMPLE_TRIP_ID,
    trips: defaultTrips,
    userEmail: null,
    allowedEmails: ALLOWED_EMAILS
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const hasBeenInitialized = localStorage.getItem(INITIALIZED_KEY);

    if (!raw && !hasBeenInitialized) {
      const initial = getInitialAppData();
      saveAppData(initial);
      localStorage.setItem(INITIALIZED_KEY, 'true');
      return initial;
    }

    if (!raw) {
      return {
        version: '1.0.0',
        activeTripId: null,
        trips: {},
        userEmail: null,
        allowedEmails: ALLOWED_EMAILS
      };
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
