import api from '@/lib/axios';

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  status: 'read' | 'unread';
  createdAt?: string;
}

interface NotificationList {
  docs: AppNotification[];
  totalDocs?: number;
  page?: number;
  totalPages?: number;
  unread?: number;
}

export interface NotificationPage {
  items: AppNotification[];
  page: number;
  pages: number;
  total: number;
  /** Every unread notification for this account, not just this page. */
  unread: number;
}

class NotificationService {
  /** One page of the feed, newest first. */
  async page(params: { page?: number; limit?: number; status?: 'read' | 'unread' } = {}) {
    const res = await api.get('/notifications', { params });
    const body = res.data as NotificationList & { data?: NotificationList };
    const data = body?.docs ? body : (body?.data ?? { docs: [] });
    const items = data.docs ?? [];
    return {
      items,
      page: data.page ?? 1,
      pages: data.totalPages ?? 1,
      total: data.totalDocs ?? items.length,
      unread:
        typeof data.unread === 'number'
          ? data.unread
          : items.filter((n) => n.status === 'unread').length,
    } satisfies NotificationPage;
  }

  /** The bell's short list. */
  async list(limit = 15): Promise<{ items: AppNotification[]; unread: number }> {
    const { items, unread } = await this.page({ limit });
    return { items, unread };
  }

  async markRead(id: string) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  }

  async markAllRead() {
    const res = await api.patch('/notifications/mark-all-read');
    return res.data;
  }

  async remove(id: string) {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  }
}

export const notificationService = new NotificationService();
