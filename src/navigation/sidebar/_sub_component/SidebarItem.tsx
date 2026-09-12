import type { ComponentType } from 'react';

export interface SidebarItemData {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string; color?: string }>;
  active?: boolean;
}

interface SidebarItemProps {
  item: SidebarItemData;
  onClick: (item: SidebarItemData) => void;
}

export function SidebarItem({ item, onClick }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={() => onClick(item)}
      className={`w-[90%] flex items-center pl-7 py-2 gap-3 rounded-tr-[36px] rounded-br-[36px] text-left transition-colors duration-200 ${
        item.active
          ? 'bg-teal-700 text-white shadow-[0px_1px_3px_0px_rgba(122,122,122,0.10)]'
          : 'text-teal-100 hover:bg-teal-700 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      {item.label}
    </button>
  );
}
