import type { VerticalPlugin } from '../core/plugin';
import { PrototypeWorkbench } from './PrototypeWorkbench';

export function PrototypeFloorPlanView({ plugin }: { plugin: VerticalPlugin }) {
  return <PrototypeWorkbench plugin={plugin} />;
}
