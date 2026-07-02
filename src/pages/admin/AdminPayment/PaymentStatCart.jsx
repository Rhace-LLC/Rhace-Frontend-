import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const PaymentStatCard = ({
  title,
  value = 0,
  comparison = '',
  change = 0,
  icon: Icon,
  color = '#0A6C6D',
  className = '',
  isCurrency = true,
}) => {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {isCurrency
              ? `₦${Number(value).toLocaleString()}`
              : Number(value).toLocaleString()}
          </h2>
        </div>

        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center"
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

        <span className="text-xs text-slate-500">
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