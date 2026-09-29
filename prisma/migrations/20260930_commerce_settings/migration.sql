CREATE TABLE "commerce_settings" (
    "id" TEXT NOT NULL,
    "shippingFee" BIGINT NOT NULL,
    "freeShippingThreshold" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commerce_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coupons" (
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "minSubtotal" BIGINT NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requiresLogin" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("code")
);

ALTER TABLE "orders" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "orders" ADD CONSTRAINT "orders_couponCode_fkey" FOREIGN KEY ("couponCode") REFERENCES "coupons"("code") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "commerce_settings" ("id", "shippingFee", "freeShippingThreshold") VALUES ('default', 30000, 399000);
INSERT INTO "coupons" ("code", "type", "value", "requiresLogin") VALUES
  ('TPETIE20', 'FIXED', 20000, false),
  ('MEMBERVIP', 'PERCENT', 10, true);

-- Legacy catalog contained ratings without review records. Do not present those as customer feedback.
UPDATE "products" SET "rating" = NULL, "reviewCount" = 0;
