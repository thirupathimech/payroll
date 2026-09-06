import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-line bg-white/85 p-4 shadow-card backdrop-blur-xl sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
