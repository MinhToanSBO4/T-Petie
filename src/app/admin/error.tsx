'use client';

import { BackOfficeErrorScreen, type ErrorBoundaryProps } from '@/components/error/ErrorBoundaryScreen';

/** Lỗi của một trang quản trị: hiện trong khung quản trị để vẫn chuyển sang mục khác được. */
export default function AdminError(props: ErrorBoundaryProps) {
  return <BackOfficeErrorScreen area="admin" {...props} />;
}
