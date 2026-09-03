import { Card } from '@/components/ui/card';
import React from 'react';

interface StatCardProps {
  title?: React.ReactNode;
  value?: React.ReactNode;
  change?: React.ReactNode;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  trend?: 'up' | 'down';
}

export function StatCard({ title, value, change, icon, iconBg, iconColor, trend = 'up' }: StatCardProps) {
  const renderIcon = () => {
    // If a React element (JSX) was passed, clone it to ensure the desired className is applied
    if (React.isValidElement(icon)) {
      const iconEl = icon as React.ReactElement<{ className?: string }>;
      const existingClass = iconEl.props?.className ? `${iconEl.props.className} ` : '';
      return React.cloneElement(iconEl, { className: `${existingClass}w-5 h-5` });
    }

    // If a component (function/class) was passed, render it as a component
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComp = icon as React.ComponentType<{ className?: string }>;
      return <IconComp className="w-5 h-5" />;
    }

    return null;
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-xl md:text-2xl font-bold mb-1">{value}</p>
          <p className="text-xs text-muted-foreground">
            <span className={trend === 'up' ? 'text-success' : 'text-destructive'}>
              {trend === 'up' ? '↑' : '↓'} {change}
            </span>
          </p>
        </div>
        <div className={`p-3 rounded-lg ${iconBg ?? ''} ${iconColor ?? ''} shrink-0`}>
          {renderIcon()}
        </div>
      </div>
    </Card>
  );
}