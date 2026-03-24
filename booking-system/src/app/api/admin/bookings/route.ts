import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth-helpers";
import { getApprovedConflictsCount } from "@/lib/booking-conflicts";
import { prisma } from "@/lib/prisma";

const statusFilterSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
});

export async function GET(request: Request) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const parsed = statusFilterSchema.safeParse({ status });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }
  const where = parsed.data.status ? { status: parsed.data.status } : {};

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      hall: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: [{ status: "asc" }, { startTime: "asc" }],
  });

  const withConflict = await Promise.all(
    bookings.map(async (booking) => {
      const conflictCount = await getApprovedConflictsCount({
        hallId: booking.hallId,
        startTime: booking.startTime,
        endTime: booking.endTime,
        excludeBookingId: booking.id,
      });

      return {
        ...booking,
        hasConflict: conflictCount > 0,
        conflictCount,
      };
    })
  );

  return NextResponse.json(withConflict);
}
