import React, { useState } from 'react';
import { Heart, Lock, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { getRemoteAllowedEmails } from '../utils/firestoreService';

interface LoginProps {
  allowedEmails: string[];
  onLoginSuccess: (email: string) => void;
  onOfflineMode: () => void;
}

const MASTER_ADMIN = 'duonganhthu1505@gmail.com';

export const Login: React.FC<LoginProps> = ({ allowedEmails, onLoginSuccess, onOfflineMode }) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const getCurrentAllowedEmails = async (): Promise<string[]> => {
    try {
      const remote = await getRemoteAllowedEmails();
      if (remote?.length) {
        return Array.from(
          new Set(
            [MASTER_ADMIN, ...remote]
              .filter((value): value is string => typeof value === 'string')
              .map((value) => value.trim().toLowerCase())
          )
        );
      }
    } catch (error) {
      console.warn('Could not refresh access permissions:', error);
    }

    return Array.from(
      new Set(
        [MASTER_ADMIN, ...(allowedEmails || [])]
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim().toLowerCase())
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setIsSigningIn(true);
    setErrorMsg(null);

    try {
      const currentAllowed = await getCurrentAllowedEmails();
      const isAllowed = cleanEmail === MASTER_ADMIN || currentAllowed.includes(cleanEmail);

      if (!isAllowed) {
        setErrorMsg(`Email "${cleanEmail}" chưa được cấp quyền truy cập. Vui lòng liên hệ quản trị viên.`);
        return;
      }

      onLoginSuccess(cleanEmail);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleOfflineMode = () => {
    const cleanEmail = emailInput.trim().toLowerCase() || MASTER_ADMIN;
    const localAllowed = [MASTER_ADMIN, ...(allowedEmails || [])].map((e) => e.trim().toLowerCase());
    const isAllowed = cleanEmail === MASTER_ADMIN || localAllowed.includes(cleanEmail);
    if (!isAllowed) {
      setErrorMsg(`Email "${cleanEmail}" chưa được cấp quyền truy cập.`);
      return;
    }
    onOfflineMode();
  };

  return (
    <div id="login-page" className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center p-4 sm:p-6 text-[#3D312A] relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#EFE6DB] blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#EADCCB] blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img
            src="/pwa-192x192.png"
            alt="Our Travel Planner Icon"
            className="w-20 h-20 rounded-2xl shadow-lg mb-4 border-2 border-[#D69B3D]/70 object-cover inline-block"
          />
          <div className="flex items-center justify-center gap-1.5 text-xs tracking-wider uppercase text-[#8C6D58] font-medium mb-1.5">
            <Heart className="w-3.5 h-3.5 fill-[#C27D66] text-[#C27D66]" />
            <span>Sổ Tay Du Lịch & Hành Trình Kỷ Niệm</span>
            <Heart className="w-3.5 h-3.5 fill-[#C27D66] text-[#C27D66]" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#382D24] tracking-tight">Our Travel Planner</h1>
          <p className="text-sm text-[#735D4E] mt-2 max-w-xs mx-auto leading-relaxed">
            Lưu giữ từng con đường, quán cà phê và khoảnh khắc hoàng hôn cùng nhau.
          </p>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-7 sm:p-8 shadow-md">
          <div className="flex items-center gap-2 pb-5 mb-5 border-b border-[#F0E6D8]">
            <Lock className="w-4 h-4 text-[#8C6D58]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#5C4033]">Đăng Nhập Sổ Tay</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1.5">
                Nhập địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A68972] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Nhập email của bạn..."
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] placeholder-[#A69585] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] transition-all"
                />
              </div>
            </div>

            {errorMsg && (
              <div id="login-error-alert" className="p-3.5 rounded-xl bg-[#FBEBE8] border border-[#E9BFB7] text-[#B85340] text-xs leading-relaxed flex items-start gap-2">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#B85340] mt-1.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 rounded-xl bg-[#5C4033] hover:bg-[#483226] active:scale-[0.99] text-white text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSigningIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang kiểm tra quyền...</span>
                </>
              ) : (
                <>
                  <span>Vào Sổ Tay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              id="login-offline-btn"
              type="button"
              onClick={handleOfflineMode}
              className="w-full py-2 text-center text-xs text-[#8C6D58] hover:text-[#5C4033] underline decoration-dotted transition-colors cursor-pointer"
            >
              Vào xem tạm thời trên máy này (Chỉ lưu nội bộ)
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#F0E6D8] text-center">
            <p className="text-[11px] text-[#A69585] leading-relaxed">
              Quyền truy cập riêng tư. Chỉ email được quản trị viên <span className="font-semibold text-[#6E4F36]">{MASTER_ADMIN}</span> cấp quyền mới có thể đăng nhập.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#A69585] mt-6">Dành riêng cho những chuyến đi đong đầy kỷ niệm</p>
      </div>
    </div>
  );
};
