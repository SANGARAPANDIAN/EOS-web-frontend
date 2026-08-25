import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface BrandMarkProps {
  /** Second line under "Sri Eshwar" — e.g. "College of Engineering", "Admin Console". */
  subtitle?: string;
  collapsed?: boolean;
}

/** The real college logo + name — the one piece of every module's header that must never be redrawn from scratch (no fake initials badges, no placeholder crests). */
export function BrandMark({ subtitle = "College of Engineering", collapsed }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/college-logo.png" alt="College logo" width={40} height={40} priority className="shrink-0 object-contain" />
      {!collapsed && (
        <div className="leading-[1.15]">
          <div className="text-base font-extrabold tracking-[-.02em] text-ink">Sri Eshwar</div>
          <div className="text-[11px] font-semibold text-muted">{subtitle}</div>
        </div>
      )}
    </div>
  );
}

interface SidebarBrandHeaderProps extends BrandMarkProps {
  className?: string;
}

/** Full bordered header block (BrandMark + the standard h-20 border-b wrapper) — use this for an `<aside>`-style sidebar that owns its own top block. For a shell whose logo sits inside a header row that already supplies its own border/height, use `BrandMark` directly instead. */
export function SidebarBrandHeader({ subtitle, collapsed, className }: SidebarBrandHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-20 shrink-0 items-center border-b border-border-default px-5",
        collapsed && "justify-center px-0",
        className,
      )}
    >
      <BrandMark subtitle={subtitle} collapsed={collapsed} />
    </div>
  );
}
