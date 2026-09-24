import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface DashboardPageHeaderProps {
  heading: string;
  subtitle?: string;
  primaryBtn?: ReactNode;
  primaryBtnText?: string;
  primaryBtnAction?: () => void;
  secondaryBtn?: ReactNode;
}

const DashboardPageHeader = ({
  heading,
  subtitle,
  primaryBtn,
  primaryBtnText,
  primaryBtnAction,
  secondaryBtn,
}: DashboardPageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {primaryBtn ? (
          primaryBtn
        ) : primaryBtnAction ? (
          <Button onClick={primaryBtnAction}>
            {primaryBtnText || 'Action'}
          </Button>
        ) : null}
        {secondaryBtn || null}
      </div>
    </div>
  );
};

export default DashboardPageHeader;
