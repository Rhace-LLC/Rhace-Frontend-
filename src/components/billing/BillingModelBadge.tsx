import { cn } from '@/lib/utils';
import { billingModelLabel, paymentBillingModel, type PaymentWithModel } from './billingModel';

const BillingModelBadge = ({
  payment,
  className,
}: {
  payment: PaymentWithModel | null | undefined;
  className?: string;
}) => {
  const subscription = paymentBillingModel(payment) === 'subscription';
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        subscription
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
        className
      )}
    >
      {billingModelLabel(payment)}
    </span>
  );
};

export default BillingModelBadge;
