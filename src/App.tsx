import React, { useState, useEffect, useCallback } from 'react';
import {
  AppData,
  TripBundle,
  TripInfo,
  Activity,
  BudgetItem,
  Place,
  ChecklistItem,
  JournalNote
} from './types';
import {
  loadAppData,
  saveAppData,
  getAuthEmail,
  setAuthEmail,
  downloadJsonFile,
  getInitialAppData
} from './utils/storage';
import { computeTripStatus } from './utils/dateHelpers';
import { Login } from './components/Login';
import { Navigation, ActiveTab } from './components/Navigation';
import { TripOverview } from './components/TripOverview';
import { TripForm } from './components/TripForm';
import { Itinerary } from './components/Itinerary';
import { Budget } from './components/Budget';
import { Places } from './components/Places';
import { Checklist } from './components/Checklist';
import { Notes } from './components/Notes';
import { Settings } from './components/Settings';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { Compass, Plus, Heart } from 'lucide-react';
import { auth, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  uploadFullTripBundle,
  saveTripInfoToFirestore,
  deleteTripFromFirestore,
  syncActivitiesToFirestore,
  syncBudgetItemsToFirestore,
  syncPlacesToFirestore,
  syncChecklistToFirestore,
  syncNotesToFirestore,
  saveUserProfile,
  subscribeToUserTrips,
  fetchFullTripBundle,
  subscribeToTripSubcollections,
  getRemoteAllowedEmails,
  saveRemoteAllowedEmails
} from './utils/firestoreService';

