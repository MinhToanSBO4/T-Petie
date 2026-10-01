-- Đánh giá không còn chờ duyệt: hiển thị ngay khi khách gửi, quản trị viên/nhân viên ẩn khi không phù hợp
-- và có thể trả lời. Đánh giá cũ đang chờ duyệt được hiển thị theo quy tắc mới.
ALTER TABLE "product_reviews" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reply" TEXT,
ADD COLUMN "repliedAt" TIMESTAMP(3),
ADD COLUMN "repliedById" TEXT;

DROP INDEX "product_reviews_productId_isApproved_idx";
DROP INDEX "product_reviews_isFeatured_isApproved_idx";
ALTER TABLE "product_reviews" DROP COLUMN "isApproved";

CREATE INDEX "product_reviews_productId_isHidden_idx" ON "product_reviews"("productId", "isHidden");
CREATE INDEX "product_reviews_isFeatured_isHidden_idx" ON "product_reviews"("isFeatured", "isHidden");
