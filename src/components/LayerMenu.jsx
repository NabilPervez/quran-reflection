import { useState, useRef, useEffect } from "react";

/**
 * Collapses the Arabic / Transliteration / Translation toggles into one chip
 * that sits beside Tafsir, so the verse card spends a single row on controls.
 *
 * @param layers [{ key, label, active, disabled, toggle }]
 */
export default function LayerMenu({ layers }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const available = layers.filter((l) => !l.disabled);
  const activeCount = available.filter((l) => l.active).length;
  // Never let the reader switch every layer off and end up with a blank card
  const isLastActive = (l) => l.active && activeCount <= 1;

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Choose which verse layers to show"
        style={{
          background: open ? "var(--primary-light)" : "transparent",
          border: "1px solid var(--primary-container)", borderRadius: 20,
          padding: "3px 10px", fontSize: 10, fontWeight: 700,
          color: "var(--primary-container)", cursor: "pointer",
          fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em",
          display: "inline-flex", alignItems: "center", gap: 5,
          transition: "all 0.2s ease",
        }}
      >
        Display ({activeCount})
        <span aria-hidden="true" style={{
          fontSize: 8, lineHeight: 1,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s ease",
        }}>▼</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 300,
            minWidth: 190, padding: 6,
            background: "var(--surface-lowest)",
            border: "1px solid var(--outline-ghost)",
            borderRadius: 12,
            boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
          }}
        >
          {layers.map((l) => {
            const locked = isLastActive(l);
            const blocked = l.disabled || locked;
            return (
              <button
                key={l.key}
                role="menuitemcheckbox"
                aria-checked={l.active}
                disabled={blocked}
                onClick={() => { if (!blocked) l.toggle(); }}
                title={
                  l.disabled ? `${l.label} is not available for this ayah`
                  : locked ? "At least one layer must stay visible"
                  : undefined
                }
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 10px", borderRadius: 8, border: "none",
                  background: "transparent", textAlign: "left",
                  cursor: blocked ? "not-allowed" : "pointer",
                  opacity: l.disabled ? 0.4 : 1,
                  color: l.active ? "var(--primary-container)" : "var(--on-surface-variant)",
                  fontFamily: "'DM Sans',sans-serif", fontSize: 13,
                  fontWeight: l.active ? 600 : 500,
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => { if (!blocked) e.currentTarget.style.background = "var(--surface-low)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span aria-hidden="true" style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1px solid ${l.active ? "var(--primary-container)" : "var(--outline-ghost)"}`,
                  background: l.active ? "var(--primary-light)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, lineHeight: 1,
                }}>{l.active ? "✓" : ""}</span>
                {l.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
