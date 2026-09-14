import React, { useEffect, useMemo, useState } from 'react';
import { AppData } from '../types';
import { auth } from '../firebase';
import { getRemoteAllowedEmails, saveRemoteAllowedEmails } from '../utils/firestoreService';
import { loadAppData, saveAppData } from '../utils/storage';
import { Check, Mail, Plus, ShieldCheck, Trash2, X } from 'lucide-react';

const MASTER_ADMIN = 'duonganhthu1505@gmail.com';

interface SettingsProps {
  appData?: AppData;
  userEmail: string | null;
  onExportData?: () => void;
  onImportData?: (data: AppData) => void;
  onUpdateAllowedEmails?: (emails: string[]) => void;
  onResetSampleData?: () => void;
  onLogout?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onForceCloudSync?: () => void;
  onClose?: () => void;
  onConnectGoogle?: () => void;
}

function normalizeEmails(values: unknown): string[] {
  if (!Array.isArray(values)) return [MASTER_ADMIN];
  return Array.from(
    new Set(
      [MASTER_ADMIN, ...values]
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
  onClose,
  onConnectGoogle,
}) => {
  const initialEmails = useMemo(() => {
    const source = appData || loadAppData();
    return normalizeEmails(source.allowedEmails);
  }, [appData]);

  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const normalizedUser = (userEmail || '').trim().toLowerCase();
  const isAdmin = normalizedUser === MASTER_ADMIN;
  const hasRealGoogleSession = auth.currentUser?.email?.trim().toLowerCase() === MASTER_ADMIN;

  useEffect(() => {
    let alive = true;
    getRemoteAllowedEmails()
      .then((remote) => {
        if (!alive || !remote?.length) return;
        setEmails(normalizeEmails(remote));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const persistLocal = (next: string[]) => {
    const current = loadAppData();
    saveAppData({ ...current, allowedEmails: next });
  };

  const savePermissions = async (nextEmails: string[]) => {
    const cleaned = normalizeEmails(nextEmails);
    setEmails(cleaned);
    persistLocal(cleaned);

    if (onUpdateAllowedEmails) {
      await Promise.resolve(onUpdateAllowedEmails(cleaned));
      setMessage('Đã cập nhật danh sách email được phép truy cập.');
      onShowToast?.('Đã cập nhật phân quyền email.', 'success');
      return;
    }

    if (!hasRealGoogleSession || !auth.currentUser) {
      setMessage('Đã lưu trên máy. Kết nối Google bằng tài khoản quản trị để đồng bộ quyền cho mọi thiết bị.');
      onShowToast?.('Đã lưu cục bộ. Kết nối Google để đồng bộ phân quyền.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      await saveRemoteAllowedEmails(cleaned, auth.currentUser);
      setMessage('Đã đồng bộ phân quyền lên Cloud.');
      onShowToast?.('Đã đồng bộ phân quyền email lên Cloud.', 'success');
    } catch (error) {
      console.warn('Save access permissions failed:', error);
      setMessage('Không thể đồng bộ phân quyền lên Cloud.');
      onShowToast?.('Không thể đồng bộ phân quyền email.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!isAdmin) return;
    if (!email || !email.includes('@')) {
      setMessage('Nhập địa chỉ Gmail/email hợp lệ.');
      return;
    }
    if (emails.includes(email)) {
      setMessage('Email này đã có trong danh sách.');
      return;
    }
    setNewEmail('');
    await savePermissions([...emails, email]);
  };

  const removeEmail = async (email: string) => {
    if (!isAdmin || email === MASTER_ADMIN) return;
    await savePermissions(emails.filter((item) => item !== email));
  };

  return (
    <div id="settings-page" className="w-full max-w-2xl mx-auto">
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#EFE6DB]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9C7E68] font-semibold">Our Travel Planner</p>
            <h2 className="font-serif text-2xl font-bold text-[#382D24] mt-1">Cài đặt</h2>
            <p className="text-xs text-[#8C6D58] mt-1">Tài khoản & phân quyền truy cập ứng dụng</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="p-2 rounded-xl border border-[#E8DEC8] text-[#6E4F36] bg-[#FAF7F2]" aria-label="Đóng cài đặt">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <section className="rounded-2xl border border-[#EFE6DB] bg-[#FAF7F2]/70 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFE6DB] flex items-center justify-center text-[#6E4F36]">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#8C6D58]">Email đang đăng nhập</p>
                <p className="text-sm font-semibold text-[#382D24] truncate">{userEmail || 'Chưa xác định'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8DEC8] bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#6E4F36]" />
                  <h3 className="font-semibold text-[#382D24]">Phân quyền Gmail / Email</h3>
                </div>
                <p className="text-xs text-[#8C6D58] mt-1">Chỉ các email trong danh sách này mới được phép vào app.</p>
              </div>
              {isAdmin && <span className="text-[10px] px-2 py-1 rounded-full bg-[#E7F2E8] text-[#2F6636] font-semibold">Quản trị viên</span>}
            </div>

            {isAdmin ? (
              <div className="flex gap-2 mb-4">
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addEmail();
                  }}
                  placeholder="example@gmail.com"
                  inputMode="email"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#DCCFBE] bg-[#FFFDF9] text-sm text-[#382D24] outline-none focus:border-[#8C6D58]"
                />
                <button
                  type="button"
                  onClick={() => void addEmail()}
                  disabled={isSaving}
                  className="px-3.5 py-2.5 rounded-xl bg-[#5C4033] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" /> Thêm
                </button>
              </div>
            ) : (
              <div className="mb-4 rounded-xl bg-[#FFF8E7] border border-[#F1D89A] px-3 py-2.5 text-xs text-[#7A5A16]">
                Chỉ {MASTER_ADMIN} được thêm hoặc xóa email.
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {emails.map((email) => (
                <div key={email} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EFE6DB]">
                  <div className="min-w-0 flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#4F7A56] shrink-0" />
                    <span className="text-sm text-[#382D24] truncate">{email}</span>
                  </div>
                  {isAdmin && email !== MASTER_ADMIN && (
                    <button type="button" onClick={() => void removeEmail(email)} disabled={isSaving} className="p-1.5 rounded-lg text-[#B85340] hover:bg-[#FBEBE8] disabled:opacity-50" aria-label={`Xóa ${email}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && !hasRealGoogleSession && onConnectGoogle && (
              <button type="button" onClick={onConnectGoogle} className="mt-4 w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF7F2] text-[#5C4033] text-sm font-semibold">
                Kết nối Google quản trị để đồng bộ phân quyền
              </button>
            )}

            {message && <p className="text-xs text-[#735D4E] mt-3">{message}</p>}
          </section>
        </div>
      </div>
    </div>
  );
};
