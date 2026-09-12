import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Compass,
  X,
  Save,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Activity, ActivityCategory, TripInfo } from '../types';
import { ACTIVITY_CATEGORIES } from '../utils/constants';
import { formatDateVN, getDatesRange } from '../utils/dateHelpers';
import { ActivityCard, CATEGORY_ICONS, CATEGORY_STYLES } from './ActivityCard';

interface ItineraryProps {
  tripInfo: TripInfo;
  itinerary: Activity[];
  onSaveActivities: (activities: Activity[]) => void;
  onRequestDeleteActivity: (id: string, title: string) => void;
}

export const Itinerary: React.FC<ItineraryProps> = ({
  tripInfo,
  itinerary,
  onSaveActivities,
  onRequestDeleteActivity
}) => {
  // Determine trip days range
  const generatedDates = getDatesRange(tripInfo.startDate, tripInfo.endDate);
  // Also include any activity dates that might exist outside the current range
  const allExistingDates = Array.from(new Set([...generatedDates, ...itinerary.map((a) => a.date)]))
    .filter(Boolean)
    .sort();

  const daysList = allExistingDates.length > 0 ? allExistingDates : [tripInfo.startDate || '2026-09-02'];

  const [selectedDay, setSelectedDay] = useState<string>(daysList[0]);
  const [viewMode, setViewMode] = useState<'day' | 'timeline' | 'all'>('day');

  // Inline time editing on timeline
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [inlineTimeVal, setInlineTimeVal] = useState<string>('');

  const startEditingTime = (id: string, currentTime: string) => {
    setEditingTimeId(id);
    setInlineTimeVal(currentTime || '09:00');
  };

  const handleSaveInlineTime = (id: string) => {
    if (inlineTimeVal) {
      const updated = itinerary.map((a) =>
        a.id === id ? { ...a, time: inlineTimeVal } : a
      );
      // Sort activities automatically by date & time
      updated.sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.time || '').localeCompare(b.time || '');
      });
      onSaveActivities(updated);
    }
    setEditingTimeId(null);
  };

  // Modal for Add/Edit Activity
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<Partial<Activity>>({
    title: '',
    time: '09:00',
    date: selectedDay,
    location: '',
    category: 'Sightseeing',
    plannedCost: 0,
    actualCost: 0,
    note: '',
    mapUrl: ''
  });

  const openAddModal = (forDate?: string) => {
    setEditingActivity(null);
    setFormData({
      title: '',
      time: '09:00',
      date: forDate || selectedDay,
      location: '',
      category: 'Sightseeing',
      plannedCost: 0,
      actualCost: 0,
      note: '',
      mapUrl: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (act: Activity) => {
    setEditingActivity(act);
    setFormData({ ...act });
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    if (editingActivity) {
      // Edit
      const updated = itinerary.map((a) =>
        a.id === editingActivity.id
          ? ({
              ...a,
              ...formData,
              title: formData.title!.trim(),
              location: formData.location?.trim() || '',
              date: formData.date || selectedDay,
              plannedCost: Number(formData.plannedCost) || 0,
              actualCost: Number(formData.actualCost) || 0
            } as Activity)
          : a
      );
      onSaveActivities(updated);
    } else {
      // Add new
      const newAct: Activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId: tripInfo.id,
        date: formData.date || selectedDay,
        time: formData.time || '10:00',
        title: formData.title!.trim(),
        location: formData.location?.trim() || '',
        category: (formData.category as ActivityCategory) || 'Sightseeing',
        plannedCost: Number(formData.plannedCost) || 0,
        actualCost: Number(formData.actualCost) || 0,
        note: formData.note?.trim() || '',
        mapUrl: formData.mapUrl?.trim() || '',
        order: itinerary.length + 1
      };
      onSaveActivities([...itinerary, newAct]);
    }
    setModalOpen(false);
  };

  const handleDuplicate = (act: Activity) => {
    const cloned: Activity = {
      ...act,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${act.title} (Copy)`,
      order: (act.order || 0) + 1
    };
    onSaveActivities([...itinerary, cloned]);
  };

  const handleMoveToDay = (activityId: string, newDate: string) => {
    const updated = itinerary.map((a) =>
      a.id === activityId ? { ...a, date: newDate } : a
    );
    onSaveActivities(updated);
  };

  const handleReorder = (currentDayActs: Activity[], fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= currentDayActs.length || toIndex >= currentDayActs.length) return;
    const reorderedInDay = [...currentDayActs];
    const [moved] = reorderedInDay.splice(fromIndex, 1);
    reorderedInDay.splice(toIndex, 0, moved);

    // Update global itinerary preserving non-day activities
    const otherActs = itinerary.filter((a) => a.date !== selectedDay);
    onSaveActivities([...otherActs, ...reorderedInDay]);
  };

  // Activities for selected day sorted by time or custom order
  const dayActivities = itinerary
    .filter((a) => a.date === selectedDay)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div id="itinerary-page" className="space-y-6 pb-16">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#C27D66]" />
            <span>Itinerary & Day Schedule</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
            Daily Wanderlust Plan
          </h2>
          <p className="text-xs text-[#735D4E] mt-1">
            Chronological itinerary crafted for unforgettable couple memories
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* View mode switcher */}
          <div className="flex items-center bg-[#FAF7F2] p-1 rounded-xl border border-[#E2D4C3] text-xs">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'day' ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] hover:bg-[#EFE8DE]'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'timeline' ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] hover:bg-[#EFE8DE]'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'all' ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] hover:bg-[#EFE8DE]'
              }`}
            >
              All Days
            </button>
          </div>

          {/* Add Activity Button */}
          <button
            id="itinerary-add-activity-btn"
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Days Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {daysList.map((dayStr, index) => {
          const isSelected = selectedDay === dayStr;
          const actsInDay = itinerary.filter((a) => a.date === dayStr);
          return (
            <button
              key={dayStr}
              id={`itinerary-day-tab-${dayStr}`}
              onClick={() => {
                setSelectedDay(dayStr);
                if (viewMode === 'all') setViewMode('day');
              }}
              className={`flex flex-col items-start px-4 py-3 rounded-2xl border text-left transition-all shrink-0 cursor-pointer min-w-[120px] ${
                isSelected
                  ? 'bg-[#5C4033] text-white border-[#5C4033] shadow-xs'
                  : 'bg-[#FFFDF9] hover:bg-[#FAF7F2] text-[#382D24] border-[#E8DEC8]'
              }`}
            >
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#EAE1D5]' : 'text-[#8C6D58]'}`}>
                DAY {index + 1}
              </span>
              <span className="font-serif text-sm font-bold mt-0.5 whitespace-nowrap">
                {formatDateVN(dayStr)}
              </span>
              <span className={`text-[10px] mt-1 ${isSelected ? 'text-[#D7C4B7]' : 'text-[#8C6D58]'}`}>
                {actsInDay.length} {actsInDay.length === 1 ? 'activity' : 'activities'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Itinerary Content */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-serif text-lg font-bold text-[#382D24] flex items-center gap-2">
              <span>Day {daysList.indexOf(selectedDay) + 1}: {formatDateVN(selectedDay)}</span>
              <span className="text-xs font-normal text-[#8C6D58]">({dayActivities.length} activities)</span>
            </h3>
            <button
              onClick={() => openAddModal(selectedDay)}
              className="text-xs font-medium text-[#6E4F36] hover:text-[#382D24] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to this day</span>
            </button>
          </div>

          {dayActivities.length === 0 ? (
            /* Empty State */
            <div id="itinerary-empty-state" className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#8C6D58] flex items-center justify-center mx-auto border border-[#E2D4C3]">
                <Compass className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h4 className="font-serif text-xl font-bold text-[#382D24]">
                No plans yet. Start adding your first activity.
              </h4>
              <p className="text-xs sm:text-sm text-[#735D4E] max-w-sm mx-auto">
                Schedule romantic breakfast spots, scenic strolls, museums, and candlelit dinners.
              </p>
              <button
                onClick={() => openAddModal(selectedDay)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayActivities.map((activity, idx) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={idx}
                  totalInDay={dayActivities.length}
                  availableDays={daysList}
                  onEdit={openEditModal}
                  onDelete={onRequestDeleteActivity}
                  onDuplicate={handleDuplicate}
                  onMoveUp={idx > 0 ? () => handleReorder(dayActivities, idx, idx - 1) : undefined}
                  onMoveDown={idx < dayActivities.length - 1 ? () => handleReorder(dayActivities, idx, idx + 1) : undefined}
                  onMoveToDay={handleMoveToDay}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div id="itinerary-timeline-view" className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-7 shadow-2xs">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0E6D8] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider bg-[#5C4033] text-white px-2.5 py-0.5 rounded-md">
                  Ngày {daysList.indexOf(selectedDay) + 1}
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#382D24]">
                  Dòng Thời Gian ({formatDateVN(selectedDay)})
                </h3>
              </div>
              <p className="text-xs text-[#8C6D58]">
                Lịch trình chi tiết • Nhấn vào hoạt động để sửa, đổi giờ trực tiếp hoặc dùng các nút điều chỉnh
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Day navigation arrows */}
              {daysList.length > 1 && (
                <div className="flex items-center bg-[#FAF7F2] border border-[#E2D4C3] rounded-xl p-0.5">
                  <button
                    type="button"
                    disabled={daysList.indexOf(selectedDay) <= 0}
                    onClick={() => {
                      const curIdx = daysList.indexOf(selectedDay);
                      if (curIdx > 0) setSelectedDay(daysList[curIdx - 1]);
                    }}
                    className="p-1.5 rounded-lg text-[#6E4F36] hover:bg-[#EFE8DE] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Ngày trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs px-2 font-medium text-[#6E4F36]">
                    {daysList.indexOf(selectedDay) + 1}/{daysList.length}
                  </span>
                  <button
                    type="button"
                    disabled={daysList.indexOf(selectedDay) >= daysList.length - 1}
                    onClick={() => {
                      const curIdx = daysList.indexOf(selectedDay);
                      if (curIdx < daysList.length - 1) setSelectedDay(daysList[curIdx + 1]);
                    }}
                    className="p-1.5 rounded-lg text-[#6E4F36] hover:bg-[#EFE8DE] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Ngày tiếp theo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => openAddModal(selectedDay)}
                className="px-3.5 py-2 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm hoạt động</span>
              </button>
            </div>
          </div>

          {dayActivities.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="w-8 h-8 text-[#A69585] mx-auto mb-2 opacity-60" />
              <p className="text-sm font-serif font-bold text-[#382D24] mb-1">
                Chưa có lịch trình cho ngày này
              </p>
              <p className="text-xs text-[#8C6D58] mb-4">
                Thêm điểm tham quan, quán ăn, quán cà phê hoặc khách sạn để hoàn thiện dòng thời gian
              </p>
              <button
                type="button"
                onClick={() => openAddModal(selectedDay)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5C4033] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm hoạt động đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-9 border-l-2 border-[#D9CABB] space-y-6 my-4 ml-3 sm:ml-4">
              {dayActivities.map((act, idx) => {
                const IconComponent = CATEGORY_ICONS[act.category];
                const catStyle = CATEGORY_STYLES[act.category] || {
                  bg: 'bg-[#FAF7F2]',
                  text: 'text-[#6E4F36]',
                  border: 'border-[#E2D4C3]'
                };
                const isEditingTime = editingTimeId === act.id;

                return (
                  <div key={act.id} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] sm:-left-[43px] top-4 w-4 h-4 rounded-full bg-[#FAF7F2] border-3 border-[#6E4F36] group-hover:scale-125 transition-transform" />

                    {/* Timeline Card */}
                    <div className="bg-[#FAF7F2] border border-[#E2D4C3] hover:border-[#C4B29E] rounded-2xl p-4 sm:p-5 transition-all hover:bg-[#FFFDF9] hover:shadow-xs">
                      {/* Top Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#EFE8DC]">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Time badge or inline editor */}
                          {isEditingTime ? (
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#8C6D58] shadow-2xs">
                              <input
                                type="time"
                                value={inlineTimeVal}
                                onChange={(e) => setInlineTimeVal(e.target.value)}
                                className="text-xs font-bold text-[#382D24] bg-transparent outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineTime(act.id)}
                                className="p-0.5 hover:bg-[#E3EFE5] text-[#2F6636] rounded cursor-pointer"
                                title="Lưu giờ"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTimeId(null)}
                                className="p-0.5 hover:bg-[#FBEBE8] text-[#B85340] rounded cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditingTime(act.id, act.time)}
                              title="Bấm để chỉnh sửa giờ nhanh"
                              className="font-bold text-xs bg-[#5C4033] hover:bg-[#483226] text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Clock className="w-3 h-3 text-[#EFE6DB]" />
                              <span>{act.time}</span>
                              <Edit3 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                            </button>
                          )}

                          {/* Category badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            {IconComponent && <IconComponent className="w-3 h-3" />}
                            <span>{act.category}</span>
                          </span>
                        </div>

                        {/* Cost badge */}
                        {(act.actualCost > 0 || act.plannedCost > 0) && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#382D24] bg-[#FFFDF9] px-2.5 py-1 rounded-lg border border-[#E8DEC8]">
                            <span className="text-[10px] text-[#2E6B38] bg-[#E8F2E8] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1" title="Đã tự động cập nhật vào Ngân sách">
                              <span>✓ Budget</span>
                            </span>
                            {act.actualCost > 0 ? (
                              <span>{act.actualCost.toLocaleString('vi-VN')} ₫</span>
                            ) : (
                              <span className="text-[#8C6D58] font-normal">
                                Dự kiến: {act.plannedCost.toLocaleString('vi-VN')} ₫
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Main Title - Clickable to open Edit modal */}
                      <div className="flex items-start justify-between gap-3 group/title">
                        <h4
                          onClick={() => openEditModal(act)}
                          className="font-serif text-base sm:text-lg font-bold text-[#382D24] hover:text-[#6E4F36] transition-colors cursor-pointer flex items-center gap-2"
                          title="Nhấn để chỉnh sửa chi tiết"
                        >
                          <span>{act.title}</span>
                          <Edit3 className="w-3.5 h-3.5 text-[#8C6D58] opacity-0 group-hover/title:opacity-100 transition-opacity" />
                        </h4>
                      </div>

                      {/* Location & Map Link */}
                      {act.location && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-[#735D4E]">
                          <MapPin className="w-3.5 h-3.5 text-[#8C6D58] shrink-0" />
                          <span className="truncate">{act.location}</span>
                          {act.mapUrl && (
                            <a
                              href={act.mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#3A5C7F] hover:underline flex items-center gap-0.5 ml-1 shrink-0"
                            >
                              <span>Bản đồ</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Note */}
                      {act.note && (
                        <p className="text-xs text-[#8C6D58] italic mt-2 bg-[#FFFDF9] p-2.5 rounded-xl border border-[#EDE4D6] leading-relaxed">
                          &ldquo;{act.note}&rdquo;
                        </p>
                      )}

                      {/* Timeline Adjustment Action Toolbar */}
                      <div className="mt-3.5 pt-3 border-t border-[#EFE8DC] flex flex-wrap items-center justify-between gap-2">
                        {/* Primary Edit Button */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditModal(act)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5C4033] hover:bg-[#483226] text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Chỉnh sửa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditingTime(act.id, act.time)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] text-xs font-medium transition-colors cursor-pointer"
                            title="Đổi giờ hoạt động"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Đổi giờ</span>
                          </button>

                          {/* Move to another day if more than 1 day */}
                          {daysList.length > 1 && (
                            <select
                              value={act.date}
                              onChange={(e) => handleMoveToDay(act.id, e.target.value)}
                              className="px-2 py-1 rounded-lg bg-[#FFFDF9] border border-[#E2D4C3] text-xs text-[#6E4F36] outline-none cursor-pointer"
                              title="Chuyển hoạt động sang ngày khác"
                            >
                              {daysList.map((d, dIdx) => (
                                <option key={d} value={d}>
                                  Sang Ngày {dIdx + 1} ({formatDateVN(d)})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Reorder and Delete Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleReorder(dayActivities, idx, idx - 1)}
                            className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            title="Di chuyển lên trước"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === dayActivities.length - 1}
                            onClick={() => handleReorder(dayActivities, idx, idx + 1)}
                            className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            title="Di chuyển xuống sau"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(act)}
                            className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] cursor-pointer transition-colors"
                            title="Nhân bản hoạt động này"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRequestDeleteActivity(act.id, act.title)}
                            className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#FBEBE8] text-[#B85340] border border-[#E2D4C3] hover:border-[#E9BFB7] cursor-pointer transition-colors ml-1"
                            title="Xóa khỏi lịch trình"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* All Days Overview */}
      {viewMode === 'all' && (
        <div className="space-y-8">
          {daysList.map((dayStr, dIndex) => {
            const acts = itinerary
              .filter((a) => a.date === dayStr)
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            return (
              <div key={dayStr} className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0E6D8]">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg font-bold text-[#382D24]">
                      Day {dIndex + 1}: {formatDateVN(dayStr)}
                    </span>
                    <span className="text-xs text-[#8C6D58]">({acts.length} activities)</span>
                  </div>
                  <button
                    onClick={() => openAddModal(dayStr)}
                    className="text-xs font-medium text-[#6E4F36] hover:text-[#382D24] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {acts.length === 0 ? (
                  <p className="text-xs text-[#8C6D58] italic py-2">No activities yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {acts.map((act, i) => (
                      <ActivityCard
                        key={act.id}
                        activity={act}
                        index={i}
                        totalInDay={acts.length}
                        availableDays={daysList}
                        onEdit={openEditModal}
                        onDelete={onRequestDeleteActivity}
                        onDuplicate={handleDuplicate}
                        onMoveToDay={handleMoveToDay}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Activity Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B1E16]/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-[#FAF7F2] border border-[#E8DEC8] rounded-3xl shadow-xl overflow-hidden p-6 text-[#3D312A] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8C6D58] hover:text-[#382D24] rounded-full hover:bg-[#EFE8DE] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-[#EAE2D5]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C6D58] font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C27D66]" />
                <span>{editingActivity ? 'Modify Stop' : 'Add New Activity'}</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingActivity ? editingActivity.title : 'Schedule An Adventure'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Day & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Date
                  </label>
                  <select
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  >
                    {daysList.map((d, i) => (
                      <option key={d} value={d}>
                        Day {i + 1} ({formatDateVN(d)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Time (HH:mm) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ben Thanh Market, Riverside dinner..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ActivityCategory })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  >
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Le Loi Street, District 1"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>
              </div>

              {/* Google Maps Link */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs text-[#382D24] focus:outline-none"
                />
              </div>

              {/* Planned & Actual Cost with Auto-Budget Sync Notice */}
              <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DEC8] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5C4033]">
                    Chi phí hoạt động (VND)
                  </span>
                  <span className="text-[10px] text-[#2E6B38] bg-[#EBF5EC] border border-[#CDE5D1] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2E6B38]" />
                    <span>Tự động cập nhật vào Budget</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6E4F36] mb-1">
                      Chi phí dự tính (VND)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={formData.plannedCost}
                      onChange={(e) => setFormData({ ...formData, plannedCost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6E4F36] mb-1">
                      Chi phí thực tế (VND)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={formData.actualCost}
                      onChange={(e) => setFormData({ ...formData, actualCost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none font-medium"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#8C6D58] leading-tight">
                  ⚡ Khi bạn nhập hoặc thay đổi chi phí ở đây, mục <strong>Ngân sách (Budget)</strong> sẽ tự động cập nhật ngay lập tức mà không cần phải nhập tay lại!
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Journal Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Try the iced drip coffee, take couple photo by the arch..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs text-[#382D24] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE2D5]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#735D4E] hover:bg-[#EFE8DE] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingActivity ? 'Save Changes' : 'Add Stop'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
