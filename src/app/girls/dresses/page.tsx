import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CategoryHero } from '@/components/collection/CategoryHero';
import { CategoryProductList } from '@/components/catalog/CategoryProductList';
import { CATEGORY_PAGE_LABELS } from '@/lib/content/site-content';
import { getCategoryPage } from '@/server/content/site-content';

export const revalidate = 60;

export default async function GirlsDressesPage() {
  const category = await getCategoryPage('dresses');
  const route = CATEGORY_PAGE_LABELS.dresses;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <Breadcrumb items={[{ label: 'Bé Gái', href: '/girls' }, { label: route.breadcrumb, href: route.href }]} />
      <CategoryHero page={category} />
      <CategoryProductList subcategory="vay" />
    </div>
  );
}