export default function App() {
  // App-level state loaded from LocalStorage
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [userEmail, setUserEmailState] = useState<string | null>(() => getAuthEmail());
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Toasts notification system
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // State for creating or editing trip details
  const [isCreatingNewTrip, setIsCreatingNewTrip] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Background Auto-Save (debounced to LocalStorage without spamming toasts)
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Auth State Listener (Firebase Auth)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setUserEmailState(user.email);
        setAuthEmail(user.email || '');
        setAppData((prev) => ({ ...prev, userEmail: user.email || '' }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch remotely authorized emails (controlled by duonganhthu1505@gmail.com)
  useEffect(() => {
    async function loadPermissions() {
      try {
        const remote = await getRemoteAllowedEmails();
        if (remote && remote.length > 0) {
          const merged = Array.from(new Set(['duonganhthu1505@gmail.com', ...remote]));
          setAppData((prev) => ({ ...prev, allowedEmails: merged }));
        }
      } catch (err) {
        console.warn('Error loading remote permissions:', err);
      }
    }
    loadPermissions();
  }, []);

  // Real-time Firestore Sync for Trips
  useEffect(() => {
    if (!firebaseUser) return;

    let isMounted = true;
    setSyncStatus('syncing');

    const unsubscribe = subscribeToUserTrips(
      firebaseUser,
      async (firestoreTrips) => {
        if (!isMounted) return;

        // If user has zero trips on Firestore but has local trips, auto-migrate to cloud!
        if (firestoreTrips.length === 0) {
          const localBundles = Object.values(appData.trips) as TripBundle[];
          if (localBundles.length > 0) {
            setSyncStatus('syncing');
            for (const bundle of localBundles) {
              await uploadFullTripBundle(bundle, firebaseUser);
            }
            setSyncStatus('synced');
            showToast('Đã đồng bộ các chuyến đi của bạn lên Cloud!', 'success');
          } else {
            setSyncStatus('synced');
          }
          return;
        }

        // We have trips from Firestore. Fetch full data for each trip
        setSyncStatus('syncing');
        const updatedTripsMap: Record<string, TripBundle> = {};

        for (const tripInfo of firestoreTrips) {
          try {
            const bundle = await fetchFullTripBundle(tripInfo.id, tripInfo);
            updatedTripsMap[tripInfo.id] = bundle;
          } catch (err) {
            console.warn('Could not fetch trip subcollections for', tripInfo.id, err);
          }
        }

        if (isMounted) {
          setAppData((prev) => {
            const activeId =
              prev.activeTripId && updatedTripsMap[prev.activeTripId]
                ? prev.activeTripId
                : firestoreTrips[0]?.id || null;
            return {
              ...prev,
              activeTripId: activeId,
              trips: { ...prev.trips, ...updatedTripsMap },
            };
          });
          setSyncStatus('synced');
        }
      },
      (err) => {
        console.warn('Firestore subscription error:', err);
        if (isMounted) setSyncStatus('offline');
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [firebaseUser]);

  // Auth Handling
  const handleLoginSuccess = (email: string) => {
    setUserEmailState(email);
    setAuthEmail(email);
    setAppData((prev) => ({ ...prev, userEmail: email }));
    showToast(`Chào mừng bạn trở lại, ${email}!`, 'success');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error', e);
    }
    setFirebaseUser(null);
    setUserEmailState(null);
    setAuthEmail(null);
    showToast('Đã đăng xuất thành công.', 'info');
  };

  // Active Trip Retrieval
  const activeTripId = appData.activeTripId;
  const currentTripBundle: TripBundle | null =
    activeTripId && appData.trips[activeTripId]
      ? appData.trips[activeTripId]
      : (Object.values(appData.trips) as TripBundle[])[0] || null;

  // Switch Trip
  const handleSelectTrip = (tripId: string) => {
    if (appData.trips[tripId]) {
      setAppData((prev) => ({ ...prev, activeTripId: tripId }));
      setIsCreatingNewTrip(false);
      showToast(`Switched to "${appData.trips[tripId].tripInfo.name}".`, 'info');
    }
  };

  // Create New Trip intent
  const handleStartNewTrip = () => {
    setIsCreatingNewTrip(true);
    setActiveTab('info');
  };

  // Save Trip Information (CRITICAL: Checks if existing tripId -> update; if new -> create)
  const handleSaveTripInfo = async (updatedInfo: TripInfo) => {
    setAppData((prev) => {
      const exists = !!prev.trips[updatedInfo.id];
      const targetId = updatedInfo.id;

      let newBundle: TripBundle;
      if (exists) {
        // UPDATE EXISTING TRIP WITHOUT DUPLICATING (Section A & Item 18 Requirement)
        newBundle = {
          ...prev.trips[targetId],
          tripInfo: updatedInfo
        };
      } else {
        // CREATE NEW TRIP WITH UNIQUE TRIP ID
        newBundle = {
          tripInfo: updatedInfo,
          itinerary: [],
          budget: [],
          places: [],
          checklist: [],
          notes: []
        };
      }

      return {
        ...prev,
        activeTripId: targetId,
        trips: {
          ...prev.trips,
          [targetId]: newBundle
        }
      };
    });

    setIsCreatingNewTrip(false);
    setActiveTab('overview');
    showToast('Lưu thông tin chuyến đi thành công.', 'success');

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await saveTripInfoToFirestore(updatedInfo, firebaseUser);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('Firestore trip save error', err);
        setSyncStatus('offline');
      }
    }
  };

  // Manual Save Trigger from Navigation
  const handleManualSave = async () => {
    saveAppData(appData);
    if (firebaseUser && currentTripBundle) {
      setSyncStatus('syncing');
      try {
        await uploadFullTripBundle(currentTripBundle, firebaseUser);
        setSyncStatus('synced');
        showToast('Đã đồng bộ lên đám mây thành công.', 'success');
      } catch (err) {
        setSyncStatus('offline');
        showToast('Đã lưu nội bộ trên máy.', 'info');
      }
    } else {
      showToast('Đã lưu thành công.', 'success');
    }
  };

  // Duplicate Trip
  const handleDuplicateTrip = async (tripId: string) => {
    const original = appData.trips[tripId];
    if (!original) return;

    const newTripId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const clonedInfo: TripInfo = {
      ...original.tripInfo,
      id: newTripId,
      name: `${original.tripInfo.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const clonedBundle: TripBundle = {
      tripInfo: clonedInfo,
      itinerary: original.itinerary.map((act) => ({
        ...act,
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId: newTripId
      })),
      budget: original.budget.map((b) => ({
        ...b,
        id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId: newTripId
      })),
      places: original.places.map((p) => ({
        ...p,
        id: `place-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId: newTripId
      })),
      checklist: original.checklist.map((c) => ({
        ...c,
        id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId: newTripId
      })),
      notes: original.notes.map((n) => ({
        ...n,
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId: newTripId
      }))
    };

    setAppData((prev) => ({
      ...prev,
      activeTripId: newTripId,
      trips: {
        ...prev.trips,
        [newTripId]: clonedBundle
      }
    }));

    showToast(`Đã sao chép chuyến đi "${original.tripInfo.name}".`, 'success');

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await uploadFullTripBundle(clonedBundle, firebaseUser);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
      }
    }
  };

  // Request Delete Trip (shows modal)
  const handleRequestDeleteTrip = (tripId: string, tripName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa chuyến đi',
      message: `Bạn có chắc muốn xóa chuyến đi "${tripName}"? Thao tác này sẽ xóa toàn bộ lịch trình, chi tiêu, địa điểm và danh sách chuẩn bị.`,
      confirmLabel: 'Xóa chuyến đi',
      isDestructive: true,
      onConfirm: async () => {
        setAppData((prev) => {
          const updatedTrips = { ...prev.trips };
          delete updatedTrips[tripId];
          const remainingIds = Object.keys(updatedTrips);
          const nextActiveId =
            prev.activeTripId === tripId ? (remainingIds.length > 0 ? remainingIds[0] : null) : prev.activeTripId;

          return {
            ...prev,
            activeTripId: nextActiveId,
            trips: updatedTrips
          };
        });
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa chuyến đi "${tripName}".`, 'info');

        if (firebaseUser) {
          setSyncStatus('syncing');
          try {
            await deleteTripFromFirestore(tripId, firebaseUser);
            setSyncStatus('synced');
          } catch (err) {
            setSyncStatus('offline');
          }
        }
      }
    });
  };

  // Itinerary Save
  const handleSaveActivities = async (activities: Activity[]) => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    setAppData((prev) => ({
      ...prev,
      trips: {
        ...prev.trips,
        [tripId]: {
          ...prev.trips[tripId],
          itinerary: activities
        }
      }
    }));

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await syncActivitiesToFirestore(tripId, activities, firebaseUser);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
      }
    }
  };

  const handleRequestDeleteActivity = (activityId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa hoạt động',
      message: `Bạn có chắc muốn xóa hoạt động "${title}" khỏi lịch trình?`,
      confirmLabel: 'Xóa',
      isDestructive: true,
      onConfirm: () => {
        if (!currentTripBundle) return;
        const updated = currentTripBundle.itinerary.filter((a) => a.id !== activityId);
        handleSaveActivities(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa "${title}".`, 'info');
      }
    });
  };

  // Budget Save
  const handleSaveBudgetItems = async (items: BudgetItem[]) => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    setAppData((prev) => ({
      ...prev,
      trips: {
        ...prev.trips,
        [tripId]: {
          ...prev.trips[tripId],
          budget: items
        }
      }
    }));

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await syncBudgetItemsToFirestore(tripId, items, firebaseUser);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
      }
    }
  };

  const handleRequestDeleteBudgetItem = (itemId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa khoản chi tiêu',
      message: `Bạn có chắc muốn xóa khoản "${title}" khỏi bảng chi tiêu?`,
      confirmLabel: 'Xóa',
      isDestructive: true,
      onConfirm: () => {
        if (!currentTripBundle) return;
        const updated = currentTripBundle.budget.filter((b) => b.id !== itemId);
        handleSaveBudgetItems(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa khoản chi tiêu "${title}".`, 'info');
      }
    });
  };

  // Places Save
  const handleSavePlaces = async (places: Place[]) => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    setAppData((prev) => ({
      ...prev,
      trips: {
        ...prev.trips,
        [tripId]: {
          ...prev.trips[tripId],
          places
        }
      }
    }));

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await syncPlacesToFirestore(tripId, places, firebaseUser);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
      }
    }
  };

  const handleRequestDeletePlace = (placeId: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa địa điểm',
      message: `Bạn có chắc muốn xóa "${name}" khỏi danh sách địa điểm yêu thích?`,
      confirmLabel: 'Xóa',
      isDestructive: true,
      onConfirm: () => {
        if (!currentTripBundle) return;
        const updated = currentTripBundle.places.filter((p) => p.id !== placeId);
        handleSavePlaces(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa "${name}".`, 'info');
      }
    });
  };

  // Checklist Save
  const handleSaveChecklist = async (checklist: ChecklistItem[]) => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    setAppData((prev) => ({
      ...prev,
      trips: {
        ...prev.trips,
        [tripId]: {
          ...prev.trips[tripId],
          checklist
        }
      }
    }));

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await syncChecklistToFirestore(tripId, checklist, firebaseUser);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
      }
    }
  };

  const handleRequestDeleteChecklistItem = (itemId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa mục chuẩn bị',
      message: `Bạn có chắc muốn xóa "${title}"?`,
      confirmLabel: 'Xóa',
      isDestructive: true,
      onConfirm: () => {
        if (!currentTripBundle) return;
        const updated = currentTripBundle.checklist.filter((c) => c.id !== itemId);
        handleSaveChecklist(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa "${title}".`, 'info');
      }
    });
  };

  // Notes Save
  const handleSaveNotes = async (notes: JournalNote[]) => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    setAppData((prev) => ({
      ...prev,
      trips: {
        ...prev.trips,
        [tripId]: {
          ...prev.trips[tripId],
          notes
        }
      }
    }));

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await syncNotesToFirestore(tripId, notes, firebaseUser);
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
      }
    }
  };

  const handleRequestDeleteNote = (noteId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa ghi chú nhật ký',
      message: `Bạn có chắc muốn xóa ghi chú "${title}"?`,
      confirmLabel: 'Xóa',
      isDestructive: true,
      onConfirm: () => {
        if (!currentTripBundle) return;
        const updated = currentTripBundle.notes.filter((n) => n.id !== noteId);
        handleSaveNotes(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa ghi chú "${title}".`, 'info');
      }
    });
  };

  // Export JSON
  const handleExportData = () => {
    downloadJsonFile(appData, `our-travel-planner-backup-${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Exported travel planner archive (JSON).', 'success');
  };

  // Import JSON
  const handleImportData = (importedData: AppData) => {
    setAppData(importedData);
    saveAppData(importedData);
    showToast('Data imported successfully!', 'success');
  };

  // Reset to Sample Trips
  const handleResetSampleData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset to Sample Data',
      message: 'This will reset your planner to the default Saigon Couple Trip & Da Lat Escape demo. Are you sure?',
      confirmLabel: 'Reset Demo',
      isDestructive: false,
      onConfirm: () => {
        const initial = getInitialAppData();
        setAppData(initial);
        saveAppData(initial);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('Sample demo trips restored.', 'success');
      }
    });
  };

  // Update Whitelist
  const handleUpdateAllowedEmails = async (emails: string[]) => {
    const unique = Array.from(new Set(['duonganhthu1505@gmail.com', ...emails]));
    setAppData((prev) => ({ ...prev, allowedEmails: unique }));
    if (firebaseUser && firebaseUser.email?.trim().toLowerCase() === 'duonganhthu1505@gmail.com') {
      try {
        await saveRemoteAllowedEmails(unique, firebaseUser);
        showToast('Đã lưu phân quyền email lên máy chủ Cloud!', 'success');
      } catch (err) {
        console.warn('Could not save remote allowed emails:', err);
      }
    }
  };

  // If not logged in, render passwordless whitelist Login screen
  if (!userEmail) {
    return (
      <Login
        allowedEmails={appData.allowedEmails || ['duonganhthu1505@gmail.com']}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // All trip summaries for switcher
  const allTripInfos = (Object.values(appData.trips) as TripBundle[]).map((b) => b.tripInfo);

  // Blank trip template when creating a new trip
  const blankTripInfo: TripInfo = {
    id: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: 'New Romantic Journey',
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 2,
    travelerNames: '',
    transport: '',
    hotel: '',
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    notes: 'Planning our next beautiful adventure together.',
    status: 'Planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <div id="travel-planner-app" className="min-h-screen bg-[#FAF7F2] text-[#3D312A] flex flex-col font-sans selection:bg-[#E2D2C3] selection:text-[#362417]">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setIsCreatingNewTrip(false);
          setActiveTab(tab);
        }}
        currentTrip={currentTripBundle ? currentTripBundle.tripInfo : null}
        allTrips={allTripInfos}
        onSelectTrip={handleSelectTrip}
        onNewTrip={handleStartNewTrip}
        onManualSave={handleManualSave}
        onLogout={handleLogout}
        userEmail={userEmail}
        syncStatus={syncStatus}
      />

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* If user is creating a new trip */}
        {isCreatingNewTrip ? (
          <TripForm
            initialData={blankTripInfo}
            isNewTrip={true}
            onSave={handleSaveTripInfo}
            onCancel={() => setIsCreatingNewTrip(false)}
          />
        ) : !currentTripBundle ? (
          /* Empty State when zero trips exist (Section 15 Requirement) */
          <div id="no-trips-empty-state" className="max-w-md mx-auto my-16 text-center bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-8 sm:p-10 shadow-sm space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] border border-[#E2D4C3] text-[#6E4F36] flex items-center justify-center mx-auto shadow-2xs">
              <Compass className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
                <Heart className="w-3.5 h-3.5 fill-[#C27D66] text-[#C27D66]" />
                <span>Begin Our Story</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
                Where are we going next?
              </h2>
              <p className="text-xs sm:text-sm text-[#735D4E] mt-2 leading-relaxed">
                Your travel journal is currently blank. Start planning your very first getaway together!
              </p>
            </div>
            <button
              id="empty-create-first-trip-btn"
              onClick={handleStartNewTrip}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create your first trip</span>
            </button>
          </div>
        ) : (
          /* Active Tab Components */
          <>
            {activeTab === 'overview' && (
              <TripOverview
                currentTripBundle={currentTripBundle}
                allTrips={appData.trips}
                onSelectTrip={handleSelectTrip}
                onEditTrip={() => setActiveTab('info')}
                onDuplicateTrip={handleDuplicateTrip}
                onRequestDeleteTrip={handleRequestDeleteTrip}
                onNewTrip={handleStartNewTrip}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'info' && (
              <TripForm
                initialData={currentTripBundle.tripInfo}
                isNewTrip={false}
                onSave={handleSaveTripInfo}
              />
            )}

            {activeTab === 'itinerary' && (
              <Itinerary
                tripInfo={currentTripBundle.tripInfo}
                itinerary={currentTripBundle.itinerary}
                onSaveActivities={handleSaveActivities}
                onRequestDeleteActivity={handleRequestDeleteActivity}
              />
            )}

            {activeTab === 'budget' && (
              <Budget
                tripId={currentTripBundle.tripInfo.id}
                items={currentTripBundle.budget}
                onSaveItems={handleSaveBudgetItems}
                onRequestDeleteItem={handleRequestDeleteBudgetItem}
              />
            )}

            {activeTab === 'places' && (
              <Places
                tripId={currentTripBundle.tripInfo.id}
                places={currentTripBundle.places}
                onSavePlaces={handleSavePlaces}
                onRequestDeletePlace={handleRequestDeletePlace}
              />
            )}

            {activeTab === 'checklist' && (
              <Checklist
                tripId={currentTripBundle.tripInfo.id}
                checklist={currentTripBundle.checklist}
                onSaveChecklist={handleSaveChecklist}
                onRequestDeleteItem={handleRequestDeleteChecklistItem}
              />
            )}

            {activeTab === 'notes' && (
              <Notes
                tripId={currentTripBundle.tripInfo.id}
                notes={currentTripBundle.notes}
                onSaveNotes={handleSaveNotes}
                onRequestDeleteNote={handleRequestDeleteNote}
              />
            )}

            {activeTab === 'settings' && (
              <Settings
                appData={appData}
                userEmail={userEmail}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onUpdateAllowedEmails={handleUpdateAllowedEmails}
                onResetSampleData={handleResetSampleData}
                onLogout={handleLogout}
                onShowToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Global Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
