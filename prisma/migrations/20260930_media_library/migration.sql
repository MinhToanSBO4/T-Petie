-- Thư viện ảnh dùng chung cho toàn bộ nội dung website.
-- Ảnh nằm trên Cloudinary; bảng này giữ metadata + URL phân phối để không
-- còn đường dẫn ảnh nào bị viết cứng trong mã nguồn.
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'tpetie/site',
    "altText" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "format" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_assets_url_key" ON "media_assets"("url");
CREATE UNIQUE INDEX "media_assets_publicId_key" ON "media_assets"("publicId");
CREATE INDEX "media_assets_createdAt_idx" ON "media_assets"("createdAt");
