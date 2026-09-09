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
    <div className="fixed inset-0 z-[500] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex max-h-[94vh] w-full max-w-6xl animate-rise flex-col overflow-hidden rounded-t-2xl bg-shell shadow-pop sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-shell px-4 py-4 sm:px-6 sm:py-5">
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
        <div data-modal-scroll="true" className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
