import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS ?? "5");
const WINDOW_MINUTES = Number(process.env.LOGIN_WINDOW_MINUTES ?? "10");
const BLOCK_MINUTES = Number(process.env.LOGIN_BLOCK_MINUTES ?? "15");

function keyFor(email: string, ip: string) {
  return `${email.toLowerCase()}::${ip}`;
}

export function extractRequestIp(request?: Request) {
  if (!request) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}

export async function isLoginBlocked(email: string, ip: string) {
  const key = keyFor(email, ip);
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  if (!row?.blockedUntil) return false;
  return row.blockedUntil.getTime() > Date.now();
}

export async function registerLoginFailure(email: string, ip: string) {
  const key = keyFor(email, ip);
  const now = new Date();
  const nextBlockedAt = new Date(now.getTime() + BLOCK_MINUTES * 60 * 1000);
  const windowMs = WINDOW_MINUTES * 60 * 1000;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT key FROM "LoginThrottle" WHERE key = ${key} FOR UPDATE`;
    const row = await tx.loginThrottle.findUnique({ where: { key } });

    if (!row) {
      await tx.loginThrottle.create({
        data: {
          key,
          attempts: 1,
          windowStart: now,
          blockedUntil: null,
        },
      });
      return;
    }

    const withinWindow = now.getTime() - row.windowStart.getTime() <= windowMs;
    const nextAttempts = withinWindow ? row.attempts + 1 : 1;
    const blockedUntil = nextAttempts >= MAX_ATTEMPTS ? nextBlockedAt : null;

    await tx.loginThrottle.update({
      where: { key },
      data: {
        attempts: nextAttempts,
        windowStart: withinWindow ? row.windowStart : now,
        blockedUntil,
      },
    });
  });
}

export async function clearLoginFailures(email: string, ip: string) {
  const key = keyFor(email, ip);
  await prisma.loginThrottle.deleteMany({ where: { key } });
}
