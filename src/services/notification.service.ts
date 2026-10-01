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
  unread?: number;
}

class NotificationService {
  async list(limit = 15): Promise<{ items: AppNotification[]; unread: number }> {
    const res = await api.get('/notifications', { params: { limit } });
    const body = res.data as NotificationList & { data?: NotificationList };
    const data = body?.docs ? body : (body?.data ?? { docs: [] });
    const items = data.docs ?? [];
    return { items, unread: items.filter((n) => n.status === 'unread').length };
  }

  async markRead(id: string) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  }

  async markAllRead() {
    const res = await api.patch('/notifications/mark-all-read');
    return res.data;
  }
}

export const notificationService = new NotificationService();
