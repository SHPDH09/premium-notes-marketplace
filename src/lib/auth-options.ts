import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rotateUserSession } from "@/lib/session-control";
import { ensureNextAuthUrlEnv } from "@/lib/resolve-nextauth-url";

ensureNextAuthUrlEnv();

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
        if (!process.env.AUTH_SECRET?.trim()) {
          console.error("AUTH_SECRET is missing — login cannot succeed.");
          return null;
        }

        if (!credentials?.email || !credentials?.password) return null;

        try {
          const email = credentials.email.toLowerCase().trim();
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) return null;

          const valid = await verifyPassword(credentials.password, user.passwordHash);
          if (!valid) return null;

          const wantsAdmin = credentials.admin === "true";
          if (wantsAdmin && user.role !== "ADMIN") return null;
          if (!wantsAdmin && user.role === "ADMIN") {
            return null;
          }

          if (user.status === "DISABLED") return null;

          let sessionVersion = user.sessionVersion ?? 0;
          try {
            sessionVersion = await rotateUserSession(user.id);
          } catch (rotateErr) {
            console.error("rotateUserSession failed (run DB migrations?)", rotateErr);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            sessionVersion,
          };
        } catch (err) {
          console.error("credentials authorize error", err);
          return null;
        }
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
