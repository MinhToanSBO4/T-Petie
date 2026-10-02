-- Chỉ mục cho hai khóa ngoại còn thiếu: đếm đơn dùng một mã giảm giá trước khi xóa mã, và kiểm tra ràng buộc
-- khi xóa size sản phẩm (order_items.variantId) không phải quét toàn bảng.
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");
CREATE INDEX "orders_couponCode_idx" ON "orders"("couponCode");
