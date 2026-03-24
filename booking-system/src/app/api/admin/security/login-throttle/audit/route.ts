import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.loginThrottleAudit.findMany({
      include: {
        adminUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.loginThrottleAudit.count(),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
