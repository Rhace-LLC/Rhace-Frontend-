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
  'relative flex min-h-[64px] w-full flex-col justify-center rounded-res-sm px-3 py-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand';

function isDisabled(slot: DaySlotDto): boolean {
  return slot.state === 'past' || slot.state === 'full';
}

function cardClass(slot: DaySlotDto, selected: boolean): string {
  if (selected) {
    return `${CARD_BASE} bg-res-brand text-res-ink-inverted shadow-res-low`;
  }
  if (slot.state === 'past') {
    return `${CARD_BASE} cursor-not-allowed border border-dashed border-res-line bg-res-surface text-res-ink-muted`;
  }
  if (slot.state === 'full') {
    return `${CARD_BASE} cursor-not-allowed bg-res-surface text-res-ink-muted opacity-75`;
  }
  return `${CARD_BASE} cursor-pointer bg-res-surface text-res-ink hover:shadow-res-low`;
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
    <div className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="type-res-h3 text-res-ink">Select a start time</h2>
          <p className="type-res-small mt-1 font-normal text-res-ink-muted">
            {data?.durationMinutes
              ? `Tables are held for ${data.durationMinutes} mins.`
              : 'Choose a date to see available times.'}
          </p>
        </div>
        {data?.slots?.length ? (
          <span className="type-res-small w-max shrink-0 rounded-full bg-res-surface px-3 py-1 font-semibold text-res-ink-muted">
            {data.slots.length} slots
          </span>
        ) : null}
      </div>

      {!planId ? (
        <Empty text="No floor plan is published for this venue yet." />
      ) : !date ? (
        <Empty text="Pick a date to see available times." />
      ) : query.isLoading ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-res-sm bg-res-surface" />
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
            <div className="hide-scrollbar -mx-1 mb-4 overflow-x-auto px-1 py-1">
              <div className="flex w-max gap-2">
                {(['all', ...groups.map((group) => group.period)] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPeriod(id)}
                    aria-pressed={period === id}
                    className={`type-res-small cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                      period === id
                        ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                        : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
                    }`}
                  >
                    {id === 'all' ? 'All' : id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            {visibleGroups.map((group) => (
              <div key={group.period}>
                <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  {group.period}
                </p>
                <div
                  className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6"
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
                        <span className="type-res-body font-semibold leading-tight">
                          {startLabel(slot)}
                        </span>
                        {slot.state === 'full' ? (
                          <span className="type-res-small mt-1 font-medium">Fully booked</span>
                        ) : slot.state === 'past' ? (
                          <span className="type-res-small mt-1">Elapsed</span>
                        ) : (
                          <span className="type-res-small mt-1 inline-flex items-center gap-1.5">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                selected ? 'bg-res-ink-inverted' : 'bg-res-accent'
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
    <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
      <p className="type-res-small font-normal text-res-ink-muted">{text}</p>
    </div>
  );
}
