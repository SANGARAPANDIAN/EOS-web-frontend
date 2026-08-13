import { cn } from "@/lib/utils/cn";

export interface PillTabOption {
  key: string;
  label: string;
}

interface PillTabsProps {
  options: PillTabOption[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Same active/inactive tone as SegmentedTabs, but each option is its own
 * bordered pill with a gap between them instead of a shared grey bar —
 * used by pages whose reference shows separated boxes (Leave Requests'
 * status filter, Placements' tab switcher) rather than a segmented track.
 */
export function PillTabs({ options, value, onChange, className }: PillTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2.5", className)}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "cursor-pointer rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors",
              active ? "border-border-accent bg-accent-50 text-primary" : "border-border-default bg-surface text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
