import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Calendar,
  Clock,
  Crown,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { floorPlanService } from '@/services/floorPlan.service';
import { inventoryBlueprintService } from '@/services/inventoryBlueprint.service';
import { physicalUnitService } from '@/services/physicalUnit.service';
import { useAssignmentRealtime } from '@/hooks/useAssignmentRealtime';
import {
  staffService,
  assignmentStaffName,
  type StaffAssignmentGroupDto,
  type StaffMember,
  type StaffShiftDto,
} from '@/services/staff.service';
import type { InventoryBlueprintDto, PhysicalUnitDto } from '@/types';

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const staffName = (value: StaffShiftDto['staff']) => {
  if (typeof value === 'object' && value) return value.name || 'Staff';
  return 'Staff';
};

const staffIdOf = (value: StaffShiftDto['staff']) =>
  typeof value === 'object' && value ? value._id : ((value as string) ?? '');

const isOnShift = (ids: Set<string>, staff: StaffShiftDto['staff']) => ids.has(staffIdOf(staff));

/** Which board action the dialog is performing. */
interface BoardDialog {
  mode: 'assign-lead' | 'add-support' | 'reassign';
  unitId: string;
  unitLabel: string;
  type: 'table' | 'room' | 'zone';
  assignmentId?: string; // reassign only
}

