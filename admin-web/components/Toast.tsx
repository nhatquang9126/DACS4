'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Tự động đóng sau 3.5 giây
      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => addToast('success', title, message),
    [addToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => addToast('error', title, message),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showSuccess, showError }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const config = {
            success: {
              bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
              icon: CheckCircle2,
              iconColor: 'text-emerald-600',
            },
            error: {
              bg: 'bg-rose-50 border-rose-200 text-rose-900',
              icon: AlertCircle,
              iconColor: 'text-rose-600',
            },
            warning: {
              bg: 'bg-amber-50 border-amber-200 text-amber-900',
              icon: AlertTriangle,
              iconColor: 'text-amber-600',
            },
            info: {
              bg: 'bg-blue-50 border-blue-200 text-blue-900',
              icon: Info,
              iconColor: 'text-blue-600',
            },
          }[toast.type];

          const IconComponent = config.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start space-x-3 transition-all duration-200 animate-in slide-in-from-bottom-3 ${config.bg}`}
            >
              <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs opacity-90 mt-1 leading-normal break-words">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback an toàn nếu chưa bọc Provider
    return {
      toasts: [],
      addToast: () => {},
      removeToast: () => {},
      showSuccess: (title) => console.log('Toast Success:', title),
      showError: (title) => console.error('Toast Error:', title),
    };
  }
  return context;
};


