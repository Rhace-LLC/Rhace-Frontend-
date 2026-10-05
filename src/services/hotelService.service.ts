import api from '@/lib/axios';
import { guestApi } from './stay.service';

export type ServiceKind = 'amenity' | 'experience';
export type ServiceRoute = 'housekeeping' | 'front_desk' | 'concierge' | 'spa' | 'maintenance';

export interface HotelServiceItemDto {
  _id: string;
  kind: ServiceKind;
  name: string;
  description?: string;
  images?: string[];
  price: number;
  categoryId?: string | null;
  routeTo: ServiceRoute;
  maxPerOrder: number;
  stock?: number | null;
  trackStock?: boolean;
  experience?: {
    durationMins: number;
    capacityPerSlot: number;
    slotIntervalMins: number;
    leadTimeMins: number;
    dayStart: string;
    dayEnd: string;
  } | null;
  active: boolean;
}

export interface HotelServiceInput {
  kind: ServiceKind;
  name: string;
  description?: string;
  price: number;
  categoryId?: string | null;
  routeTo: ServiceRoute;
  maxPerOrder?: number;
  trackStock?: boolean;
  stock?: number | null;
  active?: boolean;
  experience?: {
    durationMins: number;
    capacityPerSlot: number;
    slotIntervalMins: number;
    leadTimeMins?: number;
    dayStart?: string;
    dayEnd?: string;
  } | null;
}

export interface SlotDto {
  start: string;
  end: string;
  remaining: number;
  capacity: number;
}

export interface ServiceBookingDto {
  _id: string;
  serviceItem: string;
  start: string;
  end: string;
  status: 'held' | 'confirmed' | 'completed' | 'cancelled';
  assignedStaff?: string | null;
  guestName?: string;
  order?: string | null;
}

export interface ServiceRequestDto {
  _id: string;
  orderId: string;
  name: string;
  quantity: number;
  notes: string | null;
  routeTo: string | null;
  prepStatus: string;
  createdAt: string;
  orderStatus: string | null;
  guestName: string | null;
  reservationId: string | null;
  unitId: string | null;
  serviceBooking: unknown;
}

export interface StayCatalogOutletItem {
  _id: string;
  kind: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  categoryId: string | null;
  maxPerOrder: number;
  schedulable: boolean;
}

export interface StayCatalog {
  sources: Array<
    | {
        type: 'hotel';
        categories: Array<{ _id: string; name: string }>;
        items: Array<{
          _id: string;
          kind: ServiceKind;
          name: string;
          description?: string;
          price: number;
          images: string[];
          categoryId: string | null;
          routeTo: ServiceRoute;
          maxPerOrder: number;
          schedulable: boolean;
        }>;
      }
    | {
        type: 'outlet';
        vendorLink: string;
        outletName: string;
        partnerVendor: string;
        open: boolean;
        reason: string | null;
        etaMins: number;
        categories: Array<{ _id: string; name: string }>;
        items: StayCatalogOutletItem[];
      }
  >;
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

class HotelServiceApi {
  async list(kind?: ServiceKind, includeInactive = true): Promise<HotelServiceItemDto[]> {
    const res = await api.get('/hotel-services', {
      params: { ...(kind ? { kind } : {}), ...(includeInactive ? { includeInactive: true } : {}) },
    });
    return unwrap<HotelServiceItemDto[]>(res);
  }
  async create(input: HotelServiceInput): Promise<HotelServiceItemDto> {
    const res = await api.post('/hotel-services', input);
    return unwrap<HotelServiceItemDto>(res);
  }
  async update(id: string, patch: Partial<HotelServiceInput>): Promise<HotelServiceItemDto> {
    const res = await api.patch(`/hotel-services/${id}`, patch);
    return unwrap<HotelServiceItemDto>(res);
  }
  async remove(id: string): Promise<void> {
    await api.delete(`/hotel-services/${id}`);
  }
  async slots(id: string, date: string): Promise<SlotDto[]> {
    const res = await api.get(`/hotel-services/${id}/slots`, { params: { date } });
    return unwrap<SlotDto[]>(res);
  }
  async bookings(params?: { from?: string; to?: string; status?: string }): Promise<ServiceBookingDto[]> {
    const res = await api.get('/hotel-services/bookings/all', { params });
    return unwrap<ServiceBookingDto[]>(res);
  }
  async updateBooking(
    id: string,
    input: { status: 'confirmed' | 'completed' | 'cancelled'; assignedStaff?: string | null },
  ): Promise<ServiceBookingDto> {
    const res = await api.patch(`/hotel-services/bookings/${id}`, input);
    return unwrap<ServiceBookingDto>(res);
  }
  /** Lane-board feed: recent hotel-service request lines. */
  async requestsFeed(routeTo?: string): Promise<ServiceRequestDto[]> {
    const res = await api.get('/hotel-services/requests/feed', {
      params: routeTo ? { routeTo } : undefined,
    });
    return unwrap<ServiceRequestDto[]>(res);
  }
  /** Guest: unified in-house catalog for the verified stay. */
  async guestCatalog(): Promise<StayCatalog> {
    const res = await guestApi.get('/stay/catalog');
    return unwrap<StayCatalog>(res);
  }
}

export const hotelServiceApi = new HotelServiceApi();
