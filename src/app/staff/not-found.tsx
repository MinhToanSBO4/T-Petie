import { BackOfficeNotFound } from '@/components/error/ErrorScreen';

/** Trang không có trong khu nhân viên: báo ngay trong khung khu nhân viên thay vì trang 404 của khách. */
export default function StaffNotFound() {
  return <BackOfficeNotFound area="staff" />;
}
