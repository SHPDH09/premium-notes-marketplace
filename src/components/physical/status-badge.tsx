import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const paymentMap: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-slate-200 text-slate-800",
  PARTIALLY_REFUNDED: "bg-orange-100 text-orange-800",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("font-medium", paymentMap[status] ?? "bg-slate-100 text-slate-700")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function FulfillmentStatusBadge({ label }: { label: string }) {
  return <Badge className="bg-indigo-100 text-indigo-800 font-medium">{label}</Badge>;
}
