import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ModalPortal } from './ModalPortal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDestructive = true,
  onConfirm,
  onCancel
}) => {
  const { lang, t } = useLanguage();
  if (!isOpen) return null;

  const resolvedConfirmLabel = confirmLabel || (lang === 'vi' ? (isDestructive ? 'Xóa' : 'Xác nhận') : (isDestructive ? 'Delete' : 'Confirm'));
  const resolvedCancelLabel = cancelLabel || t.common.cancel;

  return (
    <ModalPortal>
    <div
      id="confirm-modal-overlay"
      className="app-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2B1E16]/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="confirm-modal-dialog"
        className="w-full max-w-md bg-[#FAF7F2] border border-[#E8DEC8] rounded-2xl shadow-xl overflow-hidden p-6 text-[#3D312A] relative"
      >
        <button
          id="confirm-modal-close"
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#8C6D58] hover:text-[#3D312A] p-1.5 rounded-full hover:bg-[#EFE8DE] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 mb-4">
          <div className={`p-2.5 rounded-xl shrink-0 ${isDestructive ? 'bg-[#FBEBE8] text-[#B85340]' : 'bg-[#EFE8DE] text-[#6E4F36]'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#382D24]">{title}</h3>
            <p className="text-sm text-[#735D4E] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#EAE2D5]">
          <button
            id="confirm-modal-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#735D4E] hover:bg-[#EFE8DE] transition-colors cursor-pointer"
          >
            {resolvedCancelLabel}
          </button>
          <button
            id="confirm-modal-confirm-btn"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer text-white shadow-xs ${
              isDestructive
                ? 'bg-[#B85340] hover:bg-[#9E3E2D]'
                : 'bg-[#6E4F36] hover:bg-[#583E2A]'
            }`}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
