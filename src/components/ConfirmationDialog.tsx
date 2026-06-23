import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'; // Adjust this path based on your project structure

// 1. Define Props interface
interface ConfirmationDialogProps {
  variant?: 'success' | 'warning' | 'danger';
  title: string;
  confirmationMsg: string;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  variant = 'warning',
  title,
  confirmationMsg,
  onConfirm,
  onCancel,
  open,
  onOpenChange,
}) => {
  // 1. UI Customization based on variant
  const variantConfig = {
    success: {
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      bgIcon: 'bg-emerald-50',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white',
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
      bgIcon: 'bg-amber-50',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
    },
    danger: {
      icon: <XCircle className="h-6 w-6 text-destructive" />,
      bgIcon: 'bg-destructive/10',
      buttonBg:
        'bg-destructive hover:bg-destructive/90 focus:ring-destructive text-destructive-foreground',
    },
  };

  const currentVariant = variantConfig[variant];

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-6 gap-6 rounded-xl border border-neutral-100 bg-white shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 font-sans">
        <div className="flex items-start gap-4">
          {/* Icon Wrapper */}
          <div className={`p-2.5 rounded-full shrink-0 ${currentVariant.bgIcon}`}>
            {currentVariant.icon}
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-1.5 pt-1">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-medium tracking-tight text-neutral-900">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-neutral-500">
                {confirmationMsg}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="sm:justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${currentVariant.buttonBg}`}
          >
            Confirm
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
