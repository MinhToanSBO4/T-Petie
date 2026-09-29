'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Heart, Sparkles, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'love';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'info' | 'love') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'love' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container Floating */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto flex items-center justify-between p-3.5 bg-white/95 backdrop-blur-md border border-cream-200 shadow-soft rounded-2xl text-charcoal-900"
            >
              <div className="flex items-center space-x-2.5">
                {toast.type === 'love' ? (
                  <Heart className="w-5 h-5 text-blush-500 fill-blush-500 shrink-0" />
                ) : toast.type === 'info' ? (
                  <Sparkles className="w-5 h-5 text-honey-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-sage-500 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-medium leading-snug">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-cream-100 rounded-full text-charcoal-400 hover:text-charcoal-700 transition-colors ml-2"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
