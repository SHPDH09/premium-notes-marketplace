import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { isSessionVersionValid } from "@/lib/session-control";

export async function requireSession() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.error("getServerSession failed", e);
    return {
      session: null,
      error: NextResponse.json({ error: "Session error. Sign in again." }, { status: 401 }),
    };
  }
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.status === "DISABLED") {
    return { session: null, error: NextResponse.json({ error: "Account disabled" }, { status: 403 }) };
  }

  const sessionOk = await isSessionVersionValid(
    session.user.id,
    session.user.sessionVersion
  );
  if (!sessionOk) {
    return {
      session: null,
      error: NextResponse.json(
        {
          error: "Your account was signed in on another device. Please sign in again.",
          code: "SESSION_SUPERSEDED",
        },
        { status: 401 }
      ),
    };
  }

  return { session, error: null };
}

export async function requireAdmin() {
  const result = await requireSession();
  if (result.error) return result;
  if (result.session!.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}

export async function requireStudent() {
  const result = await requireSession();
  if (result.error) return result;
  if (result.session!.user.role !== "STUDENT") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}
