import { requireStaffPage } from '@/server/auth/staff-session';
import { getProducts } from '@/server/catalog/queries';
import { TestimonialManager } from '@/components/admin/TestimonialManager';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  await requireStaffPage('/admin/feedback');
  // Danh mục đã cache; chỉ gửi xuống trình duyệt các trường cần cho ô chọn sản phẩm liên quan.
  const products = await getProducts();
  return <TestimonialManager products={products.map(({ id, name, thumbnail }) => ({ id, name, thumbnail }))} />;
}
