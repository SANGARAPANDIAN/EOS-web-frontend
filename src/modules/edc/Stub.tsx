// Temporary placeholder for a screen not yet built in the page-by-page
// rebuild — replaced with the real pixel replica when its turn comes.
// Not meant to survive to the connected-backend phase.
export function EdcStub({ title }: { title: string }) {
  return (
    <div style={{ padding: 60, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>
      <div style={{ fontSize: 15 }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 8 }}>Not built yet — coming up next in the page-by-page pass.</div>
    </div>
  );
}
