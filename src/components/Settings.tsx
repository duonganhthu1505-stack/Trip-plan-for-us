import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Upload,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  Plus,
  Trash2,
  FileJson,
  Database,
  Cloud,
  RefreshCw,
  FolderHeart,
  ExternalLink,
  Globe,
  Moon,
  Sun
} from 'lucide-react';
import { AppData } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const MASTER_ADMIN_EMAIL = 'duonganhthu1505@gmail.com';
const THEME_KEY = 'app_theme';

interface SettingsProps {
  appData: AppData;
  userEmail: string | null;
  onExportData: () => void;
  onImportData: (data: AppData) => void;
  onUpdateAllowedEmails: (emails: string[]) => void;
  onResetSampleData: () => void;
  onLogout: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onForceCloudSync?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  appData,
  userEmail,
  onExportData,
  onImportData,
  onUpdateAllowedEmails,
  onLogout,
  onShowToast,
  onForceCloudSync
}) => {
  const { lang, setLang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailsList, setEmailsList] = useState<string[]>(appData.allowedEmails || []);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(THEME_KEY) === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');

    const themeColor = document.querySelector('meta[name="theme-color"]:not([media])');
    if (themeColor) {
      themeColor.setAttribute('content', isDarkMode ? '#1F1713' : '#FAF7F2');
    }
  }, [isDarkMode]);

  const handleManualCloudSync = async () => {
    if (!onForceCloudSync) return;
    setIsSyncingNow(true);
    try {
      await onForceCloudSync();
      onShowToast('Dữ liệu đã được đồng bộ lên Cloud thành công!', 'success');
    } catch {
      onShowToast('Lỗi khi đồng bộ lên Cloud.', 'error');
    } finally {
      setIsSyncingNow(false);
    }
  };

  const isAdmin = userEmail?.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onShowToast(
        'Chỉ quản trị viên duonganhthu1505@gmail.com mới có quyền phân quyền danh sách email.',
        'error'
      );
      return;
    }
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onShowToast('Vui lòng nhập địa chỉ email hợp lệ.', 'error');
      return;
    }
    if (emailsList.some((e) => e.trim().toLowerCase() === clean)) {
      onShowToast('Email này đã có trong danh sách được phép.', 'info');
      return;
    }
    const updated = [...emailsList, clean];
    setEmailsList(updated);
    onUpdateAllowedEmails(updated);
    setNewEmailInput('');
    onShowToast(`Đã thêm ${clean} vào danh sách được phép đăng nhập!`, 'success');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (!isAdmin) {
      onShowToast(
        'Chỉ quản trị viên duonganhthu1505@gmail.com mới có quyền xóa email.',
        'error'
      );
      return;
    }
    if (emailToRemove.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      onShowToast('Không thể xóa tài khoản Quản trị viên chính.', 'error');
      return;
    }
    const updated = emailsList.filter(
      (e) => e.trim().toLowerCase() !== emailToRemove.trim().toLowerCase()
    );
    setEmailsList(updated);
    onUpdateAllowedEmails(updated);
    onShowToast(`Đã xóa ${emailToRemove} khỏi danh sách được phép.`, 'info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.trips && typeof json.trips === 'object') {
          onImportData(json as AppData);
          onShowToast('Trip data successfully imported!', 'success');
        } else {
          onShowToast('Invalid JSON file format for Our Travel Planner.', 'error');
        }
      } catch (err) {
        console.error('Import parse error:', err);
        onShowToast('Error parsing JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalTrips = Object.keys(appData.trips).length;

  return (
    <div id="settings-page" className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
          <Shield className="w-3.5 h-3.5 text-[#C27D66]" />
          <span>{lang === 'vi' ? 'Cài đặt nhật ký & Lưu trữ' : 'Journal Settings & Storage'}</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
          {lang === 'vi' ? 'Tùy chọn & Quản lý dữ liệu' : 'Preferences & Data Control'}
        </h2>
        <p className="text-xs sm:text-sm text-[#735D4E] mt-1">
          {lang === 'vi'
            ? 'Xuất sao lưu, nạp dữ liệu cũ, xem trạng thái đồng bộ đám mây hoặc đăng xuất'
            : 'Export backup archives, import past trip journals, manage access whitelists, or sign out'}
        </p>

        {/* Current user banner */}
        <div className="mt-5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D4C3] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFE6DB] text-[#6E4F36] flex items-center justify-center font-bold text-sm">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-xs text-[#8C6D58]">
                {lang === 'vi' ? 'Tài khoản đang đăng nhập' : 'Currently Authenticated'}
              </p>
              <p className="text-sm font-semibold text-[#382D24]">
                {userEmail || (lang === 'vi' ? 'Khách ghé thăm' : 'Guest user')}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFFDF9] hover:bg-[#FBEBE8] border border-[#E2D4C3] hover:border-[#E9BFB7] text-[#8C6D58] hover:text-[#B85340] text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* Appearance & Language */}
      <div className="app-appearance-card" id="settings-appearance-card">
        <div className="app-appearance-copy">
          <div className="app-appearance-title">
            {lang === 'vi' ? 'Giao diện & Ngôn ngữ' : 'Appearance & Language'}
          </div>
          <div className="app-appearance-subtitle">
            {lang === 'vi'
              ? 'Tùy chỉnh giao diện riêng trên thiết bị này.'
              : 'Customize the look of this device.'}
          </div>
        </div>

        <div className="app-appearance-actions">
          <button
            id="settings-language-toggle"
            type="button"
            className="app-appearance-button"
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            title={lang === 'vi' ? 'Đổi sang English' : 'Switch to Tiếng Việt'}
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          </button>

          <button
            id="settings-dark-mode-toggle"
            type="button"
            className="app-appearance-button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            aria-pressed={isDarkMode}
            title={
              isDarkMode
                ? lang === 'vi' ? 'Chuyển sang chế độ sáng' : 'Switch to light mode'
                : lang === 'vi' ? 'Chuyển sang chế độ tối' : 'Switch to dark mode'
            }
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>
              {isDarkMode
                ? lang === 'vi' ? 'Chế độ sáng' : 'Light mode'
                : lang === 'vi' ? 'Chế độ tối' : 'Dark mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Cloud Sync & Cross-Device Access Section */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#F0E6D8] flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E3EFE5] text-[#2F6636]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#382D24]">
                  Đồng bộ Đám mây (Firebase Firestore)
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E3EFE5] text-[#2F6636]">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-[#8C6D58]">
                Tự động đồng bộ kế hoạch và nhật ký giữa điện thoại và máy tính ngay khi chỉnh sửa
              </p>
            </div>
          </div>

          {onForceCloudSync && (
            <button
              onClick={handleManualCloudSync}
              disabled={isSyncingNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DE] border border-[#D9CABB] text-xs font-medium text-[#5C4033] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin text-[#B07D62]' : ''}`} />
              <span>{isSyncingNow ? 'Đang đồng bộ...' : 'Đồng bộ lại dữ liệu'}</span>
            </button>
          )}
        </div>

        {/* Google Drive Photo Cloud Storage Card */}
        <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#CDE5D4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E3EFE5] text-[#2F6636] flex items-center justify-center shrink-0 mt-0.5">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-[#1E4D2B]">Kho Lưu Trữ Ảnh Google Drive</p>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#D1E7D7] text-[#1E4D2B] font-semibold">
                  Tự động phân thư mục
                </span>
              </div>
              <p className="text-[11px] text-[#3D6E4A] mt-0.5 leading-relaxed">
                Ảnh nhật ký chuyến đi được lưu trữ trực tiếp vào Google Drive của bạn (không bị giới hạn dung lượng Firebase), tự động tạo thư mục riêng theo từng chuyến đi.
              </p>
            </div>
          </div>
          <a
            href="https://drive.google.com/drive/u/3/folders/1oAOGOMlP7REIMCp8PvnkTCZYMOapJLwt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2F6636] hover:bg-[#23502A] text-white text-xs font-medium shrink-0 transition-colors shadow-2xs self-start sm:self-center"
          >
            <span>Mở Google Drive</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Data Export & Import Section */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-[#F0E6D8]">
          <Database className="w-5 h-5 text-[#8C6D58]" />
          <div>
            <h3 className="font-serif text-lg font-bold text-[#382D24]">
              {lang === 'vi' ? 'Sao lưu & Di chuyển dữ liệu' : 'Data Backup & Migration'}
            </h3>
            <p className="text-xs text-[#8C6D58]">
              {lang === 'vi'
                ? 'Lưu trữ ngoại tuyến an toàn trên thiết bị cùng đồng bộ đám mây Firebase tức thì.'
                : 'Seamless offline-first persistence with LocalStorage, easily portable to Firebase / Supabase.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export */}
          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E2D4C3] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#5C4033] font-semibold text-sm mb-1">
                <Download className="w-4 h-4" />
                <span>{lang === 'vi' ? 'Xuất tệp sao lưu dữ liệu' : 'Export Journal Archive'}</span>
              </div>
              <p className="text-xs text-[#735D4E] leading-relaxed">
                {lang === 'vi'
                  ? `Tải xuống tệp JSON hoàn chỉnh chứa toàn bộ ${totalTrips} chuyến đi, lịch trình, chi tiêu, địa điểm và danh sách đồ dùng.`
                  : `Download a complete JSON file containing all ${totalTrips} trips, itineraries, budget records, wishlist spots, and checklists.`}
              </p>
            </div>
            <button
              id="settings-export-btn"
              onClick={onExportData}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileJson className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Tải bản sao lưu (JSON)' : 'Export Data (JSON)'}</span>
            </button>
          </div>

          {/* Import */}
          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E2D4C3] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#5C4033] font-semibold text-sm mb-1">
                <Upload className="w-4 h-4" />
                <span>{lang === 'vi' ? 'Khôi phục dữ liệu từ tệp' : 'Import Journal Archive'}</span>
              </div>
              <p className="text-xs text-[#735D4E] leading-relaxed">
                {lang === 'vi'
                  ? 'Khôi phục hoặc nạp dữ liệu kế hoạch du lịch từ tệp JSON đã sao lưu vào trình duyệt.'
                  : 'Restore or load saved travel planner data from an exported JSON file into your browser.'}
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="import-file-input"
              />
              <button
                id="settings-import-btn"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FFFDF9] hover:bg-[#EFE8DE] border border-[#D9CABB] text-[#382D24] text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Upload className="w-4 h-4 text-[#8C6D58]" />
                <span>{lang === 'vi' ? 'Nhập dữ liệu (JSON)' : 'Import Data (JSON)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Authorized Email Whitelist Management */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0E6D8]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isAdmin ? 'bg-[#EFE6DB] text-[#5C4033]' : 'bg-[#F2ECE4] text-[#8C6D58]'
              }`}
            >
              {isAdmin ? (
                <ShieldCheck className="w-5 h-5 text-[#2F6636]" />
              ) : (
                <Lock className="w-5 h-5 text-[#8C6D58]" />
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#382D24] flex items-center gap-2">
                <span>Phân Quyền Email Đăng Nhập</span>
                {isAdmin ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E3EFE5] text-[#2F6636] font-semibold">
                    Quản trị viên chính
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F2ECE4] text-[#8C6D58] font-semibold">
                    Chỉ xem
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#8C6D58]">
                {isAdmin
                  ? 'Chỉ bạn (duonganhthu1505@gmail.com) mới có quyền cấp phép hoặc thu hồi quyền truy cập web.'
                  : 'Chỉ có gmail duonganhthu1505@gmail.com mới được phân quyền mail nào được đăng nhập vào web.'}
              </p>
            </div>
          </div>
        </div>

        {!isAdmin && (
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D4C3] flex items-start gap-3">
            <Lock className="w-4 h-4 text-[#8C6D58] mt-0.5 shrink-0" />
            <div className="text-xs text-[#735D4E] leading-relaxed">
              <p className="font-semibold text-[#382D24] mb-0.5">Quyền hạn bị giới hạn</p>
              <p>
                Bạn đang đăng nhập bằng <span className="font-bold text-[#382D24]">{userEmail || 'tài khoản'}</span>.
                Tính năng phân quyền email đăng nhập chỉ dành riêng cho quản trị viên:{' '}
                <span className="font-bold text-[#5C4033]">duonganhthu1505@gmail.com</span>.
              </p>
            </div>
          </div>
        )}

        {isAdmin && (
          <form onSubmit={handleAddEmail} className="space-y-2">
            <label className="block text-xs font-semibold text-[#6E4F36] uppercase tracking-wider">
              Cấp quyền đăng nhập cho email mới
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                placeholder="Nhập địa chỉ Gmail muốn phân quyền (ví dụ: friend@gmail.com)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58]"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Cấp quyền</span>
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8C6D58]">
            Danh sách email được phép đăng nhập ({emailsList.length}):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {emailsList.map((email) => {
              const isCurrentUser = userEmail?.toLowerCase() === email.toLowerCase();
              const isMaster = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

              return (
                <div
                  key={email}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs text-[#382D24] ${
                    isMaster ? 'bg-[#FFFDF9] border-[#D9CABB]' : 'bg-[#FAF7F2] border-[#E2D4C3]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isMaster ? 'bg-[#2F6636]' : 'bg-[#6E4F36]'
                      }`}
                    />
                    <span className="font-medium truncate">{email}</span>
                    {isMaster && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#E3EFE5] text-[#2F6636] rounded font-semibold shrink-0">
                        Quản trị viên
                      </span>
                    )}
                    {isCurrentUser && !isMaster && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#EFE8DE] text-[#6E4F36] rounded font-semibold shrink-0">
                        Bạn
                      </span>
                    )}
                  </div>

                  {isAdmin && !isMaster && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="p-1 text-[#8C6D58] hover:text-[#B85340] rounded hover:bg-[#FBEBE8] transition-colors cursor-pointer ml-2 shrink-0"
                      title="Thu hồi quyền truy cập"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
