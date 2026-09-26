import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { toast } from 'react-toastify';
import {
  ChevronDown,
  Download,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCog,
  UserX,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Modal } from '@/components/others/RhaceModal';
import { formatDate } from '@/utils/formatDate';
import { staffService, type StaffMember, type StaffRole } from '@/services/staff.service';

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'chef', label: 'Chef' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'vip_host', label: 'VIP Host' },
  { value: 'bar_staff', label: 'Bar Staff' },
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'staff', label: 'General Staff' },
];

const roleLabel = (role?: string) => {
  const found = ROLE_OPTIONS.find((r) => r.value === role)?.label;
  if (found) return found;
  if (!role) return 'Staff';
  return role
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
};

type VendorVertical = 'hotel' | 'club' | 'restaurant';

const ROLES_BY_VERTICAL: Record<VendorVertical, StaffRole[]> = {
  hotel: ['manager', 'front_desk', 'housekeeping', 'waiter', 'chef', 'cashier', 'staff'],
  restaurant: ['manager', 'waiter', 'chef', 'bartender', 'cashier', 'staff'],
  club: ['manager', 'vip_host', 'bartender', 'bar_staff', 'waiter', 'cashier', 'staff'],
};

const verticalFromPath = (pathname: string): VendorVertical => {
  if (pathname.includes('/dashboard/hotel')) return 'hotel';
  if (pathname.includes('/dashboard/club')) return 'club';
  return 'restaurant';
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-res-secondary text-res-brand',
  invited: 'bg-res-surface text-res-ink-muted',
  suspended: 'bg-res-surface text-res-ink-muted line-through',
};

const getInitials = (name?: string) =>
  name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';

interface InviteFormState {
  name: string;
  email: string;
  role: StaffRole;
  phone: string;
  validHours: number;
}

const emptyInvite: InviteFormState = {
  name: '',
  email: '',
  role: 'staff',
  phone: '',
  validHours: 24,
};

interface EditState {
  open: boolean;
  staff: StaffMember | null;
  role: StaffRole;
}

function NativeSelect({
  value,
  onChange,
  ariaLabel,
  className,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-full bg-res-surface py-2.5 pr-9 pl-4 type-res-small font-semibold text-res-ink outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-res-ink-muted" />
    </span>
  );
}

