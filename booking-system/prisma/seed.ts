import "dotenv/config";

import { BookingStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";

async function main() {
  // 🔹 Seed Halls
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

  // 🔹 Seed Admin
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? "admin@college.edu";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin@123";
  const adminHashed = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Default Admin",
      role: Role.ADMIN,
      password: adminHashed,
    },
    create: {
      name: "Default Admin",
      email: adminEmail,
      password: adminHashed,
      role: Role.ADMIN,
    },
  });

  // 🔹 Faculty List (SCALABLE WAY)
  const facultyList = [
    {
      name: "Demo Faculty",
      email: "faculty@college.edu",
      password: "Faculty@123",
    },
    {
      name: "Anantharaman",
      email: "anantharaman0607@gmail.com",
      password: "123456",
    },
    {
      name: "Anant VJ",
      email: "anantvj06@gmail.com",
      password: "123456",
    },
  ];

  for (const faculty of facultyList) {
    const hashedPassword = await bcrypt.hash(faculty.password, 10);

    await prisma.user.upsert({
      where: { email: faculty.email },
      update: {
        name: faculty.name,
        role: Role.FACULTY,
        password: hashedPassword,
      },
      create: {
        name: faculty.name,
        email: faculty.email,
        password: hashedPassword,
        role: Role.FACULTY,
      },
    });
  }

  // 🔹 Seed Sample Booking
  const facultyUser = await prisma.user.findUnique({
    where: { email: "faculty@college.edu" },
  });

  const hall = await prisma.hall.findFirst({ where: { name: "Hall A" } });

  if (hall && facultyUser) {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(10, 0, 0, 0);

    const end = new Date(start);
    end.setHours(12, 0, 0, 0);

    await prisma.booking.upsert({
      where: { id: "seed-approved-booking-id" },
      update: {},
      create: {
        id: "seed-approved-booking-id",
        userId: facultyUser.id,
        hallId: hall.id,
        startTime: start,
        endTime: end,
        status: BookingStatus.APPROVED,
        purpose: "Seeded orientation session",
      },
    });
  }

  console.log("✅ Seed completed successfully");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });