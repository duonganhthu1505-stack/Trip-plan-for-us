/**
 * Helpers cho tính năng "Chọn Outfit" trong mục Dịch vụ.
 * Một set outfit được lưu như một ServiceOption với category 'Outfit'
 * (tái dùng toàn bộ pipeline đồng bộ Firestore của services).
 */
import { ChecklistItem, OutfitItem, OutfitItemSource, OutfitOwner, ServiceOption } from '../types';
import samplePhotoSet1a from '../assets/outfit/set1-1.jpg';
import samplePhotoSet1b from '../assets/outfit/set1-3.jpg';
import samplePhotoSet2a from '../assets/outfit/set2-1.jpg';
import samplePhotoSet2b from '../assets/outfit/set2-3.jpg';
import samplePhotoSet3 from '../assets/outfit/set3-1.jpg';

/** Nhãn hiển thị của nguồn món đồ. */
export const OUTFIT_SOURCE_LABEL: Record<OutfitItemSource, string> = {
  rent: 'thuê',
  buy: 'mua',
  own: 'nhà'
};

/** Class Tailwind cho pill món đồ theo nguồn (thuê = vàng, mua = hồng, nhà = xanh lá). */
export const OUTFIT_SOURCE_CLASS: Record<OutfitItemSource, string> = {
  rent: 'bg-[#FDF6E8] text-[#B45309] border-[#F1DAAB]',
  buy: 'bg-[#FDF0EE] text-[#C4685A] border-[#F4C7C0]',
  own: 'bg-[#EBF5EC] text-[#2E6B38] border-[#CDE5D1]'
};

export const OUTFIT_OWNER_LABEL: Record<OutfitOwner, string> = {
  her: 'Của em 👩',
  him: 'Của anh 👨'
};

/** Tổng chi phí set = tổng giá các món thuê/mua (đồ nhà tính 0₫). */
export function computeOutfitTotal(set: ServiceOption): number {
  const items = Array.isArray(set.outfitItems) ? set.outfitItems : [];
  return items.reduce((sum, it) => sum + (it.source !== 'own' ? Number(it.price) || 0 : 0), 0);
}

/** Khóa 1 buổi mặc: "YYYY-MM-DD|am" (sáng) hoặc "YYYY-MM-DD|pm" (chiều/tối). */
export type OutfitSlot = 'am' | 'pm';
export const slotKey = (date: string, slot: OutfitSlot) => `${date}|${slot}`;
export const parseSlotKey = (key: string): { date: string; slot: OutfitSlot } => {
  const [date, slot] = key.split('|');
  return { date, slot: slot === 'pm' ? 'pm' : 'am' };
};

/** Gán/bỏ gán một set vào một buổi (trả về mảng assignedSlots mới). */
export function toggleSlotAssignment(
  set: ServiceOption,
  date: string,
  slot: OutfitSlot
): string[] {
  const key = slotKey(date, slot);
  const current = Array.isArray(set.assignedSlots) ? set.assignedSlots : [];
  return current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
}

export interface OutfitChecklistSyncResult {
  checklist: ChecklistItem[];
  added: number;
  updated: number;
  removed: number;
}

const outfitChecklistNote = (set: ServiceOption, item: OutfitItem) =>
  `Outfit: ${set.name} · ${OUTFIT_OWNER_LABEL[item.owner]} · ${OUTFIT_SOURCE_LABEL[item.source]}`;

/**
 * Đồng bộ 2 chiều (đơn giản) giữa món đồ trong các set outfit và checklist
 * mục "Trang phục" (Clothes):
 *  - Món chưa có → tạo ChecklistItem mới, lưu checklistItemId ngược lại.
 *  - Món đã có nhưng đổi tên/set → cập nhật title + notes.
 *  - Checklist item từng đồng bộ ("Outfit: ...") nhưng món đã bị xóa → xóa luôn.
 * Trả về checklist mới + mảng outfit đã gắn checklistItemId.
 */
