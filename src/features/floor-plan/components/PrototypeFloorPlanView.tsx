import type { VerticalPlugin } from '../core/plugin';
import { FloorPlanWorkbench } from './FloorPlanWorkbench';

export function PrototypeFloorPlanView({ plugin }: { plugin: VerticalPlugin }) {
  return (
    <div className="flex h-full min-h-0 flex-col p-2 md:p-4">
      <FloorPlanWorkbench plugin={plugin} />
    </div>
  );
}
