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
  Search,
  Trash2,
  UserCog,
  UserX,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const statusVariant = (status: string) => {
  if (status === 'active') return 'default';
  if (status === 'suspended') return 'destructive';
  if (status === 'invited') return 'secondary';
  return 'outline';
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

export default function AllStaffTab() {
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Staff" value={stats.total} icon={PeopleIcon} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <StatCard title="Active" value={stats.active} icon={PeopleIcon} iconBg="bg-green-100" iconColor="text-green-600" />
            <StatCard title="Invited" value={stats.invited} icon={PeopleIcon} iconBg="bg-yellow-100" iconColor="text-yellow-600" />
            <StatCard title="Suspended" value={stats.suspended} icon={PeopleIcon} iconBg="bg-orange-100" iconColor="text-orange-600" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Export
          </Button>
          <Button
            onClick={() => setShowInvite(true)}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
          >
            <Plus className="w-4 h-4 mr-1" /> Invite Staff
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-0">
          {filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No staff found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or invite your first team member.
              </p>
              <Button onClick={() => setShowInvite(true)}>+ Invite Staff</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.staffId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{member.email}</div>
                      <div className="text-xs text-muted-foreground">{member.phone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(member.status)} className="capitalize">
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(member.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {busyId === member._id ? (
                        <Loader2 className="w-4 h-4 animate-spin inline" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setEdit({
                                  open: true,
                                  staff: member,
                                  role: (member.role as StaffRole) || 'staff',
                                })
                              }
                            >
                              <UserCog className="w-4 h-4 mr-2" /> Edit role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResend(member)}>
                              <Mail className="w-4 h-4 mr-2" /> Resend invite
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(member)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              {member.status === 'active' ? 'Suspend' : 'Activate'}
                            </DropdownMenuItem>
                            {member.status !== 'suspended' && (
                              <DropdownMenuItem onClick={() => handleRevoke(member)}>
                                <UserX className="w-4 h-4 mr-2" /> Revoke access
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(member)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Invite Staff</h2>
                <button
                  onClick={() => setShowInvite(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="Jane Doe"
                  value={invite.name}
                  onChange={(e) => setInvite((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={invite.email}
                  onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={invite.role}
                    onValueChange={(v) => setInvite((p) => ({ ...p, role: v as StaffRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input
                    placeholder="+234..."
                    value={invite.phone}
                    onChange={(e) => setInvite((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Invite valid for (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={invite.validHours}
                  onChange={(e) =>
                    setInvite((p) => ({ ...p, validHours: Number(e.target.value) || 24 }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {edit.open && edit.staff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Role</h2>
              <button
                onClick={() => setEdit({ open: false, staff: null, role: 'staff' })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{edit.staff.name}</p>
            <Select
              value={edit.role}
              onValueChange={(v) => setEdit((p) => ({ ...p, role: v as StaffRole }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEdit({ open: false, staff: null, role: 'staff' })}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveRole}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
