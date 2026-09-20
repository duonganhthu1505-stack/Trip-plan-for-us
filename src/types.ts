export type TripStatus = 'Planning' | 'Upcoming' | 'Ongoing' | 'Completed';

export interface TripInfo {
  id: string;
  name: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  travelers: number;
  travelerNames?: string;
  transport: string;
  hotel: string;
  coverImage: string;
  notes: string;
  plannedBudget?: number;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
  /**
   * Server-side timestamp (ms since epoch) of the last write that reached
   * Firestore. It is the only value used to decide which copy is newer —
   * device clocks are never trusted. Local-only, never written as a number:
   * the cloud document always stores it as a Firestore Timestamp.
   */
  serverUpdatedAt?: number;
}
export type ActivityCategory =
  | 'Food'
  | 'Cafe'
  | 'Sightseeing'
  | 'Hotel'
  | 'Transportation'
  | 'Shopping'
  | 'Entertainment'
  | 'Other';

export interface Activity {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  location: string;
  category: ActivityCategory;
  plannedCost: number;
  actualCost: number;
  note?: string;
  mapUrl?: string;
  latitude?: number; // Resolved exact coordinate used by the itinerary map
  longitude?: number;
  resolvedMapUrl?: string; // Final Google Maps URL after resolving a short link
  googlePlaceId?: string; // Exact Google Places ID recovered from mapUrl, when present
  resolvedPlaceName?: string; // Google's own name for the place (never the itinerary title)
  order?: number;
}

export type BudgetCategory =
  | 'Hotel'
  | 'Food'
  | 'Cafe'
  | 'Transportation'
  | 'Tickets'
  | 'Shopping'
  | 'Entertainment'
  | 'Other';

export interface BudgetItem {
  id: string;
  tripId: string;
  category: BudgetCategory;
  item: string;
  quantity: number;
  unit: string;
  plannedCost: number;
  actualCost: number;
  notes?: string;
  activityId?: string; // Linked activity in Itinerary
}

export type PlaceStatus = 'Want to go' | 'Planned' | 'Visited' | 'Skipped';

export interface Place {
  id: string;
  tripId: string;
  name: string;
  category: string;
  address: string;
  mapUrl?: string;
  estimatedCost: number;
  openingHours?: string;
  notes?: string;
  status: PlaceStatus;
  imageUrl?: string;
}

export type ChecklistGroup =
  | 'Documents'
  | 'Clothes'
  | 'Personal items'
  | 'Electronics'
  | 'Medicine'
  | 'Booking'
  | 'Other';

export interface ChecklistItem {
  id: string;
  tripId: string;
  category: ChecklistGroup;
  title: string;
  completed: boolean;
  notes?: string;
}

export interface JournalNote {
  id: string;
  tripId: string;
  title: string;
  category: string; // e.g. "Hotel info", "Booking code", "Flight info", "Diary"
  content: string;
  /**
   * Full-size photos as Base64 data URLs. Only present on the device that added
   * them, and only until they reach the cloud — otherwise the note would exceed
   * Firestore's 1 MiB document limit.
   */
  images?: string[];
  /**
   * Id of each photo on the cloud, in the same order as `images`. An empty
   * string means "this photo is not on the cloud yet". The photo itself lives in
   * its own document so it keeps its full quality.
   */
  photoIds?: string[];
  /** Small preview of each photo, aligned with `photoIds` and `images`. */
  photoThumbs?: string[];
  updatedAt: string;
}

export type ServiceCategory = 'Hotel' | 'Motorbike' | 'Transportation' | 'Other';

export interface ServiceOption {
  id: string;
  tripId: string;
  category: ServiceCategory;
  name: string;
  address?: string;
  distanceToCenter?: string; // e.g. "1,8 km tới Chợ Đà Lạt (5 phút xe)"
  pricePerUnit?: number; // Giá mỗi đơn vị (đêm/ngày/vé)
  unitLabel?: string; // 'đêm' | 'ngày' | 'vé'
  weekendSurcharge?: number; // Phụ thu cuối tuần
  deposit?: number; // Tiền cọc giữ chỗ
  totalEstimate?: number; // Tổng chi phí dự kiến
  amenities?: string[]; // Bồn tắm, view thung lũng, bữa sáng...
  pros?: string[];
  cons?: string[];
  photos?: string[]; // Danh sách link ảnh hoặc base64
  hisNote?: string; // Ghi chú của Anh
  herNote?: string; // Ghi chú của Bé yêu
  votes?: number; // Lượt thả tim bình chọn
  isChosen: boolean; // ĐÃ CHỐT DỊCH VỤ NÀY
  contactPhone?: string;
  linkUrl?: string;
  googleRating?: number; // Điểm đánh giá Google Maps, từ 0 đến 5
  createdAt?: string;
}

export interface TripBundle {
  tripInfo: TripInfo;
  itinerary: Activity[];
  budget: BudgetItem[];
  places: Place[];
  checklist: ChecklistItem[];
  notes: JournalNote[];
  services?: ServiceOption[];
}

export interface AppData {
  version: string;
  activeTripId: string | null;
  trips: Record<string, TripBundle>;
  userEmail: string | null;
  allowedEmails: string[];
}
