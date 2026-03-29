import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (!user) {
      // Return 200 for security to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiry: tokenExpiry,
      },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    const { error } = await resend.emails.send({
      from: "College Booking System <noreply@resend.dev>", // Requires verified domain in prod
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Reset Your Password</h2>
        <p>Hello ${user.name},</p>
        <p>You recently requested to reset your password for the College Hall Booking System.</p>
        <p>Click the link below to reset it. This link will expire in 1 hour.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:5px;">Reset Password</a>
        </p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
