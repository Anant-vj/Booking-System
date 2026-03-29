import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handlePrismaError, parseJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth-helpers";
import { sendBookingStatusEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { BookingService } from "@/services/BookingService";

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "WITHDRAW"]),
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
    let updated;
    
    if (parsed.data.action === "WITHDRAW") {
      const outcome = await BookingService.withdrawBooking(id);
      if (outcome.type === "not_found") {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      if (outcome.type === "invalid_state") {
        return NextResponse.json(
          { error: `Only approved bookings can be withdrawn. Current: ${outcome.status}` },
          { status: 400 }
        );
      }
      updated = outcome.updated;
    } else {
      const outcome = await BookingService.reviewBooking(id, parsed.data.action as "APPROVE" | "REJECT");

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

      updated = outcome.updated;
    }

    if (!updated) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const adminName = result.session?.user?.name || "Admin";
    const dateStr = updated.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let notificationTitle = "";
    let notificationMessage = "";

    if (parsed.data.action === "APPROVE") {
      notificationTitle = "Booking Approved ✅";
      notificationMessage = `Your booking for ${updated.hall.name} on ${dateStr} was approved by ${adminName}`;
    } else if (parsed.data.action === "REJECT") {
      notificationTitle = "Booking Rejected ❌";
      notificationMessage = `Your booking for ${updated.hall.name} on ${dateStr} was rejected by ${adminName}`;
    } else if (parsed.data.action === "WITHDRAW") {
      notificationTitle = "Approval Withdrawn ⚠️";
      notificationMessage = `Your previously approved booking for ${updated.hall.name} on ${dateStr} was withdrawn by ${adminName}`;
    }

    if (notificationTitle && notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          title: notificationTitle,
          message: notificationMessage,
        }
      });
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
