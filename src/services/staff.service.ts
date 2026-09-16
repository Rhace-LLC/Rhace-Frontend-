import api from '@/lib/axios';
import { getStaffRefreshToken, setStaffRefreshToken } from '@/lib/storage';

export type StaffRole =
  | 'manager'
  | 'waiter'
  | 'chef'
  | 'bartender'
  | 'vip_host'
  | 'bar_staff'
  | 'front_desk'
  | 'housekeeping'
  | 'cashier'
  | 'staff';

export interface StaffMember {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  staffId?: string;
  jobTitle?: string;
  role: StaffRole | string;
  status: 'invited' | 'active' | 'suspended';
  photo?: string;
  branch?: { _id: string; name?: string } | string;
  vendor?: string;
  lastLoginAt?: string;
  createdAt?: string;
  permissions?: Record<string, boolean>;
}

export interface StaffListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
  branch?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InviteStaffInput {
  name: string;
  email: string;
  role: StaffRole | string;
  phone?: string;
  branch?: string;
  validHours?: number;
}

export interface StaffShiftDto {
  _id: string;
  staff: string | { _id: string; name?: string; role?: string; staffId?: string; photo?: string };
  date: string;
  clockInAt: string;
  clockOutAt?: string | null;
  minutesWorked?: number;
  status: 'open' | 'closed';
  note?: string;
}

export interface StaffAssignmentDto {
  _id: string;
  staff: string | { _id: string; name?: string; role?: string; staffId?: string };
  date: string;
  type: 'table' | 'room' | 'zone';
  refId: string;
  label?: string;
  floorPlan?: string;
  note?: string;
}

export interface StaffActivityDto {
  _id: string;
  staff: { _id: string; name?: string; role?: string } | string;
  staffName?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  at: string;
}

export interface StaffReportRow {
  _id: string | null;
  salesVolume?: number;
  orderCount?: number;
  totalPrepMs?: number;
  voidCount?: number;
  refundCount?: number;
  refundAmount?: number;
  turnoverCount?: number;
  avgTurnoverMs?: number | null;
}

export interface StaffReports {
  sales: StaffReportRow[];
  prepSpeed: StaffReportRow[];
  voids: StaffReportRow[];
  refunds: StaffReportRow[];
  turnover: StaffReportRow[];
  dateRange: { from?: string; to?: string };
}

export interface StaffBranchOption {
  _id: string;
  name: string;
}

class StaffService {
  /** Stores the access + rotating refresh tokens a staff session runs on. */
  private persistSession(data: {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
  }): void {
    const token = data.accessToken || data.token;
    if (token) localStorage.setItem('token', token);
    if (data.refreshToken) setStaffRefreshToken(data.refreshToken);
  }

