export const reservationKeys = {
  all: ['reservations'] as const,
  list: (filters?: unknown) => ['reservations', 'list', filters ?? {}] as const,
  mine: (filters?: unknown) => ['reservations', 'mine', filters ?? {}] as const,
  detail: (id: string) => ['reservations', 'detail', id] as const,
  mineDetail: (id: string) => ['reservations', 'mine-detail', id] as const,
  counters: (filters?: unknown) => ['reservations', 'counters', filters ?? {}] as const,
  groups: (filters?: unknown) => ['reservations', 'groups', filters ?? {}] as const,
  group: (id: string) => ['reservations', 'group', id] as const,
  summary: (params?: unknown) => ['reservations', 'summary', params ?? {}] as const,
};
