import React, { useMemo, useState } from 'react';
import { AppData } from '../types';
import { Check, Mail, Plus, ShieldCheck, Trash2 } from 'lucide-react';

const MASTER_ADMIN = 'duonganhthu1505@gmail.com';

interface SettingsProps {
  appData?: AppData;
  userEmail: string | null;
  onExportData?: () => void;
  onImportData?: (data: AppData) => void;
  onUpdateAllowedEmails?: (emails: string[]) => void | Promise<void>;
  onResetSampleData?: () => void;
  onLogout?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onForceCloudSync?: () => void;
}

function normalizeEmails(values: unknown): string[] {
  const source = Array.isArray(values) ? values : [];
  return Array.from(
    new Set(
      [MASTER_ADMIN, ...source]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.includes('@'))
    )
  );
}

export const Settings: React.FC<SettingsProps> = ({
  appData,
  userEmail,
  onUpdateAllowedEmails,
  onShowToast,
}) => {
  const sourceEmails = useMemo(
    () => normalizeEmails(appData?.allowedEmails),
    [appData?.allowedEmails]
  );

  const [localEmails, setLocalEmails] = useState<string[] | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const emails = localEmails ?? sourceEmails;
  const normalizedUser = (userEmail || '').trim().toLowerCase();
  const isAdmin = normalizedUser === MASTER_ADMIN;

  const persist = async (nextValues: string[]) => {
    const next = normalizeEmails(nextValues);
    setLocalEmails(next);
    setIsSaving(true);
    try {
      await Promise.resolve(onUpdateAllowedEmails?.(next));
      setMessage('Đã cập nhật danh sách email được phép vào app.');
      onShowToast?.('Đã cập nhật phân quyền email.', 'success');
    } catch (error) {
      console.warn('Could not update allowed emails:', error);
      setMessage('Không thể lưu phân quyền. Vui lòng thử lại.');
      onShowToast?.('Không thể lưu phân quyền email.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addEmail = async () => {
    if (!isAdmin || isSaving) return;
    const email = newEmail.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      setMessage('Nhập địa chỉ Gmail/email hợp lệ.');
      return;
    }
    if (emails.includes(email)) {
      setMessage('Email này đã có trong danh sách.');
      return;
    }

    setNewEmail('');
    await persist([...emails, email]);
  };

  const removeEmail = async (email: string) => {
    if (!isAdmin || isSaving || email === MASTER_ADMIN) return;
    await persist(emails.filter((item) => item !== email));
  };

  return (
    <div id="settings-page" className="w-full max-w-3xl mx-auto space-y-5 pb-20">
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-7 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#9C7E68] font-semibold">
          Our Travel Planner
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24] mt-1">
          Cài đặt
        </h2>
        <p className="text-sm text-[#735D4E] mt-1">
          Quản lý tài khoản và quyền truy cập ứng dụng.
        </p>
      </div>

      <section className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFE6DB] flex items-center justify-center text-[#6E4F36]">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#8C6D58]">Email đang đăng nhập</p>
            <p className="text-sm font-semibold text-[#382D24] truncate">
              {userEmail || 'Chưa xác định'}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#6E4F36]" />
              <h3 className="font-semibold text-[#382D24]">Phân quyền Gmail / Email</h3>
            </div>
            <p className="text-xs text-[#8C6D58] mt-1">
              Chỉ email có trong danh sách mới được phép đăng nhập vào app.
            </p>
          </div>
          {isAdmin && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-[#E7F2E8] text-[#2F6636] font-semibold shrink-0">
              Quản trị viên
            </span>
          )}
        </div>

        {isAdmin ? (
          <div className="flex gap-2 mb-4">
            <input
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (message) setMessage('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addEmail();
              }}
              type="email"
              inputMode="email"
              placeholder="example@gmail.com"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#DCCFBE] bg-white text-sm text-[#382D24] outline-none focus:border-[#8C6D58]"
            />
            <button
              type="button"
              onClick={() => void addEmail()}
              disabled={isSaving}
              className="px-3.5 py-2.5 rounded-xl bg-[#5C4033] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm</span>
            </button>
          </div>
        ) : (
          <div className="mb-4 rounded-xl bg-[#FFF8E7] border border-[#F1D89A] px-3.5 py-3 text-xs text-[#7A5A16]">
            Chỉ {MASTER_ADMIN} được thêm hoặc xóa quyền truy cập.
          </div>
        )}

        <div className="space-y-2">
          {emails.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-[#FAF7F2] border border-[#EFE6DB]"
            >
              <div className="min-w-0 flex items-center gap-2">
                <Check className="w-4 h-4 text-[#4F7A56] shrink-0" />
                <span className="text-sm text-[#382D24] truncate">{email}</span>
              </div>

              {isAdmin && email !== MASTER_ADMIN && (
                <button
                  type="button"
                  onClick={() => void removeEmail(email)}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-[#B85340] hover:bg-[#FBEBE8] disabled:opacity-50"
                  aria-label={`Xóa ${email}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {message && (
          <p className="text-xs text-[#735D4E] mt-3">{message}</p>
        )}
      </section>
    </div>
  );
};
