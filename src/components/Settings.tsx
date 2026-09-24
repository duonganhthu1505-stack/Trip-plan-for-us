import React, { useRef, useState } from 'react';
import {
  Download,
  Upload,
  Shield,
  Lock,
  RotateCcw,
  LogOut,
  FileJson,
  Database,
  KeyRound
} from 'lucide-react';
import { AppData } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

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
  onChangeSharedPassword: (newPassword: string) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  appData,
  userEmail,
  onExportData,
  onImportData,
  onUpdateAllowedEmails,
  onResetSampleData,
  onLogout,
  onShowToast,
  onChangeSharedPassword
}) => {
  const { t, lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
            ? 'Xuất sao lưu, nạp dữ liệu cũ, quản lý quyền truy cập hoặc đăng xuất'
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
                ? 'Xuất hoặc khôi phục bản sao dữ liệu hành trình bằng tệp JSON.'
                : 'Export or restore your travel journal backup using a JSON file.'}
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

        {/* Reset sample data */}
        <div className="pt-4 border-t border-[#F2ECE1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-[#382D24]">
              {lang === 'vi' ? 'Khôi phục dữ liệu mẫu ban đầu' : 'Restore Sample Trips'}
            </p>
            <p className="text-[#8C6D58]">
              {lang === 'vi'
                ? 'Nạp lại chuyến đi mẫu Sài Gòn & Đà Lạt nguyên bản'
                : 'Load the default Saigon Couple Trip & Da Lat Escape demo data'}
            </p>
          </div>
          <button
            id="settings-reset-sample-btn"
            onClick={onResetSampleData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Đặt lại dữ liệu mẫu' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Shared password */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-[#F0E6D8]">
          <div className="p-2 rounded-xl bg-[#EFE6DB] text-[#5C4033]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#382D24]">Mật khẩu chung</h3>
            <p className="text-xs text-[#8C6D58]">Hai thiết bị dùng chung một mật khẩu. Đổi tại đây sẽ áp dụng cho cả hai.</p>
          </div>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!newPassword || newPassword.length < 6) {
            onShowToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
            return;
          }
          if (newPassword !== confirmPassword) {
            onShowToast('Mật khẩu xác nhận không khớp.', 'error');
            return;
          }
          try {
            await onChangeSharedPassword(newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          } catch {}
        }} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#6E4F36] mb-1.5">Mật khẩu hiện tại</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Không cần nhập lại nếu đang đăng nhập" disabled className="w-full px-4 py-2.5 rounded-xl bg-[#F2ECE4] border border-[#E2D4C3] text-sm text-[#382D24]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6E4F36] mb-1.5">Mật khẩu mới</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6E4F36] mb-1.5">Xác nhận mật khẩu mới</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs font-medium transition-colors">Đổi mật khẩu chung</button>
        </form>
      </div>
    </div>
  );
};