import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";

interface PrincipalComingSoonProps {
  title: string;
  icon: string;
}

/** Honest placeholder for sidebar sections not yet built — no fabricated data, just says so. */
export function PrincipalComingSoon({ title, icon }: PrincipalComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1
        className="text-[30px] font-extrabold tracking-tight"
        style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
      >
        {title}
      </h1>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border py-24 text-center hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
        style={{ background: principalColors.surfaceMuted, borderColor: principalColors.borderLight }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: principalColors.surfaceTint }}>
          <Icon name={icon} size={28} style={{ color: principalColors.primary }} />
        </div>
        <div className="text-base font-semibold" style={{ color: principalColors.heading }}>
          {title} isn&apos;t built yet
        </div>
        <p className="max-w-sm text-sm" style={{ color: principalColors.textFaint }}>
          This section will go live once it&apos;s wired to a real backend data source — nothing here is a
          placeholder for numbers we don&apos;t have.
        </p>
      </div>
    </div>
  );
}
