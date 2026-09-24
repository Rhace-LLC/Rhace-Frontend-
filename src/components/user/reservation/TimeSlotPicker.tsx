import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useBlueprintDaySlots, groupSlotsByMealPeriod } from '@/features/floor-plan';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DaySlotDto, MealPeriodDto } from '@/types';

interface TimeSlotPickerProps {
  planId?: string;
  blueprintId: string;
  date?: string;
  partySize: number;
  maxCapacity?: number;
  selectedStart?: string;
  onSelect: (slot: { start: string; end: string }) => void;
}

const CARD_BASE =
  'relative flex min-h-[64px] w-full flex-col justify-center rounded-xl px-3 py-2 text-left text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-res-brand-active/30';

function isDisabled(slot: DaySlotDto): boolean {
  return slot.state === 'past' || slot.state === 'full';
}

function cardClass(slot: DaySlotDto, selected: boolean): string {
  if (selected) {
    return `${CARD_BASE} border-2 border-res-brand-active bg-res-brand-active text-white shadow-md ring-2 ring-res-brand-active/20`;
  }
  if (slot.state === 'past') {
    return `${CARD_BASE} cursor-not-allowed border border-dashed border-gray-200 bg-gray-50 text-gray-300`;
  }
  if (slot.state === 'full') {
    return `${CARD_BASE} cursor-not-allowed border border-rose-100 bg-rose-50/50 text-rose-400 opacity-75`;
  }
  return `${CARD_BASE} cursor-pointer border border-gray-200 bg-white text-gray-800 hover:border-res-brand-active hover:bg-res-brand-active/5`;
}

/** "8:00 AM – 9:00 AM" → "8:00 AM". */
function startLabel(slot: DaySlotDto): string {
  return slot.label.split('–')[0]?.trim() || slot.label;
}

function slotTooltip(slot: DaySlotDto): string {
  if (slot.state === 'full') return `${slot.label} • Fully booked`;
  if (slot.state === 'past') return `${slot.label} • Elapsed`;
  return `${slot.label} • ${slot.available} of ${slot.total} tables available`;
}

export function TimeSlotPicker({
  planId,
  blueprintId,
  date,
  partySize,
  maxCapacity,
  selectedStart,
  onSelect,
}: TimeSlotPickerProps) {
  const enabled = Boolean(planId && blueprintId && date);
  const query = useBlueprintDaySlots(enabled ? planId : undefined, {
    blueprintId,
    date,
    partySize,
  });
  const data = query.data;
  const [period, setPeriod] = useState<'all' | MealPeriodDto>('all');

  const groups = useMemo(() => groupSlotsByMealPeriod(data?.slots ?? []), [data?.slots]);
  const visibleGroups = period === 'all' ? groups : groups.filter((group) => group.period === period);

  /** Arrow-key navigation within a meal-period grid (skips disabled cards). */
  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(key)) return;

    const grid = event.currentTarget;
    const buttons = Array.from(
      grid.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;

    const columns =
      getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    let next = index;
    if (key === 'ArrowRight') next = index + 1;
    else if (key === 'ArrowLeft') next = index - 1;
    else if (key === 'ArrowDown') next = index + columns;
    else if (key === 'ArrowUp') next = index - columns;

    if (next < 0 || next >= buttons.length) return;
    event.preventDefault();
    buttons[next]?.focus();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Select a start time</h2>
        <p className="mt-0.5 text-[11px] text-gray-500">
          {data?.durationMinutes
            ? `Tables are held for ${data.durationMinutes} mins.`
            : 'Choose a date to see available times.'}
        </p>
      </div>

      {!planId ? (
        <Empty text="No floor plan is published for this venue yet." />
      ) : !date ? (
        <Empty text="Pick a date to see available times." />
      ) : query.isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data?.notApplicable ? (
        <Empty text="Rooms are booked by night — choose your check-in and check-out dates." />
      ) : data?.isSelectable === false ? (
        <Empty
          text={`Not available for a party of ${partySize}${
            maxCapacity ? ` (seats up to ${maxCapacity})` : ''
          }. Try a different option or reduce the party size.`}
        />
      ) : data?.isClosed ? (
        <Empty text="Closed on this date. Please choose another day." />
      ) : !data?.slots?.length ? (
        <Empty text="No times available on this date." />
      ) : (
        <>
          {groups.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {(['all', ...groups.map((group) => group.period)] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPeriod(id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    period === id
                      ? 'border-res-brand-active bg-res-brand-active/5 text-res-brand-active'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {id === 'all' ? 'All' : id}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <div key={group.period}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {group.period}
                </p>
                <div
                  className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6"
                  role="group"
                  aria-label={`${group.period} time slots`}
                  onKeyDown={handleGridKeyDown}
                >
                  {group.slots.map((slot) => {
                    const selected = slot.start === selectedStart;
                    const disabled = isDisabled(slot);

                    const card = (
                      <button
                        type="button"
                        disabled={disabled}
                        aria-disabled={disabled}
                        aria-pressed={selected}
                        aria-label={slotTooltip(slot)}
                        onClick={() => onSelect({ start: slot.start, end: slot.end })}
                        className={cardClass(slot, selected)}
                      >
                        <span className="text-[13px] font-semibold leading-tight">
                          {startLabel(slot)}
                        </span>
                        {slot.state === 'full' ? (
                          <span className="mt-1 text-[11px] font-medium">Fully Booked</span>
                        ) : slot.state === 'past' ? (
                          <span className="mt-1 text-[11px]">Elapsed</span>
                        ) : (
                          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                selected ? 'bg-white' : 'bg-emerald-500'
                              }`}
                            />
                            {slot.available} left
                          </span>
                        )}
                      </button>
                    );

                    if (disabled) return card;

                    return (
                      <Tooltip key={slot.start}>
                        <TooltipTrigger asChild>{card}</TooltipTrigger>
                        <TooltipContent side="top">{slotTooltip(slot)}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
