import type { Metadata } from 'next';
import { CategoryCatalogPage, categoryMetadata } from '@/app/_catalog/category-page';
import type { SearchParams } from '@/app/_catalog/catalog-section';

type Props = { searchParams: SearchParams };

export function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return categoryMetadata('tops', searchParams);
}

export default function GirlsTopsPage({ searchParams }: Props) {
  return <CategoryCatalogPage id="tops" searchParams={searchParams} />;
}
