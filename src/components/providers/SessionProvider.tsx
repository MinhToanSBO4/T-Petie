'use client';

import React from 'react';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

/**
 * Không tải lại phiên mỗi lần tab trình duyệt được focus (mặc định của NextAuth): chuyển qua lại giữa các tab
 * từng tạo hàng loạt request phiên tới máy chủ. Máy chủ vẫn kiểm tra quyền ở mọi request; đăng nhập/đăng xuất
 * ở tab khác vẫn được NextAuth đồng bộ sang tab này.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider refetchOnWindowFocus={false}>{children}</NextAuthSessionProvider>;
}

export default SessionProvider;
