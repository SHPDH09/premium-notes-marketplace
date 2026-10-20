import { Calendar, Eye, Users } from "lucide-react";
import {
  daysSincePosted,
  formatDaysSincePosted,
  formatJobPostedDate,
} from "@/lib/placement/job-posted-at";

export function JobPostingStats({
  postedAt,
  applyCount,
  viewCount,
  className = "",
}: {
  postedAt: string;
  applyCount: number;
  viewCount?: number;
  className?: string;
}) {
  const days = daysSincePosted(new Date(postedAt));
  const dateLabel = formatJobPostedDate(postedAt);
  const daysLabel = formatDaysSincePosted(days);

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 ${className}`}>
      <span className="inline-flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        {dateLabel}
        <span className="text-slate-400">·</span>
        {daysLabel}
      </span>
      <span className="inline-flex items-center gap-1">
        <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        {applyCount} {applyCount === 1 ? "apply" : "applies"}
      </span>
      {viewCount != null ? (
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          {viewCount} {viewCount === 1 ? "view" : "views"}
        </span>
      ) : null}
    </div>
  );
}
