import React, { useState } from 'react';
import { Download, Smartphone, Maximize2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallGuideModal } from './PWAInstallBanner';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isFullscreen, toggleFullscreen, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running as an installed standalone PWA app, we can still show a subtle fullscreen toggle if on desktop
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable ? (
        <button
          onClick={install}
          id="nav-pwa-install-btn"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D69B3D] to-[#E5BA6A] hover:brightness-105 text-[#24140D] px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          title="Cài đặt ứng dụng vào thiết bị & mở toàn màn hình"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Cài App</span>
          <span className="sm:hidden">App</span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          id="nav-pwa-guide-btn"
          className="flex items-center gap-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#D5A85A]/70 text-[#4A2F22] px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer shadow-2xs"
          title="Hướng dẫn dùng toàn màn hình không có thanh trình duyệt"
        >
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9943B]" />
          <span className="hidden md:inline">Dùng như App</span>
          <span className="md:hidden">App</span>
        </button>
      )}

      {showModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowModal(false)} />}
    </>
  );
};
