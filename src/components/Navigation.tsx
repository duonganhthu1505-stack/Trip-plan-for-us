import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  DollarSign,
  MapPin,
  CheckSquare,
  FileText,
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
  Moon,
  Sun
} from 'lucide-react';
import { TripInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { PWAInstallButton } from './PWAInstallButton';

const THEME_KEY = 'app_theme';

export type ActiveTab =
  | 'overview'
  | 'itinerary'
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
  syncStatus?: 'synced' | 'syncing' | 'offline';
  isConnectedToCloud?: boolean;
  onConnectGoogle?: () => void;
  onForceCloudSync?: () => void;
}

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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(THEME_KEY) === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const tabs = useMemo(
    () => [
      { id: 'overview' as ActiveTab, label: t.tabs.myTrips, icon: LayoutDashboard },
      { id: 'itinerary' as ActiveTab, label: t.tabs.itinerary, icon: Calendar },
      { id: 'budget' as ActiveTab, label: t.tabs.budget, icon: DollarSign },
      { id: 'places' as ActiveTab, label: t.tabs.places, icon: MapPin },
      { id: 'checklist' as ActiveTab, label: t.tabs.checklist, icon: CheckSquare },
      { id: 'notes' as ActiveTab, label: t.tabs.notes, icon: FileText }
    ],
    [t]
  );

  const navigate = (tab: ActiveTab) => {
    // One navigation path for web + Android. Parent state changes first,
    // then the local menus are closed. No DOM click forwarding or timing hacks.
    onSelectTab(tab);
    setMobileMenuOpen(false);
    setTripDropdownOpen(false);
  };

  const openSettings = () => {
    navigate('settings');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8DEC8] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2">
          <button
            type="button"
            onClick={() => navigate('overview')}
            className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
          >
            <img
              src="/pwa-192x192.png"
              alt="Our Travel Planner Icon"
              className="w-10 h-10 rounded-xl object-cover border border-[#D5A85A]/70 shadow-xs transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:block">
              <span className="block font-serif text-lg font-bold text-[#382D24] leading-tight">Our Travel Planner</span>
              <span className="block text-[11px] uppercase tracking-wider text-[#9C7E68] font-medium">Romantic Travel Journal</span>
            </div>
          </button>

          <div className="relative flex-1 min-w-0 max-w-[140px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm">
            <button
              id="nav-trip-selector-btn"
              type="button"
              onClick={() => setTripDropdownOpen((prev) => !prev)}
              className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#E2D4C3] text-xs sm:text-sm text-[#382D24] transition-all w-full text-left cursor-pointer shadow-2xs"
            >
              <span className="font-serif font-bold truncate">
                {currentTrip ? currentTrip.name : lang === 'vi' ? 'Chưa chọn' : 'No trip'}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${tripDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {tripDropdownOpen && (
              <div id="nav-trip-dropdown" className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-[#FFFDF9] border border-[#E2D4C3] rounded-2xl shadow-xl py-2 z-50">
                <div className="px-3.5 py-2 border-b border-[#F0E6D8] flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8C6D58]">
                    {lang === 'vi' ? 'Đổi chuyến đi' : 'Switch Journey'}
                  </span>
                  <button
                    id="nav-dropdown-new-trip-btn"
                    type="button"
                    onClick={() => {
                      setTripDropdownOpen(false);
                      onNewTrip();
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-[#6E4F36] bg-[#EFE6DB] px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Chuyến mới' : 'New Trip'}</span>
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-[#F6EFE6]">
                  {allTrips.map((trip) => (
                    <button
                      key={trip.id}
                      id={`trip-option-${trip.id}`}
                      type="button"
                      onClick={() => {
                        onSelectTrip(trip.id);
                        setTripDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#FAF7F2] cursor-pointer"
                    >
                      <p className="font-serif text-sm font-semibold text-[#382D24] truncate">{trip.name}</p>
                      <p className="text-xs text-[#8C6D58] truncate">{trip.destination}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />

            {!isConnectedToCloud ? (
              <button
                id="nav-connect-cloud-btn"
                type="button"
                onClick={onConnectGoogle}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFF3CD] border border-[#F6D88A] text-[#856404] text-xs font-semibold cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span className="text-[11px]">Đồng bộ sang ĐT</span>
              </button>
            ) : (
              <button
                id="nav-sync-indicator-btn"
                type="button"
                onClick={onForceCloudSync}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] text-xs cursor-pointer"
              >
                {syncStatus === 'syncing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Cloud'}</span>
              </button>
            )}

            <button
              id="nav-save-trip-btn"
              type="button"
              onClick={onManualSave}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'vi' ? 'Lưu' : 'Save'}</span>
            </button>

            <button
              id="nav-lang-btn"
              type="button"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border bg-[#FAF7F2] border-[#E8DEC8] text-[#6E4F36] cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>

            <button
              id="nav-settings-btn"
              type="button"
              onClick={openSettings}
              className={`hidden sm:flex p-2 rounded-xl border cursor-pointer ${activeTab === 'settings' ? 'bg-[#EFE6DB] border-[#D9CABB] text-[#382D24]' : 'bg-[#FAF7F2] border-[#E8DEC8] text-[#6E4F36]'}`}
              title={t.tabs.settings}
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            <button
              id="nav-logout-btn"
              type="button"
              onClick={onLogout}
              className="hidden sm:flex p-2 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] text-[#8C6D58] cursor-pointer"
              title={userEmail ? `${t.common.logout} (${userEmail})` : t.common.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              id="nav-mobile-menu-btn"
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-xl bg-[#FAF7F2] active:bg-[#EFE6DB] border border-[#E8DEC8] text-[#4A2F22] cursor-pointer shadow-2xs flex items-center justify-center"
              aria-label="Menu danh mục"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 py-2 border-t border-[#F2ECE1] overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                type="button"
                onClick={() => navigate(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer ${isActive ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] bg-[#FAF7F2]/60 hover:bg-[#F3ECE2]'}`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            id="nav-tab-settings"
            type="button"
            onClick={openSettings}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer ${activeTab === 'settings' ? 'bg-[#5C4033] text-white' : 'text-[#6E4F36] bg-[#FAF7F2]/60 hover:bg-[#F3ECE2]'}`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>{t.tabs.settings}</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="nav-mobile-menu" className="md:hidden bg-[#FFFDF9] border-t border-[#E8DEC8] px-4 py-3.5 space-y-3 shadow-xl max-h-[calc(100vh-4.5rem)] overflow-y-auto">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-[#F0E6D8]">
            <span className="text-xs font-semibold text-[#8C6D58] uppercase tracking-wider">
              {lang === 'vi' ? 'Danh mục màn hình' : 'Navigation Menu'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`mobile-menu-tab-${tab.id}`}
                  type="button"
                  onClick={() => navigate(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${isActive ? 'bg-[#5C4033] text-white' : 'text-[#5C4033] bg-[#FAF7F2]/80 border border-[#EFE6DB]'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <button
              id="mobile-menu-tab-settings"
              type="button"
              onPointerUp={openSettings}
              onClick={openSettings}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer touch-manipulation ${activeTab === 'settings' ? 'bg-[#5C4033] text-white' : 'text-[#5C4033] bg-[#FAF7F2]/80 border border-[#EFE6DB]'}`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>{t.tabs.settings}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#E8DEC8] grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-[#E8DEC8] bg-[#FAF7F2] text-[11px] font-semibold text-[#6E4F36] cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</span>
            </button>

            <button
              id="mobile-dark-mode-toggle"
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-[#E8DEC8] bg-[#FAF7F2] text-[11px] font-semibold text-[#6E4F36] cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? (lang === 'vi' ? 'Sáng' : 'Light') : lang === 'vi' ? 'Tối' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-[#E9BFB7] bg-[#FDF4F2] text-[11px] font-semibold text-[#B85340] cursor-pointer"
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
