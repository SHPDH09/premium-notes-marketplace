import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
      if (!token || token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    if (
      path.startsWith("/dashboard") ||
      path.startsWith("/cart") ||
      path.startsWith("/purchases") ||
      path.startsWith("/transactions") ||
      path.startsWith("/physical-documents") ||
      path.startsWith("/physical-cart") ||
      path.startsWith("/physical-checkout") ||
      path.startsWith("/physical-orders") ||
      path.startsWith("/addresses") ||
      path === "/profile"
    ) {
      if (!token || token.role !== "STUDENT") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    if (token?.role === "ADMIN" && (path === "/login" || path === "/register")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/admin/login")) return true;
        if (path.startsWith("/login") || path.startsWith("/register")) return true;
        if (path.startsWith("/checkout")) return true;
        if (path.startsWith("/physical-checkout")) return true;
        if (path.startsWith("/notes/") && path.endsWith("/payment")) return true;
        if (
          path.startsWith("/admin") ||
          path.startsWith("/dashboard") ||
          path.startsWith("/cart") ||
          path.startsWith("/purchases") ||
          path.startsWith("/transactions") ||
          path.startsWith("/physical-documents") ||
          path.startsWith("/physical-cart") ||
          path.startsWith("/physical-orders") ||
          path.startsWith("/addresses") ||
          path === "/profile"
        ) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/cart",
    "/purchases/:path*",
    "/transactions",
    "/profile",
    "/physical-documents/:path*",
    "/physical-cart",
    "/physical-checkout/:path*",
    "/physical-orders/:path*",
    "/addresses",
  ],
};
