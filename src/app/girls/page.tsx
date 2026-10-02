import { GirlsCatalog } from '@/components/catalog/GirlsCatalog';
import { CategoryHero } from '@/components/collection/CategoryHero';
import { CATEGORY_PAGE_LABELS } from '@/lib/content/site-content';
import { getCategoryPage } from '@/server/content/site-content';

export const revalidate = 60;

export default async function GirlsPage() {
  const category = await getCategoryPage('girls');
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <CategoryHero page={category} />
      <GirlsCatalog />
    </div>
  );
}
