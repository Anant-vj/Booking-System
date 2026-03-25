import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ThrottleService } from "@/services/ThrottleService";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        
        // SECURE: Use ThrottleService to extract IP from trusted headers
        const ip = ThrottleService.extractIp(request.headers);

        try {
          const blocked = await ThrottleService.isBlocked(parsed.data.email, ip);
          if (blocked) return null;
        } catch (error) {
          console.error("Rate-limit check failed", error);
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        
        if (!user) {
          try {
            await ThrottleService.registerFailure(parsed.data.email, ip);
          } catch (error) {
            console.error("Failed to record login failure", error);
          }
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) {
          try {
            await ThrottleService.registerFailure(parsed.data.email, ip);
          } catch (error) {
            console.error("Failed to record login failure", error);
          }
          return null;
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
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
