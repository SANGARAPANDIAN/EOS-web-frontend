import { Outfit } from "next/font/google";
import { StationaryShell } from "@/modules/stationary/StationaryShell";
import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";

// "Stationery Portal.dc.html" (line 12) loads Google Fonts' Outfit for the
// whole page — scoped here via a wrapper class so it applies only inside
// /stationary and doesn't affect any other module.
const outfit = Outfit({
  variable: "--font-stationary-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function StationaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={outfit.variable} style={{ fontFamily: "var(--font-stationary-outfit), Helvetica, Arial, sans-serif" }}>
      <ToastProvider>
        <StationaryShell>{children}</StationaryShell>
      </ToastProvider>
    </div>
  );
}
