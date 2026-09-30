import { Suspense } from 'react';
import { AboutContent } from '@/components/about/AboutContent';
import { getSiteContent } from '@/server/content/site-content';

export const revalidate = 60;

export default async function AboutPage() {
  const about = (await getSiteContent()).about_page;
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto p-8 text-center text-charcoal-400">Đang tải thông tin T&apos;Petie...</div>}>
      <AboutContent about={about} />
    </Suspense>
  );
}
