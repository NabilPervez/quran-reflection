import { useState } from "react";
import { pageTitleStyle, pageSubtitleStyle } from "../lib/styles";

export default function PageHeader({ title, subtitle, onSettings }) {
  const [showTip, setShowTip] = useState(false);

  let tooltipText = "";
  if (title === "Read & Reflect") {
    tooltipText = "1. Find a Surah or Juz.\n2. Read Ayah by Ayah.\n3. Favorite or Reflect on verses.";
  } else if (title === "New Reflection") {
    tooltipText = "1. Select a range of Ayahs.\n2. Read and ponder.\n3. Write and save your reflection.";
  } else if (title === "Journal") {
    tooltipText = "1. Review your past reflections.\n2. Check your favorited verses.\n3. Track your habit streaks.";
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={pageTitleStyle}>{title}</h1>
          {tooltipText && (
            <div 
              onMouseEnter={() => setShowTip(true)} 
              onMouseLeave={() => setShowTip(false)}
              onClick={() => setShowTip(!showTip)}
              style={{ cursor: "pointer", color: "var(--primary-container)", fontSize: 18, marginTop: 4, opacity: 0.8 }}
              title="How to use this page"
            >
              ℹ️
            </div>
          )}
        </div>
        {subtitle && <p style={pageSubtitleStyle}>{subtitle}</p>}
        {showTip && tooltipText && (
          <div style={{
            position: "absolute", top: "100%", left: 0, zIndex: 100, marginTop: 8,
            background: "var(--surface-lowest)", border: "1px solid var(--outline-ghost)",
            padding: "16px", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
            width: 250, 
          }}>
            <h4 style={{ margin: "0 0 8px 0", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--on-surface)" }}>How to use this page</h4>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--on-surface-variant)", fontSize: 12, fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
              {tooltipText.split('\n').map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>
        )}
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
