import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  FileCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ChecklistGroup, ChecklistItem, ChecklistWearer } from '../types';
import { CHECKLIST_GROUPS } from '../utils/constants';
import { parseDateString } from '../utils/dateHelpers';
import { useLanguage } from '../i18n/LanguageContext';
import { ModalPortal } from './ModalPortal';

const getWearerLabel = (wearer: ChecklistWearer, lang: string) => {
  if (wearer === 'baby') return lang === 'vi' ? 'Em bé' : 'Baby';
  return lang === 'vi' ? 'Thằng chồng' : 'Husband';
};

/** YYYY-MM-DD → "15/11" */
const formatDayMonthShort = (dateStr?: string) => {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr || '';
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}`;
};

/** Các ngày trong lịch trình: "Ngày 1 · 15/11", "Ngày 2 · 16/11"... */
const buildDayOptions = (start?: string, end?: string, lang = 'vi') => {
  const s = parseDateString(start);
  const e = parseDateString(end);
  if (!s || !e) return [];
  const cur = new Date(s.year, s.month - 1, s.day);
  const last = new Date(e.year, e.month - 1, e.day);
  const opts: { value: string; label: string }[] = [];
  while (cur <= last && opts.length < 62) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const d = cur.getDate();
    const value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    opts.push({
      value,
      label: `${lang === 'vi' ? 'Ngày' : 'Day'} ${opts.length + 1} · ${formatDayMonthShort(value)}`
    });
    cur.setDate(cur.getDate() + 1);
  }
  return opts;
};

const getGroupLabel = (group: string, lang: string) => {
  if (lang !== 'vi') return group;
  switch (group) {
    case 'Documents': return 'Giấy tờ';
    case 'Clothes': return 'Trang phục';
    case 'Personal items': return 'Đồ dùng cá nhân';
    case 'Electronics': return 'Thiết bị điện tử';
    case 'Medicine': return 'Thuốc men y tế';
    case 'Booking': return 'Vé & Đặt chỗ';
    case 'Other': return 'Khác';
    default: return group;
  }
};

interface ChecklistProps {
  tripId: string;
  checklist: ChecklistItem[];
  /** Khoảng ngày của chuyến đi — sinh option «Ngày 1 · 15/11…» cho nhóm Trang phục */
  tripStartDate?: string;
  tripEndDate?: string;
  onSaveChecklist: (items: ChecklistItem[]) => void;
  onRequestDeleteItem: (id: string, title: string) => void;
}

export const Checklist: React.FC<ChecklistProps> = ({
  tripId,
  checklist,
  tripStartDate,
  tripEndDate,
  onSaveChecklist,
  onRequestDeleteItem
}) => {
  const { t, lang } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChecklistGroup>('Documents');
  const [notes, setNotes] = useState('');
  // === Riêng nhóm Trang phục ===
  const [wearer, setWearer] = useState<ChecklistWearer>('baby');
  const [wearDate, setWearDate] = useState('');

  const isClothesForm = category === 'Clothes';
  const dayOptions = useMemo(
    () => buildDayOptions(tripStartDate, tripEndDate, lang),
    [tripStartDate, tripEndDate, lang]
  );

  const total = checklist.length;
  const completed = checklist.filter((c) => c.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = (item: ChecklistItem) => {
    const updated = checklist.map((c) =>
      c.id === item.id ? { ...c, completed: !c.completed } : c
    );
    onSaveChecklist(updated);
  };

  const openAddModal = (defaultCat?: ChecklistGroup) => {
    setEditingItem(null);
    setTitle('');
    const nextCat = defaultCat || (selectedGroup !== 'ALL' ? (selectedGroup as ChecklistGroup) : 'Documents');
    setCategory(nextCat);
    setNotes('');
    setWearer('baby');
    setWearDate(nextCat === 'Clothes' ? dayOptions[0]?.value || '' : '');
    setModalOpen(true);
  };

  const openEditModal = (item: ChecklistItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setNotes(item.notes || '');
    setWearer(item.wearer || 'baby');
    setWearDate(item.wearDate || '');
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const clothesFields: Partial<ChecklistItem> = isClothesForm
      ? { wearer, wearDate: wearDate || undefined, notes: '' } // Trang phục: bỏ hẳn ghi chú
      : { notes: notes.trim(), wearer: undefined, wearDate: undefined };

    if (editingItem) {
      const updated = checklist.map((c) =>
        c.id === editingItem.id
          ? {
              ...c,
              title: title.trim(),
              category,
              ...clothesFields
            }
          : c
      );
      onSaveChecklist(updated);
    } else {
      const newItem: ChecklistItem = {
        id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId,
        title: title.trim(),
        category,
        completed: false,
        ...clothesFields
      };
      onSaveChecklist([...checklist, newItem]);
    }
    setModalOpen(false);
  };

  // Group items
  const activeGroups = CHECKLIST_GROUPS.filter((grp) => {
    if (selectedGroup === 'ALL') return true;
    return grp === selectedGroup;
  });

  return (
    <div id="checklist-page" className="space-y-6 pb-16">
      {/* Header & Progress Banner */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
              <FileCheck className="w-3.5 h-3.5 text-[#C27D66]" />
              <span>{lang === 'vi' ? 'Chuẩn bị trước chuyến đi' : 'Pre-Trip Preparation'}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
              {lang === 'vi' ? 'Danh sách chuẩn bị & hành lý' : 'Packing & Journey Checklist'}
            </h2>
            <p className="text-xs text-[#735D4E] mt-1">
              {lang === 'vi'
                ? 'Không bao giờ quên giấy tờ tùy thân, đồ đôi, sạc máy ảnh hay vé đặt chỗ'
                : 'Never forget passport essentials, couple outfits, camera chargers, or bookings'}
            </p>
          </div>

          <button
            id="checklist-add-btn"
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors self-start sm:self-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Thêm món đồ cần chuẩn bị' : 'Add Checklist Item'}</span>
          </button>
        </div>

        {/* Progress Display (Item F Requirement: "Trip preparation: 8 / 12 completed") */}
        <div className="pt-4 border-t border-[#F0E6D8] space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-medium text-[#6E4F36]">
              {lang === 'vi' ? 'Tiến độ chuẩn bị:' : 'Trip preparation:'}{' '}
              <span className="font-bold text-[#382D24]">
                {completed} / {total} {lang === 'vi' ? 'món hoàn tất' : 'completed'}
              </span>
            </span>
            <span className="font-bold text-[#5C4033]">{percentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-[#FAF7F2] border border-[#E2D4C3] overflow-hidden">
            <div
              className="h-full bg-[#5C4033] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedGroup('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
            selectedGroup === 'ALL'
              ? 'bg-[#5C4033] text-white'
              : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
          }`}
        >
          {lang === 'vi' ? 'Tất cả' : 'All Items'} ({checklist.length})
        </button>
        {CHECKLIST_GROUPS.map((grp) => {
          const count = checklist.filter((c) => c.category === grp).length;
          return (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                selectedGroup === grp
                  ? 'bg-[#5C4033] text-white'
                  : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
              }`}
            >
              {getGroupLabel(grp, lang)} ({count})
            </button>
          );
        })}
      </div>

      {/* Groups and Items List */}
      <div className="space-y-6">
        {activeGroups.map((group) => {
          const groupItems = checklist.filter((c) => c.category === group);
          const groupCompleted = groupItems.filter((c) => c.completed).length;

          if (selectedGroup === 'ALL' && groupItems.length === 0) return null;

          return (
            <div
              key={group}
              className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0E6D8]">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-[#382D24]">
                    {getGroupLabel(group, lang)}
                  </h3>
                  <span className="text-xs text-[#8C6D58] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#E2D4C3]">
                    {groupCompleted} / {groupItems.length}
                  </span>
                </div>

                <button
                  onClick={() => openAddModal(group)}
                  className="text-xs text-[#6E4F36] hover:text-[#382D24] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? `Thêm vào ${getGroupLabel(group, lang)}` : `Add to ${group}`}</span>
                </button>
              </div>

              {/* Items */}
              {groupItems.length === 0 ? (
                <p className="text-xs text-[#8C6D58] italic py-2">
                  {lang === 'vi'
                    ? `Chưa có món đồ nào trong nhóm ${getGroupLabel(group, lang)}.`
                    : `No items in ${group} yet.`}
                </p>
              ) : (
                <div className="divide-y divide-[#F6EFE6]">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-start justify-between gap-3 group/item hover:bg-[#FAF7F2]/60 px-2 rounded-xl transition-colors"
                    >
                      <div
                        onClick={() => handleToggle(item)}
                        className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-[#5C4033] hover:text-[#382D24] shrink-0"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-5 h-5 text-[#476B38]" />
                          ) : (
                            <Square className="w-5 h-5 text-[#8C6D58]" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm leading-snug transition-all ${
                              item.completed
                                ? 'line-through text-[#8C7E72]'
                                : 'text-[#382D24] font-medium'
                            }`}
                          >
                            {item.title}
                          </p>
                          {(item.wearer || item.wearDate) && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {item.wearer && (
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    item.wearer === 'baby'
                                      ? 'bg-[#FDF0EE] border-[#F4C7C0] text-[#A65448]'
                                      : 'bg-[#EAF1FB] border-[#C2D2F0] text-[#3B5B96]'
                                  }`}
                                >
                                  {getWearerLabel(item.wearer, lang)}
                                </span>
                              )}
                              {item.wearDate && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-[#FDF6E8] border-[#F1DAAB] text-[#8A6215]">
                                  {formatDayMonthShort(item.wearDate)}
                                </span>
                              )}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-[#8C6D58] italic mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover/item:opacity-100">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-[#6E4F36] hover:bg-[#EFE8DE] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRequestDeleteItem(item.id, item.title)}
                          className="p-1.5 rounded-lg text-[#8C6D58] hover:text-[#B85340] hover:bg-[#FBEBE8] transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Checklist Modal */}
      {modalOpen && (
        <ModalPortal>
        <div className="app-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2B1E16]/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FAF7F2] border border-[#E8DEC8] rounded-3xl shadow-xl overflow-hidden p-6 text-[#3D312A] relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8C6D58] hover:text-[#382D24] rounded-full hover:bg-[#EFE8DE] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-[#EAE2D5]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C6D58] font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C27D66]" />
                <span>
                  {editingItem
                    ? lang === 'vi'
                      ? 'Chỉnh sửa món đồ'
                      : 'Edit Item'
                    : lang === 'vi'
                    ? 'Món đồ chuẩn bị mới'
                    : 'New Preparation Item'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingItem
                  ? lang === 'vi'
                    ? 'Chỉnh sửa đồ dùng'
                    : 'Modify Item'
                  : lang === 'vi'
                  ? 'Thêm vào danh sách đồ mang'
                  : 'Add to Packing List'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Nhóm đồ dùng' : 'Item Group'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ChecklistGroup)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                >
                  {CHECKLIST_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {getGroupLabel(grp, lang)}
                    </option>
                  ))}
                </select>
              </div>

              {isClothesForm ? (
                <>
                  {/* Người mặc: Em bé / Thằng chồng */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'Người mặc *' : 'Worn By *'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['baby', 'husband'] as ChecklistWearer[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWearer(w)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                            wearer === w
                              ? 'bg-[#5C4033] border-[#5C4033] text-white shadow-xs'
                              : 'bg-[#FFFDF9] border-[#D9CABB] text-[#6E4F36] hover:bg-[#FAF7F2]'
                          }`}
                        >
                          {wearer === w && <Check className="w-3.5 h-3.5" />}
                          <span>{getWearerLabel(w, lang)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ngày mặc theo lịch trình */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'Ngày mặc theo lịch trình *' : 'Wear Day (From Itinerary) *'}
                    </label>
                    <select
                      value={wearDate}
                      onChange={(e) => setWearDate(e.target.value)}
                      required={dayOptions.length > 0}
                      disabled={dayOptions.length === 0}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none disabled:opacity-60"
                    >
                      <option value="">
                        {dayOptions.length > 0
                          ? lang === 'vi'
                            ? 'Chọn ngày…'
                            : 'Select a day…'
                          : lang === 'vi'
                          ? 'Chưa có ngày trong lịch trình'
                          : 'No itinerary dates yet'}
                      </option>
                      {dayOptions.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mô tả trang phục */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'Mô tả trang phục *' : 'Outfit Description *'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      maxLength={200}
                      placeholder={
                        lang === 'vi'
                          ? 'VD: Áo thun trắng + quần jean ống suông, khoác thêm cardigan be...'
                          : 'e.g. White tee + straight jeans, add a beige cardigan...'
                      }
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'Tên đồ dùng *' : 'Item Title *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        lang === 'vi'
                          ? 'VD: Hộ chiếu, Máy ảnh polaroid, Đồ đôi linen...'
                          : 'e.g. Passports, Polaroid camera, Couple linen outfits...'
                      }
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'Ghi chú (Tùy chọn)' : 'Notes (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        lang === 'vi'
                          ? 'VD: Mang theo 2 viên pin dự phòng, để trong hành lý xách tay...'
                          : 'e.g. Bring 2 extra batteries, pack in carry-on...'
                      }
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs text-[#382D24] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE2D5]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#735D4E] hover:bg-[#EFE8DE] transition-colors cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {editingItem
                      ? lang === 'vi'
                        ? 'Lưu món đồ'
                        : 'Save Item'
                      : lang === 'vi'
                      ? 'Thêm món đồ'
                      : 'Add Item'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};
