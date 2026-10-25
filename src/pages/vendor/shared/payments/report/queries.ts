import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  paymentService,
  type BreakdownDimension,
  type ReportParams,
  type TimeseriesMetric,
  type TransactionQuery,
} from '@/services/payment.service';

const STALE = 60_000;
const base = ['payments-report'] as const;

/** One query per card, so each loads and fails on its own. */
export const useReportSummary = (params: ReportParams) =>
  useQuery({
    queryKey: [...base, 'summary', params],
    queryFn: () => paymentService.getReportSummary(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });

export const useReportTimeseries = (params: ReportParams, metric: TimeseriesMetric) =>
  useQuery({
    queryKey: [...base, 'timeseries', params, metric],
    queryFn: () => paymentService.getReportTimeseries({ ...params, metric }),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });

export const useReportBreakdown = (params: ReportParams, by: BreakdownDimension) =>
  useQuery({
    queryKey: [...base, 'breakdown', params, by],
    queryFn: () => paymentService.getReportBreakdown({ ...params, by }),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });

export const useTransactions = (query: TransactionQuery) =>
  useQuery({
    queryKey: [...base, 'transactions', query],
    queryFn: () => paymentService.getTransactions(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

export const useTransaction = (id: string | null) =>
  useQuery({
    queryKey: [...base, 'transaction', id],
    queryFn: () => paymentService.getTransaction(id as string),
    enabled: Boolean(id),
  });

export const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
