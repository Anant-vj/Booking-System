import nodemailer from "nodemailer";

type BookingEmailInput = {
  to: string;
  recipientName?: string | null;
  hallName: string;
  startTime: Date;
  endTime: Date;
  status: "APPROVED" | "REJECTED" | "CANCELLED";
  purpose?: string | null;
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

export async function sendBookingStatusEmail(input: BookingEmailInput) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM;
  if (!transporter || !from) return;

  const start = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(input.startTime);

  const end = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(input.endTime);

  const subject = `Booking ${input.status}: ${input.hallName}`;
  const greeting = input.recipientName ? `Hi ${input.recipientName},` : "Hello,";
  const text = `${greeting}

Your booking has been marked as ${input.status}.
Hall: ${input.hallName}
Start: ${start}
End: ${end}
Purpose: ${input.purpose ?? "N/A"}

Regards,
College Hall Booking System`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    text,
  });
}