  // ── Staff auth (public) ────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const res = await api.post('/staff/auth/login', { email, password });
    this.persistSession(res.data);
    return res.data;
  }

  /** Revokes the refresh token server-side; safe to call with no session. */
  async logout() {
    const refreshToken = getStaffRefreshToken();
    try {
      if (refreshToken) await api.post('/staff/auth/logout', { refreshToken });
    } catch {
      // Logging out locally must succeed even if the server call fails.
    } finally {
      setStaffRefreshToken(null);
    }
  }

  async acceptInvite(inviteToken: string) {
    const res = await api.post('/staff/auth/accept-invite', { inviteToken });
    return res.data;
  }

  async setPassword(resetToken: string, password: string) {
    const res = await api.post('/staff/auth/set-password', { resetToken, password });
    this.persistSession(res.data);
    return res.data;
  }

  async forgotPassword(email: string) {
    const res = await api.post('/staff/auth/forgot-password', { email });
    return res.data;
  }

  async resetPassword(token: string, password: string) {
    const res = await api.post('/staff/auth/reset-password', { token, password });
    return res.data;
  }

  // ── Staff management (vendor admin) ────────────────────────────────────────
  async createStaff(data: Record<string, unknown>) {
    const res = await api.post('/staff', data);
    return res.data;
  }

  async inviteStaff(data: InviteStaffInput) {
    const res = await api.post('/staff/invite', data);
    return res.data as { staff: StaffMember; acceptUrl?: string };
  }

  async getStaff(params: StaffListParams = {}) {
    const res = await api.get('/staff', { params });
    return res.data as { docs: StaffMember[]; total: number; page: number; pages: number };
  }

  async getStaffById(id: string) {
    const res = await api.get(`/staff/${id}`);
    return res.data as StaffMember;
  }

  async updateStaff(id: string, data: Record<string, unknown>) {
    const res = await api.put(`/staff/${id}`, data);
    return res.data as StaffMember;
  }

  async updateStaffRole(id: string, role: string) {
    const res = await api.patch(`/staff/${id}/roles`, { role });
    return res.data as StaffMember;
  }

  async toggleStatus(id: string, status?: 'active' | 'suspended' | 'invited') {
    const res = await api.patch(`/staff/${id}/status`, status ? { status } : {});
    return res.data as StaffMember;
  }

  async deleteStaff(id: string) {
    const res = await api.delete(`/staff/${id}`);
    return res.data;
  }

  async resendInvite(staffId: string) {
    const res = await api.post(`/staff/${staffId}/resend-invite`);
    return res.data as { message: string; acceptUrl?: string };
  }

  async revokeStaff(staffId: string) {
    const res = await api.post(`/staff/${staffId}/revoke`);
    return res.data;
  }

  async exportCsv(format: 'csv' | 'xlsx' = 'csv') {
    const res = await api.get('/staff/export-csv', { params: { format }, responseType: 'blob' });
    return res.data as Blob;
  }

  // ── Shifts / attendance ────────────────────────────────────────────────────
  async clockIn(note?: string) {
    const res = await api.post('/staff/shifts/clock-in', { note });
    return res.data as StaffShiftDto;
  }

  async clockOut() {
    const res = await api.post('/staff/shifts/clock-out');
    return res.data as StaffShiftDto;
  }

  async getCurrentShift() {
    const res = await api.get('/staff/shifts/current');
    return res.data as { shift: StaffShiftDto | null };
  }

  async getLiveShifts() {
    const res = await api.get('/staff/shifts/live');
    return res.data as { docs: StaffShiftDto[]; total: number };
  }

  async getShifts(params: { date?: string; staffId?: string; status?: string } = {}) {
    const res = await api.get('/staff/shifts', { params });
    return res.data as { docs: StaffShiftDto[]; total: number };
  }

  // ── Roster assignments ─────────────────────────────────────────────────────
  async createAssignment(data: {
    staff: string;
    date?: string;
    type: 'table' | 'room' | 'zone';
    refId: string;
    label?: string;
    floorPlan?: string;
    note?: string;
  }) {
    const res = await api.post('/staff/assignments', data);
    return res.data as StaffAssignmentDto;
  }

  async getAssignments(params: { date?: string; staffId?: string; type?: string } = {}) {
    const res = await api.get('/staff/assignments', { params });
    return res.data as { docs: StaffAssignmentDto[]; total: number };
  }

  async deleteAssignment(id: string) {
    const res = await api.delete(`/staff/assignments/${id}`);
    return res.data;
  }

  // ── Activity & reports ─────────────────────────────────────────────────────
  async getActivity(params: { date?: string; staffId?: string; page?: number; limit?: number } = {}) {
    const res = await api.get('/staff/activity', { params });
    return res.data as { docs: StaffActivityDto[]; total: number; page: number; pages: number };
  }

  async getReports(params: { from?: string; to?: string; branchId?: string; staffId?: string } = {}) {
    const res = await api.get('/staff/reports', { params });
    return res.data as StaffReports;
  }

  /** Branches present among this vendor's staff (for report/roster filters). */
  async listBranches() {
    const res = await api.get('/staff/branches');
    return res.data as { docs: StaffBranchOption[] };
  }
}

export const staffService = new StaffService();
