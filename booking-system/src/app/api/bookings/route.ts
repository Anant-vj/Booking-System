import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth-helpers";
import { getApprovedConflictsCount } from "@/lib/booking-conflicts";
import { handlePrismaError, parseJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";

const createBookingSchema = z.object({
  hallId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  purpose: z.string().trim().max(500).optional(),
  numberOfParticipants: z.coerce.number().int().min(1),
});

export async function POST(request: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { session } = result;

  const bodyResult = await parseJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;
  const body = bodyResult.data;
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return NextResponse.json({ error: "Invalid date values" }, { status: 400 });
  }
  if (startTime >= endTime) {
    return NextResponse.json(
      { error: "startTime must be before endTime" },
      { status: 400 }
    );
  }

  try {
    const hall = await prisma.hall.findUnique({ where: { id: parsed.data.hallId } });
    if (!hall) {
      return NextResponse.json({ error: "Hall not found" }, { status: 404 });
    }

    const conflictCount = await getApprovedConflictsCount({
      hallId: parsed.data.hallId,
      startTime,
      endTime,
    });

    const booking = await prisma.booking.create({
      data: {
        hallId: parsed.data.hallId,
        userId: session.user.id,
        startTime,
        endTime,
        purpose: parsed.data.purpose,
        numberOfParticipants: parsed.data.numberOfParticipants,
        status: BookingStatus.PENDING,
      },
      include: {
        hall: true,
      },
    });

    return NextResponse.json({
      ...booking,
      hasConflict: conflictCount > 0,
      conflictCount,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { session } = result;

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: { hall: true },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json(bookings);
}
