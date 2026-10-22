import { NextResponse } from "next/server";
import {
  loginFailureMessage,
  validateCredentialLogin,
  type LoginMode,
} from "@/lib/credential-login";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; mode?: LoginMode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "MISSING_FIELDS", message: loginFailureMessage("MISSING_FIELDS") }, { status: 400 });
  }

  const mode: LoginMode =
    body.mode === "admin"
      ? "admin"
      : body.mode === "crm"
        ? "crm"
        : body.mode === "super_admin"
          ? "super_admin"
          : "student";
  const result = await validateCredentialLogin(String(body.email ?? ""), String(body.password ?? ""), mode);

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({
    ok: false,
    reason: result.reason,
    message: loginFailureMessage(result.reason),
  });
}
