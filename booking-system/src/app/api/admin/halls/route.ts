import { NextResponse } from "next/server";
import { z } from "zod";

import { handlePrismaError, parseJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const hallSchema = z.object({
  name: z.string().trim().min(2).max(100),
  capacity: z.number().int().positive().optional().nullable(),
});

export async function POST(request: Request) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

  const bodyResult = await parseJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;
  const body = bodyResult.data;
  
  const parsed = hallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid hall payload" }, { status: 400 });
  }

  try {
    const hall = await prisma.hall.create({ data: parsed.data });
    return NextResponse.json(hall, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}
