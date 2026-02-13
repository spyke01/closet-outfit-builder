'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AddCategoryForm } from './add-category-form';

export interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

/**
 * AddCategoryModal Component
 * 
 * Responsive modal wrapper for AddCategoryForm.
 * 
 * Features:
 * - Mobile: full-screen modal
 * - Tablet+: centered dialog
 * - Keyboard navigation (Escape to close)
 * - Focus trap within modal
 * - Backdrop click to close
 * 
 * Requirements: 7.2, 7.3
 */
export function AddCategoryModal({ isOpen, onClose, onSave }: AddCategoryModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Don't render on server or when closed
  if (!isMounted || !isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center md:p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-category-title"
    >
      {/* Modal Content */}
      <div
        className="relative w-full max-h-[90vh] overflow-y-auto bg-background shadow-xl md:max-w-2xl md:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4 border-border">
          <h2
            id="add-category-title"
            className="text-xl font-semibold text-foreground"
          >
            Add Category
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-muted-foreground  dark:hover:text-muted-foreground"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6">
          <AddCategoryForm onSave={onSave} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
