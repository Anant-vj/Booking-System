import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handlePrismaError, parseJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth-helpers";
import { sendBookingStatusEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

  const bodyResult = await parseJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;
  const body = bodyResult.data;
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { id } = await params;
  let updated: {
    id: string;
    user: { email: string; name: string };
    hall: { name: string };
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    purpose: string | null;
  } | null = null;
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;

      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) return { type: "not_found" as const };

      if (booking.status !== BookingStatus.PENDING) {
        return {
          type: "invalid_state" as const,
          status: booking.status,
        };
      }

      if (parsed.data.action === "APPROVE") {
        const conflictCount = await tx.booking.count({
          where: {
            hallId: booking.hallId,
            status: BookingStatus.APPROVED,
            id: { not: booking.id },
            startTime: { lt: booking.endTime },
            endTime: { gt: booking.startTime },
          },
        });

        if (conflictCount > 0) {
          return { type: "conflict" as const, conflictCount };
        }
      }

      const updateResult = await tx.booking.updateMany({
        where: { id, status: BookingStatus.PENDING },
        data: {
          status:
            parsed.data.action === "APPROVE"
              ? BookingStatus.APPROVED
              : BookingStatus.REJECTED,
        },
      });

      if (updateResult.count !== 1) {
        return { type: "state_changed" as const };
      }

      const updated = await tx.booking.findUnique({
        where: { id },
        include: {
          hall: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return { type: "updated" as const, updated };
    });

    if (outcome.type === "not_found") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (outcome.type === "invalid_state") {
      return NextResponse.json(
        { error: `Only pending bookings can be reviewed. Current: ${outcome.status}` },
        { status: 400 }
      );
    }
    if (outcome.type === "conflict") {
      return NextResponse.json(
        {
          error: "Conflict detected with approved bookings. Cannot approve.",
          conflictCount: outcome.conflictCount,
        },
        { status: 409 }
      );
    }
    if (outcome.type === "state_changed") {
      return NextResponse.json(
        { error: "Booking state changed by another process" },
        { status: 409 }
      );
    }

    if (!outcome.updated) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    updated = outcome.updated;
  } catch (error) {
    const response = handlePrismaError(error);
    if (response.status === 500) {
      console.error("Failed to approve/reject booking", error);
    }
    return response;
  }

  if (!updated) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  try {
    await sendBookingStatusEmail({
      to: updated.user.email,
      recipientName: updated.user.name,
      hallName: updated.hall.name,
      startTime: updated.startTime,
      endTime: updated.endTime,
      status: updated.status === BookingStatus.APPROVED ? "APPROVED" : "REJECTED",
      purpose: updated.purpose,
    });
  } catch (error) {
    console.error("Failed to send booking decision email", error);
  }

  return NextResponse.json(updated);
}
