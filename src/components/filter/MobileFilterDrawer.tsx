'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPriceRange?: string;
  onPriceChange?: (price: string) => void;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  selectedPriceRange = 'all',
  onPriceChange,
}: MobileFilterDrawerProps) {
  const priceOptions = [
    { label: 'Tất cả mức giá', value: 'all' },
    { label: 'Dưới 200.000đ', value: 'under-200' },
    { label: '200.000đ - 300.000đ', value: '200-300' },
    { label: 'Trên 300.000đ', value: 'above-300' },
  ];

  const sizeOptions = ['Size 1 (8-10kg)', 'Size 2 (10-12kg)', 'Size 3 (12-15kg)', 'Size 4 (15-18kg)'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl border-t border-cream-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="font-heading font-bold text-base text-charcoal-900">Bộ Lọc Tìm Kiếm</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-cream-100 text-charcoal-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mức Giá */}
            <div className="py-4 border-b border-cream-100">
              <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-2.5">
                Khoảng Giá
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {priceOptions.map((opt) => {
                  const isSelected = selectedPriceRange === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onPriceChange && onPriceChange(opt.value)}
                      className={`p-2.5 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'border-honey-500 bg-honey-50 text-honey-700'
                          : 'border-cream-200 bg-cream-50 text-charcoal-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-honey-600 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kích Cỡ / Cân Nặng */}
            <div className="py-4 border-b border-cream-100">
              <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-2.5">
                Cân Nặng Của Bé
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {sizeOptions.map((sz) => (
                  <div
                    key={sz}
                    className="p-2 rounded-xl text-xs font-medium border border-cream-200 bg-cream-50 text-charcoal-700 flex items-center space-x-2"
                  >
                    <span className="text-xs">👶</span>
                    <span>{sz}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nút Áp Dụng */}
            <div className="pt-4 flex gap-3">
              <button
                onClick={() => {
                  if (onPriceChange) onPriceChange('all');
                  onClose();
                }}
                className="flex-1 py-3 rounded-full border border-cream-300 text-charcoal-700 text-xs font-bold hover:bg-cream-100"
              >
                Xóa Bộ Lọc
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs font-bold shadow-md"
              >
                Áp Dụng
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
