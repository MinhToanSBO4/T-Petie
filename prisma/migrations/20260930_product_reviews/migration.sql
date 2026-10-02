-- Đánh giá sản phẩm do khách gửi; quản trị viên duyệt và chọn đánh giá nổi bật cho trang chủ.
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_reviews_productId_isApproved_idx" ON "product_reviews"("productId", "isApproved");
CREATE INDEX "product_reviews_isFeatured_isApproved_idx" ON "product_reviews"("isFeatured", "isApproved");

ALTER TABLE "product_reviews"
ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId")
REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
