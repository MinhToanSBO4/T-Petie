import { ScrollRail } from '@/components/layout/ScrollRail';
import { Collection } from '@/types/collection';
import { CollectionCard } from './CollectionCard';

/** Các bộ sưu tập ở trang chủ: một hàng lướt ngang, nút trước/sau nằm cạnh liên kết của khối (không đè lên nó). */
export function LookbookCarousel({ collections, label, heading, action }: {
  collections: Collection[]; label: string; heading: React.ReactNode; action?: React.ReactNode;
}) {
  return <ScrollRail label={label} heading={heading} action={action} headerClassName="mb-4">
    {collections.map((collection) => <li key={collection.id} className="grid w-[280px] shrink-0 snap-start sm:w-[340px]">
      <CollectionCard collection={collection} />
    </li>)}
  </ScrollRail>;
}
