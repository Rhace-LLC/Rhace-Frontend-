import api from '@/lib/axios';

export interface SubscriptionPlanDto {
  _id: string;
  name: string;
  amount: number;
  currency: string;
  intervalMonths: number;
  minTermMonths: number;
  cooldownDays: number;
  graceDays: number;
  vertical: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export type InvoiceStatus = 'draft' | 'pending_payment' | 'paid' | 'void';
export type BillingStatus = 'none' | 'active' | 'past_due' | 'lapsed' | 'cancelled';

export interface BillingInvoiceDto {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  planName: string | null;
  monthsCovered: number;
  periodStart: string | null;
  periodEnd: string | null;
  totalDue: number;
  creditApplied: number;
  taxAmount: number;
  amountReceived: number;
  dueDate: string | null;
  confirmedAt: string | null;
  createdAt: string | null;
  /** Still to pay: total minus credit and any short payments. */
  payable: number;
  failedAttempts: number;
  lastFailureReason: string | null;
  lagCreditDays: number;
}

export interface BillingPreviewDto {
  platformPercentage: number;
  windowDays: number;
  paymentCount: number;
  avgMonthlyVolume: number;
  avgMonthlyPlatformShare: number;
  avgMonthlyFees: number;
}

export interface BillingProjectionDto {
  model: 'percentage' | 'subscription';
  status: BillingStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  autoRenew: boolean;
}

export interface BillingStatusDto {
  billing: BillingProjectionDto | null;
  subscribedCurrent: boolean;
  /** Venue account (owner) — staff get a read-only view. */
  canManage: boolean;
  /** New subscriptions are open to this venue. */
  eligible: boolean;
  commitmentEnd: string | null;
  termsVersion: string;
  availableCredit: number;
  preview: BillingPreviewDto;
  invoices: BillingInvoiceDto[];
}

export interface AdminInvoiceRow {
  _id: string;
  vendor: { _id: string; businessName?: string; email?: string } | string | null;
  kind: 'invoice' | 'credit';
  invoiceNumber?: string;
  status: InvoiceStatus;
  planSnapshot?: { name?: string; amount?: number };
  periodStart?: string | null;
  periodEnd?: string | null;
  totalDue: number;
  creditApplied?: number;
  amountReceived?: number;
  appliedAmount?: number;
  dueDate?: string | null;
  paymentRef?: string | null;
  failedAttempts?: number;
  lastFailureReason?: string | null;
  partialPayments?: { ref: string; amount: number; at: string }[];
  lagCreditDays?: number;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  cancelReason?: string | null;
  createdAt: string;
}

export interface SubscriptionSummaryDto {
  from: string;
  to: string;
  platformPercentage: number;
  months: {
    month: string;
    subscriptionIncome: number;
    subscriptionTax: number;
    invoicesPaid: number;
    percentageTake: number;
    percentagePayments: number;
    subscriptionVolume: number;
    subscriptionPayments: number;
    forgoneTakeEstimate: number;
  }[];
  byVertical: { vertical: string; subscriptionIncome: number; percentageTake: number; forgoneTakeEstimate: number }[];
  totals: { subscriptionIncome: number; percentageTake: number; forgoneTakeEstimate: number; platformIncome: number };
  statuses: Record<string, number>;
  pendingInvoices: { count: number; oldestAgeDays: number | null; amount: number; withFailedPayments: number };
  attention: {
    vendorId: string;
    businessName: string;
    status: BillingStatus;
    currentPeriodEnd: string | null;
    graceUntil: string | null;
  }[];
}

export interface VendorTimelineDto {
  vendor: { _id: string; businessName?: string; email?: string; billing?: BillingProjectionDto };
  availableCredit: number;
  rows: AdminInvoiceRow[];
}

export type SupportAction = 'activate' | 'extend' | 'cancel';

class BillingService {
  // ─── Vendor ───────────────────────────────────────────────────────────
  async listPlans() {
    const res = await api.get('/billing/plans');
    return res.data as { success: boolean; data: SubscriptionPlanDto[]; termsVersion: string };
  }

  async subscribe(planId: string, callbackUrl: string) {
    const res = await api.post('/billing/subscribe', {
      planId,
      acceptTerms: true,
      callbackUrl,
    });
    return res.data as {
      success: boolean;
      /** `checkoutUrl` is null when credit covered the invoice and it activated at once. */
      data: { invoiceId: string; invoiceNumber: string; totalDue: number; creditApplied: number; checkoutUrl: string | null };
    };
  }

  async mySubscription() {
    const res = await api.get('/billing/subscription');
    return res.data as { success: boolean; data: BillingStatusDto };
  }

  async cancel(reason?: string) {
    const res = await api.post('/billing/subscription/cancel', { reason });
    return res.data;
  }

  async payInvoice(invoiceId: string, callbackUrl: string) {
    const res = await api.post(`/billing/invoices/${invoiceId}/pay`, { callbackUrl });
    return res.data as { success: boolean; data: { invoiceId: string; checkoutUrl: string } };
  }

  // ─── Admin ────────────────────────────────────────────────────────────
  async adminListPlans() {
    const res = await api.get('/billing/admin/plans');
    return res.data as { success: boolean; data: SubscriptionPlanDto[]; termsVersion: string };
  }

  async adminCreatePlan(input: {
    name: string;
    amount: number;
    minTermMonths: number;
    cooldownDays: number;
    graceDays: number;
    vertical: string | null;
  }) {
    const res = await api.post('/billing/admin/plans', input);
    return res.data as { success: boolean; data: SubscriptionPlanDto };
  }

  async adminDeactivatePlan(planId: string) {
    const res = await api.patch(`/billing/admin/plans/${planId}/deactivate`);
    return res.data as { success: boolean; data: SubscriptionPlanDto };
  }

  async adminSummary(months = 6) {
    const res = await api.get('/billing/admin/summary', { params: { months } });
    return res.data as { success: boolean; data: SubscriptionSummaryDto };
  }

  async adminInvoices(params: { status?: string; kind?: string; vendorId?: string; page?: number; limit?: number } = {}) {
    const res = await api.get('/billing/admin/invoices', { params });
    return res.data as {
      success: boolean;
      data: AdminInvoiceRow[];
      pagination: { total: number; page: number; limit: number; pages: number };
    };
  }

  async adminVendorTimeline(vendorId: string) {
    const res = await api.get(`/billing/admin/vendors/${vendorId}`);
    return res.data as { success: boolean; data: VendorTimelineDto };
  }

  async adminSupportAction(
    vendorId: string,
    input: { action: SupportAction; reason: string; days?: number; invoiceId?: string }
  ) {
    const res = await api.post(`/billing/admin/vendors/${vendorId}/actions`, input);
    return res.data as { success: boolean };
  }
}

export const billingService = new BillingService();
