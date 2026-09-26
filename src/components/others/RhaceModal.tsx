import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => {
  // Prevent background body scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle ESC key press to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Solid overlay (no blur per tactile direction) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-res-scrim"
            aria-hidden="true"
          />

          {/* Soft Scale & Fade Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1], // Custom smooth ease-out curve
            }}
            className="relative z-10 flex flex-col w-full max-w-[650px] max-h-[85vh] bg-res-card rounded-res-lg shadow-res-high overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Fixed Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-res-line">
              <div>
                {title && (
                  <h3 className="type-res-h3 text-res-ink">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="type-res-small text-res-ink-muted mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-res-ink-muted hover:text-res-ink hover:bg-res-surface rounded-res-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vertically Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {children}
            </div>

            {/* Optional Fixed Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-res-surface border-t border-res-line">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};