export function syncOutfitsToChecklist(
  outfits: ServiceOption[],
  checklist: ChecklistItem[],
  tripId: string
): OutfitChecklistSyncResult & { outfits: ServiceOption[] } {
  const nextChecklist: ChecklistItem[] = checklist.map((c) => ({ ...c }));
  const linkedIds = new Set<string>();
  let added = 0;
  let updated = 0;

  const nextOutfits = outfits.map((set) => {
    const items = Array.isArray(set.outfitItems) ? set.outfitItems : [];
    const nextItems = items.map((item) => {
      let checkId = item.checklistItemId;
      const existing = checkId ? nextChecklist.find((c) => c.id === checkId) : undefined;

      if (existing) {
        const title = `${item.label}`;
        const notes = outfitChecklistNote(set, item);
        if (existing.title !== title || existing.notes !== notes) {
          existing.title = title;
          existing.notes = notes;
          updated += 1;
        }
      } else {
        // Tìm món cũ theo ghi chú nếu chưa có id (dữ liệu cũ trước khi có sync)
        const byNote = nextChecklist.find((c) => c.notes === outfitChecklistNote(set, item));
        if (byNote) {
          checkId = byNote.id;
        } else {
          checkId = `chk-outfit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          nextChecklist.push({
            id: checkId,
            tripId,
            category: 'Clothes',
            title: item.label,
            completed: false,
            notes: outfitChecklistNote(set, item)
          });
          added += 1;
        }
      }
      linkedIds.add(checkId);
      return checkId === item.checklistItemId ? item : { ...item, checklistItemId: checkId };
    });
    return nextItems === items ? set : { ...set, outfitItems: nextItems };
  });

  // Xóa các checklist item "Outfit:" không còn món nào tham chiếu
  const orphans = nextChecklist.filter(
    (c) => typeof c.notes === 'string' && c.notes.startsWith('Outfit:') && !linkedIds.has(c.id)
  );
  const removed = orphans.length;
  const finalChecklist = removed > 0 ? nextChecklist.filter((c) => !orphans.includes(c)) : nextChecklist;

  return { checklist: finalChecklist, outfits: nextOutfits, added, updated, removed };
}

/**
 * Hai set outfit mẫu (dùng khi trip chưa từng lưu services — giống DEFAULT_SERVICES).
 * assignedSlots được inject theo ngày bắt đầu chuyến đi ở Services.
 */
export const DEFAULT_OUTFIT_SETS: ServiceOption[] = [
  {
    id: 'outfit-1',
    tripId: '',
    category: 'Outfit',
    name: 'Set Couple “Hoa Giấy” — thuê tiệm Trăng Sơn',
    address: 'Trần Nhật Duật, P.8, TP. Đà Lạt (cách homestay ~800m)',
    unitLabel: '2 ngày thuê',
    deposit: 200000,
    photos: [samplePhotoSet1a, samplePhotoSet1b],
    outfitItems: [
      { id: 'oi-1', owner: 'her', label: '👗 Váy hoa midi', source: 'rent', price: 180000 },
      { id: 'oi-2', owner: 'her', label: '🧥 Áo dạ trắng', source: 'rent', price: 90000 },
      { id: 'oi-3', owner: 'her', label: '🧣 Khăn len be', source: 'own' },
      { id: 'oi-4', owner: 'him', label: '👔 Sơ mi be', source: 'rent', price: 50000 },
      { id: 'oi-5', owner: 'him', label: '👖 Quần âu dù', source: 'rent', price: 30000 },
      { id: 'oi-6', owner: 'him', label: '👞 Giày da nâu', source: 'own' }
    ],
    shopName: 'Tiệm thuê Trăng Sơn',
    contactPhone: '0912.345.678',
    linkUrl: 'https://facebook.com',
    isChosen: true,
    createdAt: '2026-09-18T11:00:00.000Z'
  },
  {
    id: 'outfit-2',
    tripId: '',
    category: 'Outfit',
    name: 'Set “Săn Mây Sớm” — đồ nhà, ấm nhất',
    unitLabel: 'Đồ có sẵn',
    deposit: 0,
    photos: [samplePhotoSet2a, samplePhotoSet2b],
    outfitItems: [
      { id: 'oi-7', owner: 'her', label: '🧶 Len cổ cao', source: 'own' },
      { id: 'oi-8', owner: 'her', label: '🧦 Tất len dày (2 đôi)', source: 'buy', price: 45000 },
      { id: 'oi-9', owner: 'her', label: '👟 Sneaker trắng', source: 'own' },
      { id: 'oi-10', owner: 'him', label: '🧥 Áo phao olive', source: 'own' },
      { id: 'oi-11', owner: 'him', label: '🧢 Mũ len', source: 'own' }
    ],
    isChosen: false,
    createdAt: '2026-09-18T11:10:00.000Z'
  },
  {
    id: 'outfit-3',
    tripId: '',
    category: 'Outfit',
    name: 'Set “Cà Phê Sách Chill” — mua 1 lần mặc mãi',
    unitLabel: 'Mua mới',
    deposit: 0,
    photos: [samplePhotoSet3],
    outfitItems: [
      { id: 'oi-12', owner: 'her', label: '🧶 Áo len oversize kem', source: 'buy', price: 290000 },
      { id: 'oi-13', owner: 'her', label: '👖 Quần ống rộng', source: 'own' },
      { id: 'oi-14', owner: 'him', label: '👕 Polo đen', source: 'own' },
      { id: 'oi-15', owner: 'him', label: '👓 Kính', source: 'own' }
    ],
    isChosen: false,
    createdAt: '2026-09-18T11:20:00.000Z'
  }
];
