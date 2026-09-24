import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallGuideModal } from './PWAInstallBanner';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running as an installed standalone PWA app, don't show install button
  if (isInstalled || (!isIOS && !isInstallable)) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowModal(true);
      return;
    }
    await install();
  };

  return (
    <>
      <button
        onClick={handleClick}
        id="nav-pwa-install-btn"
        className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gradient-to-r from-[#D69B3D] to-[#E5BA6A] hover:brightness-105 active:scale-95 text-[#24140D] px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
        title="Cài đặt ứng dụng vào máy"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#24140D]" />
        <span className="hidden xs:inline sm:inline">Cài App</span>
        <span className="xs:hidden sm:hidden">App</span>
      </button>

      {showModal && <InstallGuideModal isIOS={isIOS} onClose={() => setShowModal(false)} />}
    </>
  );
};

