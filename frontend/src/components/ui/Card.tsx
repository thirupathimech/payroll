import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-card backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
