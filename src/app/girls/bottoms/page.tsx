import type { Metadata } from 'next';
import { CategoryCatalogPage, categoryMetadata } from '@/app/_catalog/category-page';
import type { SearchParams } from '@/app/_catalog/catalog-section';

type Props = { searchParams: SearchParams };

export function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return categoryMetadata('bottoms', searchParams);
}

export default function GirlsBottomsPage({ searchParams }: Props) {
  return <CategoryCatalogPage id="bottoms" searchParams={searchParams} />;
}