export function AllStaffTab({ onRefresh }: { onRefresh?: () => void }) {
  const { pathname } = useLocation();
  const vertical = verticalFromPath(pathname);
  const roleOptions = useMemo(
    () => ROLE_OPTIONS.filter((r) => ROLES_BY_VERTICAL[vertical].includes(r.value)),
    [vertical],
  );
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState<InviteFormState>(emptyInvite);
  const [isInviting, setIsInviting] = useState(false);
  const [edit, setEdit] = useState<EditState>({ open: false, staff: null, role: 'staff' });
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await staffService.getStaff({ limit: 200 });
      setStaff(res.docs || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch staff');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleRefresh = () => {
    loadStaff();
    onRefresh?.();
  };

  const filteredStaff = useMemo(
    () =>
      staff.filter((s) => {
        const matchesSearch =
          s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.staffId?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || s.role === filterRole;
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        return matchesSearch && matchesRole && matchesStatus;
      }),
    [staff, searchTerm, filterRole, filterStatus],
  );

  const stats = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((s) => s.status === 'active').length,
      invited: staff.filter((s) => s.status === 'invited').length,
      suspended: staff.filter((s) => s.status === 'suspended').length,
    }),
    [staff],
  );

  const handleInvite = async () => {
    if (!invite.name || !invite.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      setIsInviting(true);
      const res = await staffService.inviteStaff({
        name: invite.name,
        email: invite.email,
        role: invite.role,
        phone: invite.phone || undefined,
        validHours: invite.validHours,
      });
      setStaff((prev) => [res.staff, ...prev]);
      toast.success('Invitation sent');
      setShowInvite(false);
      setInvite(emptyInvite);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to send invitation',
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleResend = async (member: StaffMember) => {
    try {
      setBusyId(member._id);
      await staffService.resendInvite(member._id);
      toast.success(`Invitation resent to ${member.email}`);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to resend invitation',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (member: StaffMember) => {
    const next = member.status === 'active' ? 'suspended' : 'active';
    try {
      setBusyId(member._id);
      const updated = await staffService.toggleStatus(member._id, next);
      setStaff((prev) => prev.map((s) => (s._id === member._id ? { ...s, ...updated } : s)));
      toast.success(next === 'active' ? 'Staff activated' : 'Staff suspended');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (member: StaffMember) => {
    try {
      setBusyId(member._id);
      await staffService.revokeStaff(member._id);
      setStaff((prev) =>
        prev.map((s) => (s._id === member._id ? { ...s, status: 'suspended' } : s)),
      );
      toast.success('Access revoked');
    } catch {
      toast.error('Failed to revoke access');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    try {
      setBusyId(member._id);
      await staffService.deleteStaff(member._id);
      setStaff((prev) => prev.filter((s) => s._id !== member._id));
      toast.success('Staff deleted');
    } catch {
      toast.error('Failed to delete staff');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveRole = async () => {
    if (!edit.staff) return;
    try {
      const updated = await staffService.updateStaffRole(edit.staff._id, edit.role);
      setStaff((prev) => prev.map((s) => (s._id === edit.staff?._id ? { ...s, ...updated } : s)));
      toast.success('Role updated');
      setEdit({ open: false, staff: null, role: 'staff' });
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await staffService.exportCsv('csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'staff.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export staff');
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    { label: 'Total staff', value: stats.total, highlight: false },
    { label: 'Active', value: stats.active, highlight: true },
    { label: 'Invited', value: stats.invited, highlight: false },
    { label: 'Suspended', value: stats.suspended, highlight: false },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-res-md bg-res-card p-4 shadow-res-low">
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-res-surface" />
              <div className="mt-2 h-6 w-1/3 animate-pulse rounded-full bg-res-surface" />
            </div>
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low"
          >
            <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              {card.label}
            </p>
            <p className={`type-res-h2 mt-1 ${card.highlight ? 'text-res-brand' : 'text-res-ink'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex items-center gap-2 rounded-full bg-res-surface px-4 py-2.5 sm:w-64">
              <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, ID…"
                className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
              />
            </label>
            <NativeSelect value={filterRole} onChange={setFilterRole} ariaLabel="Filter by role">
              <option value="all">All roles</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={filterStatus} onChange={setFilterStatus} ariaLabel="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </NativeSelect>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-surface px-4 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-surface px-4 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              <Plus className="h-3.5 w-3.5" /> Invite staff
            </button>
          </div>
        </div>

        {/* Staff table */}
        <div className="mt-4">
          {filteredStaff.length === 0 ? (
            <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-res-card shadow-res-low">
                <Users className="h-5 w-5 text-res-brand" />
              </div>
              <p className="type-res-h3 text-res-ink">No team members found</p>
              <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                Try adjusting your filters, or invite your first team member.
              </p>
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="type-res-small mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
              >
                <Plus className="h-3.5 w-3.5" /> Invite staff
              </button>
            </div>
          ) : (
            <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
              <Table className="w-full min-w-[760px]">
                <TableHeader>
                  <TableRow className="border-b border-res-line hover:bg-transparent">
                    <TableHead className="type-res-caption py-3 pr-4 pl-4 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Team member
                    </TableHead>
                    <TableHead className="type-res-caption py-3 pr-4 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Contact
                    </TableHead>
                    <TableHead className="type-res-caption py-3 pr-4 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Role
                    </TableHead>
                    <TableHead className="type-res-caption py-3 pr-4 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Status
                    </TableHead>
                    <TableHead className="type-res-caption py-3 pr-4 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Added
                    </TableHead>
                    <TableHead className="type-res-caption py-3 pr-4 text-right font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow
                      key={member._id}
                      className="border-b border-res-line transition-colors last:border-0 hover:bg-res-surface/60"
                    >
                      <TableCell className="py-3 pr-4 pl-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-res-brand type-res-small font-semibold text-res-ink-inverted">
                            {getInitials(member.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="type-res-body block truncate font-semibold text-res-ink">
                              {member.name}
                            </span>
                            <span className="type-res-small block font-mono font-normal text-res-ink-muted">
                              {member.staffId}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 pr-4">
                        <span className="type-res-body block font-medium text-res-ink">
                          {member.email}
                        </span>
                        <span className="type-res-small block font-normal text-res-ink-muted">
                          {member.phone || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 pr-4">
                        <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold whitespace-nowrap text-res-ink-muted">
                          {roleLabel(member.role)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 pr-4">
                        <span
                          className={`type-res-small inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${STATUS_STYLE[member.status] ?? 'bg-res-surface text-res-ink-muted'}`}
                        >
                          {member.status === 'active' && (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-res-brand" />
                          )}
                          <span className="capitalize">{member.status}</span>
                        </span>
                      </TableCell>
                      <TableCell className="type-res-body py-3 pr-4 font-normal whitespace-nowrap text-res-ink-muted">
                        {formatDate(member.createdAt)}
                      </TableCell>
                      <TableCell className="py-3 pr-4 text-right">
                        {busyId === member._id ? (
                          <span className="inline-flex justify-end pr-2">
                            <Loader2 className="h-4 w-4 animate-spin text-res-brand" />
                          </span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Actions for ${member.name}`}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-res-ink-muted transition-colors outline-none hover:bg-res-surface hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-res-md border-res-line bg-res-card p-1.5 shadow-res-medium"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  setEdit({
                                    open: true,
                                    staff: member,
                                    role: (member.role as StaffRole) || 'staff',
                                  })
                                }
                                className="type-res-small cursor-pointer rounded-res-sm font-medium text-res-ink focus:bg-res-surface focus:text-res-brand"
                              >
                                <UserCog className="mr-2 h-4 w-4 text-res-ink-muted" /> Edit role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleResend(member)}
                                className="type-res-small cursor-pointer rounded-res-sm font-medium text-res-ink focus:bg-res-surface focus:text-res-brand"
                              >
                                <Mail className="mr-2 h-4 w-4 text-res-ink-muted" /> Resend invite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(member)}
                                className="type-res-small cursor-pointer rounded-res-sm font-medium text-res-ink focus:bg-res-surface focus:text-res-brand"
                              >
                                <Pencil className="mr-2 h-4 w-4 text-res-ink-muted" />
                                {member.status === 'active' ? 'Suspend' : 'Activate'}
                              </DropdownMenuItem>
                              {member.status !== 'suspended' && (
                                <DropdownMenuItem
                                  onClick={() => handleRevoke(member)}
                                  className="type-res-small cursor-pointer rounded-res-sm font-medium text-res-ink focus:bg-res-surface focus:text-res-brand"
                                >
                                  <UserX className="mr-2 h-4 w-4 text-res-ink-muted" /> Revoke access
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(member)}
                                className="type-res-small cursor-pointer rounded-res-sm font-medium text-res-ink-muted focus:bg-res-surface focus:text-res-ink"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {/* Invite modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite staff"
        subtitle="Send an onboarding invite to a team member."
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInvite}
              disabled={isInviting}
              className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isInviting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isInviting ? 'Sending…' : 'Send invite'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="invite-name">
              Full name
            </label>
            <input
              id="invite-name"
              placeholder="Jane Doe"
              value={invite.name}
              onChange={(e) => setInvite((p) => ({ ...p, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              placeholder="jane@example.com"
              value={invite.email}
              onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="invite-role">
                Role
              </label>
              <select
                id="invite-role"
                value={invite.role}
                onChange={(e) => setInvite((p) => ({ ...p, role: e.target.value as StaffRole }))}
                className={inputClass}
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="invite-phone">
                Phone <span className="font-normal">(optional)</span>
              </label>
              <input
                id="invite-phone"
                placeholder="+234…"
                value={invite.phone}
                onChange={(e) => setInvite((p) => ({ ...p, phone: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="invite-hours">
              Invite valid for (hours)
            </label>
            <input
              id="invite-hours"
              type="number"
              min={1}
              value={invite.validHours}
              onChange={(e) =>
                setInvite((p) => ({ ...p, validHours: Number(e.target.value) || 24 }))
              }
              className={inputClass}
            />
          </div>
        </div>
      </Modal>

      {/* Edit role modal */}
      <Modal
        isOpen={edit.open && !!edit.staff}
        onClose={() => setEdit({ open: false, staff: null, role: 'staff' })}
        title="Edit role"
        subtitle={edit.staff?.name ?? ''}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEdit({ open: false, staff: null, role: 'staff' })}
              className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveRole}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
            >
              Save
            </button>
          </>
        }
      >
        <div>
          <label className={labelClass} htmlFor="edit-role">
            Role
          </label>
          <select
            id="edit-role"
            value={edit.role}
            onChange={(e) => setEdit((p) => ({ ...p, role: e.target.value as StaffRole }))}
            className={inputClass}
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
