import { cn } from "@/lib/utils/cn";

export interface SegmentedTabOption<T extends string = string> {
  key: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({ options, value, onChange, className }: SegmentedTabsProps<T>) {
  return (
    <div className={cn("inline-flex gap-1 rounded-[11px] bg-surface-tint p-1", className)}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "cursor-pointer rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold transition-colors",
              active ? "bg-surface text-primary shadow-tab" : "bg-transparent text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
