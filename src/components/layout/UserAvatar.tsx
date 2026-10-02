'use client';

import { useEffect, useState } from 'react';

/**
 * Avatar khách hàng dùng chung cho header và trang tài khoản.
 * Không có ảnh, hoặc ảnh tải lỗi (avatar Google hết hạn, bị chặn...), thì dùng avatar mặc định
 * của hệ thống thay vì để biểu tượng ảnh vỡ. Ảnh Google trả 403 khi có Referer nên tắt Referer.
 */
export function UserAvatar({ src, name, className = '' }: { src?: string; name?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const label = name ? `Ảnh đại diện của ${name}` : 'Ảnh đại diện';

  return <span className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}>
    {src && !failed
      ? <img src={src} alt={label} referrerPolicy="no-referrer" onError={() => setFailed(true)}
          className="h-full w-full object-cover" />
      : <DefaultAvatar label={label} />}
  </span>;
}

/** Avatar mặc định: nền pastel ấm của thương hiệu với hình người tròn mềm. */
function DefaultAvatar({ label }: { label: string }) {
  return <svg viewBox="0 0 64 64" role="img" aria-label={label} className="h-full w-full">
    <defs>
      <linearGradient id="tpetie-avatar-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FDE7C2" />
        <stop offset="1" stopColor="#F9D3DC" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" fill="url(#tpetie-avatar-bg)" />
    <circle cx="32" cy="25" r="11" fill="#FFFFFF" fillOpacity="0.92" />
    <path d="M12 60c1.8-11 10.2-17 20-17s18.2 6 20 17" fill="#FFFFFF" fillOpacity="0.92" />
    <circle cx="28" cy="25" r="1.4" fill="#C98A3D" />
    <circle cx="36" cy="25" r="1.4" fill="#C98A3D" />
    <path d="M28.5 29.2c1.9 1.6 5.1 1.6 7 0" stroke="#C98A3D" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  </svg>;
}
