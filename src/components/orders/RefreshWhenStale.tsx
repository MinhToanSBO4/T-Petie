'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Lúc trình duyệt nhận được mỗi bản dựng trang (theo đồng hồ máy khách, nên không lệch giờ với máy chủ). */
const firstSeen = new Map<string, number>();

/**
 * Trình duyệt giữ trang đã dựng vài phút để quay lại cho nhanh (staleTimes). Trang trạng thái đơn đổi từ phía
 * shop nên không được giữ lâu: khi mở lại một bản đã cũ hơn `maxAgeMs` (quay lại trang, quay lại tab) thì tải
 * bản mới một lần. Bản vừa dựng thì không gọi thêm máy chủ.
 */
export function RefreshWhenStale({ renderId, maxAgeMs = 30_000 }: { renderId: string; maxAgeMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!firstSeen.has(renderId)) firstSeen.set(renderId, Date.now());
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - (firstSeen.get(renderId) ?? Date.now()) > maxAgeMs) {
        firstSeen.set(renderId, Date.now()); // chỉ tải lại một lần cho mỗi bản cũ
        router.refresh();
      }
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [renderId, maxAgeMs, router]);
  return null;
}
