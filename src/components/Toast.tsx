import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className="pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm transition-all duration-300 bg-[#FFFDF9] border-[#E8DEC8] text-[#3D312A]"
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#6B8E23] shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#B22222] shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-[#8C6D58] shrink-0" />}
            <span className="font-medium">{toast.message}</span>
          </div>
          <button
            id={`toast-close-${toast.id}`}
            onClick={() => onDismiss(toast.id)}
            className="text-[#8C6D58] hover:text-[#3D312A] p-1 rounded-md transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
