import { cn } from "@/lib/utils/cn";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedPillToggleProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Tinted pill-shaped tab switcher — "Today / This term / This year", "Pending / Accepted / Rejected / All". */
export function SegmentedPillToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedPillToggleProps<T>) {
  return (
    <div className={cn("inline-flex gap-1 rounded-admin-lg bg-admin-tint-strong p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-[38px] cursor-pointer rounded-admin-sm px-[18px] font-sans text-sm font-semibold transition-colors",
              active
                ? "bg-admin-canvas text-admin-primary-deep shadow-admin-resting"
                : "text-admin-muted hover:text-admin-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
