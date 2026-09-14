import api from '@/lib/axios';
import type {
  ApiEnvelope,
  BookingGroupView,
  Paginated,
  ReservationCounters,
  ReservationFilters,
  ReservationView,
  UnitSummary,
} from '../types';

const toParams = (filters?: ReservationFilters): Record<string, unknown> | undefined => {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  );
};

/** Canonical reservations API for the UnitReservation / BookingGroup engine. */
class ReservationsApi {
  /** Vendor / admin scoped list. */
  async list(filters?: ReservationFilters) {
    const res = await api.get<ApiEnvelope<Paginated<ReservationView>>>('/reservations/unit', {
      params: toParams(filters),
    });
    return res.data;
  }

  /** Customer-scoped list (own reservations). */
  async mine(filters?: ReservationFilters) {
    const res = await api.get<ApiEnvelope<Paginated<ReservationView>>>('/reservations/me', {
      params: toParams(filters),
    });
    return res.data;
  }

  async get(id: string) {
    const res = await api.get<ApiEnvelope<ReservationView>>(`/reservations/unit/${id}`);
    return res.data;
  }

  async getMine(id: string) {
    const res = await api.get<ApiEnvelope<ReservationView>>(`/reservations/me/${id}`);
    return res.data;
  }

  async cancel(id: string) {
    const res = await api.delete<ApiEnvelope<ReservationView>>(`/reservations/${id}/unit`);
    return res.data;
  }

  async cancelMine(id: string) {
    const res = await api.delete<ApiEnvelope<ReservationView>>(`/reservations/me/${id}`);
    return res.data;
  }

  async checkIn(id: string) {
    const res = await api.post<ApiEnvelope<{ reservation: ReservationView }>>(
      `/reservations/${id}/check-in`
    );
    return res.data;
  }

  async checkOut(id: string) {
    const res = await api.post<ApiEnvelope<{ reservation: ReservationView }>>(
      `/reservations/${id}/check-out`
    );
    return res.data;
  }

  async reassign(id: string, targetUnitId: string) {
    const res = await api.post<ApiEnvelope<ReservationView>>(`/reservations/${id}/reassign`, {
      targetUnitId,
    });
    return res.data;
  }

  async counters(filters?: ReservationFilters) {
    const res = await api.get<ApiEnvelope<ReservationCounters>>('/reservations/unit/counters', {
      params: toParams(filters),
    });
    return res.data;
  }

  async groups(filters?: ReservationFilters) {
    const res = await api.get<ApiEnvelope<Paginated<BookingGroupView>>>('/booking-groups', {
      params: toParams(filters),
    });
    return res.data;
  }

  async group(id: string) {
    const res = await api.get<ApiEnvelope<BookingGroupView>>(`/booking-groups/${id}`);
    return res.data;
  }

  async summary(params?: { vendorId?: string }) {
    const res = await api.get<ApiEnvelope<UnitSummary>>('/dashboard/unit-summary', {
      params,
    });
    return res.data;
  }

  async payIntent(groupId: string, strategy?: string) {
    const res = await api.post<
      ApiEnvelope<{ authorization_url: string; access_code: string; ref: string; amount: number }>
    >(`/payments/group/${groupId}/intent`, { strategy });
    return res.data;
  }

  async recordOfflinePayment(
    groupId: string,
    body: { amount: number; method: string; reference?: string; note?: string }
  ) {
    const res = await api.post<ApiEnvelope<{ paymentId: string; paymentStatus: string }>>(
      `/payments/group/${groupId}/offline-payment`,
      body
    );
    return res.data;
  }
}

export const reservationsApi = new ReservationsApi();
