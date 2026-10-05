import api from '@/lib/axios';

export interface WebhookEndpointDto {
  _id: string;
  url: string;
  description?: string;
  events: string[];
  active: boolean;
  consecutiveFailures: number;
  disabledReason?: string | null;
  lastDeliveryAt?: string | null;
  lastSuccessAt?: string | null;
  createdAt: string;
}

export interface WebhookDeliveryDto {
  _id: string;
  eventId: string;
  topic: string;
  status: 'pending' | 'succeeded' | 'failed' | 'dead';
  attempts: number;
  nextAttemptAt?: string;
  lastStatusCode?: number | null;
  lastError?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface ApiClientDto {
  _id: string;
  name: string;
  clientId: string;
  secretHint?: string;
  scopes: string[];
  active: boolean;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

/** Phase 9: webhooks + partner API clients (managers). */
class IntegrationApi {
  async meta() {
    return unwrap<{ topics: string[]; scopes: string[]; partnerBasePath: string }>(await api.get('/integrations/meta'));
  }
  async webhooks() {
    return unwrap<WebhookEndpointDto[]>(await api.get('/integrations/webhooks'));
  }
  async createWebhook(input: { url: string; events: string[]; description?: string }) {
    return unwrap<{ endpoint: WebhookEndpointDto; secret: string }>(await api.post('/integrations/webhooks', input));
  }
  async updateWebhook(id: string, patch: Partial<{ url: string; events: string[]; description: string; active: boolean }>) {
    return unwrap<WebhookEndpointDto>(await api.patch(`/integrations/webhooks/${id}`, patch));
  }
  async deleteWebhook(id: string) {
    await api.delete(`/integrations/webhooks/${id}`);
  }
  async rotateWebhookSecret(id: string) {
    return unwrap<{ endpoint: WebhookEndpointDto; secret: string }>(await api.post(`/integrations/webhooks/${id}/rotate-secret`));
  }
  async testWebhook(id: string) {
    return unwrap<WebhookDeliveryDto>(await api.post(`/integrations/webhooks/${id}/test`));
  }
  async deliveries(id: string) {
    return unwrap<WebhookDeliveryDto[]>(await api.get(`/integrations/webhooks/${id}/deliveries`));
  }
  async redeliver(deliveryId: string) {
    return unwrap<WebhookDeliveryDto>(await api.post(`/integrations/deliveries/${deliveryId}/redeliver`));
  }
  async apiClients() {
    return unwrap<ApiClientDto[]>(await api.get('/integrations/api-clients'));
  }
  async createApiClient(input: { name: string; scopes: string[] }) {
    return unwrap<{ client: ApiClientDto; clientSecret: string }>(await api.post('/integrations/api-clients', input));
  }
  async rotateApiClient(id: string) {
    return unwrap<{ client: ApiClientDto; clientSecret: string }>(await api.post(`/integrations/api-clients/${id}/rotate`));
  }
  async revokeApiClient(id: string) {
    return unwrap<ApiClientDto>(await api.delete(`/integrations/api-clients/${id}`));
  }
}

export const integrationApi = new IntegrationApi();
