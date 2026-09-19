import React, { useState } from 'react';
import {
  Compass,
  Calendar,
  DollarSign,
  MapPin,
  CheckSquare,
  FileText,
  Info,
  Save,
  Plus,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  LayoutDashboard,
  Menu,
  X,
  Cloud,
  RefreshCw,
  Globe,
  BedDouble
} from 'lucide-react';
import { TripInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab =
  | 'overview'
  | 'itinerary'
  | 'services'
  | 'budget'
  | 'places'
  | 'checklist'
  | 'notes'
  | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentTrip: TripInfo | null;
  allTrips: TripInfo[];
  onSelectTrip: (tripId: string) => void;
  onNewTrip: () => void;
  onManualSave: () => void;
  onLogout: () => void;
  userEmail: string | null;
  syncStatus?: 'synced' | 'syncing' | 'pending' | 'offline';
  isConnectedToCloud?: boolean;
  onConnectGoogle?: () => void;
  onForceCloudSync?: () => void;
}

/**
 * Presentation-only helpers for the trip switcher: order trips by their own
 * start date (newest first) and slice them into year sections. Trip data is
 * never mutated here.
 */
const parseTripTime = (value?: string): number | null => {
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

const UNDATED_GROUP_KEY = '__undated__';

const groupTripsByYear = (trips: TripInfo[]): { key: string; trips: TripInfo[] }[] => {
  const dated: { trip: TripInfo; time: number }[] = [];
  const undated: TripInfo[] = [];

  trips.forEach((trip) => {
    const time = parseTripTime(trip.startDate);
    if (time === null) undated.push(trip);
    else dated.push({ trip, time });
  });

  dated.sort((a, b) => b.time - a.time);

  const groups: { key: string; trips: TripInfo[] }[] = [];
  dated.forEach(({ trip, time }) => {
    const year = String(new Date(time).getFullYear());
    const last = groups[groups.length - 1];
    if (last && last.key === year) last.trips.push(trip);
    else groups.push({ key: year, trips: [trip] });
  });

  if (undated.length > 0) groups.push({ key: UNDATED_GROUP_KEY, trips: undated });

  return groups;
};

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  currentTrip,
  allTrips,
  onSelectTrip,
  onNewTrip,
  onManualSave,
  onLogout,
  userEmail,
  syncStatus = 'synced',
  isConnectedToCloud = false,
  onConnectGoogle,
  onForceCloudSync
}) => {
  const { lang, setLang, t } = useLanguage();
  const [tripDropdownOpen, setTripDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainTabs = [
    { id: 'overview' as ActiveTab, label: t.tabs.myTrips, icon: LayoutDashboard },
    { id: 'itinerary' as ActiveTab, label: t.tabs.itinerary, icon: Calendar },
    { id: 'services' as ActiveTab, label: (t.tabs as Record<string, string>)?.services || (lang === 'vi' ? 'Dịch vụ & Phòng' : 'Services & Stays'), icon: BedDouble },
    { id: 'budget' as ActiveTab, label: t.tabs.budget, icon: DollarSign },
    { id: 'places' as ActiveTab, label: t.tabs.places, icon: MapPin },
    { id: 'checklist' as ActiveTab, label: t.tabs.checklist, icon: CheckSquare },
    { id: 'notes' as ActiveTab, label: t.tabs.notes, icon: FileText },
    { id: 'settings' as ActiveTab, label: t.tabs.settings, icon: SettingsIcon }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8DEC8] shadow-xs">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('overview')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <img
                src="/pwa-192x192.png"
                alt="Our Travel Planner Icon"
                className="w-10 h-10 rounded-xl object-cover border border-[#D5A85A]/70 shadow-xs transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:block">
                <span className="block font-serif text-lg font-bold text-[#382D24] leading-tight group-hover:text-[#5C4033] transition-colors">
                  Our Travel Planner
                </span>
                <span className="block text-[11px] uppercase tracking-wider text-[#9C7E68] font-medium">
                  Romantic Travel Journal
                </span>
              </div>
            </button>
          </div>

          {/* Trip Selector in Navigation (Item 12 Requirement) */}
          <div className="relative flex-1 min-w-0 max-w-[140px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm">
            <button
              id="nav-trip-selector-btn"
              type="button"
              onClick={() => setTripDropdownOpen(!tripDropdownOpen)}
              className="flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#E2D4C3] text-xs sm:text-sm text-[#382D24] transition-all w-full text-left cursor-pointer shadow-2xs"
            >
              <div className="truncate flex items-center gap-1.5">
                <span className="text-[#8C6D58] hidden md:inline font-medium">
                  {lang === 'vi' ? 'Chuyến đi:' : 'Our Trips:'}
                </span>
                <span className="font-serif font-bold text-[#382D24] truncate">
                  {currentTrip ? currentTrip.name : (lang === 'vi' ? 'Chưa chọn' : 'No trip')}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8C6D58] shrink-0 transition-transform ${tripDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Trip Dropdown menu */}
            {tripDropdownOpen && (
              <div
                id="nav-trip-dropdown"
                className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-[#FFFDF9] border border-[#E2D4C3] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in"
              >
                <div className="px-3.5 py-2 border-b border-[#F0E6D8] flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8C6D58]">
                    {lang === 'vi' ? 'Đổi chuyến đi' : 'Switch Journey'}
                  </span>
                  <button
                    id="nav-dropdown-new-trip-btn"
                    onClick={() => {
                      setTripDropdownOpen(false);
                      onNewTrip();
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-[#6E4F36] hover:text-[#382D24] bg-[#EFE6DB] hover:bg-[#E5DACB] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Chuyến mới' : 'New Trip'}</span>
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-[#F6EFE6]">
                  {groupTripsByYear(allTrips).map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-1.5">
                        <span className="font-serif text-[11px] font-semibold tracking-[0.18em] text-[#8C6D58] shrink-0">
                          {group.key === UNDATED_GROUP_KEY
                            ? (lang === 'vi' ? 'Chưa xác định thời gian' : 'No dates yet')
                            : group.key}
                        </span>
                        <span className="flex-1 h-px bg-[#F0E6D8]" />
                      </div>
                      {group.trips.map((t) => {
                    const isSelected = currentTrip?.id === t.id;
                    const statusText =
                      t.status === 'Ongoing'
                        ? lang === 'vi' ? 'Đang diễn ra' : 'Ongoing'
                        : t.status === 'Upcoming'
                        ? lang === 'vi' ? 'Sắp tới' : 'Upcoming'
                        : t.status === 'Completed'
                        ? lang === 'vi' ? 'Đã xong' : 'Completed'
                        : lang === 'vi' ? 'Lên ý tưởng' : 'Planning';

                    return (
                      <button
                        key={t.id}
                        id={`trip-option-${t.id}`}
                        onClick={() => {
                          onSelectTrip(t.id);
                          setTripDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#FAF7F2]' : 'hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                            isSelected ? 'bg-[#6E4F36]' : 'bg-[#D9CABB]'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-sm font-semibold text-[#382D24] truncate">
                            {t.name}
                          </p>
                          <p className="text-xs text-[#8C6D58] truncate">
                            {t.destination} {t.startDate ? `• ${t.startDate}` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          t.status === 'Ongoing' ? 'bg-[#E3EFE5] text-[#2F6636]' :
                          t.status === 'Upcoming' ? 'bg-[#EBF2F8] text-[#2A527A]' :
                          t.status === 'Completed' ? 'bg-[#EFE8DE] text-[#6E4F36]' :
                          'bg-[#F6EBE1] text-[#915B35]'
                        }`}>
                          {statusText}
                        </span>
                      </button>
                    );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />
            
            {/* Real-time Cloud Sync Badge or Connect Cloud Button */}
            {!isConnectedToCloud ? (
              <button
                id="nav-connect-cloud-btn"
                type="button"
                onClick={onConnectGoogle}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFF3CD] hover:bg-[#FFEBAA] active:scale-[0.98] border border-[#F6D88A] text-[#856404] text-xs font-semibold shadow-2xs transition-all cursor-pointer animate-pulse"
                title="Nhấn để kết nối Google & đồng bộ dữ liệu sang điện thoại ngay!"
              >
                <Cloud className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="text-[11px] font-semibold">Đồng bộ sang ĐT</span>
              </button>
            ) : (
              <button
                id="nav-sync-indicator-btn"
                type="button"
                onClick={onForceCloudSync}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] active:scale-[0.98] border border-[#E8DEC8] text-xs transition-all cursor-pointer group shadow-2xs"
                title={
                  syncStatus === 'syncing'
                    ? 'Đang đồng bộ dữ liệu lên Cloud...'
                    : syncStatus === 'pending'
                    ? 'Còn thay đổi đang chờ gửi lên Cloud. Ứng dụng sẽ tự thử lại.'
                    : syncStatus === 'offline'
                    ? 'Đang hoạt động offline • Bấm để thử kết nối lại'
                    : 'Đã kết nối Cloud • Bấm để làm mới dữ liệu ngay (không cần F5)'
                }
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#B07D62] animate-spin" />
                    <span className="text-[#8C6D58] font-medium text-[11px]">Đang đồng bộ...</span>
                  </>
                ) : syncStatus === 'pending' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#D9A441] animate-pulse" />
                    <Cloud className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span className="text-[#8A5B00] font-medium text-[11px]">Đang chờ gửi</span>
                  </>
                ) : syncStatus === 'offline' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#A68972]" />
                    <span className="text-[#8C6D58] font-medium text-[11px]">Thử kết nối lại</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#34A853] animate-pulse" />
                    <Cloud className="w-3.5 h-3.5 text-[#34A853]" />
                    <span className="text-[#382D24] font-medium text-[11px] hidden lg:inline">Đồng bộ ĐT & Web</span>
                    <RefreshCw className="w-3 h-3 text-[#8C6D58] group-hover:rotate-180 transition-transform" />
                  </>
                )}
              </button>
            )}

            {/* Save Current Trip button */}
            <button
              id="nav-save-trip-btn"
              onClick={onManualSave}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer shrink-0"
              title={lang === 'vi' ? 'Lưu chuyến đi' : 'Save Trip'}
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{lang === 'vi' ? 'Lưu' : 'Save'}</span>
            </button>

            {/* Language Toggle button - visible on desktop, moved to menu on mobile */}
            <button
              id="nav-lang-btn"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 sm:p-2 rounded-xl border bg-[#FAF7F2] border-[#E8DEC8] text-[#6E4F36] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
              title={lang === 'vi' ? 'Đổi sang English' : 'Switch to Tiếng Việt'}
            >
              <Globe className="w-4 h-4 text-[#8C6D58]" />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>

            {/* Settings button - visible on desktop */}
            <button
              id="nav-settings-btn"
              onClick={() => onSelectTab('settings')}
              className={`hidden sm:flex p-2 rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#EFE6DB] border-[#D9CABB] text-[#382D24]'
                  : 'bg-[#FAF7F2] border-[#E8DEC8] text-[#6E4F36] hover:bg-[#F3ECE2]'
              }`}
              title={t.tabs.settings}
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Logout button - visible on desktop */}
            <button
              id="nav-logout-btn"
              onClick={onLogout}
              className="hidden sm:flex p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#FBEBE8] border border-[#E8DEC8] hover:border-[#E9BFB7] text-[#8C6D58] hover:text-[#B85340] text-xs sm:text-sm transition-colors cursor-pointer"
              title={userEmail ? `${t.common.logout} (${userEmail})` : t.common.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu toggle (Dấu 3 gạch) */}
            <button
              id="nav-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-[#FAF7F2] active:bg-[#EFE6DB] border border-[#E8DEC8] text-[#4A2F22] hover:text-[#2E1A11] transition-colors cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
              title="Menu danh mục"
              aria-label="Menu danh mục"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#B85340]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Tab Bar - Visible on desktop (md and up) */}
        <div className="hidden md:flex items-center space-x-1 sm:space-x-1.5 py-1.5 sm:py-2 border-t border-[#F2ECE1] overflow-x-auto scrollbar-none">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#5C4033] text-[#FFFDF9] shadow-2xs font-semibold'
                    : 'text-[#6E4F36] hover:bg-[#F3ECE2] hover:text-[#382D24] bg-[#FAF7F2]/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-[#FAF7F2]' : 'text-[#8C6D58]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer (Mở ra khi bấm Dấu 3 gạch) */}
      {mobileMenuOpen && (
        <div 
          id="nav-mobile-menu" 
          className="md:hidden bg-[#FFFDF9] border-t border-[#E8DEC8] px-4 py-3.5 space-y-3 animate-in slide-in-from-top-2 shadow-xl max-h-[calc(100vh-4.5rem)] overflow-y-auto"
        >
          {/* Active Screen Indicator Header in Drawer */}
          <div className="flex items-center justify-between px-1 pb-2 border-b border-[#F0E6D8]">
            <span className="text-xs font-semibold text-[#8C6D58] uppercase tracking-wider">
              {lang === 'vi' ? 'Danh mục màn hình' : 'Navigation Menu'}
            </span>
            <span className="text-[11px] font-medium text-[#B07D62] bg-[#EFE6DB] px-2 py-0.5 rounded-full">
              {mainTabs.find(t => t.id === activeTab)?.label}
            </span>
          </div>

          {/* Cloud sync status alert if not connected or Quick Refresh button */}
          {!isConnectedToCloud ? (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onConnectGoogle) onConnectGoogle();
              }}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FFF3CD] border border-[#F6D88A] text-[#856404] text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
            >
              <Cloud className="w-4 h-4 text-[#D97706]" />
              <span>{lang === 'vi' ? 'Đồng bộ sang Điện thoại (Kết nối Google)' : 'Sync to Mobile (Connect Google)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onForceCloudSync) onForceCloudSync();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] text-[#382D24] text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#34A853] animate-pulse" />
                <Cloud className="w-4 h-4 text-[#34A853]" />
                <span>{lang === 'vi' ? 'Đã kết nối Cloud • Đồng bộ thời gian thực' : 'Connected to Cloud • Real-time Sync'}</span>
              </div>
              <span className="text-[11px] font-semibold text-[#8C6D58] flex items-center gap-1 bg-[#EFE6DB] px-2 py-0.5 rounded-lg">
                <RefreshCw className="w-3 h-3" />
                {lang === 'vi' ? 'Làm mới' : 'Refresh'}
              </span>
            </button>
          )}

          {/* List of all Screen Tabs */}
          <div className="grid grid-cols-1 gap-1.5">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`mobile-menu-tab-${tab.id}`}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.99] cursor-pointer ${
                    isActive
                      ? 'bg-[#5C4033] text-white font-semibold shadow-xs'
                      : 'text-[#5C4033] hover:bg-[#F3ECE2] bg-[#FAF7F2]/80 border border-[#EFE6DB]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8C6D58]'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && (
                    <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-normal">
                      {lang === 'vi' ? 'Đang mở' : 'Active'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Quick Actions at bottom of Mobile Drawer */}
          <div className="pt-3 border-t border-[#E8DEC8] grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setLang(lang === 'vi' ? 'en' : 'vi');
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#E8DEC8] bg-[#FAF7F2] text-xs font-semibold text-[#6E4F36] active:bg-[#EFE6DB] cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#8C6D58]" />
              <span>{lang === 'vi' ? 'English (EN)' : 'Tiếng Việt (VI)'}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#E9BFB7] bg-[#FDF4F2] text-xs font-semibold text-[#B85340] active:bg-[#FBEBE8] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.common.logout}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
