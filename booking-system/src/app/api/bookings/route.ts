import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth-helpers";
import { getApprovedConflictsCount } from "@/lib/booking-conflicts";
import { handlePrismaError, parseJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { BookingService } from "@/services/BookingService";

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

    // Notify all Admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "New Booking Request",
          message: `${session.user.name || "Faculty"} requested ${booking.hall.name} on ${startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        })),
      });
    }

    return NextResponse.json({
      ...booking,
      hasConflict: conflictCount > 0,
      conflictCount,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function GET(request: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { session } = result;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "8"));

  try {
    const data = await BookingService.listBookingsWithConflicts({
      userId: session.user.id,
      page,
      pageSize,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
