import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  AlertCircle,
  Copy,
  Trash2,
  Edit3,
  Eye,
  Plus,
  Heart,
  Users,
  Car,
  Image as ImageIcon,
  Camera,
  ChevronRight,
  Maximize2,
  Download,
  X,
  ChevronLeft,
  PieChart,
  FileText,
  Sparkles,
  ArrowUpRight,
  ArrowLeft,
  Compass,
  Search,
  CheckSquare,
  Plane,
  MoreVertical
} from 'lucide-react';
import { TripBundle, JournalNote } from '../types';
import { calculateDurationDays, formatCurrency, formatDateVN, getDaysUntilTrip } from '../utils/dateHelpers';
import { ActiveTab } from './Navigation';
import { useLanguage } from '../i18n/LanguageContext';
import { getNoteCategoryLabel } from './Notes';

const getTripStatusLabel = (status: string, lang: string) => {
  if (lang !== 'vi') return status;
  switch (status) {
    case 'Ongoing':
      return 'Đang diễn ra';
    case 'Upcoming':
      return 'Sắp tới';
    case 'Completed':
      return 'Đã hoàn thành';
    case 'Draft':
      return 'Bản nháp';
    default:
      return status;
  }
};

const getBudgetCategoryName = (category: string, lang: string) => {
  if (lang !== 'vi') return category;
  switch (category) {
    case 'Accommodation': return 'Khách sạn / Lưu trú';
    case 'Transport': return 'Vé máy bay / Di chuyển';
    case 'Food': return 'Ăn uống / Nhà hàng';
    case 'Activities': return 'Vé tham quan / Vui chơi';
    case 'Shopping': return 'Mua sắm / Quà lưu niệm';
    case 'Other': return 'Chi phí khác';
    default: return category;
  }
};

interface TripOverviewProps {
  currentTripBundle: TripBundle;
  allTrips: Record<string, TripBundle>;
  onSelectTrip: (tripId: string) => void;
  onEditTrip: (tripId: string) => void;
  onDuplicateTrip: (tripId: string) => void;
  onRequestDeleteTrip: (tripId: string, tripName: string) => void;
  onNewTrip: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const TripOverview: React.FC<TripOverviewProps> = ({
  currentTripBundle,
  allTrips,
  onSelectTrip,
  onEditTrip,
  onDuplicateTrip,
  onRequestDeleteTrip,
  onNewTrip,
  onNavigateTab
}) => {
  const { lang, t } = useLanguage();

  // State to determine if we are viewing a specific trip's detail screen (Dashboard + Summary + Photos)
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lightbox State for photo viewing
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    title: string;
    images: string[];
    currentIndex: number;
  }>({
    isOpen: false,
    title: '',
    images: [],
    currentIndex: 0
  });

  const activeTripBundle = viewingTripId && allTrips[viewingTripId] 
    ? allTrips[viewingTripId] 
    : currentTripBundle;

  const { tripInfo, itinerary, budget, places, checklist, notes = [] } = activeTripBundle;

  // Calculate metrics for the active viewed trip
  const duration = calculateDurationDays(tripInfo.startDate, tripInfo.endDate);
  const daysUntil = getDaysUntilTrip(tripInfo.startDate);

  // Budget calculations
  const totalPlanned = budget.reduce((sum, item) => sum + (item.plannedCost || 0) * (item.quantity || 1), 0);
  const totalActual = budget.reduce((sum, item) => sum + (item.actualCost || 0) * (item.quantity || 1), 0);
  const budgetRemaining = totalPlanned - totalActual;
  const isBudgetExceeded = totalActual > totalPlanned && totalPlanned > 0;
  const spentPercent = totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 0;

  // Category breakdown for budget dashboard
  const categoriesList = ['Accommodation', 'Transport', 'Food', 'Activities', 'Shopping', 'Other'];
  const categoryStats = categoriesList.map((cat) => {
    const items = budget.filter((b) => b.category === cat);
    const planned = items.reduce((sum, i) => sum + (i.plannedCost || 0) * (i.quantity || 1), 0);
    const actual = items.reduce((sum, i) => sum + (i.actualCost || 0) * (i.quantity || 1), 0);
    return {
      category: cat,
      planned,
      actual,
      count: items.length
    };
  }).filter((stat) => stat.planned > 0 || stat.actual > 0);

  // Other metrics
  const activitiesCount = itinerary.length;
  const placesCount = places.length;
  const visitedCount = places.filter((p) => p.status === 'Visited').length;
  const checklistTotal = checklist.length;
  const checklistDone = checklist.filter((c) => c.completed).length;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  // All trip photos fetched from journal notes of this trip
  const tripPhotos = notes.flatMap((note) =>
    (note.images || []).map((img, idx) => ({
      img,
      noteId: note.id,
      noteTitle: note.title,
      category: note.category,
      updatedAt: note.updatedAt,
      index: idx
    }))
  );

