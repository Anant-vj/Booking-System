import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function parseJsonBody(request: Request) {
  try {
    return { data: await request.json() };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }),
    };
  }
}

export function handlePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Resource already exists" }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (error.code === "P2004") {
      return NextResponse.json(
        { error: "Operation violates booking conflict rules" },
        { status: 409 }
      );
    }
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