export function ShiftManagerTab({
  onRefresh,
  vertical: verticalProp,
}: {
  onRefresh?: () => void;
  /** Venue vertical — defaults to the vendor account (vendor shell). */
  vertical?: 'hotel' | 'club' | 'restaurant';
}) {
  const { vendorIsHotel, vendorIsClub, vendor, staff: sessionStaff } = useAuth();
  const vertical = verticalProp ?? (vendorIsHotel ? 'hotel' : vendorIsClub ? 'club' : 'restaurant');
  const realtimeVendorId = vendor?._id ?? sessionStaff?.vendor;

  const [date, setDate] = useState(toDateKey(new Date()));
  const [liveShifts, setLiveShifts] = useState<StaffShiftDto[]>([]);
  const [dayShifts, setDayShifts] = useState<StaffShiftDto[]>([]);
  const [groups, setGroups] = useState<StaffAssignmentGroupDto[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [blueprints, setBlueprints] = useState<InventoryBlueprintDto[]>([]);
  const [floorPlans, setFloorPlans] = useState<any[]>([]);
  const [units, setUnits] = useState<PhysicalUnitDto[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [draft, setDraft] = useState({ staff: '', refId: '', label: '' });
  const [dialog, setDialog] = useState<BoardDialog | null>(null);
  const [dialogStaffId, setDialogStaffId] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);

  // Auto-determined assignment type based on vendor vertical
  const assignmentType = vertical === 'hotel' ? 'room' : 'table';

  // Staff currently clocked in — drives the board's clock-in dots (B5 visibility).
  const onShiftIds = useMemo(
    () => new Set(liveShifts.map((s) => staffIdOf(s.staff))),
    [liveShifts],
  );

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [live, day, board, staffList, blueprintsRes, plansRes] = await Promise.all([
        staffService.getLiveShifts(),
        staffService.getShifts({ date }),
        // Unit-grouped payload — the board needs no client-side join (plan §5.3).
        staffService.getGroupedAssignments({ date }),
        staffService.getStaff({ limit: 200 }),
        inventoryBlueprintService.list({ vertical, includeSystem: true, limit: 100 }),
        floorPlanService.list({ vertical, limit: 50 }),
      ]);
      setLiveShifts(live.docs || []);
      setDayShifts(day.docs || []);
      setGroups(board.docs || []);
      setStaff(staffList.docs || []);
      setBlueprints(blueprintsRes.data?.items || []);
      setFloorPlans(plansRes.data?.items || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load shift data');
    } finally {
      setIsLoading(false);
    }
  }, [date, vertical]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh the board whenever anyone changes a roster (closes B11).
  useAssignmentRealtime(realtimeVendorId, () => {
    load();
  });

  const handleRefresh = () => {
    load();
    onRefresh?.();
  };

  const staffOptions = useMemo(
    () => staff.filter((s) => s.status !== 'suspended'),
    [staff],
  );

  const loadUnitsForBlueprint = useCallback(async (blueprintId: string) => {
    if (!blueprintId || floorPlans.length === 0) {
      setUnits([]);
      return;
    }
    try {
      setLoadingUnits(true);
      // Find the first floor plan for this vertical and use it to fetch units
      const planId = floorPlans[0]?._id;
      if (!planId) {
        setUnits([]);
        return;
      }
      const unitsRes = await physicalUnitService.list(planId, { blueprintId, limit: 200 });
      setUnits(unitsRes.data?.items || []);
    } catch (error) {
      console.error('Failed to load units:', error);
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  }, [floorPlans]);

  useEffect(() => {
    if (selectedBlueprintId) {
      loadUnitsForBlueprint(selectedBlueprintId);
    } else {
      setUnits([]);
    }
  }, [selectedBlueprintId, loadUnitsForBlueprint]);

  const reloadBoard = useCallback(async () => {
    try {
      const res = await staffService.getGroupedAssignments({ date });
      setGroups(res.docs || []);
    } catch (error) {
      console.error(error);
    }
  }, [date]);

  const handleAddAssignment = async () => {
    if (!draft.staff || !draft.refId) {
      toast.error('Select a staff member and provide a reference id');
      return;
    }
    try {
      setIsSaving(true);
      await staffService.createAssignment({
        staff: draft.staff,
        date,
        type: assignmentType as 'table' | 'room',
        refId: draft.refId,
        label: draft.label || undefined,
      });
      // Re-fetch so the board shows the new slot with its populated unit.
      await reloadBoard();
      setDraft({ staff: '', refId: '', label: '' });
      setSelectedBlueprintId('');
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

  /** Dialog submit — assign lead / add support / reassign, all guarded server-side. */
  const handleDialogSubmit = async () => {
    if (!dialog || !dialogStaffId) return;
    try {
      setDialogBusy(true);
      if (dialog.mode === 'reassign' && dialog.assignmentId) {
        // Atomic hand-off: release old lead + insert new one in one call (B7).
        await staffService.reassignAssignment(dialog.assignmentId, dialogStaffId);
        toast.success('Lead reassigned');
      } else {
        await staffService.createAssignment({
          staff: dialogStaffId,
          date,
          type: dialog.type,
          refId: dialog.unitId,
          role: dialog.mode === 'assign-lead' ? 'lead' : 'support',
        });
        toast.success(dialog.mode === 'assign-lead' ? 'Lead assigned' : 'Helper added');
      }
      setDialog(null);
      setDialogStaffId('');
      await reloadBoard();
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Action failed',
      );
    } finally {
      setDialogBusy(false);
    }
  };

  const handleRelease = async (assignmentId: string) => {
    try {
      await staffService.releaseAssignment(assignmentId, 'manual');
      toast.success('Slot released');
      await reloadBoard();
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to release slot',
      );
    }
  };

  const boardSummary = useMemo(() => {
    const totalUnits = groups.length;
    const assigned = groups.filter((g) => g.count > 0).length;
    const open = totalUnits - assigned;
    return { totalUnits, assigned, open };
  }, [groups]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EAEAEA] p-6 space-y-6 text-[#111827] font-sans">
        <div className="h-10 w-48 bg-[#F6F7F9] rounded-[12px] animate-pulse" />
        <div className="h-48 w-full bg-[#FFFFFF] rounded-[28px] animate-pulse shadow-[0px_4px_16px_0px_rgba(0,0,0,0.03)]" />
        <div className="h-64 w-full bg-[#FFFFFF] rounded-[28px] animate-pulse shadow-[0px_4px_16px_0px_rgba(0,0,0,0.03)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 text-[#111827] font-sans antialiased max-w-[1580px] mx-auto">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-[20px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#E0F2F1] flex items-center justify-center text-[#0A6C6D]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#111827] leading-tight">Roster Date</h1>
            <p className="text-[11px] text-[#8C94A0]">Manage shifts and assignments for this period</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-auto bg-[#F6F7F9] border-0 text-[#111827] font-medium text-[13px] px-4 py-2.5 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0A6C6D] transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* On Shift Now Section */}
      <section className="bg-[#FFFFFF] rounded-[28px] p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0A6C6D]/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-[#0A6C6D]" />
            </div>
            <h2 className="text-[16px] font-semibold text-[#111827]">On Shift Now</h2>
          </div>
          <span className="bg-[#0A6C6D] text-[#FFFFFF] text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
            {liveShifts.length} Active
          </span>
        </div>

        {liveShifts.length === 0 ? (
          <div className="bg-[#F6F7F9] rounded-[20px] p-8 text-center border border-[#F0F2F5]">
            <p className="text-[13px] text-[#8C94A0]">Nobody is clocked in right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveShifts.map((shift) => (
              <div
                key={shift._id}
                className="group relative bg-[#F6F7F9] hover:bg-[#E0F2F1]/30 rounded-[20px] p-4 flex items-center justify-between border border-[#F0F2F5] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0A6C6D] text-[#FFFFFF] font-bold text-[13px] flex items-center justify-center shadow-sm">
                    {staffName(shift.staff).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#111827] leading-tight">
                      {staffName(shift.staff)}
                    </p>
                    <p className="text-[11px] text-[#8C94A0] mt-0.5">
                      In at {formatTime(shift.clockInAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A86B] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00A86B]"></span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Attendance Log Section */}
      <section className="bg-[#FFFFFF] rounded-[28px] p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0A6C6D]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#0A6C6D]" />
            </div>
            <h2 className="text-[16px] font-semibold text-[#111827]">Attendance Log</h2>
          </div>
          <span className="text-[11px] font-medium text-[#8C94A0] bg-[#F6F7F9] px-3 py-1 rounded-full border border-[#F0F2F5]">
            {date}
          </span>
        </div>

        {dayShifts.length === 0 ? (
          <div className="bg-[#F6F7F9] rounded-[20px] p-8 text-center border border-[#F0F2F5]">
            <p className="text-[13px] text-[#8C94A0]">No shifts recorded for this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayShifts.map((shift) => {
              const isOpen = shift.status === 'open';
              return (
                <div
                  key={shift._id}
                  className="bg-[#F6F7F9] hover:bg-[#FFFFFF] rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#F0F2F5] transition-all duration-200 hover:shadow-[0px_4px_16px_0px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E0F2F1] text-[#0A6C6D] font-bold text-[11px] flex items-center justify-center">
                      {staffName(shift.staff).slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-medium text-[#111827]">
                      {staffName(shift.staff)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-[11px] font-medium text-[#8C94A0]">
                      {formatTime(shift.clockInAt)} → {formatTime(shift.clockOutAt)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-3 py-1 rounded-full ${
                        isOpen
                          ? 'bg-[#00A86B]/15 text-[#00A86B]'
                          : 'bg-[#8C94A0]/15 text-[#111827]'
                      }`}
                    >
                      {isOpen ? 'On shift' : `${shift.minutesWorked ?? 0} min`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Roster Board Section (plan §6.1) */}
      <section className="bg-[#FFFFFF] rounded-[28px] p-6 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.03)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[#111827]">Roster Board</h2>
            <p className="text-[11px] text-[#8C94A0] mt-0.5">
              One owner per {assignmentType}, plus a bounded set of helpers — for {date}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#8C94A0]">
            <Users className="h-4 w-4 text-[#0A6C6D]" />
            {boardSummary.totalUnits} units · {boardSummary.assigned} assigned ·{' '}
            {boardSummary.open} open
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="bg-[#F6F7F9] rounded-[20px] p-8 text-center border border-[#F0F2F5]">
            <p className="text-[13px] text-[#8C94A0]">
              No {assignmentType} units found for this vendor yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {groups.map((group) => {
              const unit = group.unit;
              const unitLabel = unit?.label || group.refId;
              const location = [unit?.floorId, unit?.sectionId].filter(Boolean).join(' · ');
              const full = group.count >= group.capacity;
              const unassigned = group.count === 0;
              return (
                <div
                  key={group.refId}
                  className={`rounded-[20px] p-4 border transition-all duration-200 ${
                    unassigned
                      // Distinct border so open units are spotted instantly (§6.1).
                      ? 'border-dashed border-amber-400/70 bg-amber-50/50'
                      : 'border-[#F0F2F5] bg-[#F6F7F9]'
                  }`}
                >
                  {/* Card header: unit + capacity meter n/MAX (B2 made visible) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827] truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0A6C6D]" />
                        {unitLabel}
                      </p>
                      {location && (
                        <p className="text-[10px] text-[#8C94A0] mt-0.5 truncate">{location}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`text-[11px] font-bold ${
                          full ? 'text-amber-600' : 'text-[#0A6C6D]'
                        }`}
                      >
                        {group.count}/{group.capacity}
                      </span>
                      <div className="mt-1 h-1.5 w-14 overflow-hidden rounded-full bg-[#E8EBEF]">
                        <div
                          className={`h-full rounded-full ${full ? 'bg-amber-500' : 'bg-[#0A6C6D]'}`}
                          style={{
                            width: `${Math.min(100, (group.count / Math.max(1, group.capacity)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lead slot — highlighted at the top of each card */}
                  {group.lead ? (
                    <div className="mt-3 rounded-[14px] bg-[#E0F2F1]/60 border border-[#0A6C6D]/20 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Clock-in dot: grey when off-shift (B5 visibility) */}
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              isOnShift(onShiftIds, group.lead.staff)
                                ? 'bg-[#00A86B]'
                                : 'bg-[#C4CBD4]'
                            }`}
                            title={isOnShift(onShiftIds, group.lead.staff) ? 'On shift' : 'Not clocked in'}
                          />
                          <span className="text-[13px] font-semibold text-[#111827] truncate">
                            {assignmentStaffName(group.lead.staff)}
                          </span>
                          <span className="flex items-center gap-1 bg-[#0A6C6D] text-[#FFFFFF] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                            <Crown className="h-2.5 w-2.5" /> Lead
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              setDialog({
                                mode: 'reassign',
                                unitId: group.refId,
                                unitLabel,
                                type: group.type,
                                assignmentId: group.lead!._id,
                              })
                            }
                            className="text-[10px] font-semibold text-[#0A6C6D] hover:text-[#085758] px-1.5 py-1"
                            title="Hand this unit's lead slot to someone else (atomic)"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => handleRelease(group.lead!._id)}
                            className="text-[10px] font-semibold text-[#8C94A0] hover:text-red-500 px-1.5 py-1"
                            title="Release this slot"
                          >
                            Release
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setDialog({
                          mode: 'assign-lead',
                          unitId: group.refId,
                          unitLabel,
                          type: group.type,
                        })
                      }
                      className="mt-3 w-full rounded-[14px] border border-[#0A6C6D]/30 bg-[#FFFFFF] hover:bg-[#E0F2F1]/40 p-2.5 text-[12px] font-semibold text-[#0A6C6D] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Assign lead →
                    </button>
                  )}

                  {/* Support slots — compact chips under the lead */}
                  {group.support.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {group.support.map((row) => (
                        <li
                          key={row._id}
                          className="flex items-center justify-between gap-2 rounded-[12px] bg-[#FFFFFF] border border-[#F0F2F5] px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                isOnShift(onShiftIds, row.staff) ? 'bg-[#00A86B]' : 'bg-[#C4CBD4]'
                              }`}
                            />
                            <span className="text-[12px] font-medium text-[#111827] truncate">
                              {assignmentStaffName(row.staff)}
                            </span>
                            <span className="bg-[#8C94A0]/15 text-[#111827] text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0">
                              Support
                            </span>
                          </div>
                          <button
                            onClick={() => handleRelease(row._id)}
                            className="text-[10px] font-semibold text-[#8C94A0] hover:text-red-500 shrink-0"
                            title="Release this helper"
                          >
                            Release
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add helper — disabled at the cap, so the bound is visible (B2 UX) */}
                  {!unassigned && (
                    <button
                      onClick={() =>
                        setDialog({
                          mode: 'add-support',
                          unitId: group.refId,
                          unitLabel,
                          type: group.type,
                        })
                      }
                      disabled={full}
                      className="mt-2.5 w-full rounded-[12px] border border-dashed border-[#C4CBD4] py-1.5 text-[11px] font-semibold text-[#8C94A0] hover:text-[#0A6C6D] hover:border-[#0A6C6D]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#8C94A0] disabled:hover:border-[#C4CBD4]"
                      title={full ? `Unit is at its maximum of ${group.capacity}` : 'Add a support slot'}
                    >
                      + Add helper
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Assign / reassign dialog — shared by the board's three actions */}
      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'reassign'
                ? `Reassign lead — ${dialog?.unitLabel}`
                : dialog?.mode === 'assign-lead'
                  ? `Assign lead — ${dialog?.unitLabel}`
                  : `Add helper — ${dialog?.unitLabel}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {dialog?.mode === 'reassign'
                ? 'Picks a new owner for this unit. The current lead is released and the replacement inserted in one atomic step.'
                : dialog?.mode === 'assign-lead'
                  ? 'This unit has no owner yet. The first staff member becomes its lead.'
                  : 'Support slots assist the lead. Units hold at most a handful of staff.'}
            </p>
            <Select value={dialogStaffId} onValueChange={setDialogStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a staff member…" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} ({s.role})
                    {!onShiftIds.has(s._id) ? ' · not clocked in' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full bg-[#0A6C6D] hover:bg-[#085a5b]"
              disabled={!dialogStaffId || dialogBusy}
              onClick={handleDialogSubmit}
            >
              {dialogBusy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-1 h-4 w-4" />
              )}
              {dialog?.mode === 'reassign' ? 'Reassign lead' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
