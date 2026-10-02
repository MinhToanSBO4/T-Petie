ALTER TABLE "collections"
ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "customer_testimonials" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "location" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_testimonials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_testimonials_isPublished_sortOrder_idx"
ON "customer_testimonials"("isPublished", "sortOrder");
