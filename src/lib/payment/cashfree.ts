const CASHFREE_API =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

function headers() {
  const appId = process.env.PAYMENT_API_KEY;
  const secret = process.env.PAYMENT_SECRET;
  if (!appId || !secret) throw new Error("Payment gateway is not configured.");
  return {
    "Content-Type": "application/json",
    "x-client-id": appId,
    "x-client-secret": secret,
    "x-api-version": "2023-08-01",
  };
}

export async function createCashfreeOrder(params: {
  orderId: string;
  amount: number;
  customerId: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<{ paymentSessionId: string; cfOrderId: string }> {
  const res = await fetch(`${CASHFREE_API}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: params.orderId,
      order_amount: params.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: params.customerId,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone ?? "9999999999",
      },
      order_meta: {
        return_url: params.returnUrl,
        notify_url: params.notifyUrl,
      },
    }),
  });

  const data = (await res.json()) as {
    payment_session_id?: string;
    cf_order_id?: string;
    message?: string;
  };

  if (!res.ok || !data.payment_session_id) {
    throw new Error(data.message ?? "Failed to create payment session.");
  }

  return {
    paymentSessionId: data.payment_session_id,
    cfOrderId: data.cf_order_id ?? params.orderId,
  };
}

export async function fetchCashfreeOrder(orderId: string): Promise<{
  order_status: string;
}> {
  const res = await fetch(`${CASHFREE_API}/orders/${orderId}`, {
    method: "GET",
    headers: headers(),
  });
  const data = (await res.json()) as { order_status?: string; message?: string };
  if (!res.ok) throw new Error(data.message ?? "Failed to verify payment.");
  return { order_status: data.order_status ?? "ACTIVE" };
}

export function isPaymentSuccess(status: string): boolean {
  return status === "PAID" || status === "SUCCESS";
}
