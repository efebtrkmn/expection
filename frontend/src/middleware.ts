import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/invoices",
  "/reconciliation",
  "/settings",
  "/ai-assistant",
  "/invoice-request",
  "/invoice-create",
  "/cash-flow",
  "/products",
  "/contacts",
  "/reports",
  "/marketplace",
  "/transactions",
  "/e-invoice",
  "/documents",
];
const authPaths = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasToken = request.cookies.get("expection-auth-flag")?.value === "1";

  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!hasToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (authPaths.some((path) => pathname.startsWith(path))) {
    if (hasToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (pathname === "/") {
    if (hasToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/invoices/:path*",
    "/reconciliation/:path*",
    "/settings/:path*",
    "/ai-assistant/:path*",
    "/invoice-request/:path*",
    "/invoice-create/:path*",
    "/cash-flow/:path*",
    "/products/:path*",
    "/contacts/:path*",
    "/reports/:path*",
    "/transactions/:path*",
    "/marketplace/:path*",
    "/e-invoice/:path*",
    "/documents/:path*",
    "/login",
  ],
};
