import { pageTitleStyle, pageSubtitleStyle } from "../lib/styles";

export default function PageHeader({ title, subtitle, onSettings }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
      <div>
        <h1 style={pageTitleStyle}>{title}</h1>
        {subtitle && <p style={pageSubtitleStyle}>{subtitle}</p>}
      </div>
      {onSettings && (
        <button
          id="settings-btn"
          onClick={onSettings}
          aria-label="Settings"
          style={{
            background: "var(--surface-low)",
            border: "none",
            borderRadius: "50%",
            width: 38, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            color: "var(--on-surface-variant)",
            fontSize: 17,
            flexShrink: 0,
            marginTop: 4,
            transition: "background 0.3s ease, color 0.3s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.color = "var(--primary-container)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-low)"; e.currentTarget.style.color = "var(--on-surface-variant)"; }}
        >
          ⚙️
        </button>
      )}
    </div>
  );
}
