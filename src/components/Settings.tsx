import React from 'react';
import { AppData } from '../types';

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

export const Settings: React.FC<SettingsProps> = () => {
  return (
    <div id="settings-page" className="max-w-4xl mx-auto pb-20">
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 shadow-2xs">
        <p className="text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
          Cài đặt
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
          Màn hình kiểm tra
        </h2>
        <p className="text-sm text-[#735D4E] mt-2">
          Nếu bạn nhìn thấy màn hình này và vẫn bấm được menu, lỗi nằm trong nội dung Cài đặt cũ chứ không phải Navigation/App.
        </p>
      </div>
    </div>
  );
};
