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

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Đang chuyển trang"
      className="pointer-events-none fixed inset-x-0 top-0 z-[999] h-[3px] bg-transparent"
    >
      <div className="h-full w-full overflow-hidden bg-honey-100/60">
        <div className="h-full w-full origin-left bg-gradient-to-r from-honey-400 via-honey-500 to-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.6)] animate-indeterminate-progress" />
      </div>
    </div>
  );
}
