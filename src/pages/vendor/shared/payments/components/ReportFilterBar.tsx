import { useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PRESETS, useReportFilters } from '../report/useReportFilters';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];

const triggerClass =
  'type-res-small inline-flex cursor-pointer items-center gap-2 rounded-full bg-res-card px-4 py-2 font-semibold text-res-ink shadow-res-low outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand';

/** Local calendar day as YYYY-MM-DD (the API reads it as a Lagos day). */
const toDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fromDay = (s?: string) => (s ? new Date(`${s}T12:00:00`) : undefined);

/** Date range (presets + custom) and currency, shared by both payments pages via the URL. */
export function ReportFilterBar() {
  const { params, setPreset, setCustom, setCurrency, rangeLabel } = useReportFilters();
  const [customOpen, setCustomOpen] = useState(false);
  const openingCustom = useRef(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() =>
    params.from ? { from: fromDay(params.from), to: fromDay(params.to) } : undefined,
  );

  const applyCustom = () => {
    if (!draft?.from) return;
    setCustom(toDay(draft.from), toDay(draft.to ?? draft.from));
    setCustomOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        {/* The menu opens the custom-range popover; the popover only anchors here. */}
        <PopoverAnchor asChild>
          <span className="inline-flex">
        <DropdownMenu>
          <DropdownMenuTrigger className={triggerClass}>
            <CalendarDays className="size-4 text-res-ink-muted" aria-hidden />
            {rangeLabel}
            <ChevronDown className="size-4 text-res-ink-muted" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48"
            onCloseAutoFocus={(event) => {
              // Returning focus to the trigger would count as a click outside
              // the custom-range popover that is opening.
              if (openingCustom.current) {
                event.preventDefault();
                openingCustom.current = false;
              }
            }}
          >
            {PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.value} onSelect={() => setPreset(preset.value)}>
                <span className="flex-1">{preset.label}</span>
                {!params.from && params.preset === preset.value && <Check className="size-4" aria-hidden />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                openingCustom.current = true;
                setDraft(params.from ? { from: fromDay(params.from), to: fromDay(params.to) } : undefined);
                // After the menu has closed, so its dismissal can't close the popover.
                setTimeout(() => setCustomOpen(true), 0);
              }}
            >
              <span className="flex-1">Custom range…</span>
              {params.from && <Check className="size-4" aria-hidden />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
          </span>
        </PopoverAnchor>
        <PopoverContent align="end" className="w-auto p-3">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onSelect={setDraft}
            disabled={{ after: new Date() }}
            defaultMonth={draft?.from ?? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="type-res-small cursor-pointer rounded-full px-4 py-2 font-semibold text-res-ink-muted hover:text-res-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!draft?.from}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger className={triggerClass} aria-label="Currency">
          {params.currency}
          <ChevronDown className="size-4 text-res-ink-muted" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {CURRENCIES.map((code) => (
            <DropdownMenuItem key={code} onSelect={() => setCurrency(code)}>
              <span className="flex-1">{code}</span>
              {params.currency === code && <Check className="size-4" aria-hidden />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
