'use client';

import React from 'react';
import { Toaster } from '@/components/layout/Toaster';

/** Hiện khung thông báo ở góc màn hình; trạng thái nằm trong `@/client/toast` nên không mất khi chuyển trang. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <Toaster />
  </>;
}
