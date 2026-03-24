import { BookingStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";

async function main() {
  const halls = [
    { name: "Hall A", capacity: 300 },
    { name: "Hall B", capacity: 220 },
    { name: "Seminar Hall 1", capacity: 120 },
    { name: "Seminar Hall 2", capacity: 100 },
    { name: "Conference Room", capacity: 80 },
    { name: "Auditorium", capacity: 500 },
  ];

  for (const hall of halls) {
    await prisma.hall.upsert({
      where: { name: hall.name },
      update: { capacity: hall.capacity },
      create: hall,
    });
  }

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? "admin@college.edu";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin@123";
  const hashed = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Default Admin",
      role: Role.ADMIN,
      password: hashed,
    },
    create: {
      name: "Default Admin",
      email: adminEmail,
      password: hashed,
      role: Role.ADMIN,
    },
  });

  const facultyEmail = "faculty@college.edu";
  const facultyHashed = await bcrypt.hash("Faculty@123", 10);
  const faculty = await prisma.user.upsert({
    where: { email: facultyEmail },
    update: {
      name: "Demo Faculty",
      role: Role.FACULTY,
      password: facultyHashed,
    },
    create: {
      name: "Demo Faculty",
      email: facultyEmail,
      password: facultyHashed,
      role: Role.FACULTY,
    },
  });

  const hall = await prisma.hall.findFirst({ where: { name: "Hall A" } });
  if (hall) {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);

    await prisma.booking.upsert({
      where: {
        id: "seed-approved-booking-id",
      },
      update: {},
      create: {
        id: "seed-approved-booking-id",
        userId: faculty.id,
        hallId: hall.id,
        startTime: start,
        endTime: end,
        status: BookingStatus.APPROVED,
        purpose: "Seeded orientation session",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
