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
  TripBundle
} from '../types';

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
  const tripPath = `trips/${bundle.tripInfo.id}`;
  try {
    const batch = writeBatch(db);

    const tripDocRef = doc(db, 'trips', bundle.tripInfo.id);
    const cleanTrip = sanitizePayload({
      id: bundle.tripInfo.id,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      name: bundle.tripInfo.name || 'Untitled Journey',
      destination: bundle.tripInfo.destination || 'Unknown',
      startDate: bundle.tripInfo.startDate || '',
      endDate: bundle.tripInfo.endDate || '',
      travelers: Number(bundle.tripInfo.travelers) || 2,
      travelerNames: bundle.tripInfo.travelerNames || '',
      transport: bundle.tripInfo.transport || '',
      hotel: bundle.tripInfo.hotel || '',
      coverImage: bundle.tripInfo.coverImage || '',
      notes: bundle.tripInfo.notes || '',
      plannedBudget: Number(bundle.tripInfo.plannedBudget) || 0,
      status: bundle.tripInfo.status || 'Planning',
      createdAt: bundle.tripInfo.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    batch.set(tripDocRef, cleanTrip);

    // Activities
    for (const act of bundle.itinerary) {
      const actRef = doc(db, 'trips', bundle.tripInfo.id, 'activities', act.id);
      batch.set(actRef, sanitizePayload({
        id: act.id,
        tripId: bundle.tripInfo.id,
        ownerId: user.uid,
        date: act.date,
        time: act.time,
        title: act.title,
        location: act.location,
        category: act.category,
        plannedCost: Number(act.plannedCost) || 0,
        actualCost: Number(act.actualCost) || 0,
        note: act.note || '',
        mapUrl: act.mapUrl || '',
        order: Number(act.order) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    // Budget items
    for (const b of bundle.budget) {
      const bRef = doc(db, 'trips', bundle.tripInfo.id, 'budget_items', b.id);
      batch.set(bRef, sanitizePayload({
        id: b.id,
        tripId: bundle.tripInfo.id,
        ownerId: user.uid,
        activityId: b.activityId || '',
        category: b.category,
        item: b.item,
        quantity: Number(b.quantity) || 1,
        unit: b.unit,
        plannedCost: Number(b.plannedCost) || 0,
        actualCost: Number(b.actualCost) || 0,
        notes: b.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    // Places
    for (const p of bundle.places) {
      const pRef = doc(db, 'trips', bundle.tripInfo.id, 'places', p.id);
      batch.set(pRef, sanitizePayload({
        id: p.id,
        tripId: bundle.tripInfo.id,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    // Checklist
    for (const c of bundle.checklist) {
      const cRef = doc(db, 'trips', bundle.tripInfo.id, 'checklist', c.id);
      batch.set(cRef, sanitizePayload({
        id: c.id,
        tripId: bundle.tripInfo.id,
        ownerId: user.uid,
        category: c.category,
        title: c.title,
        completed: Boolean(c.completed),
        notes: c.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    // Notes
    for (const n of bundle.notes) {
      const nRef = doc(db, 'trips', bundle.tripInfo.id, 'notes', n.id);
      batch.set(nRef, sanitizePayload({
        id: n.id,
        tripId: bundle.tripInfo.id,
        ownerId: user.uid,
        title: n.title,
        category: n.category,
        content: n.content,
        images: Array.isArray(n.images) ? n.images : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    await batch.commit();
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
    const docRef = doc(db, 'trips', trip.id);
    const payload = sanitizePayload({
      id: trip.id,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: Number(trip.travelers) || 2,
      travelerNames: trip.travelerNames || '',
      transport: trip.transport || '',
      hotel: trip.hotel || '',
      coverImage: trip.coverImage || '',
      notes: trip.notes || '',
      plannedBudget: Number(trip.plannedBudget) || 0,
      status: trip.status,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
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

    // Delete subcollections first
    const subcollections = ['activities', 'budget_items', 'places', 'checklist', 'notes'];
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

/**
 * Save Activities for a trip
 */
export async function syncActivitiesToFirestore(tripId: string, activities: Activity[], user: User): Promise<void> {
  const path = `trips/${tripId}/activities`;
  try {
    const subRef = collection(db, 'trips', tripId, 'activities');
    const snap = await getDocs(subRef);
    const existingIds = new Set(snap.docs.map((d) => d.id));
    const newIds = new Set(activities.map((a) => a.id));

    const batch = writeBatch(db);
    // Delete removed
    for (const d of snap.docs) {
      if (!newIds.has(d.id)) {
        batch.delete(d.ref);
      }
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
    const subRef = collection(db, 'trips', tripId, 'budget_items');
    const snap = await getDocs(subRef);
    const newIds = new Set(items.map((b) => b.id));

    const batch = writeBatch(db);
    for (const d of snap.docs) {
      if (!newIds.has(d.id)) {
        batch.delete(d.ref);
      }
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
    const subRef = collection(db, 'trips', tripId, 'places');
    const snap = await getDocs(subRef);
    const newIds = new Set(places.map((p) => p.id));

    const batch = writeBatch(db);
    for (const d of snap.docs) {
      if (!newIds.has(d.id)) {
        batch.delete(d.ref);
      }
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
    const subRef = collection(db, 'trips', tripId, 'checklist');
    const snap = await getDocs(subRef);
    const newIds = new Set(items.map((c) => c.id));

    const batch = writeBatch(db);
    for (const d of snap.docs) {
      if (!newIds.has(d.id)) {
        batch.delete(d.ref);
      }
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
    const subRef = collection(db, 'trips', tripId, 'notes');
    const snap = await getDocs(subRef);
    const newIds = new Set(notes.map((n) => n.id));

    const batch = writeBatch(db);
    for (const d of snap.docs) {
      if (!newIds.has(d.id)) {
        batch.delete(d.ref);
      }
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
  } catch (error) {
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
        trips.push(docSnap.data() as TripInfo);
      });
      // Sort newest first
      trips.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
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
    const [actSnap, bgtSnap, plcSnap, chkSnap, notSnap] = await Promise.all([
      getDocs(collection(db, 'trips', tripId, 'activities')),
      getDocs(collection(db, 'trips', tripId, 'budget_items')),
      getDocs(collection(db, 'trips', tripId, 'places')),
      getDocs(collection(db, 'trips', tripId, 'checklist')),
      getDocs(collection(db, 'trips', tripId, 'notes')),
    ]);

    const itinerary: Activity[] = actSnap.docs.map((d) => d.data() as Activity);
    const budget: BudgetItem[] = bgtSnap.docs.map((d) => d.data() as BudgetItem);
    const places: Place[] = plcSnap.docs.map((d) => d.data() as Place);
    const checklist: ChecklistItem[] = chkSnap.docs.map((d) => d.data() as ChecklistItem);
    const notes: JournalNote[] = notSnap.docs.map((d) => d.data() as JournalNote);

    // Sort itinerary by date and time
    itinerary.sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.time || '').localeCompare(b.time || '');
    });

    return {
      tripInfo,
      itinerary,
      budget,
      places,
      checklist,
      notes,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
  }
}

/**
 * Real-time subscription to subcollections of active trip
 */
export function subscribeToTripSubcollections(
  tripId: string,
  onUpdate: (data: {
    itinerary: Activity[];
    budget: BudgetItem[];
    places: Place[];
    checklist: ChecklistItem[];
    notes: JournalNote[];
  }) => void
): () => void {
  const unsubActs = onSnapshot(collection(db, 'trips', tripId, 'activities'), () => refreshAll());
  const unsubBgts = onSnapshot(collection(db, 'trips', tripId, 'budget_items'), () => refreshAll());
  const unsubPlcs = onSnapshot(collection(db, 'trips', tripId, 'places'), () => refreshAll());
  const unsubChks = onSnapshot(collection(db, 'trips', tripId, 'checklist'), () => refreshAll());
  const unsubNots = onSnapshot(collection(db, 'trips', tripId, 'notes'), () => refreshAll());

  let timeoutId: any = null;
  const refreshAll = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      try {
        const [actSnap, bgtSnap, plcSnap, chkSnap, notSnap] = await Promise.all([
          getDocs(collection(db, 'trips', tripId, 'activities')),
          getDocs(collection(db, 'trips', tripId, 'budget_items')),
          getDocs(collection(db, 'trips', tripId, 'places')),
          getDocs(collection(db, 'trips', tripId, 'checklist')),
          getDocs(collection(db, 'trips', tripId, 'notes')),
        ]);

        const itinerary = actSnap.docs.map((d) => d.data() as Activity);
        itinerary.sort((a, b) => {
          const dateCmp = (a.date || '').localeCompare(b.date || '');
          if (dateCmp !== 0) return dateCmp;
          return (a.time || '').localeCompare(b.time || '');
        });

        onUpdate({
          itinerary,
          budget: bgtSnap.docs.map((d) => d.data() as BudgetItem),
          places: plcSnap.docs.map((d) => d.data() as Place),
          checklist: chkSnap.docs.map((d) => d.data() as ChecklistItem),
          notes: notSnap.docs.map((d) => d.data() as JournalNote),
        });
      } catch (err) {
        console.warn('Subcollection fetch error:', err);
      }
    }, 150);
  };

  return () => {
    clearTimeout(timeoutId);
    unsubActs();
    unsubBgts();
    unsubPlcs();
    unsubChks();
    unsubNots();
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

