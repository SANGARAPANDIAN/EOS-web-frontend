interface DateTileProps {
  isoDate: string;
  size?: "sm" | "md";
}

/** Small day/month tile used anywhere a date needs to be shown as a visual chip (calendar event lists, upcoming-deadline rows). */
export function DateTile({ isoDate, size = "sm" }: DateTileProps) {
  const date = new Date(isoDate);
  const width = size === "sm" ? 48 : 56;
  return (
    <div
      className="flex shrink-0 flex-col items-center rounded-[9px] border border-border-default bg-surface-muted py-1.5"
      style={{ width }}
    >
      <span className="text-[9.5px] font-bold uppercase text-subtle">
        {date.toLocaleDateString("en-IN", { month: "short" })}
      </span>
      <span className="text-[15px] font-extrabold text-ink">{date.getDate()}</span>
    </div>
  );
}
