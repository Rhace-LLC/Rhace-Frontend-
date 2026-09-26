import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from './service';
import { catalogService } from '@/services/catalog.service';
import type { CreateOrderInput } from '../types';

export const orderKeys = {
  all: ['orders'] as const,
  byReservation: (reservationId: string) =>
    [...orderKeys.all, 'by-reservation', reservationId] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  catalog: (vendorId: string) => ['catalog', vendorId] as const,
};

export function useOrderByReservation(reservationId?: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.byReservation(reservationId ?? ''),
    queryFn: async () => (await ordersApi.getByReservation(reservationId as string)).order,
    enabled: Boolean(reservationId) && enabled,
  });
}

/** The signed-in customer's own orders (backend scopes `user` role by customerId). */
export function useMyOrders(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...orderKeys.all, 'mine', params ?? {}] as const,
    queryFn: async () => ordersApi.list({ withLines: true, limit: 50, ...params }),
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: async () => ordersApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useOrderIntent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => ordersApi.intent(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

/** Mint a signed QR token for a unit (vendor). */
export function useQrToken() {
  return useMutation({
    mutationFn: (unitId: string) => ordersApi.createQrToken(unitId),
  });
}

export function useVendorDishes(vendorId?: string) {
  return useQuery({
    queryKey: [...orderKeys.catalog(vendorId ?? ''), 'dishes'] as const,
    queryFn: async () => catalogService.getDishes(vendorId as string),
    enabled: Boolean(vendorId),
  });
}

export function useVendorDrinks(vendorId?: string) {
  return useQuery({
    queryKey: [...orderKeys.catalog(vendorId ?? ''), 'drinks'] as const,
    queryFn: async () => catalogService.getDrinks(vendorId as string),
    enabled: Boolean(vendorId),
  });
}

export function useVendorBottleSets(vendorId?: string) {
  return useQuery({
    queryKey: [...orderKeys.catalog(vendorId ?? ''), 'bottle-sets'] as const,
    queryFn: async () => catalogService.getBottleSets(vendorId as string),
    enabled: Boolean(vendorId),
  });
}
