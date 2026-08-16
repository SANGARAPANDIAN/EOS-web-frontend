import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";

interface PrincipalTableSkeletonProps {
  columns: number;
  rows?: number;
}

/** Drop-in replacement for a table's `<tbody>` while its query is loading — same row height/border rhythm as the real rows, so the table doesn't jump when data arrives. */
export function PrincipalTableSkeleton({ columns, rows = 5 }: PrincipalTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-3 py-3.5 first:pl-5 last:pr-5">
              <Skeleton className="h-4" style={{ width: c === 0 ? "70%" : "50%" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
