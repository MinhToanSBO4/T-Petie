import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { SITE_CONTENT_TAG } from './site-content';

export function invalidateCollections(slug?: string) {
  revalidateTag('collections');
  revalidateTag('products');
  // Menu bộ sưu tập nằm ở layout gốc nên làm mới toàn bộ cây trang, giống nhận diện thương hiệu.
  revalidatePath('/', 'layout');
  revalidatePath('/collections');
  if (slug) revalidatePath(`/collections/${slug}`);
}

export function invalidateTestimonials() {
  revalidateTag('testimonials');
  revalidatePath('/');
}

/** Xóa cache cấu hình nội dung và làm mới mọi trang hiển thị nó. */
export function invalidateSiteContent() {
  revalidateTag(SITE_CONTENT_TAG);
  // Nhận diện thương hiệu nằm ở layout gốc nên cần làm mới toàn bộ cây trang.
  revalidatePath('/', 'layout');
  revalidatePath('/');
  revalidatePath('/sale');
  revalidatePath('/about');
  revalidatePath('/girls');
  revalidatePath('/girls/tops');
  revalidatePath('/girls/bottoms');
  revalidatePath('/girls/dresses');
  revalidatePath('/girls/sets');
}
