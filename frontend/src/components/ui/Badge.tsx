import { clsx } from "clsx";
import { humanize } from "../../lib/format";

interface BadgeProps {
  value: string | boolean;
}

export function Badge({ value }: BadgeProps) {
  const label = typeof value === "boolean" ? (value ? "Active" : "Inactive") : humanize(value);
  const key = String(value);

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        ["ACTIVE", "APPROVED", "true"].includes(key) && "bg-emerald-50 text-emerald-700",
        ["PENDING", "PROBATION", "ON_LEAVE"].includes(key) && "bg-amber-50 text-amber-700",
        ["REJECTED", "TERMINATED", "false", "CANCELLED"].includes(key) && "bg-red-50 text-red-700",
        ![
          "ACTIVE",
          "APPROVED",
          "true",
          "PENDING",
          "PROBATION",
          "ON_LEAVE",
          "REJECTED",
          "TERMINATED",
          "false",
          "CANCELLED",
        ].includes(key) && "bg-slate-100 text-slate-700",
      )}
    >
      {label}
    </span>
  );
}
