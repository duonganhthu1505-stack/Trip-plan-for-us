import React, { useState } from 'react';
import { Compass, Heart, Lock, ArrowRight, Sparkles, Mail, Cloud, RefreshCw } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

interface LoginProps {
  allowedEmails: string[];
  onLoginSuccess: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ allowedEmails, onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSigningInGoogle(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user?.email) {
        const cleanEmail = result.user.email.trim().toLowerCase();
        const isMasterAdmin = cleanEmail === 'duonganhthu1505@gmail.com';
        const isAllowed = isMasterAdmin || allowedEmails.some((e) => e.trim().toLowerCase() === cleanEmail);

        if (!isAllowed) {
          setErrorMsg(
            `Email "${result.user.email}" chưa được cấp quyền truy cập. Chỉ có quản trị viên duonganhthu1505@gmail.com mới có quyền phân quyền.`
          );
          await auth.signOut();
          return;
        }

        onLoginSuccess(result.user.email);
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.');
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    const isMasterAdmin = cleanEmail === 'duonganhthu1505@gmail.com';
    const isAllowed = isMasterAdmin || allowedEmails.some((e) => e.trim().toLowerCase() === cleanEmail);
    if (!isAllowed) {
      setErrorMsg(
        `Email "${emailInput}" chưa được phân quyền truy cập. Vui lòng liên hệ quản trị viên duonganhthu1505@gmail.com.`
      );
      return;
    }

    setErrorMsg(null);
    onLoginSuccess(cleanEmail);
  };

  return (
    <div id="login-page" className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center p-4 sm:p-6 text-[#3D312A] relative overflow-hidden">
      {/* Subtle decorative vintage accents */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#EFE6DB] blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#EADCCB] blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#EFE6DB] text-[#6E4F36] shadow-sm mb-4 border border-[#DFD1C0]">
            <Compass className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs tracking-wider uppercase text-[#8C6D58] font-medium mb-1.5">
            <Heart className="w-3.5 h-3.5 fill-[#C27D66] text-[#C27D66]" />
            <span>Sổ Tay Du Lịch & Hành Trình Kỷ Niệm</span>
            <Heart className="w-3.5 h-3.5 fill-[#C27D66] text-[#C27D66]" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#382D24] tracking-tight">
            Our Travel Planner
          </h1>
          <p className="text-sm text-[#735D4E] mt-2 max-w-xs mx-auto leading-relaxed">
            Lưu giữ từng con đường, quán cà phê và khoảnh khắc hoàng hôn cùng nhau.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-7 sm:p-8 shadow-md">
          <div className="flex items-center gap-2 pb-5 mb-5 border-b border-[#F0E6D8]">
            <Lock className="w-4 h-4 text-[#8C6D58]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#5C4033]">
              Đăng Nhập Sổ Tay
            </h2>
          </div>

          {/* Google Sign-in for instant cross-device sync */}
          <div className="mb-5">
            <button
              id="login-google-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningInGoogle}
              className="w-full py-3.5 px-4 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] active:scale-[0.99] border-2 border-[#D9CABB] hover:border-[#8C6D58] text-[#382D24] text-sm font-medium shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              {isSigningInGoogle ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#8C6D58]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.9l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
              )}
              <span className="font-semibold">
                {isSigningInGoogle ? 'Đang kết nối...' : 'Đăng nhập với Google (Đồng bộ ĐT & Máy tính)'}
              </span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8C6D58] mt-2">
              <Cloud className="w-3 h-3 text-[#2F6636]" />
              <span>Tự động đồng bộ dữ liệu giữa mọi thiết bị theo thời gian thực</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#E8DEC8] w-full" />
            <span className="bg-[#FFFDF9] px-3 text-[11px] uppercase tracking-wider text-[#A69585] shrink-0 font-medium">
              hoặc tự nhập email
            </span>
            <div className="border-t border-[#E8DEC8] w-full" />
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
              <div id="login-error-alert" className="p-3.5 rounded-xl bg-[#FBEBE8] border border-[#E9BFB7] text-[#B85340] text-xs leading-relaxed animate-in fade-in flex items-start gap-2">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#B85340] mt-1.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-[#5C4033] hover:bg-[#483226] active:scale-[0.99] text-white text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Vào Sổ Tay Du Lịch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-[#F0E6D8] text-center">
            <p className="text-[11px] text-[#A69585] leading-relaxed">
              Quyền truy cập riêng tư. Chỉ email được quản trị viên <span className="font-semibold text-[#6E4F36]">duonganhthu1505@gmail.com</span> cấp quyền mới có thể đăng nhập.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#A69585] mt-6">
          Dành riêng cho những chuyến đi đong đầy kỷ niệm
        </p>
      </div>
    </div>
  );
};
