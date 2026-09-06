import { clsx } from "clsx";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className, id, children, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="block space-y-1.5 text-sm font-semibold text-ink/80" htmlFor={selectId}>
      {label && <span>{label}</span>}
      <select
        id={selectId}
        className={clsx(
          "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-fern focus:ring-4 focus:ring-fern/10",
          error && "border-red-400 focus:border-red-500 focus:ring-red-100",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </label>
  );
}
