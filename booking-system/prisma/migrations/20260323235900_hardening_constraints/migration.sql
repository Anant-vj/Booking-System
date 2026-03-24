-- Enforce valid booking time windows at database layer
ALTER TABLE "Booking"
ADD CONSTRAINT "booking_start_before_end_chk"
CHECK ("startTime" < "endTime");

-- Required for exclusion constraints that combine equality and range operators
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping APPROVED bookings for the same hall (database-level invariant)
ALTER TABLE "Booking"
ADD CONSTRAINT "booking_no_overlap_approved"
EXCLUDE USING gist (
  "hallId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE ("status" = 'APPROVED');
