import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { floorPlanService } from '@/services/floorPlan.service';
import { inventoryBlueprintService } from '@/services/inventoryBlueprint.service';
import { physicalUnitService } from '@/services/physicalUnit.service';
import { canvasStructureService } from '@/services/canvasStructure.service';
import { unitReservationService } from '@/services/unitReservation.service';
import { floorPlanKeys } from './keys';
import type {
  BatchUnitStatusInput,
  BulkEntitiesInput,
  ConfirmHoldInput,
  CreateBlueprintInput,
  CreateFloorPlanInput,
  CreateStructureInput,
  CreateUnitInput,
  CreateUnitReservationInput,
  HoldUnitInput,
  UnitStatusInput,
  UpdateBlueprintInput,
  UpdateFloorPlanInput,
  UpdateStructureInput,
  UpdateUnitInput,
} from '@/types';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useFloorPlans(vertical?: string) {
  return useQuery({
    queryKey: floorPlanKeys.list(vertical),
    queryFn: async () => (await floorPlanService.list({ vertical })).data,
    enabled: !!vertical,
  });
}

export function useFloorPlanLayout(planId?: string) {
  return useQuery({
    queryKey: floorPlanKeys.layout(planId ?? ''),
    queryFn: async () => (await floorPlanService.getLayout(planId as string)).data,
    enabled: !!planId,
  });
}

export function useBlueprints(vertical?: string) {
  return useQuery({
    queryKey: floorPlanKeys.blueprints(vertical),
    queryFn: async () =>
      (await inventoryBlueprintService.list({ vertical, includeSystem: true, limit: 100 })).data,
    enabled: !!vertical,
  });
}

export function usePhysicalUnits(
  planId?: string,
  filters?: { floor?: string; area?: string; blueprintId?: string; state?: string }
) {
  return useQuery({
    queryKey: floorPlanKeys.units(planId ?? '', filters),
    queryFn: async () => (await physicalUnitService.list(planId as string, filters)).data,
    enabled: !!planId,
  });
}

export function usePhysicalUnit(unitId?: string) {
  return useQuery({
    queryKey: floorPlanKeys.unit(unitId ?? ''),
    queryFn: async () => (await physicalUnitService.get(unitId as string)).data,
    enabled: !!unitId,
  });
}

export function useUnitActivity(unitId?: string, limit = 50) {
  return useQuery({
    queryKey: floorPlanKeys.unitActivity(unitId ?? ''),
    queryFn: async () => (await physicalUnitService.activity(unitId as string, limit)).data,
    enabled: !!unitId,
  });
}

export function useFloorPlanAudit(planId?: string, limit = 100) {
  return useQuery({
    queryKey: floorPlanKeys.audit(planId ?? ''),
    queryFn: async () => (await floorPlanService.audit(planId as string, { limit })).data,
    enabled: !!planId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function useInvalidateFloorPlan() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: floorPlanKeys.all });
}

export function useCreateFloorPlan() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (input: CreateFloorPlanInput) => floorPlanService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFloorPlan() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFloorPlanInput }) =>
      floorPlanService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFloorPlan() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (id: string) => floorPlanService.remove(id),
    onSuccess: invalidate,
  });
}

export function useAddFloorPlanArea() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => floorPlanService.addArea(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteFloorPlanArea() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      floorPlanService.deleteArea(id, name),
    onSuccess: invalidate,
  });
}

export function useAddFloorPlanFloor() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, name, area }: { id: string; name: string; area?: string }) =>
      floorPlanService.addFloor(id, { name, area }),
    onSuccess: invalidate,
  });
}

export function useDeleteFloorPlanFloor() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, name, area }: { id: string; name: string; area?: string }) =>
      floorPlanService.deleteFloor(id, name, area),
    onSuccess: invalidate,
  });
}

export function useBulkUpdateEntities() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BulkEntitiesInput }) =>
      floorPlanService.bulkUpdateEntities(id, input),
    onSuccess: invalidate,
  });
}

export function useCreateStructure() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateStructureInput }) =>
      floorPlanService.createStructure(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateStructure() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ structureId, input }: { structureId: string; input: UpdateStructureInput }) =>
      canvasStructureService.update(structureId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteStructure() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (structureId: string) => canvasStructureService.remove(structureId),
    onSuccess: invalidate,
  });
}

