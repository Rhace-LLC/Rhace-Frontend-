/**
 * Single source of truth for the staff workspace URLs. The landing redirect
 * (`/staff`), the workspace gate (`/staff/:role`) and the header label all read
 * from here so they can never disagree about which screen a role owns.
 */
export const STAFF_ROLE_TO_SLUG: Record<string, string> = {
  manager: 'manager',
  waiter: 'waiter',
  chef: 'kitchen',
  bartender: 'bar',
  vip_host: 'vip',
  bar_staff: 'cellar',
  front_desk: 'frontdesk',
  housekeeping: 'housekeeping',
  cashier: 'cashier',
  staff: 'general',
};

/** The workspace slug a vertical role belongs to, or null for an unknown role. */
export const slugForStaffRole = (role?: string | null): string | null =>
  role ? (STAFF_ROLE_TO_SLUG[role] ?? null) : null;

/** Where a staff member of this role should land (null when the role is unknown). */
export const workspacePathForStaffRole = (role?: string | null): string | null => {
  const slug = slugForStaffRole(role);
  return slug ? `/staff/${slug}` : null;
};

export const staffRoleLabel = (role?: string | null): string =>
  role
    ? role
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Staff';
