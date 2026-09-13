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
      className={`${indent ? 'w-[86%] ml-[6%] pl-9' : 'w-[90%] pl-7'} flex items-center py-2 gap-3 rounded-tr-[36px] rounded-br-[36px] text-left transition-colors duration-200 ${
        item.active
          ? 'bg-teal-700 text-white shadow-[0px_1px_3px_0px_rgba(122,122,122,0.10)]'
          : 'text-teal-100 hover:bg-teal-700 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1">{item.label}</span>
      {hasChildren && (
        <ChevronDown
          className={`mr-4 w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  );
}
