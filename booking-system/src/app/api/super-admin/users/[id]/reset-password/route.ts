import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const resetSchema = z.object({
  password: z.string().min(6),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid password" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    
    await prisma.user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        mustChangePassword: true, // Force user to change on next login
        loginAttempts: 0,
        lockedUntil: null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
