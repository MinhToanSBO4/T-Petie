import type { Metadata } from 'next';
import { CategoryCatalogPage, categoryMetadata } from '@/app/_catalog/category-page';
import type { SearchParams } from '@/app/_catalog/catalog-section';

type Props = { searchParams: SearchParams };

export function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return categoryMetadata('dresses', searchParams);
}

export default function GirlsDressesPage({ searchParams }: Props) {
  return <CategoryCatalogPage id="dresses" searchParams={searchParams} />;
}
