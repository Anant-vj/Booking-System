import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BookingQueryParams = {
  status?: BookingStatus;
  userId?: string;
  page: number;
  pageSize: number;
};

export class BookingService {
  static async listBookingsWithConflicts(params: BookingQueryParams) {
    const { status, userId, page, pageSize } = params;
    const where: Prisma.BookingWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
    };
    const skip = (page - 1) * pageSize;

    const [rawBookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          hall: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    // OPTIMIZATION: Fix N+1 by finding all conflicts in one query
    // We look for conflicts for ALL bookings in the current page that are not CANCELLED/REJECTED
    const items = await this.enrichWithConflicts(rawBookings);

    return { items, total, page, pageSize };
  }

  private static async enrichWithConflicts(bookings: any[]) {
    if (bookings.length === 0) return [];

    // For each booking, we want to count APPROVED bookings in the same hall with overlapping time
    // We can do this with a single complex query or by fetching all approved bookings in relevant halls/time-ranges
    
    // Simple approach to fix N+1: Use a raw query or a set of counts
    // For now, we'll keep it simple but BATCED.
        
    // REAL BATCH FIX:
    const hallIds = Array.from(new Set(bookings.map(b => b.hallId)));
    const minStart = new Date(Math.min(...bookings.map(b => new Date(b.startTime).getTime())));
    const maxEnd = new Date(Math.max(...bookings.map(b => new Date(b.endTime).getTime())));

    const approvedBookings = await prisma.booking.findMany({
      where: {
        hallId: { in: hallIds },
        status: BookingStatus.APPROVED,
        startTime: { lt: maxEnd },
        endTime: { gt: minStart },
      },
    });

    return bookings.map(b => {
      const conflicts = approvedBookings.filter(approved => 
        approved.hallId === b.hallId &&
        approved.id !== b.id &&
        new Date(approved.startTime) < new Date(b.endTime) &&
        new Date(approved.endTime) > new Date(b.startTime)
      );
      return {
        ...b,
        hasConflict: conflicts.length > 0,
        conflictCount: conflicts.length,
      };
    });
  }
  static async reviewBooking(id: string, action: "APPROVE" | "REJECT") {
    return prisma.$transaction(async (tx) => {
      // Row-level lock to prevent race conditions
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;

      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) return { type: "not_found" as const };

      if (booking.status !== BookingStatus.PENDING) {
        return {
          type: "invalid_state" as const,
          status: booking.status,
        };
      }

      if (action === "APPROVE") {
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
          status: action === "APPROVE" ? BookingStatus.APPROVED : BookingStatus.REJECTED,
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
            select: { id: true, name: true, email: true },
          },
        },
      });

      return { type: "updated" as const, updated };
    });
  }

  static async withdrawBooking(id: string) {
    return prisma.$transaction(async (tx) => {
      // Row-level lock
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;

      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) return { type: "not_found" as const };

      if (booking.status !== BookingStatus.APPROVED) {
        return {
          type: "invalid_state" as const,
          status: booking.status,
        };
      }

      await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.PENDING },
      });

      const updated = await tx.booking.findUnique({
        where: { id },
        include: {
          hall: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return { type: "updated" as const, updated };
    });
  }
}
