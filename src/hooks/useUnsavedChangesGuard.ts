'use client';

import { useEffect } from 'react';

const QUESTION = 'Có thay đổi chưa lưu. Rời trang và bỏ các thay đổi đó?';

/**
 * Hỏi lại trước khi rời trang khi form còn thay đổi chưa lưu: F5/đóng tab (beforeunload) và bấm link trong trang
 * (menu bên, logo…). Link của Next.js điều hướng bằng JavaScript nên không kích hoạt beforeunload; bắt sự kiện click
 * ở pha capture của document, chạy trước trình xử lý của React, để chặn được cả hai.
 */
export function useUnsavedChangesGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (window.confirm(QUESTION)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);
}
