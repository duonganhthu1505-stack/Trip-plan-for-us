import React, { useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Star,
  MapPin,
  UploadCloud,
  Loader2,
  CalendarDays,
  ExternalLink,
  Phone
} from 'lucide-react';
import { Activity, ChecklistItem, OutfitItem, OutfitItemSource, OutfitOwner, ServiceOption, TripInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { fileToBase64 } from '../utils/imageHelpers';
import { formatCurrency, getDatesRange } from '../utils/dateHelpers';
import { ModalPortal } from './ModalPortal';
import {
  DEFAULT_OUTFIT_SETS,
  OUTFIT_SOURCE_CLASS,
  OUTFIT_SOURCE_LABEL,
  computeOutfitTotal,
  parseSlotKey,
  slotKey,
  syncOutfitsToChecklist,
  toggleSlotAssignment,
  OutfitSlot
} from '../utils/outfitHelpers';

interface OutfitBoardProps {
  tripInfo: TripInfo;
  itinerary: Activity[];
  outfits: ServiceOption[];
  checklist: ChecklistItem[];
  onSaveOutfits: (outfits: ServiceOption[]) => void;
  onSaveChecklist: (items: ChecklistItem[]) => void;
}

const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${WEEKDAY_VI[d.getUTCDay()]} · ${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}

function slotLabel(slot: OutfitSlot, lang: string): string {
  if (slot === 'am') return lang === 'vi' ? '🌅 Sáng' : '🌅 Morning';
  return lang === 'vi' ? '🌃 Chiều–tối' : '🌃 Evening';
}

/** Gợi ý nội dung buổi dựa trên hoạt động trong lịch trình. */
function dayPlanText(activities: Activity[], date: string, slot: OutfitSlot, lang: string): string {
  const inDay = activities
    .filter((a) => a.date === date)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const bucket = inDay.filter((a) => (slot === 'am' ? (a.time || '00:00') < '12:00' : (a.time || '00:00') >= '12:00'));
  if (bucket.length === 0) return lang === 'vi' ? 'Chưa có hoạt động' : 'No plans yet';
  return bucket.slice(0, 3).map((a) => a.title).join(' · ') + (bucket.length > 3 ? ' …' : '');
}

/* ==================================================================== */
/* Gallery ảnh set — XEM TRỌN KHUNG (object-contain), bấm ảnh nhỏ đổi   */
/* ==================================================================== */
const OutfitGallery: React.FC<{ set: ServiceOption; onAddPhotos: () => void }> = ({ set, onAddPhotos }) => {
  const { lang } = useLanguage();
  const photos = Array.isArray(set.photos) ? set.photos : [];
  const [idx, setIdx] = useState(0);

  if (photos.length === 0) {
    return (
      <button
        type="button"
        onClick={onAddPhotos}
        className="w-full h-48 flex flex-col items-center justify-center gap-1.5 bg-[#FAF7F2] border-b border-[#E2D4C3] text-[#8C6D58] hover:text-[#C4685A] transition"
      >
        <span className="text-3xl">👗</span>
        <span className="text-xs font-bold">{lang === 'vi' ? '＋ Thêm ảnh set đồ' : 'Add outfit photos'}</span>
        <span className="text-[10px]">{lang === 'vi' ? 'Chụp tủ đồ nhà hoặc lưu từ Pinterest' : 'Snap your closet or save from Pinterest'}</span>
      </button>
    );
  }

  const safeIdx = Math.min(idx, photos.length - 1);
  return (
    <div className="border-b border-[#E2D4C3]">
      {/* Ảnh lớn: hiển thị TRỌN ẢNH (object-contain), không cắt kiểu ảnh bìa */}
      <div className="relative h-60 bg-white">
        <img
          src={photos[safeIdx]}
          alt={`${set.name} — ${safeIdx + 1}`}
          className="w-full h-full object-contain p-1.5"
          referrerPolicy="no-referrer"
        />
        <span className="absolute top-2 left-2 text-[10px] font-extrabold bg-white/95 text-[#6E4F36] border border-[#E2D4C3] rounded-full px-2 py-0.5">
          📷 {safeIdx + 1}/{photos.length}
        </span>
      </div>
      {/* Dải ảnh nhỏ: bấm để đổi ảnh lớn */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#FAF7F2] overflow-x-auto">
        {photos.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            title={lang === 'vi' ? `Ảnh ${i + 1}` : `Photo ${i + 1}`}
            className={`w-12 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition ${
              i === safeIdx ? 'border-[#C08A32] ring-2 ring-[#FDE68A]/60' : 'border-white hover:border-[#E2D4C3]'
            }`}
          >
            <img src={p} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </button>
        ))}
        <button
          type="button"
          onClick={onAddPhotos}
          className="shrink-0 h-12 px-2.5 rounded-lg border-2 border-dashed border-[#D9CABB] text-[10px] font-bold text-[#8C6D58] hover:border-[#C4685A] hover:text-[#C4685A] transition"
        >
          ＋<br />{lang === 'vi' ? 'Ảnh' : 'Photo'}
        </button>
      </div>
    </div>
  );
};

