-- Đơn mua: mốc hoàn tất (tính hạn đánh giá) và lịch sử trạng thái cho dòng thời gian của khách.
ALTER TABLE "orders" ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_status_events_orderId_createdAt_idx" ON "order_status_events"("orderId", "createdAt");

ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Đơn đã có: ghi mốc đặt hàng và mốc trạng thái hiện tại (lấy theo lần cập nhật cuối) để dòng thời gian không trống.
INSERT INTO "order_status_events" ("id", "orderId", "status", "createdAt")
SELECT 'migrated-' || "id" || '-created', "id", 'PENDING', "createdAt" FROM "orders";

INSERT INTO "order_status_events" ("id", "orderId", "status", "createdAt")
SELECT 'migrated-' || "id" || '-current', "id", "orderStatus", "updatedAt" FROM "orders" WHERE "orderStatus" <> 'PENDING';

UPDATE "orders" SET "completedAt" = "updatedAt" WHERE "orderStatus" = 'COMPLETED';

-- Tra cứu "khách đã mua sản phẩm này chưa" theo sản phẩm.
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- Đánh giá gắn với đúng một món đã mua: chỉ khách đã mua mới đánh giá, mỗi lần mua đánh giá một lần.
ALTER TABLE "product_reviews" ADD COLUMN "orderItemId" TEXT,
ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "variantLabel" TEXT,
ADD COLUMN "sizeFit" TEXT,
ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "editCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "product_reviews_orderItemId_key" ON "product_reviews"("orderItemId");
CREATE INDEX "product_reviews_userId_idx" ON "product_reviews"("userId");

ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
