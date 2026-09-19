export default function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "read",    label: "Read",    icon: "✧" },
    { id: "reflect", label: "Reflect", icon: "✦" },
    { id: "journal", label: "Journal", icon: "✴" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "color-mix(in srgb, var(--surface-lowest) 78%, transparent)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: "calc(var(--nav-h) + env(safe-area-inset-bottom))", zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom)",
      paddingLeft: "env(safe-area-inset-left)",
      paddingRight: "env(safe-area-inset-right)",
      borderTop: "1px solid var(--outline-ghost)",
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`nav-${t.id}`}
          onClick={() => setTab(t.id)}
          className="nav-btn"
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "var(--nav-gap)",
            flexDirection: "var(--nav-dir)",
            padding: "var(--nav-btn-pad)",
          }}
        >
          <span style={{
            fontSize: 20,
            color: tab === t.id ? "var(--primary-container)" : "var(--on-surface-variant)",
            transition: "color 0.3s ease, transform 0.3s ease",
            transform: tab === t.id ? "scale(1.15)" : "scale(1)",
            display: "block",
          }}>{t.icon}</span>
          <span style={{
            fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
            color: tab === t.id ? "var(--primary-container)" : "var(--on-surface-variant)",
            transition: "color 0.3s ease", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
