import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const changeSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = changeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        password: hashedPassword,
        mustChangePassword: false 
      }
    });

    const response = NextResponse.json({ success: true });
    // Set a cookie so middleware knows the password was changed for this session
    response.cookies.set("pwd-changed", "1", {
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return response;
  } catch (error) {
    console.error("Change password error", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
