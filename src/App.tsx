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
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useLanguage } from './i18n/LanguageContext';
import { Compass, Plus, Heart, Cloud } from 'lucide-react';
import { auth, signOut, googleProvider } from './firebase';
import { onAuthStateChanged, User, signInWithPopup } from 'firebase/auth';
import {
  uploadFullTripBundle,
  saveTripInfoToFirestore,
  deleteTripFromFirestore,
  deleteActivityFromFirestore,
  deleteBudgetItemFromFirestore,
  deletePlaceFromFirestore,
  deleteChecklistItemFromFirestore,
  deleteNoteFromFirestore,
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
  saveRemoteAllowedEmails,
  getDeletedTripIds,
  recordDeletedTripId,
  getRemoteDeletedTripIds
} from './utils/firestoreService';
import { syncItineraryToBudget, syncBudgetToItinerary } from './utils/budgetSync';

export default function App() {
  const { t, lang } = useLanguage();

  // App-level state loaded from LocalStorage
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const initialEmail = getAuthEmail();
  const [userEmail, setUserEmailState] = useState<string | null>(initialEmail);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(
    initialEmail ? ({ uid: initialEmail, email: initialEmail } as any as User) : null
  );
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('offline');
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
  const [editingTripInfo, setEditingTripInfo] = useState<TripInfo | null>(null);

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
      if (user) {
        setFirebaseUser(user);
        setUserEmailState(user.email);
        setAuthEmail(user.email || '');
        setAppData((prev) => ({ ...prev, userEmail: user.email || '' }));
      }
      // If user is null, we do NOT set firebaseUser to null here 
      // because they might be logged in manually via email input.
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

        setSyncStatus('syncing');

        // 1. SMART BIDIRECTIONAL SYNC:
        // Merge Firestore remote deleted trip IDs with local list
        const remoteDeleted = await getRemoteDeletedTripIds().catch(() => []);
        for (const dId of remoteDeleted) {
          recordDeletedTripId(dId);
        }
        const deletedTripIds = new Set([...getDeletedTripIds(), ...remoteDeleted]);
        const currentLocalBundles = Object.values(appData.trips) as TripBundle[];
        for (const localBundle of currentLocalBundles) {
          const tripId = localBundle.tripInfo.id;
          if (deletedTripIds.has(tripId)) {
            continue; // NEVER resurrect a deleted trip!
          }
          const remoteTrip = firestoreTrips.find((t) => t.id === tripId);
          if (!remoteTrip) {
            // Local trip is genuinely new and not yet in Firestore -> upload full bundle
            try {
              await uploadFullTripBundle(localBundle, firebaseUser);
            } catch (err) {
              console.warn('Auto-upload local trip failed:', tripId, err);
            }
          } else {
            // Trip exists in both: compare updatedAt timestamps
            const localTime = new Date(localBundle.tripInfo.updatedAt || localBundle.tripInfo.createdAt || 0).getTime();
            const remoteTime = new Date(remoteTrip.updatedAt || remoteTrip.createdAt || 0).getTime();
            if (localTime > remoteTime) {
              // Local has newer changes made on this device -> push to cloud
              try {
                await uploadFullTripBundle(localBundle, firebaseUser);
              } catch (err) {
                console.warn('Auto-update newer local trip failed:', tripId, err);
              }
            }
          }
        }

        // 2. Fetch full bundles from Firestore for all non-deleted trips
        const updatedTripsMap: Record<string, TripBundle> = {};

        for (const tripInfo of firestoreTrips) {
          if (deletedTripIds.has(tripInfo.id)) {
            continue; // Skip deleted trip
          }
          try {
            const bundle = await fetchFullTripBundle(tripInfo.id, tripInfo);
            updatedTripsMap[tripInfo.id] = bundle;
          } catch (err) {
            console.warn('Could not fetch trip subcollections for', tripInfo.id, err);
          }
        }

        if (isMounted) {
          setAppData((prev) => {
            const latestDeleted = new Set(getDeletedTripIds());
            const cleanedTrips: Record<string, TripBundle> = {};
            // Include remote trips that are not deleted
            for (const [id, bundle] of Object.entries(updatedTripsMap)) {
              if (!latestDeleted.has(id)) {
                cleanedTrips[id] = bundle;
              }
            }
            // Include local draft trips only if not deleted and not yet on remote
            const localEntries = Object.entries(prev.trips) as [string, TripBundle][];
            for (const [id, bundle] of localEntries) {
              if (!latestDeleted.has(id) && !cleanedTrips[id]) {
                cleanedTrips[id] = bundle;
              }
            }

            const activeId =
              prev.activeTripId && cleanedTrips[prev.activeTripId]
                ? prev.activeTripId
                : Object.keys(cleanedTrips)[0] || null;

            return {
              ...prev,
              activeTripId: activeId,
              trips: cleanedTrips,
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
    setFirebaseUser({ uid: email, email: email } as any as User);
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
    setSyncStatus('offline');
    showToast('Đã đăng xuất thành công.', 'info');
  };

  const handleConnectGoogle = async () => {
    try {
      showToast('Đang kết nối tài khoản Google...', 'info');
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user?.email) {
        const cleanEmail = result.user.email.trim().toLowerCase();
        const isMasterAdmin = cleanEmail === 'duonganhthu1505@gmail.com';
        const isAllowed = isMasterAdmin || appData.allowedEmails.some((e) => e.trim().toLowerCase() === cleanEmail);

        if (!isAllowed) {
          showToast(`Email "${result.user.email}" chưa được cấp quyền truy cập.`, 'error');
          await signOut(auth);
          return;
        }

        setUserEmailState(result.user.email);
        setAuthEmail(result.user.email);
        setAppData((prev) => ({ ...prev, userEmail: result.user.email || '' }));
        showToast('Kết nối Google thành công! Dữ liệu đã sẵn sàng đồng bộ sang điện thoại.', 'success');
      }
    } catch (err: any) {
      console.error('Google connect error:', err);
      if (err.code === 'auth/popup-blocked') {
        showToast('Trình duyệt đang chặn mở cửa sổ Google. Hãy cho phép popup nhé!', 'error');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Không thể kết nối Google: ' + (err.message || ''), 'error');
      }
    }
  };

  // Active Trip Retrieval
  const activeTripId = appData.activeTripId;
  const currentTripBundle: TripBundle | null =
    activeTripId && appData.trips[activeTripId]
      ? appData.trips[activeTripId]
      : (Object.values(appData.trips) as TripBundle[])[0] || null;

  // Auto-sync itinerary activities into budget if needed on trip load/switch
  useEffect(() => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    const { updatedBudget, changed } = syncItineraryToBudget(
      currentTripBundle.itinerary || [],
      currentTripBundle.budget || [],
      tripId
    );
    if (changed) {
      setAppData((prev) => {
        const trip = prev.trips[tripId];
        if (!trip) return prev;
        return {
          ...prev,
          trips: {
            ...prev.trips,
            [tripId]: {
              ...trip,
              budget: updatedBudget
            }
          }
        };
      });
      if (firebaseUser) {
        syncBudgetItemsToFirestore(tripId, updatedBudget, firebaseUser).catch(() => {});
      }
    }
  }, [currentTripBundle?.tripInfo.id, firebaseUser]);

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
    setEditingTripInfo(null);
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
        showToast('Đã đồng bộ lên đám mây thành công (sẵn sàng trên điện thoại).', 'success');
      } catch (err) {
        setSyncStatus('offline');
        showToast('Đã lưu nội bộ trên máy.', 'info');
      }
    } else {
      showToast('Đã lưu trên máy này! Hãy bấm "Đồng bộ sang ĐT" trên thanh menu để chuyển dữ liệu sang điện thoại nhé.', 'info');
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
      message: `Bạn có chắc muốn xóa chuyến đi "${tripName}"? Thao tác này sẽ xóa vĩnh viễn toàn bộ lịch trình, chi tiêu, địa điểm và danh sách chuẩn bị trên tất cả thiết bị.`,
      confirmLabel: 'Xóa chuyến đi',
      isDestructive: true,
      onConfirm: async () => {
        // Record deletion immediately so it never resurrects
        recordDeletedTripId(tripId);

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
            console.warn('Delete trip from Firestore error:', err);
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
    const currentBudget = currentTripBundle.budget || [];

    // Automatically sync activities with cost into Budget
    const { updatedBudget, changed: budgetChanged } = syncItineraryToBudget(
      activities,
      currentBudget,
      tripId
    );

    setAppData((prev) => {
      const trip = prev.trips[tripId];
      if (!trip) return prev;
      return {
        ...prev,
        trips: {
          ...prev.trips,
          [tripId]: {
            ...trip,
            itinerary: activities,
            budget: budgetChanged ? updatedBudget : trip.budget
          }
        }
      };
    });

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await syncActivitiesToFirestore(tripId, activities, firebaseUser);
        if (budgetChanged) {
          await syncBudgetItemsToFirestore(tripId, updatedBudget, firebaseUser);
        }
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
        const tripId = currentTripBundle.tripInfo.id;
        const updated = currentTripBundle.itinerary.filter((a) => a.id !== activityId);
        handleSaveActivities(updated);
        if (firebaseUser) {
          deleteActivityFromFirestore(tripId, activityId, firebaseUser).catch((e) => console.warn(e));
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa "${title}".`, 'info');
      }
    });
  };

  const handleRequestDeleteMultipleActivities = (activityIds: string[]) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa nhiều hoạt động',
      message: `Bạn có chắc muốn xóa ${activityIds.length} hoạt động đã chọn khỏi lịch trình?`,
      confirmLabel: 'Xóa',
      isDestructive: true,
      onConfirm: () => {
        if (!currentTripBundle) return;
        const tripId = currentTripBundle.tripInfo.id;
        const updated = currentTripBundle.itinerary.filter((a) => !activityIds.includes(a.id));
        handleSaveActivities(updated);
        if (firebaseUser) {
          activityIds.forEach((id) => {
            deleteActivityFromFirestore(tripId, id, firebaseUser).catch((e) => console.warn(e));
          });
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa ${activityIds.length} hoạt động.`, 'info');
      }
    });
  };

  // Budget Save
  const handleSaveBudgetItems = async (items: BudgetItem[]) => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    const currentItinerary = currentTripBundle.itinerary || [];

    // Sync any cost/title edits to linked activities in Itinerary
    const { updatedItinerary, changed: itineraryChanged } = syncBudgetToItinerary(
      items,
      currentItinerary
    );

    setAppData((prev) => {
      const trip = prev.trips[tripId];
      if (!trip) return prev;
      return {
        ...prev,
        trips: {
          ...prev.trips,
          [tripId]: {
            ...trip,
            budget: items,
            itinerary: itineraryChanged ? updatedItinerary : trip.itinerary
          }
        }
      };
    });

    if (firebaseUser) {
      setSyncStatus('syncing');
      try {
        await syncBudgetItemsToFirestore(tripId, items, firebaseUser);
        if (itineraryChanged) {
          await syncActivitiesToFirestore(tripId, updatedItinerary, firebaseUser);
        }
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
        const tripId = currentTripBundle.tripInfo.id;
        const target = currentTripBundle.budget.find((b) => b.id === itemId);
        const updatedBudget = currentTripBundle.budget.filter((b) => b.id !== itemId);

        if (firebaseUser) {
          deleteBudgetItemFromFirestore(tripId, itemId, firebaseUser).catch((e) => console.warn(e));
        }

        // If it was linked to an activity, reset the cost from that activity in itinerary
        if (target?.activityId) {
          const updatedActivities = currentTripBundle.itinerary.map((act) => {
            if (act.id === target.activityId) {
              return { ...act, plannedCost: 0, actualCost: 0 };
            }
            return act;
          });
          handleSaveActivities(updatedActivities);
        } else {
          handleSaveBudgetItems(updatedBudget);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa khoản chi tiêu "${title}".`, 'info');
      }
    });
  };

  const handleRequestDeleteMultipleBudgetItems = (itemIds: string[]) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa nhiều khoản chi tiêu',
      message: `Bạn có chắc muốn xóa ${itemIds.length} khoản chi tiêu đã chọn?`,
      confirmLabel: 'Xóa',
      isDestructive: true,
      onConfirm: () => {
        if (!currentTripBundle) return;
        const tripId = currentTripBundle.tripInfo.id;
        const itemsToDelete = currentTripBundle.budget.filter((b) => itemIds.includes(b.id));
        const updatedBudget = currentTripBundle.budget.filter((b) => !itemIds.includes(b.id));
        
        if (firebaseUser) {
          itemIds.forEach((id) => {
            deleteBudgetItemFromFirestore(tripId, id, firebaseUser).catch((e) => console.warn(e));
          });
        }

        // Find if any deleted items were linked to activities
        const linkedActivityIds = itemsToDelete.filter(b => b.activityId).map(b => b.activityId);

        if (linkedActivityIds.length > 0) {
          const updatedActivities = currentTripBundle.itinerary.map((act) => {
            if (linkedActivityIds.includes(act.id)) {
              return { ...act, plannedCost: 0, actualCost: 0 };
            }
            return act;
          });
          
          setAppData((prev) => {
            const trip = prev.trips[tripId];
            if (!trip) return prev;
            return {
              ...prev,
              trips: {
                ...prev.trips,
                [tripId]: {
                  ...trip,
                  budget: updatedBudget,
                  itinerary: updatedActivities
                }
              }
            };
          });

          if (firebaseUser) {
            syncBudgetItemsToFirestore(tripId, updatedBudget, firebaseUser).catch(()=>{});
            syncActivitiesToFirestore(tripId, updatedActivities, firebaseUser).catch(()=>{});
          }
        } else {
          handleSaveBudgetItems(updatedBudget);
        }

        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa ${itemIds.length} khoản chi tiêu.`, 'info');
      }
    });
  };

  const handleManualSyncBudgetFromItinerary = async () => {
    if (!currentTripBundle) return;
    const tripId = currentTripBundle.tripInfo.id;
    const { updatedBudget, changed } = syncItineraryToBudget(
      currentTripBundle.itinerary || [],
      currentTripBundle.budget || [],
      tripId
    );
    if (changed) {
      await handleSaveBudgetItems(updatedBudget);
      showToast('Đã đồng bộ lại chi phí từ Lịch trình vào Ngân sách!', 'success');
    } else {
      showToast('Tất cả chi phí từ Lịch trình đã được đồng bộ.', 'info');
    }
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
        const tripId = currentTripBundle.tripInfo.id;
        const updated = currentTripBundle.places.filter((p) => p.id !== placeId);
        handleSavePlaces(updated);
        if (firebaseUser) {
          deletePlaceFromFirestore(tripId, placeId, firebaseUser).catch((e) => console.warn(e));
        }
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
        const tripId = currentTripBundle.tripInfo.id;
        const updated = currentTripBundle.checklist.filter((c) => c.id !== itemId);
        handleSaveChecklist(updated);
        if (firebaseUser) {
          deleteChecklistItemFromFirestore(tripId, itemId, firebaseUser).catch((e) => console.warn(e));
        }
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
        const tripId = currentTripBundle.tripInfo.id;
        const updated = currentTripBundle.notes.filter((n) => n.id !== noteId);
        handleSaveNotes(updated);
        if (firebaseUser) {
          deleteNoteFromFirestore(tripId, noteId, firebaseUser).catch((e) => console.warn(e));
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã xóa ghi chú "${title}".`, 'info');
      }
    });
  };

  // Export JSON
  const handleExportData = () => {
    downloadJsonFile(appData, `our-travel-planner-backup-${new Date().toISOString().slice(0, 10)}.json`);
    showToast(lang === 'vi' ? 'Đã xuất tệp sao lưu dữ liệu du lịch (JSON).' : 'Exported travel planner archive (JSON).', 'success');
  };

  // Import JSON
  const handleImportData = (importedData: AppData) => {
    setAppData(importedData);
    saveAppData(importedData);
    showToast(lang === 'vi' ? 'Nhập dữ liệu thành công!' : 'Data imported successfully!', 'success');
  };

  // Reset to Sample Trips
  const handleResetSampleData = () => {
    setConfirmModal({
      isOpen: true,
      title: lang === 'vi' ? 'Khôi phục dữ liệu mẫu' : 'Reset to Sample Data',
      message: lang === 'vi' ? 'Thao tác này sẽ đặt lại kế hoạch với dữ liệu mẫu (Sài Gòn & Đà Lạt). Bạn có chắc chắn không?' : 'This will reset your planner to the default Saigon Couple Trip & Da Lat Escape demo. Are you sure?',
      confirmLabel: lang === 'vi' ? 'Khôi phục mẫu' : 'Reset Demo',
      isDestructive: false,
      onConfirm: () => {
        const initial = getInitialAppData();
        setAppData(initial);
        saveAppData(initial);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(lang === 'vi' ? 'Đã khôi phục dữ liệu chuyến đi mẫu.' : 'Sample demo trips restored.', 'success');
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
        onOfflineMode={() => handleLoginSuccess('duonganhthu1505@gmail.com')}
      />
    );
  }

  // All trip summaries for switcher
  const allTripInfos = (Object.values(appData.trips) as TripBundle[]).map((b) => b.tripInfo);

  // Blank trip template when creating a new trip
  const blankTripInfo: TripInfo = {
    id: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: lang === 'vi' ? 'Hành trình mới' : 'New Romantic Journey',
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 2,
    travelerNames: '',
    transport: '',
    hotel: '',
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    notes: lang === 'vi' ? 'Lên kế hoạch cho hành trình tuyệt đẹp sắp tới.' : 'Planning our next beautiful adventure together.',
    status: 'Planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <div id="travel-planner-app" className="min-h-screen bg-[#FAF7F2] text-[#3D312A] flex flex-col font-sans selection:bg-[#E2D2C3] selection:text-[#362417] pb-24 md:pb-6">
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
        isConnectedToCloud={!!firebaseUser}
        onConnectGoogle={handleConnectGoogle}
      />

      {/* Unsynced Cloud Banner if not authenticated with Firebase */}
      {!firebaseUser && (
        <div id="cloud-sync-banner" className="bg-[#FFF8E7] border-b border-[#F6D88A] px-4 py-2.5 text-xs text-[#8A5B00] shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#D97706] shrink-0 animate-pulse" />
              <span>
                <strong className="font-semibold text-[#6E4800]">Chưa đồng bộ sang Điện thoại:</strong> Bạn đang ở chế độ lưu trên máy này. Để dữ liệu vừa cập nhật xuất hiện ngay trên điện thoại, hãy bấm kết nối Google!
              </span>
            </div>
            <button
              id="banner-connect-google-btn"
              type="button"
              onClick={handleConnectGoogle}
              className="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Đồng bộ sang Điện thoại ngay
            </button>
          </div>
        </div>
      )}

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-12 sm:pb-16">
        {/* If user is creating a new trip */}
        {isCreatingNewTrip ? (
          <TripForm
            initialData={blankTripInfo}
            isNewTrip={true}
            onSave={handleSaveTripInfo}
            onCancel={() => setIsCreatingNewTrip(false)}
          />
        ) : editingTripInfo ? (
          <TripForm
            initialData={editingTripInfo}
            isNewTrip={false}
            onSave={handleSaveTripInfo}
            onCancel={() => setEditingTripInfo(null)}
          />
        ) : activeTab === 'settings' ? (
          <Settings
            appData={appData}
            userEmail={userEmail}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onUpdateAllowedEmails={handleUpdateAllowedEmails}
            onResetSampleData={handleResetSampleData}
            onLogout={handleLogout}
            onShowToast={showToast}
            onForceCloudSync={handleManualSave}
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
                <span>{lang === 'vi' ? 'Bắt đầu câu chuyện' : 'Begin Our Story'}</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
                {lang === 'vi' ? 'Chúng ta sẽ đi đâu tiếp theo?' : 'Where are we going next?'}
              </h2>
              <p className="text-xs sm:text-sm text-[#735D4E] mt-2 leading-relaxed">
                {lang === 'vi' 
                  ? 'Sổ tay du lịch của bạn hiện đang trống. Hãy bắt đầu lên kế hoạch cho chuyến đi đầu tiên cùng nhau!' 
                  : 'Your travel journal is currently blank. Start planning your very first getaway together!'}
              </p>
            </div>
            <button
              id="empty-create-first-trip-btn"
              onClick={handleStartNewTrip}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Tạo chuyến đi đầu tiên' : 'Create your first trip'}</span>
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
                onEditTrip={(tripId) => setEditingTripInfo(appData.trips[tripId]?.tripInfo || currentTripBundle.tripInfo)}
                onDuplicateTrip={handleDuplicateTrip}
                onRequestDeleteTrip={handleRequestDeleteTrip}
                onNewTrip={handleStartNewTrip}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'itinerary' && (
              <Itinerary
                tripInfo={currentTripBundle.tripInfo}
                itinerary={currentTripBundle.itinerary}
                onSaveActivities={handleSaveActivities}
                onRequestDeleteActivity={handleRequestDeleteActivity}
                onRequestDeleteMultipleActivities={handleRequestDeleteMultipleActivities}
              />
            )}

            {activeTab === 'budget' && (
              <Budget
                tripId={currentTripBundle.tripInfo.id}
                items={currentTripBundle.budget}
                itinerary={currentTripBundle.itinerary}
                onSaveItems={handleSaveBudgetItems}
                onRequestDeleteItem={handleRequestDeleteBudgetItem}
                onRequestDeleteMultipleItems={handleRequestDeleteMultipleBudgetItems}
                onSyncFromItinerary={handleManualSyncBudgetFromItinerary}
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
                tripName={currentTripBundle.tripInfo.name}
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

      {/* PWA App-like Installation Banner & Prompt */}
      <PWAInstallBanner />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
