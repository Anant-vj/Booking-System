import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handlePrismaError, parseJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth-helpers";
import { sendBookingStatusEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { BookingService } from "@/services/BookingService";

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
  try {
    const outcome = await BookingService.reviewBooking(id, parsed.data.action);

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

    const updated = outcome.updated;
    if (!updated) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Send email notification (non-blocking)
    void sendBookingStatusEmail({
      to: updated.user.email,
      recipientName: updated.user.name,
      hallName: updated.hall.name,
      startTime: updated.startTime,
      endTime: updated.endTime,
      status: updated.status === BookingStatus.APPROVED ? "APPROVED" : "REJECTED",
      purpose: updated.purpose,
    }).catch((err) => console.error("Failed to send booking decision email", err));

    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error);
  }
}
