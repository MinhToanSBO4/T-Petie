import { CategoryHero } from '@/components/collection/CategoryHero';
import { CategoryProductList } from '@/components/catalog/CategoryProductList';
import { CATEGORY_PAGE_LABELS } from '@/lib/content/site-content';
import { getCategoryPage } from '@/server/content/site-content';

export const revalidate = 60;

export default async function GirlsTopsPage() {
  const category = await getCategoryPage('tops');
  const route = CATEGORY_PAGE_LABELS.tops;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <CategoryHero page={category} />
      <CategoryProductList subcategory="ao" />
    </div>
  );
}
