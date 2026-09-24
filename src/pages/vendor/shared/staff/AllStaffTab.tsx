import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Download,
  Filter,
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
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/Statcard';
import { PeopleIcon } from '@/components/icons/icons';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
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

const roleLabel = (role?: string) =>
  ROLE_OPTIONS.find((r) => r.value === role)?.label ?? (role || 'Staff');

const getStatusBadgeStyle = (status: string) => {
  if (status === 'active') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
  }
  if (status === 'suspended') {
    return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
  }
  if (status === 'invited') {
    return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
  }
  return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
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

export function AllStaffTab({ onRefresh }: { onRefresh?: () => void }) {
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

  if (isLoading) {
    return (
      <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl border border-slate-100" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl border border-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white ">
      {/* Metrics Row */}
      <Card className="shadow-none border border-slate-200 rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-6 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Staff"
              value={stats.total}
              icon={PeopleIcon}
              iconBg="bg-teal-50"
              iconColor="text-teal-600"
            />
            <StatCard
              title="Active"
              value={stats.active}
              icon={PeopleIcon}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              title="Invited"
              value={stats.invited}
              icon={PeopleIcon}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              title="Suspended"
              value={stats.suspended}
              icon={PeopleIcon}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 text-sm shadow-sm"
            />
          </div>

          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 border-slate-200 rounded-xl bg-white text-slate-700 text-sm focus:ring-teal-500 shadow-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
              <SelectItem value="all" className="focus:bg-teal-50 focus:text-teal-700">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="focus:bg-teal-50 focus:text-teal-700">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px] h-10 border-slate-200 rounded-xl bg-white text-slate-700 text-sm focus:ring-teal-500 shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
              <SelectItem value="all" className="focus:bg-teal-50 focus:text-teal-700">All status</SelectItem>
              <SelectItem value="active" className="focus:bg-teal-50 focus:text-teal-700">Active</SelectItem>
              <SelectItem value="invited" className="focus:bg-teal-50 focus:text-teal-700">Invited</SelectItem>
              <SelectItem value="suspended" className="focus:bg-teal-50 focus:text-teal-700">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-teal-600 rounded-xl font-medium shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-teal-600 rounded-xl font-medium shadow-sm transition-all"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export
          </Button>
          <Button
            onClick={() => setShowInvite(true)}
            className="h-10 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-medium shadow-md shadow-teal-500/10 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Invite Staff
          </Button>
        </div>
      </div>

      {/* Main Staff Table */}
      <Card className="shadow-none border border-slate-200 rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-0 bg-white">
          {filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-sm">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No staff found</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-6">
                Try adjusting your filters or invite your first team member to start collaborating.
              </p>
              <Button
                onClick={() => setShowInvite(true)}
                className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white shadow-md rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" /> Invite Staff
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4 pl-6">Staff Member</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4">Contact</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4">Role</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4">Added On</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 bg-white">
                  {filteredStaff.map((member) => (
                    <TableRow key={member._id} className="hover:bg-teal-50/20 transition-colors group">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-white">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                              {member.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">{member.staffId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm font-medium text-slate-800">{member.email}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{member.phone || '—'}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="bg-white text-slate-700 border-slate-200 font-medium px-2.5 py-1 rounded-lg text-xs shadow-2xs"
                        >
                          {roleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={`capitalize px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeStyle(member.status)}`}
                        >
                          <span className="flex items-center gap-1.5">
                            {member.status === 'active' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {member.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-slate-500 font-medium">
                        {formatDate(member.createdAt)}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        {busyId === member._id ? (
                          <div className="flex justify-end pr-2">
                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-xl rounded-xl p-1.5 space-y-0.5">
                              <DropdownMenuItem
                                onClick={() =>
                                  setEdit({
                                    open: true,
                                    staff: member,
                                    role: (member.role as StaffRole) || 'staff',
                                  })
                                }
                                className="rounded-lg text-slate-700 focus:bg-teal-50 focus:text-teal-700 font-medium text-xs py-2 cursor-pointer"
                              >
                                <UserCog className="w-4 h-4 mr-2 text-slate-400" /> Edit role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleResend(member)}
                                className="rounded-lg text-slate-700 focus:bg-teal-50 focus:text-teal-700 font-medium text-xs py-2 cursor-pointer"
                              >
                                <Mail className="w-4 h-4 mr-2 text-slate-400" /> Resend invite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(member)}
                                className="rounded-lg text-slate-700 focus:bg-teal-50 focus:text-teal-700 font-medium text-xs py-2 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4 mr-2 text-slate-400" />
                                {member.status === 'active' ? 'Suspend' : 'Activate'}
                              </DropdownMenuItem>
                              {member.status !== 'suspended' && (
                                <DropdownMenuItem
                                  onClick={() => handleRevoke(member)}
                                  className="rounded-lg text-slate-700 focus:bg-amber-50 focus:text-amber-700 font-medium text-xs py-2 cursor-pointer"
                                >
                                  <UserX className="w-4 h-4 mr-2 text-amber-500" /> Revoke access
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-700 font-medium text-xs py-2 cursor-pointer"
                                onClick={() => handleDelete(member)}
                              >
                                <Trash2 className="w-4 h-4 mr-2 text-rose-500" /> Delete
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
        </CardContent>
      </Card>

      {/* Invite Modal Overlay */}
      {showInvite && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-7 space-y-5 bg-white">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Invite Staff</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Send an onboarding invite to a team member</p>
                </div>
                <button
                  onClick={() => setShowInvite(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                <Input
                  placeholder="Jane Doe"
                  value={invite.name}
                  onChange={(e) => setInvite((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl bg-white text-slate-800 text-sm shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={invite.email}
                  onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
                  className="h-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl bg-white text-slate-800 text-sm shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Role</Label>
                  <Select
                    value={invite.role}
                    onValueChange={(v) => setInvite((p) => ({ ...p, role: v as StaffRole }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:ring-teal-500 shadow-2xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="focus:bg-teal-50 focus:text-teal-700">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Phone (optional)</Label>
                  <Input
                    placeholder="+234..."
                    value={invite.phone}
                    onChange={(e) => setInvite((p) => ({ ...p, phone: e.target.value }))}
                    className="h-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl bg-white text-slate-800 text-sm shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Invite valid for (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={invite.validHours}
                  onChange={(e) =>
                    setInvite((p) => ({ ...p, validHours: Number(e.target.value) || 24 }))
                  }
                  className="h-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl bg-white text-slate-800 text-sm shadow-2xs"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  className="flex-1 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium"
                  onClick={() => setShowInvite(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-10 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-medium shadow-md shadow-teal-500/10 rounded-xl"
                  onClick={handleInvite}
                  disabled={isInviting}
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal Overlay */}
      {edit.open && edit.staff && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Role</h2>
                <p className="text-xs text-slate-500 font-medium">{edit.staff.name}</p>
              </div>
              <button
                onClick={() => setEdit({ open: false, staff: null, role: 'staff' })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Select New Role</Label>
              <Select
                value={edit.role}
                onValueChange={(v) => setEdit((p) => ({ ...p, role: v as StaffRole }))}
              >
                <SelectTrigger className="h-10 border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:ring-teal-500 shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="focus:bg-teal-50 focus:text-teal-700">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium"
                onClick={() => setEdit({ open: false, staff: null, role: 'staff' })}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-10 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-medium shadow-md shadow-teal-500/10 rounded-xl"
                onClick={handleSaveRole}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}