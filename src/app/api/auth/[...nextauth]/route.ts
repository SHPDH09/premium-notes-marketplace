import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { syncNextAuthUrlWithRequest } from "@/lib/resolve-nextauth-url";

const nextAuthHandler = NextAuth(authOptions);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function authHandler(req: Request, context: RouteContext) {
  syncNextAuthUrlWithRequest(req);
  return nextAuthHandler(req, context);
}

export { authHandler as GET, authHandler as POST };
