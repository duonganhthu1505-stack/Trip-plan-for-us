import React, { useRef, useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { AppData } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const MASTER_ADMIN_EMAIL = 'duonganhthu1505@gmail.com';

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
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailsList, setEmailsList] = useState<string[]>(appData.allowedEmails || []);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const isAdmin = userEmail?.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
  const totalTrips = Object.keys(appData.trips || {}).length;

  const handleManualCloudSync = async () => {
    if (!onForceCloudSync || isSyncingNow) return;
    setIsSyncingNow(true);
    try {
      await onForceCloudSync();
    } catch {
      onShowToast('Lỗi khi đồng bộ lên Cloud.', 'error');
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const clean = newEmailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onShowToast('Vui lòng nhập địa chỉ email hợp lệ.', 'error');
      return;
    }
    if (emailsList.some((email) => email.trim().toLowerCase() === clean)) {
      onShowToast('Email này đã có trong danh sách được phép.', 'info');
      return;
    }

    const updated = [...emailsList, clean];
    setEmailsList(updated);
    onUpdateAllowedEmails(updated);
    setNewEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (!isAdmin) return;
    if (emailToRemove.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) return;

    const updated = emailsList.filter(
      (email) => email.trim().toLowerCase() !== emailToRemove.trim().toLowerCase()
    );
    setEmailsList(updated);
    onUpdateAllowedEmails(updated);
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
        } else {
          onShowToast('File JSON không đúng định dạng.', 'error');
        }
      } catch {
        onShowToast('Không thể đọc file JSON.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div id="settings-page" className="max-w-4xl mx-auto space-y-6 pb-20">
      <section className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-8 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
          <Shield className="w-3.5 h-3.5 text-[#C27D66]" />
          <span>{lang === 'vi' ? 'Cài đặt' : 'Settings'}</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
          {lang === 'vi' ? 'Quản lý dữ liệu & tài khoản' : 'Data & Account Management'}
        </h2>

        <div className="mt-5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D4C3] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[#8C6D58]">{lang === 'vi' ? 'Tài khoản đang đăng nhập' : 'Signed in account'}</p>
            <p className="text-sm font-semibold text-[#382D24] truncate">{userEmail || 'Guest'}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#E2D4C3] text-[#B85340] text-xs font-medium cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
          </button>
        </div>
      </section>

      <section className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-[#E3EFE5] text-[#2F6636] shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-bold text-[#382D24]">Đồng bộ Cloud</h3>
              <p className="text-xs text-[#8C6D58]">Firebase Firestore • đồng bộ dữ liệu giữa các thiết bị</p>
            </div>
          </div>
          {onForceCloudSync && (
            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={isSyncingNow}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-xs font-medium text-[#5C4033] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? 'Đang đồng bộ...' : 'Đồng bộ lại dữ liệu'}</span>
            </button>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#CDE5D4] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FolderHeart className="w-5 h-5 text-[#2F6636] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1E4D2B]">Kho ảnh Google Drive</p>
              <p className="text-[11px] text-[#3D6E4A]">Ảnh nhật ký được lưu theo từng chuyến đi.</p>
            </div>
          </div>
          <a
            href="https://drive.google.com/drive/u/3/folders/1oAOGOMlP7REIMCp8PvnkTCZYMOapJLwt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#2F6636] text-white text-xs font-medium shrink-0"
          >
            <span>Mở</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      <section className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#8C6D58]" />
          <div>
            <h3 className="font-serif text-lg font-bold text-[#382D24]">Sao lưu dữ liệu</h3>
            <p className="text-xs text-[#8C6D58]">Hiện có {totalTrips} chuyến đi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            id="settings-export-btn"
            type="button"
            onClick={onExportData}
            className="py-3 px-4 rounded-xl bg-[#5C4033] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileJson className="w-4 h-4" />
            <Download className="w-4 h-4" />
            <span>Xuất JSON</span>
          </button>

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
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-[#382D24] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Nhập JSON</span>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#EFE6DB] text-[#5C4033] shrink-0">
            {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#382D24]">Phân quyền Email</h3>
            <p className="text-xs text-[#8C6D58]">
              {isAdmin ? 'Quản lý email được phép truy cập web.' : 'Chỉ quản trị viên chính có thể chỉnh sửa danh sách.'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <form onSubmit={handleAddEmail} className="flex gap-2">
            <input
              type="email"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              placeholder="email@gmail.com"
              className="min-w-0 flex-1 px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24]"
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-[#5C4033] text-white text-xs font-medium cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm</span>
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {emailsList.map((email) => {
            const isMaster = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
            return (
              <div
                key={email}
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#E2D4C3] text-xs text-[#382D24]"
              >
                <span className="font-medium truncate">{email}</span>
                {isAdmin && !isMaster && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="p-1.5 text-[#B85340] rounded-lg cursor-pointer shrink-0"
                    title="Thu hồi quyền truy cập"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
