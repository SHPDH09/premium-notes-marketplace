function dateStamp(iso: string) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function digitalInvoiceNumber(orderId: string, createdAt: string) {
  const tail = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `TL-DIG-${dateStamp(createdAt)}-${tail}`;
}

export function physicalInvoiceNumber(orderNumber: string) {
  return `TL-PHY-${orderNumber}`;
}
