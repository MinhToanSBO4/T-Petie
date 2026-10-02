'use client';

import { ReviewModerationPanel } from '@/components/admin/ReviewModerationPanel';

/**
 * Tất cả đánh giá của khách ở mọi sản phẩm. Đánh giá hiển thị ngay khi khách gửi; tại đây quản trị viên
 * và nhân viên trả lời, ẩn hoặc xóa đánh giá không phù hợp. Mỗi sản phẩm cũng
 * có mục Đánh giá riêng khi mở sửa sản phẩm.
 */
export function ReviewManager() {
  return <div className="space-y-4">
    <header>
      <h1 className="font-heading text-3xl font-bold text-charcoal-900">Đánh giá sản phẩm</h1>
      <p className="mt-1 text-sm text-charcoal-600">
        Chỉ khách đã mua và nhận hàng mới đánh giá được. Đánh giá hiển thị ngay; ẩn đánh giá sẽ gỡ khỏi trang sản phẩm và không tính vào điểm sao.
      </p>
    </header>
    <ReviewModerationPanel />
  </div>;
}
