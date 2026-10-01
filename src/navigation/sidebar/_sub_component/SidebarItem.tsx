import type { ComponentType } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SidebarItemData {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string; color?: string }>;
  active?: boolean;
  children?: SidebarItemData[];
}

interface SidebarItemProps {
  item: SidebarItemData;
  onClick: (item: SidebarItemData) => void;
  hasChildren?: boolean;
  expanded?: boolean;
  indent?: boolean;
}

export function SidebarItem({ item, onClick, hasChildren, expanded, indent }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={() => onClick(item)}
      aria-current={item.active ? 'page' : undefined}
      className={`type-res-small flex w-full cursor-pointer items-center gap-3 rounded-res-sm px-3 py-2.5 text-left font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white ${
        indent ? 'pl-9' : ''
      } ${
        item.active
          ? 'bg-white text-emerald-950 shadow-res-medium'
          : 'text-slate-100/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {hasChildren && (
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  );
}
