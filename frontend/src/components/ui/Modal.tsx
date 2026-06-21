import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, description, open, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl animate-rise rounded-[2rem] bg-shell p-6 shadow-card">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
          </div>
          <Button type="button" variant="ghost" className="h-10 w-10 rounded-full p-0" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
