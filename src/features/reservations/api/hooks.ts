import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from './service';
import { reservationKeys } from './keys';
import type { ReservationFilters } from '../types';

interface QueryOptions {
  enabled?: boolean;
}

const useInvalidateReservations = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: reservationKeys.all });
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useReservations(filters?: ReservationFilters, options?: QueryOptions) {
  return useQuery({
    queryKey: reservationKeys.list(filters),
    queryFn: async () => (await reservationsApi.list(filters)).data,
    enabled: options?.enabled ?? true,
  });
}

export function useMyReservations(filters?: ReservationFilters, options?: QueryOptions) {
  return useQuery({
    queryKey: reservationKeys.mine(filters),
    queryFn: async () => (await reservationsApi.mine(filters)).data,
    enabled: options?.enabled ?? true,
  });
}

export function useReservation(id?: string) {
  return useQuery({
    queryKey: reservationKeys.detail(id ?? ''),
    queryFn: async () => (await reservationsApi.get(id as string)).data,
    enabled: !!id,
  });
}

export function useMyReservation(id?: string) {
  return useQuery({
    queryKey: reservationKeys.mineDetail(id ?? ''),
    queryFn: async () => (await reservationsApi.getMine(id as string)).data,
    enabled: !!id,
  });
}

export function useReservationCounters(filters?: ReservationFilters, options?: QueryOptions) {
  return useQuery({
    queryKey: reservationKeys.counters(filters),
    queryFn: async () => (await reservationsApi.counters(filters)).data,
    enabled: options?.enabled ?? true,
  });
}

export function useBookingGroups(filters?: ReservationFilters, options?: QueryOptions) {
  return useQuery({
    queryKey: reservationKeys.groups(filters),
    queryFn: async () => (await reservationsApi.groups(filters)).data,
    enabled: options?.enabled ?? true,
  });
}

export function useBookingGroup(id?: string) {
  return useQuery({
    queryKey: reservationKeys.group(id ?? ''),
    queryFn: async () => (await reservationsApi.group(id as string)).data,
    enabled: !!id,
  });
}

export function useUnitSummary(params?: { vendorId?: string }, options?: QueryOptions) {
  return useQuery({
    queryKey: reservationKeys.summary(params),
    queryFn: async () => (await reservationsApi.summary(params)).data,
    enabled: options?.enabled ?? true,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCancelReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: invalidate,
  });
}

export function useCancelMyReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.cancelMine(id),
    onSuccess: invalidate,
  });
}

export function useCheckInReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.checkIn(id),
    onSuccess: invalidate,
  });
}

export function useCheckOutReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.checkOut(id),
    onSuccess: invalidate,
  });
}

export function useReassignReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: ({ id, targetUnitId }: { id: string; targetUnitId: string }) =>
      reservationsApi.reassign(id, targetUnitId),
    onSuccess: invalidate,
  });
}

export function useRecordOfflinePayment() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: ({
      groupId,
      body,
    }: {
      groupId: string;
      body: { amount: number; method: string; reference?: string; note?: string };
    }) => reservationsApi.recordOfflinePayment(groupId, body),
    onSuccess: invalidate,
  });
}

/** Creates a Paystack intent for a group and returns the redirect URL. */
export function usePayBalance() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: ({ groupId, strategy }: { groupId: string; strategy?: string }) =>
      reservationsApi.payIntent(groupId, strategy),
    onSuccess: invalidate,
  });
}
