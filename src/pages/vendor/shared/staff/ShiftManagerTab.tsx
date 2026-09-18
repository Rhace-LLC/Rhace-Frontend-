import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Clock, Loader2, Plus, Trash2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { staffService, type StaffAssignmentDto, type StaffMember, type StaffShiftDto } from '@/services/staff.service';

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const staffName = (value: StaffShiftDto['staff'] | StaffAssignmentDto['staff']) => {
  if (typeof value === 'object' && value) return value.name || 'Staff';
  return 'Staff';
};

export default function ShiftManagerTab() {
  const [date, setDate] = useState(toDateKey(new Date()));
  const [liveShifts, setLiveShifts] = useState<StaffShiftDto[]>([]);
  const [dayShifts, setDayShifts] = useState<StaffShiftDto[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState({ staff: '', type: 'table', refId: '', label: '' });

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [live, day, assigns, staffList] = await Promise.all([
        staffService.getLiveShifts(),
        staffService.getShifts({ date }),
        staffService.getAssignments({ date }),
        staffService.getStaff({ limit: 200 }),
      ]);
      setLiveShifts(live.docs || []);
      setDayShifts(day.docs || []);
      setAssignments(assigns.docs || []);
      setStaff(staffList.docs || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load shift data');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const staffOptions = useMemo(
    () => staff.filter((s) => s.status !== 'suspended'),
    [staff],
  );

  const handleAddAssignment = async () => {
    if (!draft.staff || !draft.refId) {
      toast.error('Select a staff member and provide a reference id');
      return;
    }
    try {
      setIsSaving(true);
      const created = await staffService.createAssignment({
        staff: draft.staff,
        date,
        type: draft.type as 'table' | 'room' | 'zone',
        refId: draft.refId,
        label: draft.label || undefined,
      });
      setAssignments((prev) => [...prev, created]);
      setDraft({ staff: '', type: 'table', refId: '', label: '' });
      toast.success('Assignment added');
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to add assignment',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await staffService.deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a._id !== id));
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Roster date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" /> On shift now
            <Badge variant="secondary" className="ml-2">
              {liveShifts.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is clocked in right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveShifts.map((shift) => (
                <div
                  key={shift._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{staffName(shift.staff)}</p>
                    <p className="text-xs text-muted-foreground">
                      In at {formatTime(shift.clockInAt)}
                    </p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" /> Attendance — {date}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shifts recorded for this day.</p>
          ) : (
            <div className="space-y-2">
              {dayShifts.map((shift) => (
                <div
                  key={shift._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium">{staffName(shift.staff)}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      {formatTime(shift.clockInAt)} → {formatTime(shift.clockOutAt)}
                    </span>
                    <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
                      {shift.status === 'open' ? 'On shift' : `${shift.minutesWorked ?? 0} min`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Roster assignments — {date}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2 space-y-2">
              <Label>Staff</Label>
              <Select value={draft.staff} onValueChange={(v) => setDraft((p) => ({ ...p, staff: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} · {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((p) => ({ ...p, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="room">Room</SelectItem>
                  <SelectItem value="zone">Zone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference ID</Label>
              <Input
                placeholder="Table / room id"
                value={draft.refId}
                onChange={(e) => setDraft((p) => ({ ...p, refId: e.target.value }))}
              />
            </div>
            <Button onClick={handleAddAssignment} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments for this day yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {a.type}
                    </Badge>
                    <span className="font-medium">{staffName(a.staff)}</span>
                    {a.label && <span className="text-sm text-muted-foreground">{a.label}</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteAssignment(a._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
