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
  images?: string[]; // Array of Base64-encoded image data URLs
  updatedAt: string;
}

export type ServiceCategory = 'Hotel' | 'Motorbike' | 'Transportation' | 'Outfit' | 'Other';

/** Món đồ trong một set outfit: của em (her) / của anh (him). */
export type OutfitOwner = 'her' | 'him';

/** Nguồn của món đồ: thuê / mua mới / đồ có sẵn trong tủ. */
export type OutfitItemSource = 'rent' | 'buy' | 'own';

export interface OutfitItem {
  id: string;
  owner: OutfitOwner;        // 👩 của em | 👨 của anh
  label: string;             // "Váy hoa midi"
  source: OutfitItemSource;  // thuê | mua | đồ nhà
  price?: number;            // Giá thuê/mua của món (0 = đồ nhà)
  checklistItemId?: string;  // Đã đồng bộ vào Hành trang (Checklist "Clothes")
}

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
  /** === Riêng cho category 'Outfit' === */
  outfitItems?: OutfitItem[]; // Danh sách món đồ trong set
  assignedSlots?: string[];   // Lịch mặc: "YYYY-MM-DD|am" hoặc "YYYY-MM-DD|pm"
  shopName?: string;          // Tên tiệm thuê (nếu có)
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
