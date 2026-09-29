'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler, Sparkles, HelpCircle } from 'lucide-react';
import { SIZE_CHART_HOC_XINH_KEM, SIZE_CHART_BABY, SIZE_SELECTION_TIPS } from '@/lib/constants/sizeGuide';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'kids' | 'baby'>('kids');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-cream-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-honey-100 text-honey-600">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-charcoal-900">
                    Bảng Hướng Dẫn Chọn Size Cho Bé
                  </h3>
                  <p className="text-[11px] text-charcoal-400">Được đo chuẩn xác theo thể trạng trẻ em Việt Nam</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-cream-100 text-charcoal-400 hover:text-charcoal-700 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Chọn Độ Tuổi */}
            <div className="flex bg-cream-100 p-1 rounded-2xl my-4">
              <button
                onClick={() => setActiveTab('kids')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'kids'
                    ? 'bg-white text-honey-600 shadow-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Bảng Size Chuẩn (Size 90 - 150)
              </button>
              <button
                onClick={() => setActiveTab('baby')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'baby'
                    ? 'bg-white text-honey-600 shadow-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Bé Sơ Sinh (0 - 12 Tháng)
              </button>
            </div>

            {/* Bảng Dữ Liệu Size */}
            <div className="overflow-y-auto flex-1 border border-cream-200 rounded-2xl max-h-56">
              <table className="w-full text-xs text-left">
                <thead className="bg-cream-50 text-charcoal-900 font-bold border-b border-cream-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Cân Nặng</th>
                    <th className="py-2.5 px-3">Chiều Cao</th>
                    <th className="py-2.5 px-3">Độ Tuổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {(activeTab === 'kids' ? SIZE_CHART_HOC_XINH_KEM : SIZE_CHART_BABY).map((row, idx) => (
                    <tr key={idx} className="hover:bg-cream-50 transition-colors">
                      <td className="py-2 px-3 font-bold text-honey-600">{row.size}</td>
                      <td className="py-2 px-3 font-semibold text-sage-700">{row.weight}</td>
                      <td className="py-2 px-3 text-charcoal-700">{row.height}</td>
                      <td className="py-2 px-3 text-charcoal-500">{row.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lưu ý khi chọn size */}
            <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-charcoal-700 space-y-1 overflow-y-auto max-h-32">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Lưu ý khi chọn size cho bé:</span>
              </div>
              <ul className="space-y-1 list-disc pl-4 text-charcoal-600 leading-relaxed text-[11px]">
                {SIZE_SELECTION_TIPS.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            {/* Nút Đóng */}
            <div className="mt-3 pt-1">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                Đã Hiểu, Tiếp Tục Mua Sắm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
