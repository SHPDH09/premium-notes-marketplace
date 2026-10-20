import { readJsonResponse } from "@/lib/api/fetch-json";

export type PhysicalVerifyResult = {
  status?: string;
  orderId?: string;
  orderNumber?: string;
  error?: string;
};

export async function verifyPhysicalPayment(body: {
  orderId?: string | null;
  physicalOrderId?: string | null;
  cashfreeOrderId?: string | null;
}): Promise<PhysicalVerifyResult> {
  const res = await fetch("/api/payments/verify-physical", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: body.orderId ?? undefined,
      physicalOrderId: body.physicalOrderId ?? undefined,
      cashfreeOrderId: body.cashfreeOrderId ?? undefined,
    }),
  });
  return readJsonResponse<PhysicalVerifyResult>(res);
}
