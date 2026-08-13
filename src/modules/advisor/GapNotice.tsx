// Shared "confirmed backend gap" screen — used by pages whose design
// content has NO faculty-accessible endpoint anywhere in EOSbackend1 (audited,
// not assumed). Shown instead of the design's fabricated sample data, per the
// project rule: never invent a value the backend doesn't return.
export function GapNotice({ title, subtitle, detail }: { title: string; subtitle: string; detail: string }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>{subtitle}</div>

      <div
        data-advisor-lift=""
        style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 48, marginTop: 20, textAlign: "center" }}
      >
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid #DBEAFE", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D4ED8", fontSize: 20, fontWeight: 800 }}>
          !
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 16 }}>Not connected yet</div>
        <div style={{ fontSize: 13.5, color: "#7C8899", fontWeight: 500, marginTop: 8, lineHeight: 1.6, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>{detail}</div>
      </div>
    </div>
  );
}
