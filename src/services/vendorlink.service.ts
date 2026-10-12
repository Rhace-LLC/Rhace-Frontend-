import api from '@/lib/axios';

export interface VendorLinkDto {
  _id: string;
  hotelVendor: string;
  partnerVendor?: string | null;
  outletName?: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  scopes: string[];
  invitedEmail?: string | null;
  commission: { kind: 'percent' | 'flat'; value: number; appliesTo: 'food' | 'all' };
  settlement: { cycle: 'daily' | 'weekly'; method: 'payout' | 'manual' };
  defaultPrepEtaMins: number;
  approvedAt?: string | null;
  createdAt?: string;
  /** Business name of the other side (partner for a hotel, hotel for a partner). */
  counterpartName?: string | null;
}

export interface DeliveryZoneDto {
  _id: string;
  name: string;
  kind: 'rooms' | 'common_area';
  unitIds: string[];
  labelRange?: { from?: string; to?: string };
  outlets: Array<{ vendorLink: string; dispatchPoint?: string; etaMins?: number }>;
  allowsScheduled: boolean;
  active: boolean;
}

export interface OrderingWindowDto {
  _id: string;
  vendorLink?: string | null;
  name: string;
  days: string[];
  start: string;
  end: string;
  mode: 'allow' | 'block';
  priority: number;
  active: boolean;
}

export interface FeeRuleDto {
  _id: string;
  label: string;
  kind: 'flat' | 'percent';
  value: number;
  scope: { vendorLinks: string[]; sources: string[]; fulfillment: string[] };
  beneficiary: 'hotel' | 'partner';
  active: boolean;
  order: number;
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

class VendorLinkApi {
  // Hotel
  async pairingCode(outletName?: string) {
    const res = await api.post('/vendor-links/pairing-code', { outletName });
    return unwrap<{ link: VendorLinkDto; code: string; expiresAt: string }>(res);
  }
  async invite(input: { email?: string; partnerVendorId?: string; outletName?: string }) {
    const res = await api.post('/vendor-links/invite', input);
    return unwrap<{ link: VendorLinkDto }>(res);
  }
  async hotelLinks(): Promise<VendorLinkDto[]> {
    const res = await api.get('/vendor-links');
    return unwrap<VendorLinkDto[]>(res);
  }
  async updateLink(id: string, patch: Record<string, unknown>): Promise<VendorLinkDto> {
    const res = await api.patch(`/vendor-links/${id}`, patch);
    return unwrap<VendorLinkDto>(res);
  }
  async revokeLink(id: string): Promise<VendorLinkDto> {
    const res = await api.delete(`/vendor-links/${id}`);
    return unwrap<VendorLinkDto>(res);
  }
  // Restaurant
  async redeem(code: string, scopes?: string[]) {
    const res = await api.post('/vendor-links/redeem', { code, scopes });
    return unwrap<{ link: VendorLinkDto }>(res);
  }
  async partnerLinks(): Promise<VendorLinkDto[]> {
    const res = await api.get('/vendor-links/partner/links');
    return unwrap<VendorLinkDto[]>(res);
  }
  async approveLink(id: string, scopes?: string[]): Promise<VendorLinkDto> {
    const res = await api.post(`/vendor-links/${id}/approve`, { scopes });
    return unwrap<VendorLinkDto>(res);
  }
  async declineLink(id: string): Promise<VendorLinkDto> {
    const res = await api.post(`/vendor-links/${id}/decline`);
    return unwrap<VendorLinkDto>(res);
  }
  async linkZones(id: string) {
    const res = await api.get(`/vendor-links/${id}/zones`);
    return unwrap<DeliveryZoneDto[]>(res);
  }
  // Zones
  async zones(): Promise<DeliveryZoneDto[]> {
    const res = await api.get('/vendor-links/zones/all');
    return unwrap<DeliveryZoneDto[]>(res);
  }
  async createZone(input: Record<string, unknown>): Promise<DeliveryZoneDto> {
    const res = await api.post('/vendor-links/zones', input);
    return unwrap<DeliveryZoneDto>(res);
  }
  async updateZone(id: string, patch: Record<string, unknown>): Promise<DeliveryZoneDto> {
    const res = await api.patch(`/vendor-links/zones/${id}`, patch);
    return unwrap<DeliveryZoneDto>(res);
  }
  async deleteZone(id: string): Promise<void> {
    await api.delete(`/vendor-links/zones/${id}`);
  }
  // Windows — no arg: every window; '' : hotel services only; id: one outlet.
  async windows(vendorLink?: string): Promise<OrderingWindowDto[]> {
    const res = await api.get('/vendor-links/windows/all', {
      params: vendorLink !== undefined ? { vendorLink } : undefined,
    });
    return unwrap<OrderingWindowDto[]>(res);
  }
  async createWindow(input: Record<string, unknown>): Promise<OrderingWindowDto> {
    const res = await api.post('/vendor-links/windows', input);
    return unwrap<OrderingWindowDto>(res);
  }
  async updateWindow(id: string, patch: Record<string, unknown>): Promise<OrderingWindowDto> {
    const res = await api.patch(`/vendor-links/windows/${id}`, patch);
    return unwrap<OrderingWindowDto>(res);
  }
  async deleteWindow(id: string): Promise<void> {
    await api.delete(`/vendor-links/windows/${id}`);
  }
  // Fees
  async fees(): Promise<FeeRuleDto[]> {
    const res = await api.get('/vendor-links/fees/all');
    return unwrap<FeeRuleDto[]>(res);
  }
  async createFee(input: Record<string, unknown>): Promise<FeeRuleDto> {
    const res = await api.post('/vendor-links/fees', input);
    return unwrap<FeeRuleDto>(res);
  }
  async updateFee(id: string, patch: Record<string, unknown>): Promise<FeeRuleDto> {
    const res = await api.patch(`/vendor-links/fees/${id}`, patch);
    return unwrap<FeeRuleDto>(res);
  }
  async deleteFee(id: string): Promise<void> {
    await api.delete(`/vendor-links/fees/${id}`);
  }
  async previewFees(input: {
    subtotal: number;
    source: 'linked' | 'hotel';
    fulfillmentMode: 'room' | 'location';
    vendorLinkId?: string;
  }) {
    const res = await api.post('/vendor-links/fees/preview', input);
    return unwrap<{ fees: Array<{ label: string; amount: number; beneficiary: string }> }>(res);
  }
}

export const vendorLinkApi = new VendorLinkApi();
