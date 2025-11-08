// src/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_ROUTES = ["/", "/store", "/tables", "/menu", "/billing"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const idToken = req.cookies.get("idToken")?.value;

  const isAuthPage = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isProtected = PROTECTED_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!idToken && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (idToken && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/store/:path*", "/tables/:path*", "/menu/:path*", "/billing/:path*", "/login", "/signup"],
};
