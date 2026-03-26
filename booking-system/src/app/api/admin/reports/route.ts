import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

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

    return NextResponse.json({ today, thisWeek, thisMonth });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