/* ==================================================================== */
/* Thẻ một set outfit                                                    */
/* ==================================================================== */
interface OutfitCardProps {
  set: ServiceOption;
  assignOpen: boolean;
  onToggleAssign: () => void;
  onCloseAssign: () => void;
  onAssign: (setId: string, date: string, slot: OutfitSlot) => void;
  onChoose: (setId: string) => void;
  onEdit: (set: ServiceOption) => void;
  onDelete: (setId: string) => void;
  onAddPhotos: (set: ServiceOption) => void;
  tripDates: string[];
  itinerary: Activity[];
}

const OutfitCard: React.FC<OutfitCardProps> = ({
  set, assignOpen, onToggleAssign, onCloseAssign, onAssign, onChoose, onEdit, onDelete, onAddPhotos, tripDates, itinerary
}) => {
  const { lang } = useLanguage();
  const isWinner = set.isChosen;
  const items = Array.isArray(set.outfitItems) ? set.outfitItems : [];
  const herItems = items.filter((i) => i.owner === 'her');
  const himItems = items.filter((i) => i.owner === 'him');
  const total = computeOutfitTotal(set);
  const costItems = items.filter((i) => i.source !== 'own' && (Number(i.price) || 0) > 0);
  const assigned = Array.isArray(set.assignedSlots) ? set.assignedSlots : [];

  const renderItemPills = (list: OutfitItem[]) => (
    <div className="flex flex-wrap gap-1.5">
      {list.map((item) => (
        <span
          key={item.id}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${OUTFIT_SOURCE_CLASS[item.source]}`}
        >
          {item.label}
          {item.source !== 'own' && item.price ? ` · ${formatCurrency(item.price)}` : ` (${OUTFIT_SOURCE_LABEL[item.source]})`}
        </span>
      ))}
      {list.length === 0 && <span className="text-[10px] text-[#8C6D58]">—</span>}
    </div>
  );

  return (
    <div className={`bg-[#FFFDF9] rounded-3xl overflow-hidden border transition-all duration-200 flex flex-col relative ${
      isWinner
        ? 'border-2 border-[#D97706] shadow-md ring-2 ring-[#FDE68A]/50'
        : 'border-[#E8DEC8] hover:border-[#6E4F36] shadow-xs hover:shadow-md'
    }`}>
      {/* Huy hiệu */}
      {isWinner && (
        <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-[#D97706] to-[#B45309] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>{lang === 'vi' ? 'ĐÃ CHỐT SET NÀY ♥' : 'CHOSEN SET'}</span>
        </div>
      )}
      {!isWinner && (
        <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md text-[#735D4E] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#E8DEC8]">
          {lang === 'vi' ? 'Đang cân nhắc' : 'Candidate'}
        </div>
      )}

      <OutfitGallery set={set} onAddPhotos={() => onAddPhotos(set)} />

      <div className="p-4 flex-1 flex flex-col gap-3">
        <h3 className="font-serif text-base sm:text-lg font-bold text-[#382D24] leading-snug pr-16">{set.name}</h3>

        {/* Buổi đã gán */}
        {assigned.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {assigned.map((k) => {
              const { date, slot } = parseSlotKey(k);
              return (
                <span key={k} className="text-[10px] font-bold bg-[#F4EEF8] text-[#7A5C8E] border border-[#DFCCEA] px-2 py-0.5 rounded-md">
                  {slotLabel(slot, lang)} · {dateLabel(date)}
                </span>
              );
            })}
          </div>
        )}

        {/* Chi phí thuê / mua */}
        {(costItems.length > 0 || (set.deposit || 0) > 0) && (
          <div className="bg-white border border-[#E8DEC8] rounded-xl p-2.5 space-y-1 text-xs">
            {costItems.map((item) => (
              <div key={item.id} className="flex justify-between text-[#55423A]">
                <span>{item.label} <span className="text-[#8C6D58]">({OUTFIT_SOURCE_LABEL[item.source]})</span></span>
                <span className="font-bold">{formatCurrency(Number(item.price) || 0)}</span>
              </div>
            ))}
            {(set.deposit || 0) > 0 && (
              <div className="flex justify-between text-[#735D4E]">
                <span>{lang === 'vi' ? 'Tiền cọc (nhớ lấy lại):' : 'Deposit (refundable):'}</span>
                <span className="font-medium">{formatCurrency(set.deposit || 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-[#E8DEC8] text-[#B45309]">
              <span>{lang === 'vi' ? 'Tổng set này:' : 'Set total:'}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {/* Món đồ theo người */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-1.5">
            <span className="text-[11px] w-5 shrink-0">👩</span>
            <div className="flex-1">{renderItemPills(herItems)}</div>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-[11px] w-5 shrink-0">👨</span>
            <div className="flex-1">{renderItemPills(himItems)}</div>
          </div>
        </div>

        {/* Tiệm thuê */}
        {(set.shopName || set.contactPhone || set.address) && (
          <div className="bg-[#FAF7F2] border border-[#E2D4C3] rounded-xl px-2.5 py-1.5 text-[11px] text-[#55423A] space-y-0.5">
            {set.shopName && <div className="font-bold">🏪 {set.shopName}</div>}
            {set.address && (
              <div className="flex items-start gap-1 text-[#735D4E]">
                <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-[#1A73E8]" />
                <span>{set.address}</span>
              </div>
            )}
            {(set.contactPhone || set.linkUrl) && (
              <div className="flex items-center gap-2 text-[#735D4E]">
                {set.contactPhone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{set.contactPhone}</span>
                )}
                {set.linkUrl && (
                  <a href={set.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 text-[#1A73E8] hover:underline">
                    <ExternalLink className="w-3 h-3" />{lang === 'vi' ? 'Link' : 'Link'}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 pt-1 border-t border-[#E8DEC8] mt-auto space-y-2">
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            {/* Gán buổi */}
            <div className="relative">
              <button
                onClick={onToggleAssign}
                className="flex items-center gap-1 text-[11px] font-bold text-[#7A5C8E] hover:bg-[#F4EEF8] px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Gán buổi' : 'Assign day'}
              </button>
              {assignOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={onCloseAssign} />
                  <div className="absolute bottom-full mb-2 left-0 z-40 w-64 bg-white border border-[#E2D4C3] rounded-2xl shadow-xl p-3">
                    <div className="text-[11px] font-bold text-[#55423A] mb-2">
                      {lang === 'vi' ? 'Mặc set này vào buổi nào?' : 'Wear this set on…'}
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {tripDates.length === 0 && (
                        <div className="text-[11px] text-[#8C6D58]">{lang === 'vi' ? 'Chuyến đi chưa có ngày.' : 'Trip has no dates yet.'}</div>
                      )}
                      {tripDates.map((d, di) => (
                        <div key={d} className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-semibold text-[#55423A] w-16 shrink-0">
                            {lang === 'vi' ? `Ngày ${di + 1}` : `Day ${di + 1}`}<span className="text-[#8C6D58] font-normal"> · {dateLabel(d)}</span>
                          </span>
                          <div className="flex gap-1">
                            {(['am', 'pm'] as OutfitSlot[]).map((sl) => {
                              const on = assigned.includes(slotKey(d, sl));
                              return (
                                <button
                                  key={sl}
                                  onClick={() => onAssign(set.id, d, sl)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                                    on
                                      ? 'bg-[#7A5C8E] text-white border-[#7A5C8E]'
                                      : 'bg-white text-[#8C6D58] border-[#E2D4C3] hover:border-[#7A5C8E] hover:text-[#7A5C8E]'
                                  }`}
                                >
                                  {sl === 'am' ? '🌅 Sáng' : '🌃 Tối'}{on ? ' ✓' : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onEdit(set)}
              className="p-1.5 text-[#8C6D58] hover:text-[#382D24] hover:bg-[#FAF7F2] rounded-lg transition"
              title={lang === 'vi' ? 'Sửa set' : 'Edit set'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(set.id)}
              className="p-1.5 text-[#8C6D58] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition"
              title={lang === 'vi' ? 'Xóa set' : 'Delete set'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Nút chốt — mỗi set chốt độc lập (không loại trừ nhau như khách sạn) */}
        <button
          onClick={() => onChoose(set.id)}
          className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            isWinner
              ? 'bg-gradient-to-r from-[#D97706] to-[#B45309] text-white shadow-sm'
              : 'bg-[#FFFDF9] border border-[#D9CABB] text-[#5C4033] hover:bg-[#F4EEF8] hover:border-[#7A5C8E] hover:text-[#7A5C8E]'
          }`}
        >
          {isWinner ? (
            <><Check className="w-4 h-4 stroke-[2.5]" /><span>{lang === 'vi' ? '✓ ĐÃ CHỐT SET NÀY' : '✓ SET CHOSEN'}</span></>
          ) : (
            <><Star className="w-4 h-4" /><span>{lang === 'vi' ? '★ Chốt set này' : 'Choose this set'}</span></>
          )}
        </button>
      </div>
    </div>
  );
};

/* ==================================================================== */
/* Modal thêm / sửa set outfit                                           */
/* ==================================================================== */
const OutfitEditorModal: React.FC<{
  initial: ServiceOption;
  isNew: boolean;
  onSave: (set: ServiceOption) => void;
  onClose: () => void;
}> = ({ initial, isNew, onSave, onClose }) => {
  const { lang } = useLanguage();
  const [draft, setDraft] = useState<ServiceOption>(initial);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const items = Array.isArray(draft.outfitItems) ? draft.outfitItems : [];

  const updateItem = (id: string, patch: Partial<OutfitItem>) => {
    setDraft((prev) => ({
      ...prev,
      outfitItems: (prev.outfitItems || []).map((it) => (it.id === id ? { ...it, ...patch } : it))
    }));
  };

  const addItem = (owner: OutfitOwner) => {
    setDraft((prev) => ({
      ...prev,
      outfitItems: [
        ...(prev.outfitItems || []),
        { id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, owner, label: '', source: 'own' }
      ]
    }));
  };

  const removeItem = (id: string) => {
    setDraft((prev) => ({ ...prev, outfitItems: (prev.outfitItems || []).filter((it) => it.id !== id) }));
  };

  const handlePhotosSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const current = Array.isArray(draft.photos) ? draft.photos : [];
    if (current.length + files.length > 8) {
      setPhotoError(lang === 'vi' ? 'Tối đa 8 ảnh cho mỗi set.' : 'Up to 8 photos per set.');
      return;
    }
    setPhotoError(null);
    setIsProcessingPhotos(true);
    try {
      const converted: string[] = [];
      for (let i = 0; i < files.length; i += 1) {
        if (!files[i].type.startsWith('image/')) continue;
        converted.push(await fileToBase64(files[i], 900, 900, 0.64, 90));
      }
      setDraft((prev) => ({ ...prev, photos: [...(prev.photos || []), ...converted] }));
    } catch (err) {
      console.warn('Outfit photo processing failed:', err);
      setPhotoError(lang === 'vi' ? 'Không thể xử lý ảnh. Thử ảnh khác nhé.' : 'Could not process the image.');
    } finally {
      setIsProcessingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    const cleaned: ServiceOption = {
      ...draft,
      name: draft.name.trim(),
      outfitItems: (draft.outfitItems || []).filter((it) => it.label.trim()),
      totalEstimate: computeOutfitTotal(draft)
    };
    onSave(cleaned);
  };

  return (
    <ModalPortal>
      <div className="app-modal-overlay fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
          <button onClick={onClose} className="absolute top-5 right-5 text-[#8C6D58] hover:text-[#382D24] p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>

          <h3 className="font-serif text-xl font-bold text-[#382D24] mb-1">
            {isNew ? (lang === 'vi' ? 'Thêm set outfit mới 👗' : 'Add New Outfit Set 👗') : (lang === 'vi' ? 'Sửa set outfit' : 'Edit Outfit Set')}
          </h3>
          <p className="text-xs text-[#735D4E] mb-4">
            {lang === 'vi'
              ? 'Lưu set đồ cho chuyến đi: chụp tủ đồ nhà, ghi món thuê/mua và tổng tiền để hai bạn cùng duyệt.'
              : 'Save an outfit set: snap your closet, list rent/buy items, and total the cost together.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Tên set */}
            <div>
              <label className="block font-bold text-[#55423A] mb-1">{lang === 'vi' ? 'Tên set *' : 'Set name *'}</label>
              <input
                type="text"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={lang === 'vi' ? 'Ví dụ: Set Couple “Hoa Giấy” — thuê tiệm Trăng Sơn' : 'e.g. Date-night couple set'}
                className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#7A5C8E] outline-hidden"
              />
            </div>

            {/* Món đồ theo người */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-[#55423A]">{lang === 'vi' ? 'Món đồ trong set' : 'Items in this set'}</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => addItem('her')}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-[#F4C7C0] text-[#C4685A] hover:bg-[#FDF0EE] transition cursor-pointer"
                  >
                    👩 {lang === 'vi' ? 'Thêm của em' : 'Add hers'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addItem('him')}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-[#C2D7FA] text-[#1A73E8] hover:bg-[#e8f0fe] transition cursor-pointer"
                  >
                    👨 {lang === 'vi' ? 'Thêm của anh' : 'Add his'}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-1.5 bg-white border border-[#E8DEC8] rounded-xl p-1.5">
                    <select
                      value={item.owner}
                      onChange={(e) => updateItem(item.id, { owner: e.target.value as OutfitOwner })}
                      className="bg-[#FAF7F2] border border-[#E2D4C3] rounded-lg px-1 py-1 text-[11px] font-bold text-[#55423A] outline-hidden shrink-0"
                    >
                      <option value="her">👩</option>
                      <option value="him">👨</option>
                    </select>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItem(item.id, { label: e.target.value })}
                      placeholder={lang === 'vi' ? 'Tên món đồ…' : 'Item name…'}
                      className="flex-1 min-w-0 bg-transparent px-1 py-1 text-[11px] outline-hidden"
                    />
                    <select
                      value={item.source}
                      onChange={(e) => {
                        const source = e.target.value as OutfitItemSource;
                        updateItem(item.id, { source, price: source === 'own' ? 0 : (item.price || 0) });
                      }}
                      className="bg-[#FAF7F2] border border-[#E2D4C3] rounded-lg px-1 py-1 text-[11px] font-bold text-[#55423A] outline-hidden shrink-0"
                    >
                      <option value="rent">{lang === 'vi' ? 'Thuê' : 'Rent'}</option>
                      <option value="buy">{lang === 'vi' ? 'Mua' : 'Buy'}</option>
                      <option value="own">{lang === 'vi' ? 'Nhà' : 'Own'}</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={item.source === 'own' ? '' : (item.price || '')}
                      disabled={item.source === 'own'}
                      onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })}
                      placeholder="₫"
                      className="w-16 bg-[#FAF7F2] border border-[#E2D4C3] rounded-lg px-1.5 py-1 text-[11px] text-right outline-hidden disabled:opacity-40 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-[#8C6D58] hover:text-[#DC2626] rounded-lg transition shrink-0"
                      title={lang === 'vi' ? 'Bỏ món' : 'Remove item'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-[11px] text-[#8C6D58] italic">
                    {lang === 'vi' ? 'Chưa có món nào — bấm “Thêm của em / của anh”.' : 'No items yet — add hers or his.'}
                  </p>
                )}
              </div>
              {items.some((it) => it.source !== 'own' && (Number(it.price) || 0) > 0) && (
                <div className="mt-1.5 text-right text-[11px] font-bold text-[#B45309]">
                  {lang === 'vi' ? 'Tổng tự động:' : 'Auto total:'} {formatCurrency(computeOutfitTotal(draft))}
                </div>
              )}
            </div>

            {/* Cọc */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#55423A] mb-1">{lang === 'vi' ? 'Tiền cọc (₫)' : 'Deposit (₫)'}</label>
                <input
                  type="number"
                  min="0"
                  value={draft.deposit || ''}
                  onChange={(e) => setDraft({ ...draft, deposit: Number(e.target.value) || 0 })}
                  placeholder="200000"
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#7A5C8E] outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-[#55423A] mb-1">{lang === 'vi' ? 'Ghi chú thời gian' : 'Duration note'}</label>
                <input
                  type="text"
                  value={draft.unitLabel || ''}
                  onChange={(e) => setDraft({ ...draft, unitLabel: e.target.value })}
                  placeholder={lang === 'vi' ? 'Ví dụ: 2 ngày thuê' : 'e.g. 2-day rental'}
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#7A5C8E] outline-hidden"
                />
              </div>
            </div>

            {/* Tiệm thuê */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#55423A] mb-1">{lang === 'vi' ? 'Tiệm thuê (nếu có)' : 'Rental shop (optional)'}</label>
                <input
                  type="text"
                  value={draft.shopName || ''}
                  onChange={(e) => setDraft({ ...draft, shopName: e.target.value })}
                  placeholder={lang === 'vi' ? 'Ví dụ: Tiệm Trăng Sơn' : 'e.g. Trang Son rental'}
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#7A5C8E] outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-[#55423A] mb-1">{lang === 'vi' ? 'Địa chỉ tiệm' : 'Shop address'}</label>
                <input
                  type="text"
                  value={draft.address || ''}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder={lang === 'vi' ? 'Địa chỉ / khoảng cách tới chỗ ở' : 'Address / distance to stay'}
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#7A5C8E] outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#55423A] mb-1">{lang === 'vi' ? 'Liên hệ' : 'Contact'}</label>
                <input
                  type="text"
                  value={draft.contactPhone || ''}
                  onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
                  placeholder="0912 345 678"
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#7A5C8E] outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-[#55423A] mb-1">{lang === 'vi' ? 'Link tham khảo' : 'Reference link'}</label>
                <input
                  type="url"
                  value={draft.linkUrl || ''}
                  onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                  placeholder="https://…"
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#7A5C8E] outline-hidden"
                />
              </div>
            </div>

            {/* Ảnh set */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-[#55423A]">{lang === 'vi' ? 'Ảnh set đồ' : 'Outfit photos'}</label>
                <span className="text-[11px] text-[#8C6D58]">{draft.photos?.length || 0}/8</span>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotosSelected(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isProcessingPhotos}
                className="w-full border-2 border-dashed border-[#D9CABB] hover:border-[#7A5C8E] bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition disabled:opacity-60"
              >
                {isProcessingPhotos ? (
                  <><Loader2 className="w-5 h-5 animate-spin text-[#7A5C8E]" /><span className="text-xs font-medium text-[#6E4F36]">{lang === 'vi' ? 'Đang tối ưu ảnh...' : 'Optimizing…'}</span></>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 text-[#8C6D58]" />
                    <span className="text-xs font-bold text-[#5C4033]">{lang === 'vi' ? 'Thêm ảnh set (xem trọn khung, không bị cắt)' : 'Add photos (shown full-frame)'}</span>
                    <span className="text-[10px] text-[#8C6D58]">{lang === 'vi' ? 'Chọn nhiều ảnh từ điện thoại hoặc máy tính' : 'Pick multiple photos'}</span>
                  </>
                )}
              </button>
              {photoError && <p className="text-xs text-[#B85340] mt-1.5">{photoError}</p>}
              {(draft.photos?.length || 0) > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {draft.photos!.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#E2D4C3] bg-[#FAF7F2]">
                      <img src={photo} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, photos: draft.photos!.filter((_, i) => i !== idx) })}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center"
                        aria-label={lang === 'vi' ? 'Xóa ảnh' : 'Remove photo'}
                      ><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#D9CABB] font-bold text-[#735D4E] hover:bg-[#FAF7F2] transition cursor-pointer"
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#7A5C8E] hover:bg-[#6a4f7c] text-white font-bold transition shadow-xs cursor-pointer"
              >
                {lang === 'vi' ? 'Lưu set outfit' : 'Save set'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

/* ==================================================================== */
/* Board chính: filter + thẻ + lịch mặc theo ngày + đồng bộ hành trang   */
/* ==================================================================== */
export const OutfitBoard: React.FC<OutfitBoardProps> = ({
  tripInfo, itinerary, outfits, checklist, onSaveOutfits, onSaveChecklist
}) => {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'couple' | 'her' | 'him' | 'unassigned'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ServiceOption | null>(null);
  const [assignOpenFor, setAssignOpenFor] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const tripDates = React.useMemo(() => {
    const { getDatesRange } = require('../utils/dateHelpers') as typeof import('../utils/dateHelpers');
    return getDatesRange(tripInfo.startDate, tripInfo.endDate);
  }, [tripInfo.startDate, tripInfo.endDate]);

  /* ---------- Filter ---------- */
  const setKind = (s: ServiceOption): 'couple' | 'her' | 'him' | 'empty' => {
    const items = s.outfitItems || [];
    const hasHer = items.some((i) => i.owner === 'her');
    const hasHim = items.some((i) => i.owner === 'him');
    if (hasHer && hasHim) return 'couple';
    if (hasHer) return 'her';
    if (hasHim) return 'him';
    return 'empty';
  };
  const filtered = outfits.filter((s) => {
    if (filter === 'couple') return setKind(s) === 'couple';
    if (filter === 'her') return setKind(s) === 'her';
    if (filter === 'him') return setKind(s) === 'him';
    if (filter === 'unassigned') return (s.assignedSlots || []).length === 0;
    return true;
  });

  /* ---------- Chốt set (độc lập giữa các set) ---------- */
  const handleChoose = (setId: string) => {
    onSaveOutfits(outfits.map((s) => (s.id === setId ? { ...s, isChosen: !s.isChosen } : s)));
  };

  /* ---------- Gán/bỏ gán buổi ---------- */
  const handleAssign = (setId: string, date: string, slot: OutfitSlot) => {
    onSaveOutfits(outfits.map((s) => (s.id === setId ? { ...s, assignedSlots: toggleSlotAssignment(s, date, slot) } : s)));
  };

  /* ---------- Xóa set (kèm món đã đồng bộ trong Hành trang) ---------- */
  const handleDelete = (setId: string) => {
    const target = outfits.find((s) => s.id === setId);
    if (!target) return;
    const linkedIds = (target.outfitItems || []).map((i) => i.checklistItemId).filter(Boolean) as string[];
    const msg = lang === 'vi'
      ? `Xóa set “${target.name}”?${linkedIds.length > 0 ? ` ${linkedIds.length} món đã đồng bộ trong Hành trang cũng sẽ được xóa.` : ''}`
      : `Delete set “${target.name}”?${linkedIds.length > 0 ? ` ${linkedIds.length} synced packing items will also be removed.` : ''}`;
    if (!window.confirm(msg)) return;

    onSaveOutfits(outfits.filter((s) => s.id !== setId));
    if (linkedIds.length > 0) {
      const nextChecklist = checklist.filter((c) => !linkedIds.includes(c.id) || !String(c.notes || '').startsWith('Outfit:'));
      if (nextChecklist.length !== checklist.length) onSaveChecklist(nextChecklist);
    }
  };

  /* ---------- Lưu modal ---------- */
  const handleSaveModal = (set: ServiceOption) => {
    const exists = outfits.some((s) => s.id === set.id);
    onSaveOutfits(exists ? outfits.map((s) => (s.id === set.id ? set : s)) : [set, ...outfits]);
    setModalOpen(false);
    setEditingSet(null);
  };

  /* ---------- Đồng bộ Hành trang ---------- */
  const handleSyncChecklist = () => {
    const result = syncOutfitsToChecklist(outfits, checklist, tripInfo.id);
    onSaveOutfits(result.outfits);
    onSaveChecklist(result.checklist);
    setLastSync(
      lang === 'vi'
        ? `＋${result.added} món mới · ~${result.updated} món cập nhật · −${result.removed} món dư`
        : `＋${result.added} added · ~${result.updated} updated · −${result.removed} removed`
    );
  };

  /* ---------- Lịch mặc theo ngày ---------- */
  const outfitForSlot = (date: string, slot: OutfitSlot): string => {
    const key = slotKey(date, slot);
    const found = outfits.find((s) => (s.assignedSlots || []).includes(key));
    return found ? found.id : '';
  };

  const chosenCount = outfits.filter((s) => s.isChosen).length;
  const daysWithOutfit = tripDates.filter((d) => outfitForSlot(d, 'am') || outfitForSlot(d, 'pm')).length;
  const linkedItemCount = outfits.reduce((n, s) => n + (s.outfitItems || []).filter((i) => i.checklistItemId).length, 0);
  const totalCost = outfits.reduce((n, s) => n + computeOutfitTotal(s), 0);

  const filterChips: { key: typeof filter; label: string }[] = [
    { key: 'all', label: lang === 'vi' ? `Tất cả · ${outfits.length}` : `All · ${outfits.length}` },
    { key: 'couple', label: lang === 'vi' ? '💑 Set đôi' : '💑 Couple sets' },
    { key: 'her', label: '👩 ' + (lang === 'vi' ? 'Của em' : 'Hers') },
    { key: 'him', label: '👨 ' + (lang === 'vi' ? 'Của anh' : 'His') },
    { key: 'unassigned', label: lang === 'vi' ? '📅 Chưa gán buổi' : '📅 Unassigned' }
  ];

  return (
    <div className="space-y-5">
      {/* Thanh filter + thêm set */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                filter === chip.key
                  ? 'bg-[#F4EEF8] text-[#7A5C8E] border-[#DFCCEA]'
                  : 'bg-[#FFFDF9] text-[#6E4F36] border-[#E8DEC8] hover:bg-[#FAF7F2]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setEditingSet({
              id: `outfit-${Date.now()}`,
              tripId: tripInfo.id,
              category: 'Outfit',
              name: '',
              unitLabel: '',
              deposit: 0,
              photos: [],
              outfitItems: [],
              assignedSlots: [],
              isChosen: false
            });
            setModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#7A5C8E] hover:bg-[#6a4f7c] text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Thêm set outfit' : 'Add outfit set'}</span>
        </button>
      </div>

      {/* Lưới thẻ set */}
      {filtered.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-dashed border-[#E2D4C3] rounded-3xl p-10 text-center">
          <div className="text-4xl mb-2">👗</div>
          <p className="text-sm font-bold text-[#55423A]">
            {lang === 'vi' ? 'Chưa có set nào ở đây' : 'No sets here yet'}
          </p>
          <p className="text-xs text-[#8C6D58] mt-1">
            {lang === 'vi' ? 'Bấm “Thêm set outfit” để lưu bộ đồ đầu tiên của chuyến đi nhé.' : 'Tap “Add outfit set” to save your first look.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((set) => (
            <OutfitCard
              key={set.id}
              set={set}
              tripDates={tripDates}
              itinerary={itinerary}
              assignOpen={assignOpenFor === set.id}
              onToggleAssign={() => setAssignOpenFor((prev) => (prev === set.id ? null : set.id))}
              onCloseAssign={() => setAssignOpenFor(null)}
              onAssign={handleAssign}
              onChoose={handleChoose}
              onEdit={(s) => { setEditingSet(s); setModalOpen(true); }}
              onDelete={handleDelete}
              onAddPhotos={(s) => { setEditingSet(s); setModalOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* ===== Lịch mặc theo ngày + đồng bộ hành trang ===== */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8DEC8]">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#382D24] flex items-center gap-2">
              <span>📅</span>
              <span>{lang === 'vi' ? 'Lịch mặc theo ngày' : 'What to wear, day by day'}</span>
            </h3>
            <p className="text-xs text-[#735D4E] mt-0.5">
              {lang === 'vi'
                ? `Đã có set cho ${daysWithOutfit}/${tripDates.length || 0} ngày · ${chosenCount} set được chốt · tổng ~${formatCurrency(totalCost)}`
                : `${daysWithOutfit}/${tripDates.length || 0} days covered · ${chosenCount} chosen sets · ~${formatCurrency(totalCost)}`}
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#7A5C8E] bg-[#F4EEF8] border border-[#DFCCEA] px-3 py-1 rounded-full">
            👗 {outfits.length} set
          </span>
        </div>

        {tripDates.length === 0 ? (
          <p className="text-xs text-[#8C6D58] italic">
            {lang === 'vi' ? 'Chuyến đi chưa có ngày bắt đầu/kết thúc — cập nhật ở Chi tiết để lên lịch mặc.' : 'Set trip dates first to plan outfits.'}
          </p>
        ) : (
          <div className="space-y-2">
            {tripDates.map((d, di) => (
              <div key={d} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white border border-[#E2D4C3] rounded-2xl px-3 py-2.5">
                <div className="w-24 shrink-0">
                  <div className="text-xs font-extrabold text-[#382D24]">
                    {lang === 'vi' ? `Ngày ${di + 1}` : `Day ${di + 1}`}
                  </div>
                  <div className="text-[10px] text-[#8C6D58]">{dateLabel(d)}</div>
                </div>
                <div className="flex-1 min-w-0 text-[11px] text-[#735D4E] leading-snug">
                  <div className="truncate">🌅 {dayPlanText(itinerary, d, 'am', lang)}</div>
                  <div className="truncate">🌃 {dayPlanText(itinerary, d, 'pm', lang)}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(['am', 'pm'] as OutfitSlot[]).map((sl) => {
                    const val = outfitForSlot(d, sl);
                    return (
                      <select
                        key={sl}
                        value={val}
                        onChange={(e) => {
                          const setId = e.target.value;
                          // Bỏ gán mọi set khỏi buổi này, rồi gán set được chọn (nếu có)
                          const cleaned = outfits.map((s) => ({
                            ...s,
                            assignedSlots: (s.assignedSlots || []).filter((k) => k !== slotKey(d, sl))
                          }));
                          const next = setId
                            ? cleaned.map((s) => (s.id === setId ? { ...s, assignedSlots: [...s.assignedSlots, slotKey(d, sl)] } : s))
                            : cleaned;
                          onSaveOutfits(next);
                        }}
                        className={`text-[10.5px] font-bold rounded-xl border px-2 py-1.5 outline-hidden cursor-pointer max-w-[150px] ${
                          val
                            ? 'bg-[#F4EEF8] text-[#7A5C8E] border-[#DFCCEA]'
                            : 'bg-[#FAF7F2] text-[#8C6D58] border-[#E2D4C3]'
                        }`}
                      >
                        <option value="">{sl === 'am' ? '🌅 Sáng: ＋ gán' : '🌃 Tối: ＋ gán'}</option>
                        {outfits.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.isChosen ? '★ ' : ''}{s.name}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Đồng bộ hành trang */}
        <div className="bg-[#EBF5EC] border border-[#CDE5D1] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-lg">🧳</span>
          <p className="text-[11px] text-[#2E6B38] flex-1 leading-relaxed">
            {lang === 'vi'
              ? `Đồng bộ món đồ trong các set vào Hành trang → mục “Trang phục”${linkedItemCount > 0 ? ` (đang liên kết ${linkedItemCount} món)` : ''}. Tick “đã pack” ở Hành trang, mở lại đây vẫn thấy ✓.`
              : `Sync outfit items into the packing list (Clothes group)${linkedItemCount > 0 ? ` — ${linkedItemCount} linked` : ''}.`}
            {lastSync && <span className="block font-bold mt-0.5">{lastSync}</span>}
          </p>
          <button
            onClick={handleSyncChecklist}
            className="px-4 py-2 rounded-xl bg-[#2E6B38] hover:bg-[#275c30] text-white text-xs font-bold transition cursor-pointer shrink-0"
          >
            🧳 {lang === 'vi' ? 'Đồng bộ Hành trang' : 'Sync to packing list'}
          </button>
        </div>
      </div>

      {/* Modal thêm/sửa */}
      {modalOpen && editingSet && (
        <OutfitEditorModal
          initial={editingSet}
          isNew={!outfits.some((s) => s.id === editingSet.id)}
          onSave={handleSaveModal}
          onClose={() => { setModalOpen(false); setEditingSet(null); }}
        />
      )}
    </div>
  );
};

export { DEFAULT_OUTFIT_SETS };
