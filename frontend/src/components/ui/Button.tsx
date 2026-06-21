import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-moss text-white shadow-glow hover:bg-ink",
  secondary: "border border-moss/15 bg-white/80 text-moss hover:bg-white",
  ghost: "text-moss hover:bg-moss/8",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
