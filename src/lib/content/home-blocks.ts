import { onSaleByDiscount, type PriceEntry } from '@/lib/catalog/filters';
import { HOME_BLOCK_LABELS, type HomeBlockId, type HomeSections } from '@/lib/content/site-content';

/*
 * Quy tắc dựng trang chủ, dùng chung cho trang chủ, menu "Trang Chủ" ở đầu trang và trình sửa nội dung
 * để cả ba luôn hiện cùng khối, cùng sản phẩm và cùng thứ tự.
 */

/** Số sản phẩm tối đa của mỗi khối sản phẩm; ô chọn sản phẩm trong trình sửa nội dung dùng cùng giới hạn. */
export const HOME_PRODUCT_LIMITS = { bestSellers: 12, sale: 8 } as const;
export type HomeProductBlockId = keyof typeof HOME_PRODUCT_LIMITS;
export type HomeProductEntry = PriceEntry & { id: string; isBestSeller?: boolean };

/** Sản phẩm quản trị viên đã chọn mà vẫn đang bán, theo thứ tự đã chọn. */
export function chosenHomeProducts<T extends { id: string }>(products: T[], selectedIds: readonly string[] = []): T[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return selectedIds.map((id) => byId.get(id)).filter((product): product is T => Boolean(product));
}

/**
 * Sản phẩm của khối Bán chạy / Ưu đãi. Có sản phẩm đã chọn (còn bán) thì hiện đúng các sản phẩm đó. Chưa chọn thì
 * Bán chạy lấy sản phẩm gắn nhãn Bán chạy, mới nhất trước; Ưu đãi lấy như trang /sale mà nút "Xem tất cả" mở tới:
 * hàng đang giảm giá, giảm nhiều nhất trước. `products` xếp mới nhất trước như getProducts().
 */
export function homeBlockProducts<T extends HomeProductEntry>(block: HomeProductBlockId, products: T[], selectedIds?: readonly string[]): T[] {
  const chosen = chosenHomeProducts(products, selectedIds);
  if (chosen.length) return chosen.slice(0, HOME_PRODUCT_LIMITS[block]);
  const automatic = block === 'bestSellers' ? products.filter((product) => product.isBestSeller) : onSaleByDiscount(products);
  return automatic.slice(0, HOME_PRODUCT_LIMITS[block]);
}

/** Những gì quyết định một khối có nội dung để hiện hay không. */
export type HomeBlockContent = {
  hero?: { imageUrl: string; slides: readonly unknown[] } | null;
  features?: { items: readonly unknown[] } | null;
  /** Bộ sưu tập bật "Hiện ở trang chủ". */
  collections: readonly unknown[];
  bestSellers: readonly unknown[];
  sale: readonly unknown[];
  feedback: readonly unknown[];
};

/** Khối không có gì để hiện thì bị ẩn khỏi trang chủ và khỏi menu; trình sửa nội dung báo khối đó đang ẩn. */
export function homeBlockVisibility(content: HomeBlockContent): Record<HomeBlockId, boolean> {
  return {
    hero: content.collections.length > 0 || Boolean(content.hero?.imageUrl) || (content.hero?.slides.length ?? 0) > 0,
    bestSellers: content.bestSellers.length > 0,
    sale: content.sale.length > 0,
    collections: content.collections.length > 0,
    features: (content.features?.items.length ?? 0) > 0,
    testimonials: content.feedback.length > 0,
  };
}

export type HomeSectionId = keyof HomeSections;
/** id để menu cuộn tới khối; giữ id cũ để liên kết đã chia sẻ vẫn tới đúng chỗ. */
export const HOME_SECTION_ANCHORS: Record<HomeSectionId, string> = { bestSellers: 'best-seller', sale: 'flash-sale', collections: 'collections' };
const isSectionId = (id: HomeBlockId): id is HomeSectionId => id in HOME_SECTION_ANCHORS;

/** Mục con "Trang Chủ" của menu: các khối đang hiện, đúng thứ tự và tiêu đề đã cấu hình. */
export function homeNavItems(order: readonly HomeBlockId[], sections: HomeSections | null | undefined,
  visible: Record<HomeBlockId, boolean>): { label: string; href: string }[] {
  return order.filter(isSectionId).filter((id) => visible[id])
    .map((id) => ({ label: sections?.[id].title || HOME_BLOCK_LABELS[id], href: `/#${HOME_SECTION_ANCHORS[id]}` }));
}
