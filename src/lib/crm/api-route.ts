import { NextResponse } from "next/server";

export function crmJsonError(error: unknown, status = 500) {
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof Error && error.message.startsWith("PLAN_LIMIT")) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  console.error("CRM API error", error);
  return NextResponse.json({ error: "Internal server error" }, { status });
}

export async function withCrmJson(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (e) {
    return crmJsonError(e);
  }
}
