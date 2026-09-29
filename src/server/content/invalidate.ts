import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';

export function invalidateCollections(slug?: string) {
  revalidateTag('collections');
  revalidateTag('products');
  revalidatePath('/');
  revalidatePath('/bo-suu-tap');
  if (slug) revalidatePath(`/bo-suu-tap/${slug}`);
}

export function invalidateTestimonials() {
  revalidateTag('testimonials');
  revalidatePath('/');
}
