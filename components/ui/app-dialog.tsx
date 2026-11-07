"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native modal supplies focus containment, Escape, and focus restoration. */
export function AppDialog({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const rect = ref.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
      aria-label={title}
      className={`app-dialog ${className}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          type="button"
          className="app-dialog-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border p-0"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <X size={20} className="block shrink-0" aria-hidden="true" />
        </button>
      </header>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
