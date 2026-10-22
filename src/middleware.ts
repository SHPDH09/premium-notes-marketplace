import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const STUDENT_AREA_PREFIXES = [
  "/dashboard",
  "/cart",
  "/purchases",
  "/transactions",
  "/orders",
  "/physical-documents",
  "/physical-cart",
  "/physical-checkout",
  "/physical-orders",
  "/addresses",
  "/profile",
] as const;

function isStudentArea(path: string): boolean {
  return STUDENT_AREA_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/super-admin") && !path.startsWith("/super-admin/login")) {
      if (!token || token.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/super-admin/login", req.url));
      }
    }

    if (path.startsWith("/crm") && !path.startsWith("/crm/login")) {
      if (!token || (token.role !== "COMPANY_ADMIN" && token.role !== "AGENT")) {
        return NextResponse.redirect(new URL("/crm/login", req.url));
      }
    }

    if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
      if (!token || token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    if (isStudentArea(path)) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (token.role !== "STUDENT") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    if (path === "/login" || path === "/register") {
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (token?.role === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/super-admin", req.url));
      }
      if (token?.role === "COMPANY_ADMIN" || token?.role === "AGENT") {
        return NextResponse.redirect(new URL("/crm/inbox", req.url));
      }
      if (token?.role === "STUDENT") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (path === "/admin/login" && token?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (path === "/super-admin/login" && token?.role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/super-admin", req.url));
    }

    if (path === "/crm/login" && (token?.role === "COMPANY_ADMIN" || token?.role === "AGENT")) {
      return NextResponse.redirect(new URL("/crm/inbox", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/admin/login")) return true;
        if (path.startsWith("/super-admin/login")) return true;
        if (path.startsWith("/crm/login")) return true;
        if (path === "/login" || path === "/register") return true;
        if (path.startsWith("/checkout")) return true;
        if (path.startsWith("/physical-checkout")) return true;
        if (path.startsWith("/notes/") && path.endsWith("/payment")) return true;
        if (
          path.startsWith("/admin") ||
          path.startsWith("/super-admin") ||
          path.startsWith("/crm") ||
          isStudentArea(path)
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
    "/super-admin/:path*",
    "/crm/:path*",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/cart",
    "/purchases/:path*",
    "/transactions",
    "/orders/:path*",
    "/profile/:path*",
    "/physical-documents/:path*",
    "/physical-cart",
    "/physical-checkout/:path*",
    "/physical-orders/:path*",
    "/addresses",
  ],
};
