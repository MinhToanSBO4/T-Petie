import { CategoryHero } from '@/components/collection/CategoryHero';
import { CategoryProductList } from '@/components/catalog/CategoryProductList';
import { CATEGORY_PAGE_LABELS } from '@/lib/content/site-content';
import { getCategoryPage } from '@/server/content/site-content';

export const revalidate = 60;

export default async function GirlsBottomsPage() {
  const category = await getCategoryPage('bottoms');
  const route = CATEGORY_PAGE_LABELS.bottoms;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <CategoryHero page={category} />
      <CategoryProductList subcategory="quan" />
    </div>
  );
}
