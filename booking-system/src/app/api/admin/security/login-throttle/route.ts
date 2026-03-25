import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth-helpers";
import { ThrottleService } from "@/services/ThrottleService";

const querySchema = z.object({
  blockedOnly: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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

  const { q, page, pageSize, blockedOnly: blockedOnlyStr } = parsed.data;
  const blockedOnly = blockedOnlyStr !== "false";

  try {
    const data = await ThrottleService.listThrottles({ q, page, pageSize, blockedOnly });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
