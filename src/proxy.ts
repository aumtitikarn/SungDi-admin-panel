// src/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_ROUTES = ["/", "/store", "/tables", "/menu", "/billing"];

// ทำให้ proxy เป็น async เพื่อรอ getToken ได้
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ✅ อ่าน JWT ของ NextAuth (ต้องมี NEXTAUTH_SECRET)
  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const hasNextAuth = !!nextAuthToken;


  const isLoggedIn = hasNextAuth

  const isAuthPage = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isProtected = PROTECTED_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // ยังไม่ล็อกอิน → กันหน้า protected
  if (!isLoggedIn && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (!searchParams.get("from")) url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // ล็อกอินแล้ว → กันหน้า /login, /signup
  if (isLoggedIn && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ใช้ matcher เดิมของคุณได้เลย
export const config = {
  matcher: ["/", "/store/:path*", "/tables/:path*", "/menu/:path*", "/billing/:path*", "/login", "/signup"],
};
