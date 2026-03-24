import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const result = await requireRole(["ADMIN"]);
  if ("error" in result) return result.error;
  const { session } = result;

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  await prisma.$transaction(async (tx) => {
    await tx.loginThrottleAudit.create({
      data: {
        throttleKey: decodedKey,
        adminUserId: session.user.id,
        action: "UNBLOCK",
        note: "Manual unblock from admin dashboard",
      },
    });

    await tx.loginThrottle.deleteMany({
      where: { key: decodedKey },
    });
  });

  return NextResponse.json({ success: true });
}
