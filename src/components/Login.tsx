import React, { useState } from 'react';
import { Compass, Heart, Lock, ArrowRight, Sparkles, Mail, Cloud, RefreshCw } from 'lucide-react';

interface LoginProps {
  allowedEmails: string[];
  onGoogleLogin: () => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ allowedEmails, onGoogleLogin }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      await onGoogleLogin();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể đăng nhập Google. Vui lòng thử lại.');
    } finally {
      setIsSigningIn(false);
    }
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
            Lưu giữ từng con đường, quán cà phê và khoảnh khắc hoàng hôn cùng nhau. Đăng nhập để đồng bộ real-time giữa các máy.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-7 sm:p-8 shadow-md">
          <div className="flex items-center gap-2 pb-5 mb-5 border-b border-[#F0E6D8]">
            <Lock className="w-4 h-4 text-[#8C6D58]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#5C4033]">
              Đăng Nhập Bằng Google
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] text-xs text-[#735D4E] leading-relaxed flex items-start gap-2">
              <Cloud className="w-4 h-4 text-[#8C6D58] shrink-0 mt-0.5" />
              <span>
                Dữ liệu sẽ được lưu thẳng lên đám mây chung. Đổi điện thoại đăng nhập lại vẫn thấy đủ trip cũ, không còn chế độ gõ mail giả nữa.
              </span>
            </div>

            {errorMsg && (
              <div id="login-error-alert" className="p-3.5 rounded-xl bg-[#FBEBE8] border border-[#E9BFB7] text-[#B85340] text-xs leading-relaxed animate-in fade-in flex items-start gap-2">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#B85340] mt-1.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="login-google-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D9CABB] active:scale-[0.99] text-[#382D24] text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {isSigningIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Đăng nhập bằng Google</span>
                  <ArrowRight className="w-4 h-4 text-[#8C6D58]" />
                </>
              )}
            </button>
            
            <div className="text-center pt-2">
              <p className="text-[11px] text-[#A69585] leading-relaxed">
                Chỉ email được quản trị viên <span className="font-semibold text-[#6E4F36]">duonganhthu1505@gmail.com</span> cấp quyền mới đăng nhập được. Hiện đã cấp quyền cho: {allowedEmails.slice(0,3).join(', ')}{allowedEmails.length > 3 ? ` và ${allowedEmails.length - 3} mail khác` : ''}.
              </p>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-[#F0E6D8] text-center">
            <p className="text-[11px] text-[#A69585] leading-relaxed flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Dữ liệu tự đồng bộ real-time, đổi máy vẫn còn nguyên</span>
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
