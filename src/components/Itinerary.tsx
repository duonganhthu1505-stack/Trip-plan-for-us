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
import { Activity, ActivityCategory, ServiceOption, TripInfo } from '../types';
import { ACTIVITY_CATEGORIES } from '../utils/constants';
import { formatDateVN, formatNumberWithDots, getDatesRange, parseNumberFromDots } from '../utils/dateHelpers';
import { ActivityCard, CATEGORY_ICONS, CATEGORY_STYLES, formatMapUrl } from './ActivityCard';
import { useLanguage } from '../i18n/LanguageContext';
import { ItineraryMap } from './ItineraryMap';

interface ItineraryProps {
  tripInfo: TripInfo;
  itinerary: Activity[];
  onSaveActivities: (activities: Activity[]) => void;
  onRequestDeleteActivity: (id: string, title: string) => void;
  onRequestDeleteMultipleActivities?: (ids: string[]) => void;
  chosenHotel?: ServiceOption;
}

export const Itinerary: React.FC<ItineraryProps> = ({
  tripInfo,
  itinerary,
  onSaveActivities,
  onRequestDeleteActivity,
  onRequestDeleteMultipleActivities,
  chosenHotel
}) => {
  const { t, lang } = useLanguage();

  // Determine trip days range
  const generatedDates = getDatesRange(tripInfo.startDate, tripInfo.endDate);
  // Also include any activity dates that might exist outside the current range
  const allExistingDates = Array.from(new Set([...generatedDates, ...itinerary.map((a) => a.date)]))
    .filter(Boolean)
    .sort();

  const daysList = allExistingDates.length > 0 ? allExistingDates : [tripInfo.startDate || '2026-09-02'];

  const [selectedDay, setSelectedDay] = useState<string>(daysList[0]);
  const [viewMode, setViewMode] = useState<'day' | 'timeline' | 'all'>('day');
  const [showMap, setShowMap] = useState<boolean>(true);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const handleToggleItemSelection = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (activitiesToSelect: Activity[]) => {
    if (selectedIds.length === activitiesToSelect.length && activitiesToSelect.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activitiesToSelect.map(i => i.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length > 0 && onRequestDeleteMultipleActivities) {
      onRequestDeleteMultipleActivities(selectedIds);
      setIsSelectionMode(false);
      setSelectedIds([]);
    }
  };

  return (
    <div id="itinerary-page" className="space-y-6 pb-16">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#C27D66]" />
            <span>{lang === 'vi' ? 'Lịch trình & Kế hoạch ngày' : 'Itinerary & Day Schedule'}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
            {lang === 'vi' ? 'Lịch trình khám phá' : 'Daily Wanderlust Plan'}
          </h2>
          <p className="text-xs text-[#735D4E] mt-1">
            {lang === 'vi'
              ? 'Lịch trình chi tiết theo từng ngày cho kỷ niệm đáng nhớ của hai người'
              : 'Chronological itinerary crafted for unforgettable couple memories'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* View mode switcher */}
          <div className="flex items-center bg-[#FAF7F2] p-1 rounded-xl border border-[#E2D4C3] text-xs">
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'day' ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] hover:bg-[#EFE8DE]'
              }`}
            >
              {t.itinerary.dayView}
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'timeline' ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] hover:bg-[#EFE8DE]'
              }`}
            >
              {t.itinerary.timeline}
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'all' ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] hover:bg-[#EFE8DE]'
              }`}
            >
              {t.itinerary.allDays}
            </button>
          </div>

          {/* Add Activity Button */}
          <button
            id="itinerary-add-activity-btn"
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.addActivity}</span>
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
                {lang === 'vi' ? `NGÀY ${index + 1}` : `DAY ${index + 1}`}
              </span>
              <span className="font-serif text-sm font-bold mt-0.5 whitespace-nowrap">
                {formatDateVN(dayStr)}
              </span>
              <span className={`text-[10px] mt-1 ${isSelected ? 'text-[#D7C4B7]' : 'text-[#8C6D58]'}`}>
                {actsInDay.length} {lang === 'vi' ? 'hoạt động' : actsInDay.length === 1 ? 'activity' : 'activities'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selection Toolbar */}
      <div className="flex items-center justify-between bg-[#FFFDF9] border border-[#E8DEC8] p-2.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSelectionMode}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer border ${
              isSelectionMode
                ? 'bg-[#EFE8DE] border-[#D9CABB] text-[#5C4033] hover:bg-[#E2D4C3]'
                : 'bg-[#FFFDF9] border-[#D9CABB] text-[#5C4033] hover:bg-[#EFE8DE]'
            }`}
          >
            {isSelectionMode ? t.actions.cancelSelection : t.actions.selectItems}
          </button>
          
          {isSelectionMode && (
            <button
              onClick={() => handleSelectAll(viewMode === 'all' ? itinerary : dayActivities)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer border border-[#D9CABB] text-[#5C4033] hover:bg-[#EFE8DE]"
            >
              {t.actions.selectAll}
            </button>
          )}

          {/* Toggle Map Button */}
          <button
            onClick={() => setShowMap(!showMap)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
              showMap
                ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                : 'bg-[#FFFDF9] border-[#D9CABB] text-[#5C4033] hover:bg-[#EFE8DE]'
            }`}
            title="Bật/Tắt bản đồ chỉ đường Google Maps"
          >
            <span>🗺️</span>
            <span>{showMap ? (lang === 'vi' ? 'Ẩn bản đồ' : 'Hide Map') : (lang === 'vi' ? 'Bản đồ Google' : 'Google Map')}</span>
          </button>
        </div>
        
        {isSelectionMode && selectedIds.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B85340] hover:bg-[#9E3E2D] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t.actions.deleteSelected} ({selectedIds.length})</span>
            <span className="sm:hidden">({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* Main Itinerary Content */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Authentic Google Maps Live Card */}
          {showMap && dayActivities.length > 0 && (
            <div className="mb-4">
              <ItineraryMap
                activities={dayActivities}
                selectedDay={selectedDay}
                dayIndex={daysList.indexOf(selectedDay) + 1}
                destination={tripInfo.destination}
              />
            </div>
          )}

          <div className="flex items-center justify-between px-2">
            <h3 className="font-serif text-lg font-bold text-[#382D24] flex items-center gap-2">
              <span>{lang === 'vi' ? `Ngày ${daysList.indexOf(selectedDay) + 1}` : `Day ${daysList.indexOf(selectedDay) + 1}`}: {formatDateVN(selectedDay)}</span>
              <span className="text-xs font-normal text-[#8C6D58]">({dayActivities.length} {lang === 'vi' ? 'hoạt động' : 'activities'})</span>
            </h3>
            <button
              onClick={() => openAddModal(selectedDay)}
              className="text-xs font-medium text-[#6E4F36] hover:text-[#382D24] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Thêm vào ngày này' : 'Add to this day'}</span>
            </button>
          </div>

          {dayActivities.length === 0 ? (
            /* Empty State */
            <div id="itinerary-empty-state" className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#8C6D58] flex items-center justify-center mx-auto border border-[#E2D4C3]">
                <Compass className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h4 className="font-serif text-xl font-bold text-[#382D24]">
                {t.itinerary.noActivities}
              </h4>
              <p className="text-xs sm:text-sm text-[#735D4E] max-w-sm mx-auto">
                {t.itinerary.startAdding}
              </p>
              <button
                onClick={() => openAddModal(selectedDay)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.actions.addActivity}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayActivities.map((activity, idx) => (
                <React.Fragment key={activity.id}>
                  {idx > 0 && (
                    <div className="flex items-center justify-center my-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E2D4C3] text-[11px] font-semibold text-[#8C6D58] shadow-2xs">
                        <span>🚗</span>
                        <span>Quãng đường xem trên bản đồ</span>
                      </div>
                    </div>
                  )}
                  <ActivityCard
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
                    isSelected={selectedIds.includes(activity.id)}
                    isSelectionMode={isSelectionMode}
                    onToggleSelect={handleToggleItemSelection}
                  />
                </React.Fragment>
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

                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                      <div className="absolute -left-[14px] top-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(act.id)}
                          onChange={() => handleToggleItemSelection(act.id)}
                          className="w-4 h-4 rounded border-[#D9CABB] text-[#5C4033] bg-white focus:ring-[#5C4033] cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Timeline Card */}
                    <div className={`bg-[#FAF7F2] border ${selectedIds.includes(act.id) ? 'border-[#E9BFB7] bg-[#F9DCD6]/30' : 'border-[#E2D4C3] hover:border-[#C4B29E]'} rounded-2xl p-4 sm:p-5 transition-all hover:bg-[#FFFDF9] hover:shadow-xs`}>
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
                            <span>{(t.categories as Record<string, string>)?.[act.category] || act.category}</span>
                          </span>
                        </div>

                        {/* Cost badge */}
                        {(act.actualCost > 0 || act.plannedCost > 0) && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#382D24] bg-[#FFFDF9] px-2.5 py-1 rounded-lg border border-[#E8DEC8]">
                            <span className="text-[10px] text-[#2E6B38] bg-[#E8F2E8] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1" title={lang === 'vi' ? 'Đã tự động cập nhật vào Ngân sách' : 'Auto-synced with Budget'}>
                              <span>✓ {lang === 'vi' ? 'Ngân sách' : 'Budget'}</span>
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

                      {/* Location & Google Map Button */}
                      {(act.location || act.mapUrl) && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                          {act.location && (
                            <div className="flex items-center gap-1.5 text-[#735D4E]">
                              <MapPin className="w-3.5 h-3.5 text-[#8C6D58] shrink-0" />
                              <span className="truncate max-w-[200px] sm:max-w-xs">{act.location}</span>
                            </div>
                          )}
                          {act.mapUrl && (
                            <a
                              id={`timeline-map-btn-${act.id}`}
                              href={formatMapUrl(act.mapUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EBF3FE] hover:bg-[#D7E7FD] text-[#1A73E8] border border-[#C5DCFA] text-xs font-semibold shadow-2xs transition-colors cursor-pointer group/map shrink-0"
                              title={lang === 'vi' ? 'Tra vị trí trên Google Maps (mở tab mới)' : 'Open in Google Maps'}
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#1A73E8] group-hover/map:scale-110 transition-transform" />
                              <span>{lang === 'vi' ? 'Tra Google Map' : 'Google Maps'}</span>
                              <ExternalLink className="w-3 h-3 text-[#1A73E8]/80" />
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
                      {lang === 'vi' ? `Ngày ${dIndex + 1}` : `Day ${dIndex + 1}`}: {formatDateVN(dayStr)}
                    </span>
                    <span className="text-xs text-[#8C6D58]">({acts.length} {lang === 'vi' ? 'hoạt động' : 'activities'})</span>
                  </div>
                  <button
                    onClick={() => openAddModal(dayStr)}
                    className="text-xs font-medium text-[#6E4F36] hover:text-[#382D24] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.common.add}</span>
                  </button>
                </div>

                {acts.length === 0 ? (
                  <p className="text-xs text-[#8C6D58] italic py-2">
                    {lang === 'vi' ? 'Chưa có hoạt động nào.' : 'No activities yet.'}
                  </p>
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
                        isSelected={selectedIds.includes(act.id)}
                        isSelectionMode={isSelectionMode}
                        onToggleSelect={handleToggleItemSelection}
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
                <span>
                  {editingActivity
                    ? lang === 'vi'
                      ? 'Chỉnh sửa hoạt động'
                      : 'Modify Stop'
                    : lang === 'vi'
                    ? 'Thêm hoạt động mới'
                    : 'Add New Activity'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingActivity
                  ? editingActivity.title
                  : lang === 'vi'
                  ? 'Lên lịch trình'
                  : 'Schedule An Adventure'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Day & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Ngày' : 'Date'}
                  </label>
                  <select
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  >
                    {daysList.map((d, i) => (
                      <option key={d} value={d}>
                        {lang === 'vi' ? `Ngày ${i + 1} (${formatDateVN(d)})` : `Day ${i + 1} (${d})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Thời gian (Giờ:Phút) *' : 'Time (HH:mm) *'}
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

              {/* Chosen Hotel Auto-fill Suggestion Chip */}
              {chosenHotel && (
                <div className="bg-[#FFF8EC] border border-[#F1DAAB] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="text-xs">
                    <div className="font-bold text-[#B45309] flex items-center gap-1.5">
                      <span>🏨 Gợi ý từ Dịch vụ đã chốt:</span>
                      <span className="font-serif">{chosenHotel.name}</span>
                    </div>
                    <div className="text-[11px] text-[#735D4E] mt-0.5">
                      {chosenHotel.distanceToCenter || chosenHotel.address}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        title: `Check-in: ${chosenHotel.name}`,
                        location: chosenHotel.address || chosenHotel.distanceToCenter || '',
                        category: 'Hotel',
                        plannedCost: chosenHotel.pricePerUnit || formData.plannedCost || 0
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold shrink-0 cursor-pointer transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <span>Áp dụng khách sạn này</span>
                    <span>↵</span>
                  </button>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Tên hoạt động *' : 'Activity Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    lang === 'vi'
                      ? 'VD: Ăn sáng Phở Bát Đàn, Check-in phố cổ, Ăn tối lãng mạn...'
                      : 'e.g. Ben Thanh Market, Riverside dinner...'
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Phân loại' : 'Category'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value as ActivityCategory;
                      let nextTitle = formData.title;
                      let nextLoc = formData.location;
                      let nextCost = formData.plannedCost;
                      if (newCat === 'Hotel' && chosenHotel) {
                        if (!nextTitle || nextTitle.trim() === '') {
                          nextTitle = `Check-in: ${chosenHotel.name}`;
                        }
                        if (!nextLoc || nextLoc.trim() === '') {
                          nextLoc = chosenHotel.address || chosenHotel.distanceToCenter || '';
                        }
                        if (!nextCost && chosenHotel.pricePerUnit) {
                          nextCost = chosenHotel.pricePerUnit;
                        }
                      }
                      setFormData({
                        ...formData,
                        category: newCat,
                        title: nextTitle,
                        location: nextLoc,
                        plannedCost: nextCost
                      });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  >
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {(t.categories as Record<string, string>)?.[cat.value] || cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Địa điểm' : 'Location'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'vi' ? 'VD: 49 Bát Đàn, Quận Hoàn Kiếm' : 'e.g. Le Loi Street, District 1'}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>
              </div>

              {/* Google Maps Link & Quick Search / Test */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36]">
                    {lang === 'vi' ? 'Đường dẫn Google Maps (tùy chọn)' : 'Google Maps Link (Optional)'}
                  </label>
                  {formData.mapUrl ? (
                    <a
                      href={formatMapUrl(formData.mapUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#1A73E8] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{lang === 'vi' ? 'Mở thử link' : 'Test Link'}</span>
                    </a>
                  ) : (formData.location || formData.title) ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((formData.location ? `${formData.location}, ` : '') + (formData.title || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#1A73E8] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                      title={lang === 'vi' ? 'Tìm địa điểm này trên Google Maps để sao chép link' : 'Search place on Google Maps'}
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{lang === 'vi' ? 'Tìm trên Maps để lấy link' : 'Search on Maps'}</span>
                    </a>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    placeholder={
                      lang === 'vi'
                        ? 'Dán link Google Maps (VD: https://maps.app.goo.gl/...)'
                        : 'Paste Google Maps link (e.g. https://maps.app.goo.gl/...)'
                    }
                    value={formData.mapUrl}
                    onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none focus:border-[#5C4033]"
                  />
                </div>
                <p className="text-[11px] text-[#8C6D58]">
                  {lang === 'vi'
                    ? '💡 Khi gắn link, thẻ hoạt động sẽ hiển thị nút "Tra Google Map" để bấm nhảy thẳng sang bản đồ.'
                    : '💡 When linked, this activity will show a "Tra Google Map" button to quickly navigate on maps.'}
                </p>
              </div>

              {/* Planned & Actual Cost with Auto-Budget Sync Notice */}
              <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DEC8] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5C4033]">
                    {lang === 'vi' ? 'Chi phí hoạt động (VND)' : 'Activity Cost (VND)'}
                  </span>
                  <span className="text-[10px] text-[#2E6B38] bg-[#EBF5EC] border border-[#CDE5D1] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2E6B38]" />
                    <span>{lang === 'vi' ? 'Tự động cập nhật vào Budget' : 'Auto-synced with Budget'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'Chi phí dự tính (VND)' : 'Planned Cost (VND)'}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={lang === 'vi' ? 'VD: 1.000.000' : 'e.g. 1,000,000'}
                      value={formatNumberWithDots(formData.plannedCost)}
                      onChange={(e) => {
                        const num = parseNumberFromDots(e.target.value);
                        setFormData({ ...formData, plannedCost: num });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'Chi phí thực tế (VND)' : 'Actual Cost (VND)'}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={lang === 'vi' ? 'VD: 1.000.000' : 'e.g. 1,000,000'}
                      value={formatNumberWithDots(formData.actualCost)}
                      onChange={(e) => {
                        const num = parseNumberFromDots(e.target.value);
                        setFormData({ ...formData, actualCost: num });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none font-medium"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#8C6D58] leading-tight">
                  {lang === 'vi' ? (
                    <>
                      ⚡ Khi bạn nhập hoặc thay đổi chi phí ở đây, mục <strong>Ngân sách (Budget)</strong> sẽ tự động cập nhật ngay lập tức mà không cần phải nhập tay lại!
                    </>
                  ) : (
                    <>
                      ⚡ Entering or updating costs here will automatically synchronize with your <strong>Budget</strong> in real time!
                    </>
                  )}
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Ghi chú / Mẹo nhỏ' : 'Journal Note'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    lang === 'vi'
                      ? 'VD: Thử cà phê trứng, góc chụp ảnh đẹp ở ban công...'
                      : 'e.g. Try the iced drip coffee, take couple photo by the arch...'
                  }
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
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {editingActivity
                      ? lang === 'vi'
                        ? 'Lưu thay đổi'
                        : 'Save Changes'
                      : lang === 'vi'
                      ? 'Thêm hoạt động'
                      : 'Add Stop'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
