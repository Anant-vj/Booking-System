import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth-helpers";
import { ThrottleService } from "@/services/ThrottleService";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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

  try {
    const data = await ThrottleService.listAudits(parsed.data);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
