import React from 'react';
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
  Car
} from 'lucide-react';
import { TripBundle } from '../types';
import { calculateDurationDays, formatCurrency, formatDateVN, getDaysUntilTrip } from '../utils/dateHelpers';
import { ActiveTab } from './Navigation';

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
  const { tripInfo, itinerary, budget, places, checklist } = currentTripBundle;

  // Calculate metrics
  const duration = calculateDurationDays(tripInfo.startDate, tripInfo.endDate);
  const daysUntil = getDaysUntilTrip(tripInfo.startDate);

  // Budget calculations
  const totalPlanned = budget.reduce((sum, item) => sum + (item.plannedCost || 0) * (item.quantity || 1), 0);
  const totalActual = budget.reduce((sum, item) => sum + (item.actualCost || 0) * (item.quantity || 1), 0);
  const budgetRemaining = totalPlanned - totalActual;
  const isBudgetExceeded = totalActual > totalPlanned && totalPlanned > 0;

  // Other metrics
  const activitiesCount = itinerary.length;
  const placesCount = places.length;
  const visitedCount = places.filter((p) => p.status === 'Visited').length;
  const checklistTotal = checklist.length;
  const checklistDone = checklist.filter((c) => c.completed).length;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const tripsList = (Object.values(allTrips) as TripBundle[]).sort((a, b) => {
    return (b.tripInfo.createdAt || '').localeCompare(a.tripInfo.createdAt || '');
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Current Trip Hero Card (Journal Style) */}
      <div
        id="current-trip-hero"
        className="relative bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl overflow-hidden shadow-sm"
      >
        {/* Cover Photo Banner */}
        <div className="h-48 sm:h-64 lg:h-72 w-full relative overflow-hidden bg-[#EAE1D5]">
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
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E16]/80 via-[#2B1E16]/30 to-transparent" />

          {/* Top floating badges */}
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
              {tripInfo.status}
            </span>
            {daysUntil !== null && tripInfo.status === 'Upcoming' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FFFDF9]/90 text-[#382D24] backdrop-blur-md shadow-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8C6D58]" />
                {daysUntil === 0
                  ? 'Leaves today!'
                  : daysUntil > 0
                  ? `${daysUntil} days to go`
                  : 'Past date'}
              </span>
            )}
          </div>

          {/* Quick Edit button on cover */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <button
              id="hero-edit-trip-btn"
              onClick={() => onEditTrip(tripInfo.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2]/90 hover:bg-[#FAF7F2] text-[#382D24] text-xs font-medium backdrop-blur-md shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#6E4F36]" />
              <span>Edit Trip</span>
            </button>
          </div>

          {/* Bottom Title on Cover */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-[#FAF7F2]">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#EAE1D5] mb-1 font-medium">
              <MapPin className="w-4 h-4 text-[#D7C4B7]" />
              <span>{tripInfo.destination || 'Unspecified destination'}</span>
              {tripInfo.travelers && (
                <>
                  <span>•</span>
                  <Users className="w-3.5 h-3.5 text-[#D7C4B7]" />
                  <span>
                    {tripInfo.travelers} {tripInfo.travelers === 2 ? 'travelers (Couple)' : 'travelers'}
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
                <p className="text-xs text-[#8C6D58] uppercase tracking-wider font-semibold">Travel Dates</p>
                <p className="text-sm sm:text-base font-medium text-[#382D24]">
                  {formatDateVN(tripInfo.startDate)}
                  {tripInfo.endDate && tripInfo.endDate !== tripInfo.startDate ? ` – ${formatDateVN(tripInfo.endDate)}` : ''}
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#EFE8DE] text-[#6E4F36] font-semibold">
                    {duration} {duration === 1 ? 'day' : 'days'}
                  </span>
                </p>
              </div>
            </div>

            {/* Hotel & Transport if provided */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#6E4F36]">
              {tripInfo.hotel && (
                <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E8DEC8]">
                  <span className="font-medium text-[#8C6D58]">Hotel:</span>
                  <span className="text-[#382D24] font-semibold truncate max-w-[180px]">{tripInfo.hotel}</span>
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

          {/* Key Metrics Grid (Section 11 Dashboard Summary) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
            {/* Planned Budget */}
            <div
              onClick={() => onNavigateTab('budget')}
              className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Planned Budget</span>
                <DollarSign className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-serif text-lg sm:text-xl font-bold text-[#382D24]">
                {formatCurrency(totalPlanned)}
              </p>
              <p className="text-[11px] text-[#8C6D58] mt-1">
                {budget.length} budgeted items
              </p>
            </div>

            {/* Actual Cost */}
            <div
              onClick={() => onNavigateTab('budget')}
              className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Actual Spent</span>
                <TrendingUp className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
              </div>
              <p className={`font-serif text-lg sm:text-xl font-bold ${isBudgetExceeded ? 'text-[#B85340]' : 'text-[#382D24]'}`}>
                {formatCurrency(totalActual)}
              </p>
              <p className="text-[11px] text-[#8C6D58] mt-1 flex items-center gap-1">
                {isBudgetExceeded ? (
                  <span className="text-[#B85340] font-medium flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> Exceeded planned!
                  </span>
                ) : (
                  <span>Remaining: {formatCurrency(budgetRemaining)}</span>
                )}
              </p>
            </div>

            {/* Itinerary Activities */}
            <div
              onClick={() => onNavigateTab('itinerary')}
              className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Activities</span>
                <ListTodo className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-serif text-lg sm:text-xl font-bold text-[#382D24]">
                {activitiesCount}
              </p>
              <p className="text-[11px] text-[#8C6D58] mt-1">
                Planned on timeline
              </p>
            </div>

            {/* Wishlist Places & Checklist */}
            <div
              onClick={() => onNavigateTab('places')}
              className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] hover:border-[#D9CABB] transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[#8C6D58] mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Places & Packing</span>
                <CheckCircle2 className="w-4 h-4 text-[#8C6D58] group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-serif text-lg sm:text-xl font-bold text-[#382D24]">
                {placesCount} spots <span className="text-xs font-normal text-[#8C6D58]">({visitedCount} visited)</span>
              </p>
              <p className="text-[11px] text-[#8C6D58] mt-1">
                Checklist: {checklistPercent}% complete ({checklistDone}/{checklistTotal})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Trips / Trips History Section */}
      <div id="trips-history-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#382D24] flex items-center gap-2">
              <span>Journeys & Memory Chest</span>
              <Heart className="w-4 h-4 text-[#C27D66] fill-[#C27D66]" />
            </h2>
            <p className="text-xs sm:text-sm text-[#8C6D58]">
              Previous trips & upcoming adventures saved in your journal ({tripsList.length})
            </p>
          </div>

          <button
            id="history-new-trip-btn"
            onClick={onNewTrip}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Trip</span>
          </button>
        </div>

        {/* Trips Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tripsList.map((bundle) => {
            const t = bundle.tripInfo;
            const isCurrent = t.id === tripInfo.id;
            const tDuration = calculateDurationDays(t.startDate, t.endDate);
            const tActual = bundle.budget.reduce(
              (sum, item) => sum + (item.actualCost || 0) * (item.quantity || 1),
              0
            );

            return (
              <div
                key={t.id}
                id={`trip-card-${t.id}`}
                className={`bg-[#FFFDF9] border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                  isCurrent ? 'border-[#8C6D58] ring-1 ring-[#8C6D58]/30' : 'border-[#E8DEC8]'
                }`}
              >
                <div>
                  {/* Card Cover */}
                  <div className="h-40 relative overflow-hidden bg-[#EFE8DE]">
                    {t.coverImage ? (
                      <img
                        src={t.coverImage}
                        alt={t.name}
                        className="w-full h-full object-cover brightness-[0.93] transition-transform duration-500 hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#A68972]">
                        <MapPin className="w-10 h-10 stroke-[1.5]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E16]/70 via-transparent to-transparent" />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${
                          t.status === 'Ongoing'
                            ? 'bg-[#2E6B38]/90 text-white'
                            : t.status === 'Upcoming'
                            ? 'bg-[#31577E]/90 text-white'
                            : t.status === 'Completed'
                            ? 'bg-[#5C4033]/90 text-white'
                            : 'bg-[#9C6644]/90 text-white'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    {/* Active Flag */}
                    {isCurrent && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF7F2] text-[#5C4033] shadow-xs">
                          Active Now
                        </span>
                      </div>
                    )}

                    {/* Card Title on image */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs text-[#EAE1D5] flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-[#D7C4B7]" />
                        <span className="truncate">{t.destination}</span>
                      </p>
                      <h3 className="font-serif text-base sm:text-lg font-bold truncate">
                        {t.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2.5 text-xs text-[#6E4F36]">
                    <div className="flex items-center justify-between text-[#8C6D58]">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateVN(t.startDate)}
                        {t.endDate && t.endDate !== t.startDate ? ` - ${formatDateVN(t.endDate)}` : ''}
                      </span>
                      <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md font-semibold text-[#6E4F36]">
                        {tDuration}d
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#F2ECE1]">
                      <span className="text-[#8C6D58]">Actual Spent:</span>
                      <span className="font-serif font-bold text-[#382D24] text-sm">
                        {formatCurrency(tActual)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[#8C6D58] text-[11px]">
                      <span>{bundle.itinerary.length} activities</span>
                      <span>•</span>
                      <span>{bundle.places.length} places</span>
                      <span>•</span>
                      <span>{bundle.checklist.length} tasks</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions (View, Edit, Duplicate, Delete) */}
                <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE2D5] flex items-center justify-between gap-1">
                  <button
                    id={`trip-card-view-${t.id}`}
                    onClick={() => onSelectTrip(t.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#5C4033] hover:bg-[#483226] text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Open Trip"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    id={`trip-card-edit-${t.id}`}
                    onClick={() => onEditTrip(t.id)}
                    className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] border border-[#E2D4C3] text-[#6E4F36] text-xs transition-colors cursor-pointer"
                    title="Edit Trip Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id={`trip-card-duplicate-${t.id}`}
                    onClick={() => onDuplicateTrip(t.id)}
                    className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] border border-[#E2D4C3] text-[#6E4F36] text-xs transition-colors cursor-pointer"
                    title="Duplicate Trip"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id={`trip-card-delete-${t.id}`}
                    onClick={() => onRequestDeleteTrip(t.id, t.name)}
                    className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#FBEBE8] border border-[#E2D4C3] hover:border-[#E9BFB7] text-[#8C6D58] hover:text-[#B85340] text-xs transition-colors cursor-pointer"
                    title="Delete Trip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