export function useCreateBlueprint() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (input: CreateBlueprintInput) => inventoryBlueprintService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateBlueprint() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBlueprintInput }) =>
      inventoryBlueprintService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteBlueprint() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (id: string) => inventoryBlueprintService.remove(id),
    onSuccess: invalidate,
  });
}

export function useCreateUnit() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: CreateUnitInput }) =>
      physicalUnitService.create(planId, input),
    onSuccess: invalidate,
  });
}

export function useCreateUnitsBatch() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ planId, units }: { planId: string; units: CreateUnitInput[] }) =>
      physicalUnitService.createBatch(planId, units),
    onSuccess: invalidate,
  });
}

export function useUpdateUnit() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ unitId, input }: { unitId: string; input: UpdateUnitInput }) =>
      physicalUnitService.update(unitId, input),
    onSuccess: invalidate,
  });
}

export function useTransitionUnitStatus() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ unitId, input }: { unitId: string; input: UnitStatusInput }) =>
      physicalUnitService.transitionStatus(unitId, input),
    onSuccess: invalidate,
  });
}

export function useBatchUpdateUnitStatus() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: BatchUnitStatusInput }) =>
      physicalUnitService.batchUpdateStatus(planId, input),
    onSuccess: invalidate,
  });
}

export function useDuplicateUnit() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (unitId: string) => physicalUnitService.duplicate(unitId),
    onSuccess: invalidate,
  });
}

export function useDeleteUnit() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ unitId, force }: { unitId: string; force?: boolean }) =>
      physicalUnitService.remove(unitId, force),
    onSuccess: invalidate,
  });
}

// ─── Availability / timeline ──────────────────────────────────────────────────

export function useFloorPlanAvailability(
  planId?: string,
  params?: { blueprintId?: string; start?: string; end?: string; floor?: string; area?: string }
) {
  return useQuery({
    queryKey: [...floorPlanKeys.detail(planId ?? ''), 'availability', params ?? {}] as const,
    queryFn: async () => (await floorPlanService.getAvailability(planId as string, params)).data,
    enabled: !!planId,
  });
}

export function useFloorPlanTimeline(
  planId?: string,
  params?: { start?: string; end?: string; blueprintId?: string; floor?: string; area?: string }
) {
  return useQuery({
    queryKey: [...floorPlanKeys.detail(planId ?? ''), 'timeline', params ?? {}] as const,
    queryFn: async () => (await floorPlanService.getTimeline(planId as string, params)).data,
    enabled: !!planId,
  });
}

// ─── Unit reservations (canonical engine) ─────────────────────────────────────

export function useHoldUnit() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: HoldUnitInput; idempotencyKey?: string }) =>
      unitReservationService.hold(input, idempotencyKey),
    onSuccess: invalidate,
  });
}

export function useConfirmHold() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (input: ConfirmHoldInput) => unitReservationService.confirm(input),
    onSuccess: invalidate,
  });
}

export function useCreateUnitReservation() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (input: CreateUnitReservationInput) => unitReservationService.create(input),
    onSuccess: invalidate,
  });
}

export function useReassignUnitReservation() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: ({ reservationId, targetUnitId }: { reservationId: string; targetUnitId: string }) =>
      unitReservationService.reassign(reservationId, targetUnitId),
    onSuccess: invalidate,
  });
}

export function useCheckInUnitReservation() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (reservationId: string) => unitReservationService.checkIn(reservationId),
    onSuccess: invalidate,
  });
}

export function useCheckOutUnitReservation() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (reservationId: string) => unitReservationService.checkOut(reservationId),
    onSuccess: invalidate,
  });
}

export function useCancelUnitReservation() {
  const invalidate = useInvalidateFloorPlan();
  return useMutation({
    mutationFn: (reservationId: string) => unitReservationService.cancel(reservationId),
    onSuccess: invalidate,
  });
}

export function useUnitReservations(params?: {
  floorPlanId?: string;
  unitId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...floorPlanKeys.all, 'unit-reservations', params ?? {}] as const,
    queryFn: async () => (await unitReservationService.list(params)).data,
  });
}

export function useQuarantinedReservations(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...floorPlanKeys.all, 'quarantine', params ?? {}] as const,
    queryFn: async () => (await unitReservationService.quarantine(params)).data,
  });
}
