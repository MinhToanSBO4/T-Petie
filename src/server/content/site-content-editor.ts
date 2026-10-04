import 'server-only';
import { getProducts, getCollections } from '@/server/catalog/queries';
import { getPublishedFeedback } from '@/server/content/testimonials';
import { readSiteContentForEditor } from '@/server/content/site-content';
import { HOME_FEEDBACK_LIMIT } from '@/lib/content/testimonial-input';
import { toProductCard } from '@/types/product';

/** Dữ liệu của trình chỉnh sửa nội dung website, dùng chung cho khu quản trị và khu nhân viên. */
export async function loadSiteContentEditor() {
  const [{ content, invalidKeys }, products, collections, feedback] = await Promise.all([
    readSiteContentForEditor(),
    getProducts(),
    getCollections(),
    getPublishedFeedback(),
  ]);
  return {
    initialContent: content,
    invalidKeys,
    collections: collections.filter((collection) => collection.showOnHome),
    // Mọi sản phẩm đang bán (mới nhất trước như trang chủ): bản xem trước tự chọn sản phẩm cho từng khối
    // theo bản nháp bằng đúng quy tắc của trang chủ, và ô chọn sản phẩm tìm trong danh sách này.
    products: products.map(toProductCard),
    feedback: feedback.slice(0, HOME_FEEDBACK_LIMIT),
    feedbackTotal: feedback.length,
  };
}

/** Sản phẩm cho ô chọn "sản phẩm được khen" của feedback: chỉ các trường cần gửi xuống trình duyệt. */
export async function loadFeedbackProductOptions() {
  const products = await getProducts();
  return products.map(({ id, name, thumbnail }) => ({ id, name, thumbnail }));
}
