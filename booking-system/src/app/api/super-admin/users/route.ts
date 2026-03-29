import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "FACULTY"]),
});

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  if (role !== "ADMIN" && role !== "FACULTY") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true, name: true, email: true, role: true, loginAttempts: true, lockedUntil: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const result = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        password: hashedPassword,
        role: parsed.data.role,
        mustChangePassword: true // Force them to change their temp password on first login
      },
      select: { id: true, name: true, email: true, role: true }
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
