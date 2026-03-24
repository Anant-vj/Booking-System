import { BookingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getApprovedConflictsCount(params: {
  hallId: string;
  startTime: Date;
  endTime: Date;
  excludeBookingId?: string;
}) {
  const { hallId, startTime, endTime, excludeBookingId } = params;

  return prisma.booking.count({
    where: {
      hallId,
      status: BookingStatus.APPROVED,
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      // Critical overlap condition:
      // (startA < endB) AND (endA > startB)
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
}
