import api from '@/lib/axios';
import type {
  ConfirmHoldInput,
  CreateUnitReservationInput,
  FloorPlanApiEnvelope,
  HoldUnitInput,
  HoldUnitResultDto,
  PaginatedData,
  UnitReservationDto,
} from '@/types';

/** Canonical unit-reservation engine (PhysicalUnit migration). */
class UnitReservationService {
  async hold(input: HoldUnitInput, idempotencyKey?: string) {
    const res = await api.post<FloorPlanApiEnvelope<HoldUnitResultDto>>('/bookings/hold', input, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return res.data;
  }

  async confirm(input: ConfirmHoldInput) {
    const res = await api.post<FloorPlanApiEnvelope<UnitReservationDto>>('/bookings/confirm', input, {
      headers: input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : undefined,
    });
    return res.data;
  }

  async heartbeatLock(token: string) {
    const res = await api.post<FloorPlanApiEnvelope<{ expiresAt: string }>>(
      `/locks/${token}/heartbeat`
    );
    return res.data;
  }

  async releaseLock(token: string) {
    const res = await api.delete<FloorPlanApiEnvelope<{ token: string }>>(`/locks/${token}`);
    return res.data;
  }

  async create(input: CreateUnitReservationInput) {
    const res = await api.post<FloorPlanApiEnvelope<UnitReservationDto>>('/reservations', input);
    return res.data;
  }

  async list(params?: {
    floorPlanId?: string;
    unitId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get<FloorPlanApiEnvelope<PaginatedData<UnitReservationDto>>>(
      '/reservations/unit',
      { params }
    );
    return res.data;
  }

  async get(reservationId: string) {
    const res = await api.get<FloorPlanApiEnvelope<UnitReservationDto>>(
      `/reservations/unit/${reservationId}`
    );
    return res.data;
  }

  async quarantine(params?: { page?: number; limit?: number }) {
    const res = await api.get<FloorPlanApiEnvelope<PaginatedData<UnitReservationDto>>>(
      '/reservations/quarantine',
      { params }
    );
    return res.data;
  }

  async reassign(reservationId: string, targetUnitId: string) {
    const res = await api.post<FloorPlanApiEnvelope<UnitReservationDto>>(
      `/reservations/${reservationId}/reassign`,
      { targetUnitId }
    );
    return res.data;
  }

  async checkIn(reservationId: string) {
    const res = await api.post<FloorPlanApiEnvelope<{ reservation: UnitReservationDto }>>(
      `/reservations/${reservationId}/check-in`
    );
    return res.data;
  }

  async checkOut(reservationId: string) {
    const res = await api.post<FloorPlanApiEnvelope<{ reservation: UnitReservationDto }>>(
      `/reservations/${reservationId}/check-out`
    );
    return res.data;
  }

  async cancel(reservationId: string) {
    const res = await api.delete<FloorPlanApiEnvelope<UnitReservationDto>>(
      `/reservations/${reservationId}/unit`
    );
    return res.data;
  }
}

export const unitReservationService = new UnitReservationService();
