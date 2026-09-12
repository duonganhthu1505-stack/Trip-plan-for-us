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
  RefreshCw
} from 'lucide-react';
import { TripInfo } from '../types';

export type ActiveTab =
  | 'overview'
  | 'info'
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
  onConnectGoogle
}) => {
  const [tripDropdownOpen, setTripDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainTabs = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'info' as ActiveTab, label: 'Trip Info', icon: Info },
    { id: 'itinerary' as ActiveTab, label: 'Itinerary', icon: Calendar },
    { id: 'budget' as ActiveTab, label: 'Budget', icon: DollarSign },
    { id: 'places' as ActiveTab, label: 'Places', icon: MapPin },
    { id: 'checklist' as ActiveTab, label: 'Checklist', icon: CheckSquare },
    { id: 'notes' as ActiveTab, label: 'Notes', icon: FileText }
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
              <div className="w-10 h-10 rounded-xl bg-[#EFE6DB] border border-[#DFD1C0] text-[#6E4F36] flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
                <Compass className="w-5 h-5 stroke-[1.75]" />
              </div>
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
          <div className="relative shrink min-w-0 max-w-[260px] sm:max-w-xs md:max-w-sm">
            <button
              id="nav-trip-selector-btn"
              type="button"
              onClick={() => setTripDropdownOpen(!tripDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#E2D4C3] text-xs sm:text-sm text-[#382D24] transition-all w-full text-left cursor-pointer shadow-2xs"
            >
              <div className="truncate flex items-center gap-1.5">
                <span className="text-[#8C6D58] hidden md:inline font-medium">Our Trips:</span>
                <span className="font-serif font-bold text-[#382D24] truncate">
                  {currentTrip ? currentTrip.name : 'No trip selected'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#8C6D58] shrink-0 transition-transform ${tripDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Trip Dropdown menu */}
            {tripDropdownOpen && (
              <div
                id="nav-trip-dropdown"
                className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-[#FFFDF9] border border-[#E2D4C3] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in"
              >
                <div className="px-3.5 py-2 border-b border-[#F0E6D8] flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8C6D58]">
                    Switch Journey
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
                    <span>New Trip</span>
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-[#F6EFE6]">
                  {allTrips.map((t) => {
                    const isSelected = currentTrip?.id === t.id;
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
                          {t.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Real-time Cloud Sync Badge or Connect Cloud Button */}
            {!isConnectedToCloud ? (
              <button
                id="nav-connect-cloud-btn"
                type="button"
                onClick={onConnectGoogle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFF3CD] hover:bg-[#FFEBAA] active:scale-[0.98] border border-[#F6D88A] text-[#856404] text-xs font-semibold shadow-2xs transition-all cursor-pointer animate-pulse"
                title="Nhấn để kết nối Google & đồng bộ dữ liệu sang điện thoại ngay!"
              >
                <Cloud className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="text-[11px] font-semibold">Đồng bộ sang ĐT</span>
              </button>
            ) : (
              <div
                id="nav-sync-indicator"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] text-xs"
                title={
                  syncStatus === 'syncing'
                    ? 'Đang đồng bộ dữ liệu lên Cloud...'
                    : syncStatus === 'offline'
                    ? 'Đang hoạt động offline'
                    : 'Đã kết nối Cloud • Đồng bộ thời gian thực giữa ĐT & Máy tính'
                }
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#B07D62] animate-spin" />
                    <span className="text-[#8C6D58] font-medium text-[11px]">Đang đồng bộ...</span>
                  </>
                ) : syncStatus === 'offline' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#A68972]" />
                    <span className="text-[#8C6D58] font-medium text-[11px]">Offline</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#34A853] animate-pulse" />
                    <Cloud className="w-3.5 h-3.5 text-[#34A853]" />
                    <span className="text-[#382D24] font-medium text-[11px]">Đồng bộ ĐT & Web</span>
                  </>
                )}
              </div>
            )}

            {/* Save Current Trip button */}
            <button
              id="nav-save-trip-btn"
              onClick={onManualSave}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
              title="Save Trip data to storage"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Save Trip</span>
            </button>

            {/* Settings button */}
            <button
              id="nav-settings-btn"
              onClick={() => onSelectTab('settings')}
              className={`p-2 rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#EFE6DB] border-[#D9CABB] text-[#382D24]'
                  : 'bg-[#FAF7F2] border-[#E8DEC8] text-[#6E4F36] hover:bg-[#F3ECE2]'
              }`}
              title="Settings & Data Management"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Logout button */}
            <button
              id="nav-logout-btn"
              onClick={onLogout}
              className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#FBEBE8] border border-[#E8DEC8] hover:border-[#E9BFB7] text-[#8C6D58] hover:text-[#B85340] text-xs sm:text-sm transition-colors cursor-pointer"
              title={userEmail ? `Sign out (${userEmail})` : 'Sign out'}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu toggle */}
            <button
              id="nav-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] text-[#6E4F36] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
              title="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Tab Bar */}
        <div className="hidden md:flex items-center space-x-1 py-2 border-t border-[#F2ECE1] overflow-x-auto">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#5C4033] text-[#FFFDF9] shadow-2xs font-semibold'
                    : 'text-[#6E4F36] hover:bg-[#F3ECE2] hover:text-[#382D24]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FAF7F2]' : 'text-[#8C6D58]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div id="nav-mobile-menu" className="md:hidden bg-[#FFFDF9] border-t border-[#E8DEC8] px-4 py-3 space-y-2 animate-in slide-in-from-top-2">
          {!isConnectedToCloud && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onConnectGoogle) onConnectGoogle();
              }}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FFF3CD] border border-[#F6D88A] text-[#856404] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-[#D97706]" />
              <span>Đồng bộ sang Điện thoại (Kết nối Google)</span>
            </button>
          )}
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-tab-${tab.id}`}
                onClick={() => {
                  onSelectTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#5C4033] text-white'
                    : 'text-[#6E4F36] hover:bg-[#F3ECE2]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8C6D58]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Item 1 & 8 Requirement) */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E8DEC8] px-2 py-1.5 flex items-center justify-around shadow-lg">
        {[
          { id: 'overview' as ActiveTab, label: 'Overview', icon: LayoutDashboard },
          { id: 'itinerary' as ActiveTab, label: 'Itinerary', icon: Calendar },
          { id: 'budget' as ActiveTab, label: 'Budget', icon: DollarSign },
          { id: 'places' as ActiveTab, label: 'Places', icon: MapPin },
          { id: 'checklist' as ActiveTab, label: 'Pack', icon: CheckSquare }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors cursor-pointer min-w-[56px] min-h-[44px] ${
                isActive ? 'text-[#5C4033]' : 'text-[#8C6D58] hover:text-[#382D24]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
              <span className={`text-[10px] mt-0.5 whitespace-nowrap ${isActive ? 'font-bold text-[#5C4033]' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