  // Display order only: newest trip start date first, undated trips last.
  const startTime = (value?: string): number | null => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = new Date(trimmed).getTime();
    if (!Number.isNaN(direct)) return direct;
    const yearMatch = trimmed.match(/(\d{4})/);
    if (!yearMatch) return null;
    const fallback = new Date(`${yearMatch[1]}-01-01`).getTime();
    return Number.isNaN(fallback) ? null : fallback;
  };

  const tripsList = (Object.values(allTrips) as TripBundle[]).sort((a, b) => {
    const aTime = startTime(a.tripInfo.startDate);
    const bTime = startTime(b.tripInfo.startDate);
    if (aTime === null && bTime === null) {
      return (b.tripInfo.createdAt || '').localeCompare(a.tripInfo.createdAt || '');
    }
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });

  const filteredTripsList = tripsList.filter((b) => {
    const matchesStatus = statusFilter === 'ALL' || b.tripInfo.status === statusFilter;
    const matchesSearch = !searchQuery.trim() || 
      b.tripInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.tripInfo.destination && b.tripInfo.destination.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const featuredTrip = (() => {
    const ongoing = tripsList.find((b) => b.tripInfo.status === 'Ongoing');
    if (ongoing) return ongoing;
    const upcoming = tripsList
      .filter((b) => b.tripInfo.status === 'Upcoming')
      .sort((a, b) =>
        (a.tripInfo.startDate || '9999-12-31').localeCompare(b.tripInfo.startDate || '9999-12-31')
      );
    return upcoming[0] || null;
  })();

  const handleOpenTripDetail = (tripId: string) => {
    onSelectTrip(tripId);
    setViewingTripId(tripId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToTripsList = () => {
    setViewingTripId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLightbox = (title: string, images: string[], startIndex: number = 0) => {
    if (!images || images.length === 0) return;
    setLightbox({
      isOpen: true,
      title,
      images,
      currentIndex: startIndex
    });
  };

  const closeLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  };

  const nextLightboxImage = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  };

  const prevLightboxImage = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  };

  // ==========================================
  // VIEW 1: DEDICATED TRIP DETAIL SCREEN
  // (Opened ONLY when user clicks "Xem chuyến đi")
  // Contains: Dashboard, Tóm tắt chuyến đi, Kho ảnh kỷ niệm lấy từ nhật ký
  // ==========================================
  if (viewingTripId !== null) {
    return (
      <div id="trip-detail-screen" className="space-y-7 pb-14 animate-in fade-in">
        {/* Navigation Bar: Back button & Trip Quick Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-4 shadow-2xs">
          <button
            id="back-to-trips-btn"
            onClick={handleBackToTripsList}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F0E6D8] border border-[#D9CABB] text-[#5C4033] text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#8C6D58]" />
            <span>{lang === 'vi' ? 'Quay lại danh sách chuyến đi' : 'Back to Trips List'}</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onEditTrip(tripInfo.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] border border-[#D9CABB] text-[#5C4033] text-xs font-medium transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#8C6D58]" />
              <span>{lang === 'vi' ? 'Chỉnh sửa' : 'Edit'}</span>
            </button>

            <button
              onClick={() => onDuplicateTrip(tripInfo.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] border border-[#D9CABB] text-[#5C4033] text-xs font-medium transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#8C6D58]" />
              <span>{lang === 'vi' ? 'Nhân bản' : 'Duplicate'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('itinerary')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Mở lịch trình' : 'Open Itinerary'}</span>
            </button>
          </div>
        </div>

        {/* 1. TÓM TẮT CHUYẾN ĐI (Trip Summary Hero Card) */}
        <div
          id="trip-summary-hero"
          className="relative bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl overflow-hidden shadow-sm"
        >
          {/* Cover Photo Banner */}
          <div className="h-56 sm:h-64 lg:h-72 w-full relative overflow-hidden bg-[#EAE1D5]">
            {tripInfo.coverImage ? (
              <img
                src={tripInfo.coverImage}
                alt={tripInfo.name}
                className="w-full h-full object-cover brightness-[0.92] contrast-[1.03] transition-transform duration-700 hover:scale-102"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#EFE8DE] text-[#A68972]">
                <MapPin className="w-12 h-12 stroke-[1.25]" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E16]/85 via-[#2B1E16]/35 to-transparent" />

            {/* Top floating status badges */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                  tripInfo.status === 'Ongoing'
                    ? 'bg-[#2E6B38]/90 text-white'
                    : tripInfo.status === 'Upcoming'
                    ? 'bg-[#31577E]/90 text-white'
                    : tripInfo.status === 'Completed'
                    ? 'bg-[#5C4033]/90 text-white'
                    : 'bg-[#9C6644]/90 text-white'
                }`}
              >
                {getTripStatusLabel(tripInfo.status, lang)}
              </span>
              {daysUntil !== null && tripInfo.status === 'Upcoming' && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FFFDF9]/90 text-[#382D24] backdrop-blur-md shadow-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8C6D58]" />
                  {daysUntil === 0
                    ? lang === 'vi'
                      ? 'Khởi hành hôm nay!'
                      : 'Leaves today!'
                    : daysUntil > 0
                    ? lang === 'vi'
                      ? `Còn ${daysUntil} ngày nữa`
                      : `${daysUntil} days to go`
                    : lang === 'vi'
                    ? 'Đã qua'
                    : 'Past date'}
                </span>
              )}
            </div>

            {/* Bottom Title on Cover */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-[#FAF7F2]">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#EAE1D5] mb-1 font-medium">
                <MapPin className="w-4 h-4 text-[#D7C4B7]" />
                <span>{tripInfo.destination || (lang === 'vi' ? 'Chưa xác định điểm đến' : 'Unspecified destination')}</span>
                {tripInfo.travelers && (
                  <>
                    <span>•</span>
                    <Users className="w-3.5 h-3.5 text-[#D7C4B7]" />
                    <span>
                      {tripInfo.travelers}{' '}
                      {tripInfo.travelers === 2
                        ? lang === 'vi'
                          ? 'người (Cặp đôi)'
                          : 'travelers (Couple)'
                        : lang === 'vi'
                        ? 'người'
                        : 'travelers'}
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                {tripInfo.name}
              </h1>
            </div>
          </div>

          {/* Travel Journal Details Bar */}
          <div className="p-5 sm:p-6 bg-[#FFFDF9]">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#F0E6D8]">
              {/* Dates & Duration */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] flex items-center justify-center text-[#6E4F36]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[#8C6D58] uppercase tracking-wider font-semibold">
                    {lang === 'vi' ? 'Thời gian hành trình' : 'Travel Dates'}
                  </p>
                  <p className="text-sm sm:text-base font-medium text-[#382D24]">
                    {formatDateVN(tripInfo.startDate)}
                    {tripInfo.endDate && tripInfo.endDate !== tripInfo.startDate ? ` – ${formatDateVN(tripInfo.endDate)}` : ''}
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#EFE8DE] text-[#6E4F36] font-semibold">
                      {duration} {lang === 'vi' ? 'ngày' : duration === 1 ? 'day' : 'days'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Hotel & Transport */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E4F36]">
                {tripInfo.hotel && (
                  <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E8DEC8]">
                    <span className="font-medium text-[#8C6D58]">{lang === 'vi' ? 'Khách sạn:' : 'Hotel:'}</span>
                    <span className="text-[#382D24] font-semibold truncate max-w-[200px]">{tripInfo.hotel}</span>
                  </div>
                )}
                {tripInfo.transport && (
                  <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E8DEC8]">
                    <Car className="w-3.5 h-3.5 text-[#8C6D58]" />
                    <span className="text-[#382D24] font-medium">{tripInfo.transport}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Couple Note / Journal Quote */}
            {tripInfo.notes && (
              <div className="my-4 p-3.5 rounded-xl bg-[#FAF7F2] border-l-3 border-[#8C6D58] text-xs sm:text-sm text-[#6E4F36] italic leading-relaxed">
                &ldquo;{tripInfo.notes}&rdquo;
              </div>
            )}

            {/* 4 Navigation / Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
              {/* Planned Budget */}
              <div
                onClick={() => onNavigateTab('budget')}
                className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {lang === 'vi' ? 'Dự toán' : 'Planned'}
                  </span>
                  <DollarSign className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-serif text-lg sm:text-xl font-bold text-[#382D24]">
                  {formatCurrency(totalPlanned)}
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  {budget.length} {lang === 'vi' ? 'khoản dự toán' : 'budgeted items'}
                </p>
              </div>

              {/* Actual Cost */}
              <div
                onClick={() => onNavigateTab('budget')}
                className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {lang === 'vi' ? 'Thực chi' : 'Actual Spent'}
                  </span>
                  <TrendingUp className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
                </div>
                <p className={`font-serif text-lg sm:text-xl font-bold ${isBudgetExceeded ? 'text-[#B85340]' : 'text-[#382D24]'}`}>
                  {formatCurrency(totalActual)}
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  {isBudgetExceeded ? (
                    <span className="text-[#B85340] font-medium flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> {lang === 'vi' ? 'Vượt dự kiến!' : 'Over budget!'}
                    </span>
                  ) : (
                    <span>
                      {lang === 'vi' ? 'Còn lại: ' : 'Left: '}{formatCurrency(budgetRemaining)}
                    </span>
                  )}
                </p>
              </div>

              {/* Itinerary Activities */}
              <div
                onClick={() => onNavigateTab('itinerary')}
                className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {lang === 'vi' ? 'Lịch trình' : 'Itinerary'}
                  </span>
                  <ListTodo className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-serif text-lg sm:text-xl font-bold text-[#382D24]">
                  {activitiesCount} {lang === 'vi' ? 'hoạt động' : 'activities'}
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  {lang === 'vi' ? 'Xem dòng thời gian' : 'View timeline'}
                </p>
              </div>

              {/* Photos & Journal Count */}
              <div
                onClick={() => onNavigateTab('notes')}
                className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {lang === 'vi' ? 'Ảnh & Nhật ký' : 'Photos & Journal'}
                  </span>
                  <ImageIcon className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-serif text-lg sm:text-xl font-bold text-[#382D24]">
                  {tripPhotos.length} {lang === 'vi' ? 'ảnh' : 'photos'}
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  {notes.length} {lang === 'vi' ? 'bài viết nhật ký' : 'journal entries'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MỤC DASHBOARD NGÂN SÁCH (Chỉ xuất hiện khi bấm Xem chuyến đi) */}
        <div id="trip-budget-dashboard" className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0E6D8]">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-0.5">
                <PieChart className="w-3.5 h-3.5 text-[#C27D66]" />
                <span>{lang === 'vi' ? 'Dashboard Ngân Sách' : 'Budget Dashboard'}</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#382D24]">
                {lang === 'vi' ? 'Tổng quan thu chi chuyến đi' : 'Trip Spending Overview'}
              </h3>
            </div>

            <button
              onClick={() => onNavigateTab('budget')}
              className="flex items-center gap-1 text-xs font-semibold text-[#5C4033] hover:underline self-start sm:self-center cursor-pointer"
            >
              <span>{lang === 'vi' ? 'Xem chi tiết bảng ngân sách' : 'View Full Budget'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar & Spending Health */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-[#6E4F36] font-medium">
                {lang === 'vi' ? 'Tiến độ chi tiêu:' : 'Spending Progress:'}{' '}
                <strong className="text-[#382D24]">{spentPercent}%</strong>
              </span>
              <span className="text-xs text-[#8C6D58]">
                {formatCurrency(totalActual)} / {formatCurrency(totalPlanned)}
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-3 rounded-full bg-[#EAE1D5] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isBudgetExceeded ? 'bg-[#B85340]' : 'bg-[#5C4033]'
                }`}
                style={{ width: `${Math.min(100, spentPercent)}%` }}
              />
            </div>
          </div>

          {/* Category Breakdown list */}
          {categoryStats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {categoryStats.map((cat) => {
                const catPercent = cat.planned > 0 ? Math.round((cat.actual / cat.planned) * 100) : 100;
                return (
                  <div
                    key={cat.category}
                    className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#382D24]">
                      <span>{getBudgetCategoryName(cat.category, lang)}</span>
                      <span className="text-[#8C6D58] font-mono">{cat.count} mục</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6E4F36] font-medium">{formatCurrency(cat.actual)}</span>
                      <span className="text-[#8C6D58]">{lang === 'vi' ? 'Dự toán: ' : 'Plan: '}{formatCurrency(cat.planned)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#E5D7C5] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.actual > cat.planned && cat.planned > 0 ? 'bg-[#B85340]' : 'bg-[#8C6D58]'
                        }`}
                        style={{ width: `${Math.min(100, catPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#8C6D58] italic">
              {lang === 'vi' ? 'Chưa có khoản chi tiêu nào được thêm vào ngân sách.' : 'No budget items added yet.'}
            </p>
          )}
        </div>

        {/* 3. KHO ẢNH KỶ NIỆM (LẤY DỮ LIỆU TỪ MỤC NHẬT KÝ CỦA CHUYẾN ĐI NÀY) */}
        <div id="trip-journal-photos-section" className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0E6D8]">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-0.5">
                <Camera className="w-3.5 h-3.5 text-[#C27D66]" />
                <span>{lang === 'vi' ? 'Kho ảnh kỷ niệm (Lấy từ Nhật ký)' : 'Photo Memories (From Journal)'}</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#382D24]">
                {lang === 'vi' ? 'Album ảnh kỷ niệm hành trình' : 'Trip Photo Gallery'}
              </h3>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => onNavigateTab('notes')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Đăng ảnh / Viết nhật ký mới' : 'Add Photo / Journal'}</span>
              </button>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          {tripPhotos.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tripPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => openLightbox(photo.noteTitle, tripPhotos.map(p => p.img), idx)}
                    className="group relative aspect-4/3 rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#E2D4C3] cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300"
                  >
                    <img
                      src={photo.img}
                      alt={photo.noteTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E16]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5 text-white">
                      <div className="self-end p-1 rounded-md bg-black/40 backdrop-blur-2xs">
                        <Maximize2 className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold truncate drop-shadow-sm">{photo.noteTitle}</p>
                        <p className="text-[9px] text-stone-300">{getNoteCategoryLabel(photo.category, lang)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#FAF7F2] border border-dashed border-[#D9CABB] rounded-2xl p-6 text-center space-y-2">
              <ImageIcon className="w-10 h-10 text-[#8C6D58] mx-auto stroke-[1.5]" />
              <p className="text-xs font-medium text-[#6E4F36]">
                {lang === 'vi'
                  ? 'Chưa có ảnh nào được lưu trong mục Nhật ký cho chuyến đi này.'
                  : 'No photos recorded in the Journal for this trip yet.'}
              </p>
              <button
                onClick={() => onNavigateTab('notes')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5C4033] text-white text-xs font-medium hover:bg-[#483226] transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Vào mục Nhật ký để tải ảnh' : 'Go to Journal to upload'}</span>
              </button>
            </div>
          )}

          {/* Recent Journal Notes Preview */}
          {notes.length > 0 && (
            <div className="pt-3 border-t border-[#F0E6D8]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C6D58] mb-2.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#C27D66]" />
                <span>{lang === 'vi' ? 'Các ghi chép nhật ký gần đây' : 'Recent Journal Notes'}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notes.slice(0, 2).map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onNavigateTab('notes')}
                    className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-all cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#6E4F36]">{getNoteCategoryLabel(note.category, lang)}</span>
                      <span className="text-[#8C6D58]">{formatDateVN(note.updatedAt?.slice(0, 10))}</span>
                    </div>
                    <h5 className="font-serif font-bold text-sm text-[#382D24] truncate group-hover:text-[#5C4033]">
                      {note.title}
                    </h5>
                    <p className="text-xs text-[#735D4E] line-clamp-2 leading-relaxed">
                      {note.content}
                    </p>
                    {note.images && note.images.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#8C6D58] font-medium">
                        <ImageIcon className="w-3 h-3 text-[#B07D62]" />
                        <span>{note.images.length} {lang === 'vi' ? 'ảnh đính kèm' : 'attached photos'}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Photo Lightbox Modal */}
        {lightbox.isOpen && lightbox.images.length > 0 && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in"
            onClick={closeLightbox}
          >
            <div 
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar */}
              <div className="w-full flex items-center justify-between text-white pb-3 px-2">
                <div className="truncate pr-4">
                  <span className="text-xs text-stone-400 block">{lightbox.title || tripInfo.name}</span>
                  <span className="text-sm font-semibold">
                    {lang === 'vi' ? 'Ảnh' : 'Photo'} {lightbox.currentIndex + 1} / {lightbox.images.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={lightbox.images[lightbox.currentIndex]}
                    download={`trip-photo-${lightbox.currentIndex + 1}.jpg`}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title={lang === 'vi' ? 'Tải ảnh xuống' : 'Download photo'}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={closeLightbox}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Image */}
              <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-white/10">
                <img
                  src={lightbox.images[lightbox.currentIndex]}
                  alt="Trip photo full size"
                  className="max-h-[75vh] max-w-full object-contain select-none"
                  referrerPolicy="no-referrer"
                />

                {/* Prev / Next controls */}
                {lightbox.images.length > 1 && (
                  <>
                    <button
                      onClick={prevLightboxImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextLightboxImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: TRIPS LIST OVERVIEW
  // (Main list of trips where user can select, manage, and click "Xem chuyến đi")
  // ==========================================

// ---------- helpers for the redesigned trips list ----------
function destCode(name?: string): string {
  const s = (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!s) return '•••';
  return s.slice(0, 3);
}

const STAMP_STYLE: Record<string, string> = {
  Ongoing: 'border-[#2E6B38] text-[#2E6B38]',
  Upcoming: 'border-[#31577E] text-[#31577E]',
  Completed: 'border-[#5C4033] text-[#5C4033]',
  Draft: 'border-[#9C6644] text-[#9C6644]'
};

// ==========================================
// VIEW 2: REDESIGNED TRIPS LIST (mobile + desktop)
// Journal-cover header + featured boarding pass +
// perforated ticket cards on a dotted journey
// ==========================================
return (
  <div id="trips-overview-main" className="space-y-6 pb-12">
    {/* ===== Journal-cover header with featured boarding pass ===== */}
    <section
      id="trips-journal-header"
      className="relative overflow-hidden rounded-3xl border border-[#E8DEC8] bg-[#FFFDF9] shadow-2xs"
    >
      <div className="relative bg-[#B9AA9B] px-5 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10">
        {/* dotted route + plane + heart deco (E1 icon language) */}
        <svg
          className="absolute right-0 top-0 w-[340px] sm:w-[460px] h-full opacity-60 pointer-events-none"
          viewBox="0 0 460 200"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M18 178 C120 158 138 84 248 72 C338 62 352 34 428 26"
            stroke="#55423A"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="0.1 17"
          />
          <path
            transform="translate(252 70) rotate(82) scale(0.34) translate(-50 -50)"
            fill="#55423A"
            d="M50 2 C55 2 58 9 58 18 L58 36 L94 58 L94 68 L58 56 L58 76 L72 88 L72 96 L50 90 L28 96 L28 88 L42 76 L42 56 L6 68 L6 58 L42 36 L42 18 C42 9 45 2 50 2 Z"
          />
          <path
            transform="translate(430 26) scale(0.55)"
            fill="#C4685A"
            d="M0 40 C0 40 -42 10 -42 -16 C-42 -31 -31 -40 -20 -40 C-11 -40 -4 -35 0 -28 C4 -35 11 -40 20 -40 C31 -40 42 -31 42 -16 C42 10 0 40 0 40 Z"
          />
          <path d="M64 44 v20 M54 54 h20" stroke="#55423A" strokeWidth="5" strokeLinecap="round" />
        </svg>

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
          {/* Intro copy */}
          <div className="max-w-xl">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#55423A] font-bold mb-1.5">
              <Compass className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Sổ tay hành trình đôi' : 'Our Couple Travel Journal'}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#FFFDF9] drop-shadow-sm flex items-center gap-2">
              <span>{lang === 'vi' ? 'Hộp kỷ niệm & Các chuyến đi' : 'Journeys & Memory Chest'}</span>
              <Heart className="w-5 h-5 text-[#C4685A] fill-[#C4685A]" />
            </h2>
            <p className="text-xs sm:text-sm text-[#F1E9DD] mt-2 leading-relaxed">
              {lang === 'vi'
                ? 'Mọi hành trình của hai đứa — sắp đi, đang đi và những kỷ niệm — nằm gọn trên một tuyến đường chấm.'
                : 'Every journey of ours — upcoming, ongoing and remembered — laid along one dotted route.'}
            </p>
            <button
              id="history-new-trip-btn"
              onClick={onNewTrip}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#55423A] hover:bg-[#3f2f28] text-[#F1E9DD] text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Tạo chuyến đi mới' : 'Create New Trip'}</span>
            </button>
          </div>

          {/* Featured next trip boarding pass (desktop: right column) */}
          {featuredTrip && (
            <div className="lg:ml-auto lg:w-[400px] shrink-0">
              <div className="rounded-2xl border-2 border-[#55423A] bg-[#FFFDF9] overflow-hidden shadow-md">
                <div className="flex items-center justify-between px-4 py-2 border-b-2 border-dashed border-[#55423A]">
                  <span className="text-[10px] font-bold tracking-[0.18em] text-[#55423A]">
                    {lang === 'vi' ? 'CHUYẾN ĐI TIẾP THEO' : 'NEXT TRIP'}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold tracking-wider uppercase border-2 rounded-md px-1.5 py-0.5 -rotate-3 ${
                      STAMP_STYLE[featuredTrip.tripInfo.status] || STAMP_STYLE.Draft
                    }`}
                  >
                    {getTripStatusLabel(featuredTrip.tripInfo.status, lang)}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="text-center">
                    <div className="font-serif text-2xl font-extrabold text-[#382D24] leading-none">
                      {destCode(featuredTrip.tripInfo.destination)}
                    </div>
                    <div className="text-[10px] text-[#8C6D58] font-medium mt-1 max-w-[90px] truncate">
                      {featuredTrip.tripInfo.destination || '—'}
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <div className="border-t-2 border-dashed border-[#8C6D58]" />
                    <Plane className="w-4 h-4 text-[#C4685A] absolute left-1/2 -top-2 -translate-x-1/2 bg-[#FFFDF9] px-0.5" />
                  </div>
                  <div className="text-center">
                    <div className="font-serif text-2xl font-extrabold text-[#C4685A] leading-none">
                      {(() => {
                        const d = getDaysUntilTrip(featuredTrip.tripInfo.startDate);
                        return d === null ? '—' : d >= 0 ? `${d}` : '✓';
                      })()}
                    </div>
                    <div className="text-[10px] text-[#8C6D58] font-medium mt-1">
                      {lang === 'vi' ? 'ngày nữa' : 'days left'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenTripDetail(featuredTrip.tripInfo.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#55423A] hover:bg-[#3f2f28] text-[#F1E9DD] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="truncate px-2">{featuredTrip.tripInfo.name}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>

    {/* ===== Filter pills + search ===== */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', labelVi: 'Tất cả', labelEn: 'All' },
          { id: 'Ongoing', labelVi: 'Đang diễn ra', labelEn: 'Ongoing' },
          { id: 'Upcoming', labelVi: 'Sắp tới', labelEn: 'Upcoming' },
          { id: 'Completed', labelVi: 'Đã hoàn thành', labelEn: 'Completed' },
          { id: 'Draft', labelVi: 'Bản nháp', labelEn: 'Draft' }
        ].map((pill) => {
          const count =
            pill.id === 'ALL'
              ? tripsList.length
              : tripsList.filter((b) => b.tripInfo.status === pill.id).length;
          if (count === 0 && pill.id !== 'ALL' && statusFilter !== pill.id) return null;
          const active = statusFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#55423A] text-[#F1E9DD] shadow-2xs'
                  : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
              }`}
            >
              {lang === 'vi' ? pill.labelVi : pill.labelEn}{' '}
              <span className={active ? 'text-[#E9BFB7]' : 'text-[#C27D66]'}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="relative min-w-[220px]">
        <Search className="w-3.5 h-3.5 text-[#8C6D58] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={lang === 'vi' ? 'Tìm tên hoặc điểm đến...' : 'Search trip or destination...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-2 rounded-full bg-[#FFFDF9] border border-[#E8DEC8] text-xs text-[#382D24] focus:outline-none focus:border-[#8C6D58]"
        />
      </div>
    </div>

    {/* ===== Trip ticket cards ===== */}
    {filteredTripsList.length === 0 ? (
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-3">
        <Compass className="w-12 h-12 text-[#8C6D58] mx-auto stroke-[1.5]" />
        <h4 className="font-serif text-lg font-bold text-[#382D24]">
          {lang === 'vi' ? 'Không tìm thấy chuyến đi phù hợp' : 'No matching trips found'}
        </h4>
        <p className="text-xs text-[#735D4E] max-w-sm mx-auto">
          {lang === 'vi'
            ? 'Hãy thử thay đổi bộ lọc hoặc tạo một hành trình lãng mạn mới ngay bây giờ.'
            : 'Try changing your filter or start planning your next romantic getaway.'}
        </p>
        <button
          onClick={onNewTrip}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#55423A] text-[#F1E9DD] text-xs font-medium hover:bg-[#3f2f28] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Tạo chuyến đi mới' : 'Create New Trip'}</span>
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredTripsList.map((bundle) => {
          const t = bundle.tripInfo;
          const isCurrent = t.id === currentTripBundle.tripInfo.id;
          const tDuration = calculateDurationDays(t.startDate, t.endDate);
          const tActual = bundle.budget.reduce(
            (sum, item) => sum + (item.actualCost || 0) * (item.quantity || 1),
            0
          );
          const tPlanned = bundle.budget.reduce(
            (sum, item) => sum + (item.plannedCost || 0) * (item.quantity || 1),
            0
          );
          const tSpentPct = tPlanned > 0 ? Math.min(100, Math.round((tActual / tPlanned) * 100)) : 0;
          const tCheckDone = bundle.checklist.filter((c) => c.completed).length;
          const tCheckPct =
            bundle.checklist.length > 0
              ? Math.round((tCheckDone / bundle.checklist.length) * 100)
              : null;
          const bundlePhotosCount = (bundle.notes || []).reduce(
            (count, n) => count + (n.images?.length || 0),
            0
          );

          return (
            <div
              key={t.id}
              id={`trip-card-${t.id}`}
              className={`relative bg-[#FFFDF9] border-2 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group ${
                isCurrent ? 'border-[#8C6D58]' : 'border-[#E8DEC8]'
              }`}
            >
              <div>
                {/* Card cover */}
                <div
                  onClick={() => handleOpenTripDetail(t.id)}
                  className="h-40 relative overflow-hidden bg-[#EFE8DE] cursor-pointer"
                >
                  {t.coverImage ? (
                    <img
                      src={t.coverImage}
                      alt={t.name}
                      className="w-full h-full object-cover brightness-[0.93] transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A68972] bg-[#B9AA9B]">
                      <MapPin className="w-10 h-10 stroke-[1.5]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E16]/80 via-[#2B1E16]/25 to-transparent" />

                  {/* rotated status stamp */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-block bg-[#FFFDF9]/90 backdrop-blur-sm border-2 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider -rotate-3 ${
                        STAMP_STYLE[t.status] || STAMP_STYLE.Draft
                      }`}
                    >
                      {getTripStatusLabel(t.status, lang)}
                    </span>
                  </div>

                  {isCurrent && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF7F2] text-[#5C4033] shadow-xs">
                        {lang === 'vi' ? 'Đang chọn' : 'Active'}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[#EAE1D5] flex items-center gap-1 font-medium mb-0.5">
                        <MapPin className="w-3 h-3 text-[#D7C4B7]" />
                        <span className="truncate">{t.destination || (lang === 'vi' ? 'Chưa đặt điểm đến' : 'No destination yet')}</span>
                      </p>
                      <h3 className="font-serif text-base sm:text-lg font-bold truncate drop-shadow-sm">
                        {t.name}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif text-xl font-extrabold tracking-widest drop-shadow-sm">
                        {destCode(t.destination)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* perforation line with punched notches */}
                <div className="relative">
                  <div className="border-t-2 border-dashed border-[#E2D4C3]" />
                  <span className="absolute -left-2.5 -top-[9px] w-4 h-4 rounded-full bg-[#FAF7F2]" />
                  <span className="absolute -right-2.5 -top-[9px] w-4 h-4 rounded-full bg-[#FAF7F2]" />
                </div>

                {/* Card content & metrics */}
                <div className="p-4 space-y-2.5 text-xs text-[#6E4F36]">
                  <div className="flex items-center justify-between text-[#8C6D58]">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateVN(t.startDate)}
                      {t.endDate && t.endDate !== t.startDate ? ` - ${formatDateVN(t.endDate)}` : ''}
                    </span>
                    <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md font-semibold text-[#6E4F36]">
                      {tDuration}
                      {lang === 'vi' ? ' ngày' : 'd'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#F2ECE1]">
                    <span className="text-[#8C6D58]">{lang === 'vi' ? 'Chi tiêu thực tế:' : 'Actual Spent:'}</span>
                    <span className="font-serif font-bold text-[#382D24] text-sm">
                      {formatCurrency(tActual)}
                    </span>
                  </div>

                  {/* progress bars */}
                  {(tPlanned > 0 || tCheckPct !== null) && (
                    <div className="space-y-1.5 pt-1">
                      {tPlanned > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-[10px] text-[#8C6D58] font-medium">
                            {lang === 'vi' ? 'Ngân sách' : 'Budget'}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#EFE8DE] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tSpentPct >= 100 ? 'bg-[#B85340]' : 'bg-[#C08A32]'}`}
                              style={{ width: `${tSpentPct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[10px] font-semibold text-[#6E4F36]">
                            {tSpentPct}%
                          </span>
                        </div>
                      )}
                      {tCheckPct !== null && (
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-[10px] text-[#8C6D58] font-medium">
                            {lang === 'vi' ? 'Chuẩn bị' : 'Packing'}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#EFE8DE] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#C4685A]"
                              style={{ width: `${tCheckPct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[10px] font-semibold text-[#6E4F36]">
                            {tCheckPct}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#8C6D58] text-[11px] pt-1">
                    <span>{bundle.itinerary.length} {lang === 'vi' ? 'hoạt động' : 'act.'}</span>
                    <span>•</span>
                    <span>{bundle.places.length} {lang === 'vi' ? 'địa điểm' : 'places'}</span>
                    <span>•</span>
                    <span className="font-medium text-[#B07D62] flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>{bundlePhotosCount} {lang === 'vi' ? 'ảnh' : 'photos'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card actions: primary + kebab menu */}
              <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE2D5] flex items-center gap-1.5">
                <button
                  id={`trip-card-view-${t.id}`}
                  onClick={() => handleOpenTripDetail(t.id)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-[#55423A] hover:bg-[#3f2f28] text-[#F1E9DD] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title={lang === 'vi' ? 'Mở Dashboard, Tóm tắt & Kho ảnh' : 'View Trip Dashboard & Photos'}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Xem chuyến đi' : 'View Trip'}</span>
                </button>

                <div className="relative">
                  <button
                    id={`trip-card-menu-${t.id}`}
                    onClick={() => setMenuOpenId(menuOpenId === t.id ? null : t.id)}
                    className="p-2 rounded-xl bg-[#FFFDF9] hover:bg-[#EFE8DE] border border-[#E2D4C3] text-[#6E4F36] transition-colors cursor-pointer"
                    title={lang === 'vi' ? 'Thao tác khác' : 'More actions'}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {menuOpenId === t.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                      <div className="absolute right-0 bottom-11 z-20 w-44 rounded-xl border border-[#E8DEC8] bg-[#FFFDF9] shadow-lg overflow-hidden">
                        <button
                          id={`trip-card-edit-${t.id}`}
                          onClick={() => {
                            setMenuOpenId(null);
                            onSelectTrip(t.id);
                            onEditTrip(t.id);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-[#6E4F36] hover:bg-[#FAF7F2] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {lang === 'vi' ? 'Sửa thông tin' : 'Edit details'}
                        </button>
                        <button
                          id={`trip-card-duplicate-${t.id}`}
                          onClick={() => {
                            setMenuOpenId(null);
                            onDuplicateTrip(t.id);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-[#6E4F36] hover:bg-[#FAF7F2] cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {lang === 'vi' ? 'Nhân bản' : 'Duplicate'}
                        </button>
                        <button
                          id={`trip-card-delete-${t.id}`}
                          onClick={() => {
                            setMenuOpenId(null);
                            onRequestDeleteTrip(t.id, t.name);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-[#B85340] hover:bg-[#FBEBE8] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {lang === 'vi' ? 'Xóa chuyến đi' : 'Delete trip'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
};
