import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth-helpers";
import { ThrottleService } from "@/services/ThrottleService";
import { prisma } from "@/lib/prisma";

// key format is email::ip
const keySchema = z.string().includes("::").min(5);

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;
  const { session } = result;

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  const parsed = keySchema.safeParse(decodedKey);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login throttle key format" }, { status: 400 });
  }

  try {
    await ThrottleService.unblock(decodedKey, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to unblock login key:", err);
    return NextResponse.json({ error: "Failed to process unblock" }, { status: 500 });
  }
}
