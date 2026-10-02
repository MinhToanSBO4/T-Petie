-- Feedback khách hàng chuyển từ trích dẫn chữ sang ảnh chụp màn hình tin nhắn.
-- Feedback dạng chữ không chuyển được sang ảnh, nên migration dừng lại thay vì tự xóa dữ liệu.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "customer_testimonials") THEN
    RAISE EXCEPTION 'customer_testimonials còn feedback dạng chữ: sao lưu và xóa các bản ghi này trước khi chuyển sang feedback dạng ảnh';
  END IF;
END $$;

ALTER TABLE "customer_testimonials" DROP COLUMN "customerName",
DROP COLUMN "location",
DROP COLUMN "quote",
DROP COLUMN "rating",
ADD COLUMN "imageUrl" TEXT NOT NULL,
ADD COLUMN "imageWidth" INTEGER,
ADD COLUMN "imageHeight" INTEGER,
ADD COLUMN "caption" TEXT,
ADD COLUMN "productId" TEXT;

ALTER TABLE "customer_testimonials" ADD CONSTRAINT "customer_testimonials_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
