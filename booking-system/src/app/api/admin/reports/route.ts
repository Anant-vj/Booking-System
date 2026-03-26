import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period"); // today, week, month, year, all

  const now = new Date();

  // Today: midnight to midnight
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // This week: Monday to Sunday
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // This month: 1st to end
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  async function getStats(start: Date, end: Date) {
    const bookings = await prisma.booking.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: start, lt: end },
      },
      _count: { id: true },
    });

    const counts: Record<string, number> = {
      total: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };

    for (const row of bookings) {
      counts[row.status] = row._count.id;
      counts.total += row._count.id;
    }

    return counts;
  }

  try {
    const [today, thisWeek, thisMonth] = await Promise.all([
      getStats(todayStart, todayEnd),
      getStats(weekStart, weekEnd),
      getStats(monthStart, monthEnd),
    ]);

    let previewBookings: any[] = [];
    if (period) {
      let queryStart: Date | undefined;
      let queryEnd: Date | undefined;

      if (period === "today") {
        queryStart = todayStart;
        queryEnd = todayEnd;
      } else if (period === "week") {
        queryStart = weekStart;
        queryEnd = weekEnd;
      } else if (period === "month") {
        queryStart = monthStart;
        queryEnd = monthEnd;
      } else if (period === "year") {
        queryStart = new Date(now.getFullYear(), 0, 1);
        queryEnd = new Date(now.getFullYear() + 1, 0, 1);
      } // 'all' leaves both undefined

      previewBookings = await prisma.booking.findMany({
        where: {
          ...(queryStart && queryEnd ? { createdAt: { gte: queryStart, lt: queryEnd } } : {}),
        },
        include: {
          hall: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ today, thisWeek, thisMonth, previewBookings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
