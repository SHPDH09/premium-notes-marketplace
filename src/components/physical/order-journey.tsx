import { PhysicalOrderTimeline } from "@/components/physical/order-timeline";
import { PhysicalFulfillmentStatus } from "@prisma/client";
import { fulfillmentLabel } from "@/lib/physical/status-machine";

export type OrderHistoryEntry = {
  status: string;
  note?: string | null;
  changedBy?: string | null;
  at: string;
};

function formatHistoryLabel(status: string): string {
  if (status.startsWith("PRINT:")) {
    return status.replace("PRINT:", "Print — ").replace(/_/g, " ");
  }
  if (status === "REFUNDED") return "Refund processed";
  if (status === "PACKED") return "Packed";
  const asFulfillment = status as PhysicalFulfillmentStatus;
  try {
    return fulfillmentLabel(asFulfillment);
  } catch {
    return status.replace(/_/g, " ");
  }
}

export function PhysicalOrderJourney(props: {
  fulfillmentStatus: PhysicalFulfillmentStatus;
  history: OrderHistoryEntry[];
}) {
  const sorted = [...props.history].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Order journey</h3>
        <PhysicalOrderTimeline current={props.fulfillmentStatus} history={props.history} />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Status history</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500">No status updates yet.</p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto text-sm">
            {sorted.map((h, i) => (
              <li key={`${h.at}-${h.status}-${i}`} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                <p className="font-medium text-slate-900">{formatHistoryLabel(h.status)}</p>
                <p className="text-xs text-slate-500">
                  {new Date(h.at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {h.note && <p className="mt-1 text-xs text-slate-600">{h.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
