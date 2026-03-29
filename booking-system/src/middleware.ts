import { NextResponse } from "next/server";
import { auth } from "@/auth";

const SUPER_ADMIN_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export default auth((req) => {
  const { nextUrl } = req;
  const isAuth = !!req.auth;
  const role = req.auth?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const mustChangePassword = (req.auth?.user as any)?.mustChangePassword;

  // Path matchers
  const isSuperAdminRoute = nextUrl.pathname.startsWith("/super-admin");
  const isSuperAdminLogin = nextUrl.pathname === "/super-admin/login";
  const isSuperAdminChangePass = nextUrl.pathname === "/super-admin/change-password";
  
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isFacultyRoute = nextUrl.pathname.startsWith("/faculty");
  const isLoginRoute = nextUrl.pathname === "/login";

  // Prevent logged-in users from seeing login pages
  if (isAuth && (isLoginRoute || isSuperAdminLogin)) {
    if (isSuperAdmin) return NextResponse.redirect(new URL("/super-admin", req.nextUrl));
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.nextUrl));
    if (role === "FACULTY") return NextResponse.redirect(new URL("/faculty", req.nextUrl));
  }

  // 1. SUPER_ADMIN checks
  if (isSuperAdminRoute && !isSuperAdminLogin) {
    if (!isAuth || !isSuperAdmin) {
      return NextResponse.redirect(new URL("/super-admin/login", req.nextUrl));
    }

    // 2-hour inactivity timeout
    const lastActivityCookie = req.cookies.get("sa-last-activity");
    const now = Date.now();
    
    if (lastActivityCookie) {
      const lastActivity = parseInt(lastActivityCookie.value, 10);
      if (now - lastActivity > SUPER_ADMIN_TIMEOUT_MS) {
        // Expired! Clear token & redirect to login
        const res = NextResponse.redirect(new URL("/super-admin/login?timeout=1", req.nextUrl));
        res.cookies.delete("authjs.session-token");
        res.cookies.delete("next-auth.session-token");
        res.cookies.delete("sa-last-activity");
        return res;
      }
    }

    // Must change password check
    if (mustChangePassword && !isSuperAdminChangePass && !nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/super-admin/change-password", req.nextUrl));
    }

    // Update activity cookie for valid SUPER_ADMIN requests
    const res = NextResponse.next();
    res.cookies.set("sa-last-activity", now.toString(), {
      path: "/",
      maxAge: 60 * 60 * 2, // 2 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
    return res;
  }

  // Prevent SUPER_ADMIN from accessing Admin/Faculty routes to avoid seeing booking data
  if (isSuperAdmin && (isAdminRoute || isFacultyRoute)) {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  // 2. ADMIN checks
  if (isAdminRoute) {
    if (!isAuth) return NextResponse.redirect(new URL("/login", req.nextUrl));
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  // 3. FACULTY checks
  if (isFacultyRoute) {
    if (!isAuth) return NextResponse.redirect(new URL("/login", req.nextUrl));
    if (role !== "FACULTY") return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)",
  ],
};
