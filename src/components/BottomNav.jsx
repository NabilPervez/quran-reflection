export default function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "read",    label: "Read",    icon: "📖" },
    { id: "reflect", label: "Reflect", icon: "✦" },
    { id: "journal", label: "Journal", icon: "📋" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(250,249,246,0.72)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: 68, zIndex: 100,
      borderTop: "1px solid rgba(193,201,191,0.15)",
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`nav-${t.id}`}
          onClick={() => setTab(t.id)}
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: "10px 0",
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
            fontSize: 10, fontFamily: "'Inter',sans-serif", fontWeight: 600,
            color: tab === t.id ? "var(--primary-container)" : "var(--on-surface-variant)",
            transition: "color 0.3s ease", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
