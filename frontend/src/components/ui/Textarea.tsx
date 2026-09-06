import { clsx } from "clsx";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="block space-y-1.5 text-sm font-semibold text-ink/80" htmlFor={textareaId}>
      {label && <span>{label}</span>}
      <textarea
        id={textareaId}
        className={clsx(
          "min-h-28 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-fern focus:ring-4 focus:ring-fern/10",
          error && "border-red-400 focus:border-red-500 focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </label>
  );
}
