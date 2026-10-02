-- Lịch sử trạng thái đơn ghi rõ ai thao tác và ghi chú (lý do hủy, tự động hoàn tất).
ALTER TABLE "order_status_events" ADD COLUMN "actor" TEXT,
ADD COLUMN "note" TEXT;
