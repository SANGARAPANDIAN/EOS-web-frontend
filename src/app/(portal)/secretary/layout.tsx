import { Poppins } from "next/font/google";
import { SecretaryShell } from "@/modules/secretary/SecretaryShell";

// The Secretary design source ("Secretary Module - Web/Secretary Dashboard.dc.html",
// line 15) sets `body { font-family: Poppins, "Helvetica Neue", Arial, sans-serif; }`
// — a different font than the app-wide Plus Jakarta Sans in the root layout (which
// other modules' own design sources call for). Scoped here via a wrapper class so it
// applies only inside /secretary and doesn't affect EDC/Advisor/Student.
const poppins = Poppins({
  variable: "--font-secretary-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SecretaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={poppins.variable} style={{ fontFamily: "var(--font-secretary-poppins), 'Helvetica Neue', Arial, sans-serif" }}>
      <SecretaryShell>{children}</SecretaryShell>
    </div>
  );
}
