import { TIMELINE_STATUSES, fulfillmentLabel } from "@/lib/physical/status-machine";
import { PhysicalFulfillmentStatus } from "@prisma/client";
import { CheckCircle2, Circle } from "lucide-react";

export function PhysicalOrderTimeline(props: {
  current: PhysicalFulfillmentStatus;
  history: { status: string; at: string }[];
}) {
  function timeForStep(step: PhysicalFulfillmentStatus): string | undefined {
    for (const h of props.history) {
      if (h.status === step) return h.at;
    }
    if (step === "PRINTING") {
      const p = props.history.find((h) => h.status === "PRINT:PRINTING" || h.status === "PRINTING");
      if (p) return p.at;
    }
    if (step === "QUALITY_CHECK") {
      const p = props.history.find(
        (h) =>
          h.status.startsWith("PRINT:QC") ||
          h.status === "QUALITY_CHECK" ||
          h.status === "PRINT:PRINTED"
      );
      if (p) return p.at;
    }
    if (step === "PACKED") {
      const p = props.history.find((h) => h.status === "PACKED");
      if (p) return p.at;
    }
    return undefined;
  }

  const currentIdx = TIMELINE_STATUSES.indexOf(props.current);

  return (
    <ol className="space-y-4 border-l border-slate-200 pl-6">
      {TIMELINE_STATUSES.map((s, idx) => {
        const done = props.current === "CANCELLED" ? idx === 0 : idx <= currentIdx;
        const at = timeForStep(s);
        return (
          <li key={s} className="relative">
            <span className="absolute -left-[29px] top-0.5 rounded-full bg-white">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
            </span>
            <p className={`font-medium ${done ? "text-slate-900" : "text-slate-400"}`}>
              {fulfillmentLabel(s)}
            </p>
            {at && (
              <p className="text-xs text-slate-500">
                {new Date(at).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
