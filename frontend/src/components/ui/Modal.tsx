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
      <div data-modal-scroll="true" className="max-h-[92vh] w-full max-w-6xl animate-rise overflow-y-auto rounded-[2rem] bg-shell p-6 shadow-card">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
          </div>
          <Button type="button" variant="secondary" className="h-10 w-10 rounded-full border-2 border-ink/20 bg-white p-0 text-ink shadow-sm hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={onClose} aria-label="Close dialog" title="Close">
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
