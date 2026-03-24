import { NextResponse } from "next/server";
import { z } from "zod";

import { handlePrismaError, parseJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const updateHallSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  capacity: z.number().int().positive().optional().nullable(),
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
  const parsed = updateHallSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid hall payload" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const updated = await prisma.hall.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

  const { id } = await params;
  const activeBookingsCount = await prisma.booking.count({
    where: {
      hallId: id,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (activeBookingsCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete hall with active bookings" },
      { status: 400 }
    );
  }

  try {
    await prisma.hall.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handlePrismaError(error);
  }
}
