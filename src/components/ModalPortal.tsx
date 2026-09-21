import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

let openModalCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (openModalCount === 0) {
    previousOverflow = document.body.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.classList.add('app-modal-open');
    document.body.classList.add('app-modal-open');
  }
  openModalCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
    document.documentElement.classList.remove('app-modal-open');
    document.body.classList.remove('app-modal-open');
  }
}

interface ModalPortalProps {
  children: React.ReactNode;
}

/** Renders overlays/modals on document.body so they are never clipped or
 *  stacked under Leaflet map panes / transformed parents. Also locks page scroll. */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};
