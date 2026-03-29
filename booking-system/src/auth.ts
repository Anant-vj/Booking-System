import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ThrottleService } from "@/services/ThrottleService";
import { CredentialsSignin } from "next-auth";

class CustomAuthError extends CredentialsSignin {
  code: string;
  constructor(message: string) {
    super();
    this.code = message;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  isSuperAdmin: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isSuperAdmin: { label: "isSuperAdmin", type: "text" }
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        
        const isSuperAdminLogin = parsed.data.isSuperAdmin === "true";

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (isSuperAdminLogin) {
          if (!user || user.role !== "SUPER_ADMIN") return null;

          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const timeString = user.lockedUntil.toLocaleTimeString();
            throw new CustomAuthError(`Account locked. Try again after ${timeString}`);
          }

          const isValid = await bcrypt.compare(parsed.data.password, user.password);
          if (!isValid) {
            const newAttempts = user.loginAttempts + 1;
            const updates: any = { loginAttempts: newAttempts };
            let lockedUntil = null;
            if (newAttempts >= 5) {
              lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
              updates.lockedUntil = lockedUntil;
            }
            await prisma.user.update({ where: { id: user.id }, data: updates });

            const ip = ThrottleService.extractIp(request.headers);
            await prisma.loginThrottleAudit.create({
              data: {
                throttleKey: `superadmin::${user.email}`,
                userId: user.id,
                ipAddress: ip,
                action: lockedUntil ? "LOCKOUT" : "FAILURE",
                note: `Failed Super Admin login attempt (${newAttempts}/5)`,
              }
            });

            if (lockedUntil) {
              const timeString = lockedUntil.toLocaleTimeString();
              throw new CustomAuthError(`Account locked. Try again after ${timeString}`);
            }

            throw new CustomAuthError("CredentialsSignin");
          }

          if (user.loginAttempts > 0 || user.lockedUntil) {
            await prisma.user.update({
              where: { id: user.id },
              data: { loginAttempts: 0, lockedUntil: null }
            });
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword
          } as any;
        }

        // Standard logic for Admin/Faculty
        if (!user || user.role === "SUPER_ADMIN") return null;

        const ip = ThrottleService.extractIp(request.headers);
        try {
          const blocked = await ThrottleService.isBlocked(parsed.data.email, ip);
          if (blocked) {
            const throttleKey = ThrottleService.keyFor(parsed.data.email, ip);
            const row = await prisma.loginThrottle.findUnique({ where: { key: throttleKey } });
            if (row?.blockedUntil) {
              const timeString = row.blockedUntil.toLocaleTimeString();
              throw new CustomAuthError(`Account locked. Try again after ${timeString}`);
            }
            throw new CustomAuthError("Account locked. Try again later.");
          }
        } catch (error) {
          if (error instanceof CustomAuthError) throw error;
          console.error("Rate-limit check failed", error);
        }
        
        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) {
          try {
            await ThrottleService.registerFailure(parsed.data.email, ip);
            const isNowBlocked = await ThrottleService.isBlocked(parsed.data.email, ip);
            
            await prisma.loginThrottleAudit.create({
              data: {
                throttleKey: ThrottleService.keyFor(parsed.data.email, ip),
                userId: user.id,
                ipAddress: ip,
                action: isNowBlocked ? "LOCKOUT" : "FAILURE",
                note: `Failed login attempt for ${user.role} (${parsed.data.email})`,
              }
            });

            if (isNowBlocked) {
              const row = await prisma.loginThrottle.findUnique({ where: { key: ThrottleService.keyFor(parsed.data.email, ip) } });
              if (row?.blockedUntil) {
                const timeString = row.blockedUntil.toLocaleTimeString();
                throw new CustomAuthError(`Account locked. Try again after ${timeString}`);
              }
            }
          } catch (error) {
            if (error instanceof CustomAuthError) throw error;
            console.error("Failed to record login failure", error);
          }
          throw new CustomAuthError("CredentialsSignin");
        }

        try {
          await ThrottleService.clearFailures(parsed.data.email, ip);
        } catch (error) {
          console.error("Failed to clear login failures", error);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        if ('mustChangePassword' in user) {
          token.mustChangePassword = user.mustChangePassword;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as Role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
});
