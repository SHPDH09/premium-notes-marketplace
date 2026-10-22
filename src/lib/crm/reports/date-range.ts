import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "this_month"
  | "prev_month"
  | "custom";

/** Ranges use server UTC; UI labels company timezone for display only. */
export function resolveReportRange(params: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
}): { from: Date; to: Date; label: string } {
  const now = new Date();
  let from = startOfDay(now);
  let to = endOfDay(now);
  let label = "Today";

  const preset = (params.preset ?? "last7") as DateRangePreset;

  switch (preset) {
    case "today":
      break;
    case "yesterday": {
      const y = subDays(now, 1);
      from = startOfDay(y);
      to = endOfDay(y);
      label = "Yesterday";
      break;
    }
    case "last7":
      from = startOfDay(subDays(now, 6));
      label = "Last 7 days";
      break;
    case "last30":
      from = startOfDay(subDays(now, 29));
      label = "Last 30 days";
      break;
    case "this_month":
      from = startOfMonth(now);
      to = endOfMonth(now);
      label = "This month";
      break;
    case "prev_month": {
      const prev = subMonths(now, 1);
      from = startOfMonth(prev);
      to = endOfMonth(prev);
      label = "Previous month";
      break;
    }
    case "custom":
      if (params.from) from = startOfDay(new Date(params.from));
      if (params.to) to = endOfDay(new Date(params.to));
      label = "Custom range";
      break;
    default:
      from = startOfDay(subDays(now, 6));
      label = "Last 7 days";
  }

  return { from, to, label };
}
