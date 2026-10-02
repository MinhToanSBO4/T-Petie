-- Lưu kênh khách biết đến cửa hàng khi đặt hàng (trước đây giao diện thu nhưng không lưu).
ALTER TABLE "orders" ADD COLUMN "source" TEXT;
