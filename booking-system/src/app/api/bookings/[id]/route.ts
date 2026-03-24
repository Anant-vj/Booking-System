import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth-helpers";
import { handlePrismaError } from "@/lib/api-errors";
import { sendBookingStatusEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { session } = result;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isOwner = booking.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    booking.status === BookingStatus.REJECTED ||
    booking.status === BookingStatus.CANCELLED
  ) {
    return NextResponse.json(
      { error: `Cannot cancel ${booking.status.toLowerCase()} booking` },
      { status: 400 }
    );
  }

  let updated;
  try {
    updated = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: {
        hall: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });
  } catch (error) {
    return handlePrismaError(error);
  }

  try {
    await sendBookingStatusEmail({
      to: updated.user.email,
      recipientName: updated.user.name,
      hallName: updated.hall.name,
      startTime: updated.startTime,
      endTime: updated.endTime,
      status: "CANCELLED",
      purpose: updated.purpose,
    });
  } catch (error) {
    console.error("Failed to send cancellation email", error);
  }

  return NextResponse.json(updated);
}
