import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  X, 
  Share, 
  PlusSquare, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isAndroid, 
    isFullscreen, 
    toggleFullscreen, 
    install 
  } = usePWAInstall();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Check if previously dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  // If already running inside installed standalone app, NEVER show browser banner
  if (isInstalled || isDismissed) {
    return (
      <>
        {/* Floating subtle Fullscreen toggle for Android/Desktop if user wants it */}
        {showGuideModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />}
      </>
    );
  }

  return (
    <>
      {/* Floating Bottom App Installation Bar */}
      <aside 
        id="pwa-app-install-banner"
        aria-label="Cài đặt ứng dụng"
        className="fixed bottom-16 md:bottom-5 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-50 animate-in slide-in-from-bottom duration-300 pointer-events-auto"
      >
        <div className="bg-[#2E1A11]/95 text-[#FFFDF9] backdrop-blur-xl border border-[#D5A85A]/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center justify-between gap-3">
          {/* App Icon Avatar */}
          <div className="relative shrink-0">
            <img 
              src="/pwa-192x192.png" 
              alt="Our Travel Planner Icon" 
              className="w-12 h-12 rounded-xl object-cover shadow-md border border-[#E5BA6A]/50"
            />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#D69B3D] text-[#24140D] rounded-full flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Text Information */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-serif font-bold text-sm text-[#FCE1A8] truncate">
                Dùng như App thật
              </h4>
              <span className="text-[10px] bg-[#E5BA6A]/20 text-[#FCE1A8] px-1.5 py-0.5 rounded font-medium border border-[#E5BA6A]/30">
                Ẩn thanh duyệt
              </span>
            </div>
            <p className="text-xs text-[#DFD1C0] mt-0.5 line-clamp-1 leading-tight">
              {isIOS 
                ? 'Thêm vào Màn hình chính để mở toàn màn hình.' 
                : 'Cài đặt vào máy để mở toàn màn hình không có thanh URL.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isInstallable ? (
              <button
                id="pwa-quick-install-btn"
                onClick={install}
                className="flex items-center gap-1 bg-gradient-to-r from-[#D69B3D] to-[#E5BA6A] hover:brightness-110 text-[#24140D] font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài App</span>
              </button>
            ) : (
              <button
                id="pwa-open-guide-btn"
                onClick={() => setShowGuideModal(true)}
                className="flex items-center gap-1 bg-gradient-to-r from-[#D69B3D] to-[#E5BA6A] hover:brightness-110 text-[#24140D] font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Hướng dẫn</span>
              </button>
            )}

            {/* Quick Fullscreen toggle if on Chrome / Desktop */}
            {!isIOS && (
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FCE1A8] transition-colors cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình (Ẩn thanh duyệt ngay)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {/* Close / Dismiss */}
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-[#DFD1C0]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Detail Step-by-Step Installation Modal */}
      {showGuideModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />}
    </>
  );
};

interface ModalProps {
  isIOS: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<ModalProps> = ({ isIOS, onClose }) => {
  const { toggleFullscreen, isFullscreen, isInstallable, install } = usePWAInstall();

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-[#FAF7F2] border border-[#D5A85A]/50 p-6 shadow-2xl overflow-hidden relative text-[#382D24]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#EFE6DB] hover:bg-[#E2D4C3] text-[#5C4033] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <img 
            src="/pwa-192x192.png" 
            alt="App Icon" 
            className="w-14 h-14 rounded-2xl shadow-lg border-2 border-[#D69B3D]"
          />
          <div>
            <h3 className="font-serif font-bold text-lg text-[#2E1A11] leading-tight">
              Our Travel Planner
            </h3>
            <p className="text-xs text-[#8C6D58] mt-0.5">
              Cách ẩn thanh trình duyệt & chạy như App 100%
            </p>
          </div>
        </div>

        {/* Instructions based on OS */}
        {isIOS ? (
          <div className="space-y-3.5">
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#2E1A11] text-[#FCE1A8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                  1
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-[#2E1A11]">Chạm vào nút Chia sẻ (Share)</p>
                  <p className="text-xs text-[#6E4F36] mt-0.5 flex items-center gap-1.5">
                    Biểu tượng hình vuông có mũi tên lên <Share className="w-4 h-4 text-[#007AFF] inline shrink-0" /> ở thanh công cụ Safari phía dưới màn hình.
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#EFE6DB]" />

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#2E1A11] text-[#FCE1A8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                  2
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-[#2E1A11]">Chọn "Thêm vào MH chính"</p>
                  <p className="text-xs text-[#6E4F36] mt-0.5 flex items-center gap-1.5">
                    Cuộn xuống danh sách và nhấn <span className="font-medium text-[#2E1A11] inline-flex items-center gap-1 bg-[#EFE6DB] px-1.5 py-0.5 rounded"><PlusSquare className="w-3.5 h-3.5" /> Thêm vào MH chính (Add to Home Screen)</span>.
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#EFE6DB]" />

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#2E1A11] text-[#FCE1A8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                  3
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-[#2E1A11]">Mở App từ màn hình chính</p>
                  <p className="text-xs text-[#6E4F36] mt-0.5">
                    Nhấn vào icon ngoài màn hình điện thoại, app sẽ tự động <strong>toàn màn hình, không còn thanh URL hay nút duyệt web</strong>!
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-4 space-y-3">
              <p className="text-xs text-[#6E4F36]">
                Để ẩn thanh địa chỉ và các tab trình duyệt, bạn có 2 lựa chọn:
              </p>

              {isInstallable ? (
                <button
                  onClick={async () => {
                    await install();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D69B3D] to-[#E5BA6A] hover:brightness-105 text-[#24140D] font-bold text-sm py-3 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Cài đặt ứng dụng vào máy ngay</span>
                </button>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-[#2E1A11] text-[#FCE1A8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-[#2E1A11]">Chọn menu trình duyệt (dấu 3 chấm ⋮)</p>
                    <p className="text-xs text-[#6E4F36] mt-0.5">
                      Nhấn vào dấu 3 chấm góc trên bên phải của Chrome/Edge, chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào màn hình chính"</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="h-px bg-[#EFE6DB]" />

              {/* Fullscreen Quick Toggle */}
              <button
                onClick={() => {
                  toggleFullscreen();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#EFE6DB] hover:bg-[#E2D4C3] text-[#4A2F22] font-semibold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>Bật / Tắt Toàn Màn Hình Ngay Lập Tức</span>
              </button>
            </div>
          </div>
        )}

        {/* Benefits reminder */}
        <div className="mt-4 flex items-center justify-around text-[11px] text-[#8C6D58] border-t border-[#E8DEC8] pt-3">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34A853]" /> 100% Không thanh duyệt
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34A853]" /> Hoạt động Ngoại tuyến
          </span>
        </div>

        {/* Bottom confirmation button */}
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-[#2E1A11] py-3 text-sm font-semibold text-[#FCE1A8] hover:bg-[#3D251A] transition-colors cursor-pointer shadow-md"
        >
          Đã hiểu, đóng hướng dẫn
        </button>
      </div>
    </div>
  );
};
