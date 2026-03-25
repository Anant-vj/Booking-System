import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS ?? "5");
const WINDOW_MINUTES = Number(process.env.LOGIN_WINDOW_MINUTES ?? "10");
const BLOCK_MINUTES = Number(process.env.LOGIN_BLOCK_MINUTES ?? "15");

export class ThrottleService {
  /**
   * Safely extracts the client IP, preferring trusted proxy headers.
   * Prevents IP Spoofing by not trusting a mutable X-Forwarded-For as-is.
   */
  static extractIp(headers: Headers): string {
    // Vercel/Cloudflare specific trusted header
    const vercelIp = headers.get("x-real-ip");
    if (vercelIp) return vercelIp.trim();

    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      // Trust the last IP in the chain (most recent proxy) instead of the first (client-setted)
      const ips = forwarded.split(",").map(t => t.trim());
      return ips[ips.length - 1] || "unknown";
    }

    return "unknown";
  }

  static keyFor(email: string, ip: string): string {
    return `${email.toLowerCase()}::${ip}`;
  }

  static async isBlocked(email: string, ip: string): Promise<boolean> {
    const key = this.keyFor(email, ip);

    // ARCHITECTURE: Pluggable Redis Support
    // To enable Redis, add REDIS_URL and implement an Upstash-compatible client.
    if (process.env.REDIS_URL) {
      // return RedisThrottle.isBlocked(key);
    }

    // Fallback to Database
    const row = await prisma.loginThrottle.findUnique({ where: { key } });
    if (!row?.blockedUntil) return false;
    return row.blockedUntil.getTime() > Date.now();
  }

  static async registerFailure(email: string, ip: string): Promise<void> {
    const key = this.keyFor(email, ip);
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

  static async clearFailures(email: string, ip: string): Promise<void> {
    const key = this.keyFor(email, ip);
    await prisma.loginThrottle.deleteMany({ where: { key } });
  }

  static async listThrottles(params: { q?: string; page: number; pageSize: number; blockedOnly?: boolean }) {
    const { q, page, pageSize, blockedOnly } = params;
    const query = q?.toLowerCase();
    const where = {
      ...(blockedOnly ? { blockedUntil: { gt: new Date() } } : {}),
      ...(query ? { key: { contains: query, mode: "insensitive" as const } } : {}),
    };
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.loginThrottle.findMany({
        where,
        orderBy: [{ blockedUntil: "desc" }, { attempts: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.loginThrottle.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  static async listAudits(params: { page: number; pageSize: number }) {
    const { page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.loginThrottleAudit.findMany({
        include: {
          adminUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.loginThrottleAudit.count(),
    ]);

    return { items, total, page, pageSize };
  }

  static async unblock(key: string, adminUserId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.loginThrottleAudit.create({
        data: {
          throttleKey: key,
          adminUserId,
          action: "UNBLOCK",
          note: "Manual unblock from admin dashboard",
        },
      });

      await tx.loginThrottle.deleteMany({
        where: { key },
      });
    });
  }
}
