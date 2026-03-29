import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: parsed.data.token,
        passwordResetExpiry: {
          gt: new Date() // Must not be expired
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    // Also clear the login lockout if they successfully reset password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        loginAttempts: 0,
        lockedUntil: null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
