import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipboardList, Loader2, RefreshCw, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/features/orders/api/service';
import type { OrderDto, OrderItemType } from '@/features/orders/types';
import { staffService, type StaffAssignmentDto } from '@/services/staff.service';
import type { StockItemKind } from '@/services/stock.service';
import { slugForStaffRole, staffRoleLabel } from './roles';
import TicketBoard from './components/TicketBoard';
import Item86Panel from './components/Item86Panel';
import WaiterWorkspace from './components/WaiterWorkspace';
import VipHostWorkspace from './components/VipHostWorkspace';
import FrontDeskWorkspace from './components/FrontDeskWorkspace';
import HousekeepingWorkspace from './components/HousekeepingWorkspace';

/**
 * Stations that work a line-level ticket queue. Each one sees only the lines it
 * owns, so a bar ticket clears without waiting on the kitchen.
 */
const STATIONS: Record<
  string,
  { title: string; itemTypes: OrderItemType[]; stock: StockItemKind[]; addOnAlert?: boolean }
> = {
  chef: { title: 'Kitchen Display', itemTypes: ['dish'], stock: ['dish'] },
  bartender: { title: 'Bar Tickets', itemTypes: ['drink', 'bottle_set'], stock: ['drink'] },
  bar_staff: {
    title: 'Cellar Dispatch',
    itemTypes: ['bottle_set', 'drink'],
    stock: ['drink'],
    addOnAlert: true,
  },
};

const ageMinutes = (createdAt?: string) =>
  createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000) : 0;

const ageColor = (minutes: number) => {
  if (minutes >= 20) return 'border-red-500 bg-red-50';
  if (minutes >= 10) return 'border-amber-500 bg-amber-50';
  return 'border-green-500 bg-green-50';
};

/** Roles that work a live order queue, and the transitions they may perform. */
const QUEUE_ROLES: Record<string, { title: string; transitions: Record<string, string> }> = {
  chef: { title: 'Kitchen Display', transitions: { placed: 'preparing', preparing: 'served' } },
  bartender: { title: 'Bar Tickets', transitions: { placed: 'preparing', preparing: 'served' } },
  // Cellar/bar dispatch runs the same ticket flow as the bar ("prepared" is not
  // a real order status, so the old key left this queue with no usable action).
  bar_staff: { title: 'Cellar Dispatch', transitions: { placed: 'preparing', preparing: 'served' } },
  // waiter (floor map), vip_host (booth map + minimum-spend tracker),
  // front_desk (room grid) and housekeeping (room status) each have dedicated
  // workspaces below.
  cashier: { title: 'Cashier', transitions: { served: 'completed' } },
};

const assignmentTypeLabel = (type: string) =>
  type === 'room' ? 'Room' : type === 'zone' ? 'Zone' : 'Table';

export default function StaffWorkspace() {
  const { staff } = useAuth();
  const { role: roleParam } = useParams();
  // UX-level gate: a staff member only ever sees their own workspace. Every write
  // is still authorised server-side, so this is not the security boundary.
  const ownSlug = slugForStaffRole(staff?.role);
  // Also normalises aliases (e.g. /staff/chef -> /staff/kitchen).
  const isOwnWorkspace = Boolean(ownSlug) && roleParam === ownSlug;
  const role = staff?.role ?? 'staff';
  const station = STATIONS[role];

  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Don't spend a request on a workspace this account cannot open (or on the
    // ticket stations / waiter floor map, which load their own data).
    if (
      !isOwnWorkspace ||
      station ||
      role === 'waiter' ||
      role === 'vip_host' ||
      role === 'front_desk' ||
      role === 'housekeeping'
    )
      return;
    try {
      setIsLoading(true);
      const [orderRes, assignmentRes] = await Promise.all([
        // Lines come back inline so the tracker can show what is on each order.
        ordersApi.list({ limit: 50, withLines: true }),
        staffService.getAssignments(),
      ]);
      setOrders(orderRes.items || []);
      setAssignments(assignmentRes.docs || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load workspace data');
    } finally {
      setIsLoading(false);
    }
  }, [isOwnWorkspace, station, role]);

  useEffect(() => {
    load();
  }, [load]);

  const queueConfig = QUEUE_ROLES[role];
  const activeOrders = useMemo(
    () => orders.filter((o) => !['completed', 'cancelled'].includes(o.status)),
    [orders],
  );

  const handleTransition = async (order: OrderDto, nextStatus: string) => {
    try {
      setUpdatingId(order._id);
      const updated = await ordersApi.updateStatus(order._id, nextStatus);
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o)));
      toast.success(`Order marked ${nextStatus}`);
    } catch {
      toast.error('Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOwnWorkspace) {
    return <Navigate to={ownSlug ? `/staff/${ownSlug}` : '/staff'} replace />;
  }

  if (station) {
    return (
      <div className="space-y-6">
        <TicketBoard
          title={station.title}
          itemTypes={station.itemTypes}
          addOnAlert={station.addOnAlert}
        />
        <Item86Panel kinds={station.stock} />
      </div>
    );
  }

  if (role === 'waiter') {
    return <WaiterWorkspace />;
  }

  if (role === 'vip_host') {
    return <VipHostWorkspace />;
  }

  if (role === 'front_desk') {
    return <FrontDeskWorkspace />;
  }

  if (role === 'housekeeping') {
    return <HousekeepingWorkspace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {queueConfig?.title ?? `${staffRoleLabel(role)} Workspace`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4" /> My assignments today
            <Badge variant="secondary">{assignments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tables, rooms or zones have been assigned to you yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignments.map((a) => (
                <Badge key={a._id} variant="outline" className="capitalize">
                  {assignmentTypeLabel(a.type)}: {a.label || a.refId}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {queueConfig ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="w-4 h-4" /> Live queue
              <Badge variant="secondary">{activeOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active orders. All caught up.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activeOrders.map((order) => {
                  const minutes = ageMinutes(order.createdAt);
                  const next = queueConfig.transitions[order.status];
                  return (
                    <div
                      key={order._id}
                      className={`rounded-lg border-l-4 border p-4 ${ageColor(minutes)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {order.guestName || `Order ${order._id.slice(-6)}`}
                        </span>
                        <Badge variant={order.status === 'placed' ? 'destructive' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {minutes} min · {order.lines?.length ?? 0} item(s)
                      </p>
                      {order.lines && order.lines.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {order.lines.slice(0, 5).map((line) => (
                            <li key={line._id}>
                              {line.quantity}× {line.name}
                            </li>
                          ))}
                        </ul>
                      )}
                      {next && (
                        <Button
                          size="sm"
                          className="mt-3 w-full bg-[#0A6C6D] hover:bg-[#085a5b]"
                          disabled={updatingId === order._id}
                          onClick={() => handleTransition(order, next)}
                        >
                          {updatingId === order._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            `Mark ${next}`
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{staffRoleLabel(role)} workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your assigned {role === 'housekeeping' ? 'rooms' : 'areas'} are listed above. Use the
              clock widget in the header to start and end your shift.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
