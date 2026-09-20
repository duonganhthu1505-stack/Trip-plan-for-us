import React, { useState } from 'react';
import { Compass, Heart, Lock, ArrowRight, Sparkles, Mail, Cloud, RefreshCw } from 'lucide-react';
/** The four-colour Google mark. */
const GoogleMark: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v9.3h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 7-10.3 7-18.4z" />
    <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.6-5.8l-7.6-5.9c-2 1.4-4.7 2.4-8 2.4-6.3 0-11.7-3.7-13.6-8.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

interface LoginProps {
  allowedEmails: string[];
  onLoginSuccess: (email: string) => void;
  onOfflineMode: () => void;
  /** Real Google sign-in — the only way to reach the shared cloud data. */
  onGoogleLogin?: () => void;
}
export const Login: React.FC<LoginProps> = ({ allowedEmails, onLoginSuccess, onOfflineMode, onGoogleLogin }) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setIsSigningIn(true);
    
    // Simulate a brief loading state for better UX
    setTimeout(() => {
      const isMasterAdmin = cleanEmail === 'duonganhthu1505@gmail.com';
      const isAllowed = isMasterAdmin || allowedEmails.some((e) => e.trim().toLowerCase() === cleanEmail);

      if (!isAllowed) {
        setErrorMsg(`Email "${cleanEmail}" chưa được cấp quyền truy cập. Vui lòng liên hệ quản trị viên.`);
        setIsSigningIn(false);
        return;
      }

      onLoginSuccess(cleanEmail);
    }, 600);
  };

  const handleOfflineMode = () => {
    const cleanEmail = emailInput.trim().toLowerCase() || 'duonganhthu1505@gmail.com';
    const isMasterAdmin = cleanEmail === 'duonganhthu1505@gmail.com';
    const isAllowed = isMasterAdmin || allowedEmails.some((e) => e.trim().toLowerCase() === cleanEmail);
    if (!isAllowed) {
      setErrorMsg(`Email "${cleanEmail}" chưa được cấp quyền truy cập.`);
      return;
    }
    onOfflineMode();
  };

  return (
    <div id="login-page" className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center p-4 sm:p-6 text-[#3D312A] relative overflow-hidden">
      {/* Subtle decorative vintage accents */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#EFE6DB] blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#EADCCB] blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
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
          {/* Google sign-in comes first: it is the only path that unlocks the
              shared cloud, which is what makes both phones show the same data. */}
          <button
            id="login-google-btn"
            type="button"
            onClick={() => {
              setErrorMsg(null);
              if (onGoogleLogin) onGoogleLogin();
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-[#F7F3EC] active:scale-[0.99] border-2 border-[#D9CABB] text-[#382D24] text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <GoogleMark />
            <span>Đăng nhập bằng Google</span>
          </button>

          <div className="mt-3 mb-5 p-3 rounded-xl bg-[#F3FAF5] border border-[#CFE9D9] flex items-start gap-2">
            <Cloud className="w-4 h-4 mt-0.5 shrink-0 text-[#34A853]" />
            <p className="text-[11px] text-[#4A6152] leading-relaxed">
              <strong className="text-[#1B7F3B]">Khuyên dùng.</strong> Chỉ cần đăng nhập <strong>1 lần</strong> — máy tự nhớ,
              không phải đăng nhập lại mỗi lần mở app. Đây là cách duy nhất để dữ liệu trên điện thoại và
              máy tính giống nhau.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-[#F0E6D8]" />
            <span className="text-[10px] uppercase tracking-wider text-[#A69585]">hoặc chỉ xem trên máy này</span>
            <div className="h-px flex-1 bg-[#F0E6D8]" />
          </div>

          <p className="-mt-2 mb-4 text-[11px] text-[#8C6D58] leading-relaxed text-center">
            Cách nhập email bên dưới chỉ mở dữ liệu đã lưu trên máy này, <strong>không đồng bộ</strong> với thiết bị khác.
          </p>

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
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 rounded-xl bg-[#5C4033] hover:bg-[#483226] active:scale-[0.99] text-white text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSigningIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <span>Xem trên máy này</span>
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
