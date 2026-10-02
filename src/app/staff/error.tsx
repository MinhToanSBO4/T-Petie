'use client';

import { BackOfficeErrorScreen, type ErrorBoundaryProps } from '@/components/error/ErrorBoundaryScreen';

/** Lỗi của một trang trong khu nhân viên: hiện trong khung khu nhân viên để vẫn chuyển sang mục khác được. */
export default function StaffError(props: ErrorBoundaryProps) {
  return <BackOfficeErrorScreen area="staff" {...props} />;
}
