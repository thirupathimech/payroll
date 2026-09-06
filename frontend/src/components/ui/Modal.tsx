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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        data-modal-scroll="true"
        className="max-h-[94vh] w-full max-w-6xl animate-rise overflow-y-auto rounded-t-2xl bg-shell p-4 shadow-pop sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-9 shrink-0 rounded-full !p-0"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
          >
            <X size={17} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
