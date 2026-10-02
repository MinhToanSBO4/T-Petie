'use client';

import React from 'react';
import { toast } from '@/client/toast';
import { Toaster } from '@/components/layout/Toaster';

type ShowToastType = 'success' | 'info' | 'love' | 'error' | 'warning';

const api = {
  /** Cách gọi cũ, vẫn dùng được: `showToast('Đã thêm vào giỏ')`, `showToast('Không lưu được', 'error')`. */
  showToast: (message: string, type: ShowToastType = 'success') => { toast[type](message); },
  /** Đầy đủ: lỗi, đang xử lý, tiến độ, nút hành động… xem `@/client/toast`. */
  toast,
};

/** Hiện khung thông báo ở góc màn hình; trạng thái nằm trong `@/client/toast` nên không mất khi chuyển trang. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <Toaster />
  </>;
}

export function useToast() {
  return api;
}
