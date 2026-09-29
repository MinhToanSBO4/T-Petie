'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setPending(false);
    setVisible(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function start() { setPending(true); }
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target || link.hasAttribute('download')) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      start();
    }
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);
    window.addEventListener('tpetie:navigation-start', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      window.removeEventListener('tpetie:navigation-start', start);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const show = window.setTimeout(() => setVisible(true), 120);
    const clear = window.setTimeout(() => { setPending(false); setVisible(false); }, 15000);
    return () => { window.clearTimeout(show); window.clearTimeout(clear); };
  }, [pending]);

  return visible ? <div role="status" aria-label="Đang chuyển trang" className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-cream-50/60 backdrop-blur-[2px]">
    <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-honey-100"><div className="h-full w-1/3 animate-pulse bg-honey-600" /></div>
    <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-lg"><span className="h-5 w-5 animate-spin rounded-full border-2 border-honey-200 border-t-honey-600" /><span className="text-sm font-semibold text-charcoal-800">Đang tải trang…</span></div>
  </div> : null;
}
