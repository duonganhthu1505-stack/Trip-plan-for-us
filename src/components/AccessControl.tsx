import React, { useEffect, useMemo, useState } from 'react';
import { AppData } from '../types';
import { getRemoteAllowedEmails } from '../utils/firestoreService';
import { Check, Mail, Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';

const MASTER_ADMIN = 'duonganhthu1505@gmail.com';

interface AccessControlProps {
  appData?: AppData;
  userEmail: string | null;
  onUpdateAllowedEmails?: (emails: string[]) => void | Promise<void>;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onClose: () => void;
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

/**
 * Independent "Phân quyền" (access control) screen.
 *
 * It intentionally uses the plain email-only identity the app already has: the master
 * administrator is recognised by the email typed on the login screen. There is no Google
 * popup, no password and no second sign-in step here.
 */
export const AccessControl: React.FC<AccessControlProps> = ({
  appData,
  userEmail,
  onUpdateAllowedEmails,
  onShowToast,
  onClose,
}) => {
  const sourceEmails = useMemo(
    () => normalizeEmails(appData?.allowedEmails),
    [appData?.allowedEmails]
  );
  const [localEmails, setLocalEmails] = useState<string[] | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const emails = localEmails ?? sourceEmails;
  const isAdmin = (userEmail || '').trim().toLowerCase() === MASTER_ADMIN;

  // Always show the list that is actually stored in the cloud, so the administrator
  // edits the same list every device reads at login time.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsRefreshing(true);
      try {
        const remote = await getRemoteAllowedEmails();
        if (!cancelled && remote && remote.length > 0) {
          setLocalEmails(normalizeEmails(remote));
        }
      } catch (error) {
        console.warn('Could not read the remote permission list:', error);
        if (!cancelled) {
          setMessage('Chưa đọc được danh sách trên Cloud. Đang hiển thị danh sách lưu trên thiết bị này.');
        }
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div
      id="access-control-overlay"
      className="fixed inset-0 z-50 bg-[#3D312A]/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div id="access-control-panel" className="w-full max-w-2xl my-8 sm:my-0 bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#EFE6DB]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9C7E68] font-semibold">Our Travel Planner</p>
            <h2 className="font-serif text-2xl font-bold text-[#382D24] mt-1">Phân quyền</h2>
            <p className="text-xs text-[#8C6D58] mt-1">Quản lý email được phép truy cập ứng dụng.</p>
          </div>
          <button id="access-control-close-btn" type="button" onClick={onClose} className="p-2 rounded-xl border border-[#E8DEC8] text-[#6E4F36] bg-[#FAF7F2] hover:bg-[#F3ECE2] transition-colors cursor-pointer" aria-label="Đóng phân quyền">
            <X className="w-4 h-4" />
          </button>
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
                  <ShieldCheck className="w-5 h-5 text-[#6E4F36]" />
                  <h3 className="font-semibold text-[#382D24]">Email được phép vào app</h3>
                </div>
                <p className="text-xs text-[#8C6D58] mt-1">Chỉ các email trong danh sách này mới được đăng nhập.</p>
              </div>
              {isRefreshing ? (
                <span className="text-[10px] px-2 py-1 rounded-full bg-[#F3ECE2] text-[#8C6D58] font-semibold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải
                </span>
              ) : (
                isAdmin && <span className="text-[10px] px-2 py-1 rounded-full bg-[#E7F2E8] text-[#2F6636] font-semibold">Quản trị viên</span>
              )}
            </div>

            {isAdmin ? (
              <div className="flex gap-2 mb-4">
                <input
                  id="access-control-new-email-input"
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
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#DCCFBE] bg-[#FFFDF9] text-sm text-[#382D24] outline-none focus:border-[#8C6D58]"
                />
                <button id="access-control-add-btn" type="button" onClick={() => void addEmail()} disabled={isSaving} className="px-3.5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" /> {isSaving ? 'Đang lưu...' : 'Thêm'}
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
                    <button type="button" onClick={() => void removeEmail(email)} disabled={isSaving} className="p-1.5 rounded-lg text-[#B85340] hover:bg-[#FBEBE8] disabled:opacity-50 transition-colors cursor-pointer" aria-label={`Xóa ${email}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {message && <p className="text-xs text-[#735D4E] mt-3">{message}</p>}
          </section>
        </div>
      </div>
    </div>
  );
};
