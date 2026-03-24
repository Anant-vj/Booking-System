import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  blockedOnly: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    blockedOnly: searchParams.get("blockedOnly") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const blockedOnly = parsed.data.blockedOnly !== "false";
  const query = parsed.data.q?.toLowerCase();
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 20;
  const where = {
    ...(blockedOnly ? { blockedUntil: { gt: new Date() } } : {}),
    ...(query ? { key: { contains: query, mode: "insensitive" as const } } : {}),
  };
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.loginThrottle.findMany({
      where,
      orderBy: [{ blockedUntil: "desc" }, { attempts: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.loginThrottle.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}
