import { cn } from "@/lib/utils/cn";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Renders a Material Symbols Rounded ligature icon — pass the icon name exactly as used in the design reference (e.g. "grid_view"). */
export function Icon({ name, size = 19, className, style }: IconProps) {
  return (
    <span
      className={cn("material-symbols-rounded select-none", className)}
      style={{ fontSize: size, ...style }}
    >
      {name}
    </span>
  );
}
