import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.status === "DISABLED") {
    return { session: null, error: NextResponse.json({ error: "Account disabled" }, { status: 403 }) };
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
