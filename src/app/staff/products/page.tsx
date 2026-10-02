import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { ProductManager } from '@/components/admin/ProductManager';

export const dynamic = 'force-dynamic';

/** Nhân viên sửa sản phẩm, ảnh, size và tồn kho; chỉ quản trị viên tạo sản phẩm mới. */
export default async function StaffProductsPage() {
  await requireStaffAreaPage('/staff/products');
  return <ProductManager canCreateProduct={false} />;
}
