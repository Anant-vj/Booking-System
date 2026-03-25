-- Backfill existing NULL throttleKey values safely
UPDATE "LoginThrottleAudit" 
SET "throttleKey" = 'deleted_key_historical' 
WHERE "throttleKey" IS NULL;

-- Drop the foreign key constraint that causes ON DELETE SET NULL
-- The constraint name might vary depending on previous migrations, 
-- but Prisma usually names it ModelName_fieldName_fkey
ALTER TABLE "LoginThrottleAudit" DROP CONSTRAINT IF EXISTS "LoginThrottleAudit_throttleKey_fkey";

-- Make the column non-nullable now that it is backfilled
ALTER TABLE "LoginThrottleAudit" ALTER COLUMN "throttleKey" SET NOT NULL;

-- Note: No need to recreate the constraint as we want to keep the keys immutable 
-- even after the referenced LoginThrottle is deleted.
