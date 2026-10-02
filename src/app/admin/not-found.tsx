import { BackOfficeNotFound } from '@/components/error/ErrorScreen';

/** Trang không có trong khu quản trị: báo ngay trong khung quản trị thay vì trang 404 của khách. */
export default function AdminNotFound() {
  return <BackOfficeNotFound area="admin" />;
}
