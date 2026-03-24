CREATE TABLE "LoginThrottleAudit" (
  "id" TEXT NOT NULL,
  "throttleKey" TEXT,
  "adminUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginThrottleAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginThrottleAudit_throttleKey_createdAt_idx"
ON "LoginThrottleAudit"("throttleKey", "createdAt");

CREATE INDEX "LoginThrottleAudit_adminUserId_createdAt_idx"
ON "LoginThrottleAudit"("adminUserId", "createdAt");

ALTER TABLE "LoginThrottleAudit"
ADD CONSTRAINT "LoginThrottleAudit_throttleKey_fkey"
FOREIGN KEY ("throttleKey") REFERENCES "LoginThrottle"("key")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoginThrottleAudit"
ADD CONSTRAINT "LoginThrottleAudit_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
