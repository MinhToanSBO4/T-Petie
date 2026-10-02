import type { Metadata } from 'next';
import { CategoryCatalogPage, categoryMetadata } from '@/app/_catalog/category-page';
import type { SearchParams } from '@/app/_catalog/catalog-section';

type Props = { searchParams: SearchParams };

export function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return categoryMetadata('girls', searchParams);
}

export default function GirlsPage({ searchParams }: Props) {
  return <CategoryCatalogPage id="girls" searchParams={searchParams} />;
}
