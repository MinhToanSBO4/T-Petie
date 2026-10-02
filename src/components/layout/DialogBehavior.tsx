'use client';

import type { RefObject } from 'react';
import { useDialog } from '@/hooks/useDialog';

/**
 * Gắn hành vi hộp thoại (Esc để đóng, giữ Tab bên trong, khóa cuộn, trả focus) cho một khung chỉ hiện khi mở.
 * Đặt bên trong nhánh đang mở để hook chạy đúng lúc mở/đóng (giỏ hàng nhanh, bảng size).
 */
export function DialogBehavior({ target, onClose }: { target: RefObject<HTMLElement>; onClose: () => void }) {
  useDialog(target, onClose);
  return null;
}
