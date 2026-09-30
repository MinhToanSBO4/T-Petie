-- Tiến trình xuất Excel chạy nền: API trả về ngay, người dùng nhận thông báo khi file xong.
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "export_jobs_createdAt_idx" ON "export_jobs"("createdAt");
