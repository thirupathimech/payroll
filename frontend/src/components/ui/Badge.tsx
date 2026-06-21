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
        "inline-flex rounded-full px-3 py-1 text-xs font-bold",
        ["ACTIVE", "APPROVED", "true"].includes(key) && "bg-emerald-100 text-emerald-700",
        ["PENDING", "PROBATION", "ON_LEAVE"].includes(key) && "bg-amber-100 text-amber-800",
        ["REJECTED", "TERMINATED", "false", "CANCELLED"].includes(key) && "bg-red-100 text-red-700",
        !["ACTIVE", "APPROVED", "true", "PENDING", "PROBATION", "ON_LEAVE", "REJECTED", "TERMINATED", "false", "CANCELLED"].includes(key) &&
          "bg-slate-100 text-slate-700",
      )}
    >
      {label}
    </span>
  );
}
