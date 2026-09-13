import type { VerticalPlugin } from '../core/plugin';
import { PrototypeWorkbench } from './PrototypeWorkbench';

export function PrototypeFloorPlanView({
  plugin,
  planId,
}: {
  plugin: VerticalPlugin;
  planId?: string;
}) {
  return <PrototypeWorkbench plugin={plugin} planId={planId} />;
}
