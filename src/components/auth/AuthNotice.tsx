'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/client/toast';
import type { AuthNoticeKind } from '@/lib/auth-google';

const STORAGE_KEY = 'tpetie:auth-notice';
const shown = new Set<number>();

/** Mỗi thông báo chỉ hiện một lần, kể cả khi phiên được tải lại hay mở thêm tab trong lúc thông báo còn hạn. */
function firstTime(at: number) {
  if (shown.has(at)) return false;
  shown.add(at);
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === String(at)) return false;
    window.localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    // Chế độ riêng tư chặn bộ nhớ trình duyệt: chỉ nhớ trong tab này.
  }
  return true;
}

function show(kind: AuthNoticeKind) {
  switch (kind) {
    case 'google-signed-up':
      toast.success('🎉 Đăng ký thành công! Chào mừng Mẹ đến với T\'Petie.');
      break;
    case 'google-linked':
      toast.success('Đã liên kết Google với tài khoản của Mẹ', {
        description: 'Lần sau Mẹ chỉ cần bấm "Đăng nhập với Google".',
      });
      break;
    case 'google-linked-password-removed':
      toast.success('Đã liên kết Google với tài khoản của Mẹ', {
        description: 'Để giữ an toàn, mật khẩu cũ không còn dùng được. Từ nay Mẹ đăng nhập bằng Google, hoặc đặt mật khẩu mới trong Tài khoản.',
        action: { label: 'Đặt mật khẩu mới', href: '/dashboard?tab=security' },
        duration: 7_000,
      });
      break;
    default:
      toast.success('Chào mừng bạn trở lại với T\'Petie! 🌸');
  }
}

/** Đăng nhập Google kết thúc bằng một lần chuyển trang từ Google về, nên kết quả được máy chủ gửi kèm phiên (`session.notice`). */
export function AuthNotice() {
  const { data } = useSession();
  const kind = data?.notice?.kind;
  const at = data?.notice?.at;
  useEffect(() => {
    if (kind && at && firstTime(at)) show(kind);
  }, [kind, at]);
  return null;
}
