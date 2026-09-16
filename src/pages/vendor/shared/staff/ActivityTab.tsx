import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Activity as ActivityIcon, Loader2 } from 'lucide-react';
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
import { staffService, type StaffActivityDto, type StaffMember } from '@/services/staff.service';

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

const labelForAction = (action: string) =>
  action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const activityName = (value: StaffActivityDto['staff'], fallback?: string) =>
  typeof value === 'object' && value ? value.name || 'Staff' : fallback || 'Staff';

export default function ActivityTab() {
  const [date, setDate] = useState(toDateKey(new Date()));
  const [staffId, setStaffId] = useState('all');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activity, setActivity] = useState<StaffActivityDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsFetching(true);
      const res = await staffService.getActivity({
        date,
        staffId: staffId === 'all' ? undefined : staffId,
        limit: 200,
      });
      setActivity(res.docs || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load activity');
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }, [date, staffId]);

  useEffect(() => {
    staffService
      .getStaff({ limit: 200 })
      .then((res) => setStaff(res.docs || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={load} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ActivityIcon className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Activity feed — {date}</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">
              No recorded activity for this day.
            </p>
          ) : (
            <ol className="relative border-l border-muted-foreground/20 space-y-5 pl-6">
              {activity.map((entry) => (
                <li key={entry._id} className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-teal-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{labelForAction(entry.action)}</Badge>
                    <span className="font-medium">
                      {activityName(entry.staff, entry.staffName)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {entry.entity && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.entity}
                      {entry.metadata && Object.keys(entry.metadata).length > 0
                        ? ` · ${Object.entries(entry.metadata)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(', ')}`
                        : ''}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
