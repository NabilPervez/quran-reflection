export default function BottomNav({ tab, setTab }) {
  // Reflect is a sub-flow of reading, so it keeps Read lit rather than
  // leaving the bar with nothing selected.
  const activeTab = tab === "reflect" ? "read" : tab;
  // Reflect is reached from the Reflect action on an ayah, not from the bar.
  // Settings lives behind the header icon, not in the bar (Nabil, 2026-11-05)
  const ic = (d) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  );
  const tabs = [
    { id: "home",    label: "Home",    icon: ic(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>) },
    { id: "read",    label: "Read",    icon: ic(<><path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z" /><path d="M12 6v14" /></>) },
    { id: "journal", label: "Journal", icon: ic(<><path d="M6 3h11a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-3 2V5a2 2 0 0 1 2-2z" /><path d="M9 8h6M9 12h6" /></>) },
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
            fontSize: 20, lineHeight: 0,
            color: activeTab === t.id ? "var(--ink-accent)" : "var(--on-surface-variant)",
            transition: "color 0.3s ease, transform 0.3s ease",
            
            display: "block",
          }}>{t.icon}</span>
          <span style={{
            fontSize: 12, fontFamily: "'Outfit',sans-serif", fontWeight: 500,
            color: activeTab === t.id ? "var(--ink-accent)" : "var(--on-surface-variant)",
            transition: "color 0.3s ease", 
          }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
