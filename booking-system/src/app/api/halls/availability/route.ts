import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;

  const halls = await prisma.hall.findMany({
    orderBy: { name: "asc" },
    include: {
      bookings: {
        where: { status: BookingStatus.APPROVED },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { startTime: "asc" },
      },
    },
  });

  return NextResponse.json(halls);
}
