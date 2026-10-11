import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PaymentStatCardProps {
  title: string;
  value?: number;
  comparison?: string;
  change?: number;
  icon: LucideIcon;
  color?: string;
  className?: string;
  isCurrency?: boolean;
}

const PaymentStatCard = ({
  title,
  value = 0,
  comparison = '',
  change = 0,
  icon: Icon,
  color = '#0A6C6D',
  className = '',
  isCurrency = true,
}: PaymentStatCardProps) => {
  return (
    <div
      className={`rounded-res-md border border-res-line bg-res-card p-5 shadow-res-low ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="type-res-small text-res-ink-muted">{title}</p>

          <h2 className="mt-2 text-3xl font-bold text-res-ink">
            {isCurrency
              ? `₦${Number(value).toLocaleString()}`
              : Number(value).toLocaleString()}
          </h2>
        </div>

        <div
          className="h-12 w-12 rounded-res-sm flex items-center justify-center"
          style={{
            backgroundColor: `${color}15`,
          }}
        >
          <Icon
            size={24}
            style={{
              color,
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">

        <span className="type-res-small text-res-ink-muted">
          {comparison}
        </span>

        <div
          className={`flex items-center gap-1 text-sm font-semibold ${
            change >= 0
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {change >= 0 ? (
            <ArrowUpRight size={16} />
          ) : (
            <ArrowDownRight size={16} />
          )}

          {Math.abs(change).toFixed(1)}%
        </div>

      </div>
    </div>
  );
};

export default PaymentStatCard;