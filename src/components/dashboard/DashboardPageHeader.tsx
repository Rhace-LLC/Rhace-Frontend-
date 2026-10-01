import type { ReactNode } from 'react';

interface DashboardPageHeaderProps {
  /** Page title — plain words per the presentation vocabulary standard. */
  title: ReactNode;
  /** One-line helper under the title. */
  subtitle?: ReactNode;
  /** Right-side actions (buttons, links, selects). */
  actions?: ReactNode;
}

/**
 * Standard dashboard page heading: title + subtitle on the left, optional
 * actions on the right. Same pattern as the orders and reservations pages.
 */
const DashboardPageHeader = ({ title, subtitle, actions }: DashboardPageHeaderProps) => {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="type-res-h2 text-res-ink">{title}</h1>
        {subtitle && (
          <p className="type-res-body mt-1 font-normal text-res-ink-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};

export default DashboardPageHeader;
