import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { LoginFailureReason } from "@/lib/credential-login-messages";

export type { LoginFailureReason } from "@/lib/credential-login-messages";
export { loginFailureMessage } from "@/lib/credential-login-messages";

export type LoginMode = "student" | "admin";

export type LoginValidationResult =
  | { ok: true; userId: string }
  | { ok: false; reason: LoginFailureReason };

export async function validateCredentialLogin(
  rawEmail: string,
  password: string,
  mode: LoginMode
): Promise<LoginValidationResult> {
  if (!process.env.AUTH_SECRET?.trim()) {
    return { ok: false, reason: "SERVER_MISCONFIG" };
  }

  const email = rawEmail.toLowerCase().trim();
  if (!email || !password) {
    return { ok: false, reason: "MISSING_FIELDS" };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: false, reason: "INVALID_CREDENTIALS" };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { ok: false, reason: "INVALID_CREDENTIALS" };
    }

    const wantsAdmin = mode === "admin";
    if (wantsAdmin && user.role !== "ADMIN") {
      return { ok: false, reason: "STUDENT_PORTAL_REQUIRED" };
    }
    if (!wantsAdmin && user.role === "ADMIN") {
      return { ok: false, reason: "ADMIN_PORTAL_REQUIRED" };
    }

    if (user.status === "DISABLED") {
      return { ok: false, reason: "DISABLED" };
    }

    return { ok: true, userId: user.id };
  } catch (err) {
    console.error("validateCredentialLogin error", err);
    return { ok: false, reason: "SERVER_ERROR" };
  }
}
