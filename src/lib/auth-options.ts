import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rotateUserSession } from "@/lib/session-control";

if (!process.env.NEXTAUTH_URL) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "STUDENT" | "ADMIN";
      status: "ACTIVE" | "DISABLED";
      sessionVersion: number;
    };
  }
  interface User {
    role: "STUDENT" | "ADMIN";
    status: "ACTIVE" | "DISABLED";
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "STUDENT" | "ADMIN";
    status: "ACTIVE" | "DISABLED";
    sessionVersion: number;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        admin: { label: "Admin", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;

        const wantsAdmin = credentials.admin === "true";
        if (wantsAdmin && user.role !== "ADMIN") return null;
        if (!wantsAdmin && user.role === "ADMIN") {
          // Admins use /admin/login
          return null;
        }

        if (user.status === "DISABLED") return null;

        const sessionVersion = await rotateUserSession(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.sessionVersion = token.sessionVersion ?? 0;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
