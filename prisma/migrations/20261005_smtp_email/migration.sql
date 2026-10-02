ALTER TABLE "users" ADD COLUMN "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "email_jobs" (
  "id" TEXT NOT NULL, "eventKey" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "eventId" TEXT, "recipient" TEXT NOT NULL, "kind" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3), "leaseOwner" TEXT, "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sentAt" TIMESTAMP(3),
  CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_jobs_eventKey_key" ON "email_jobs"("eventKey");
CREATE INDEX "email_jobs_status_nextAttemptAt_idx" ON "email_jobs"("status", "nextAttemptAt");
CREATE INDEX "email_jobs_orderId_eventId_idx" ON "email_jobs"("orderId", "eventId");
