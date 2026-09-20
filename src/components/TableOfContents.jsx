import { useState, useMemo, useRef, useEffect } from "react";
import { SURAHS, JUZ_START_PAGE, SURAH_START_PAGE } from "../lib/data";
import { pageContainerStyle, underlineInputStyle, pageTitleStyle } from "../lib/styles";

/** First surah that begins on or before the given Juz's starting page */
export function surahForJuz(juzNum) {
  const startPage = JUZ_START_PAGE[juzNum] ?? 1;
  let target = 1;
  for (const [surah, pg] of Object.entries(SURAH_START_PAGE)) {
    if (pg <= startPage) target = Number(surah);
    else break;
  }
  return target;
}

/**
 * Full-page contents browser: pick a Surah, then an Ayah within it.
 * Replaces the inline "Navigation" accordion that used to sit on the Read page.
 */
export default function TableOfContents({ current, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [openSurah, setOpenSurah] = useState(null); // surah number, when picking an ayah
  const searchRef = useRef(null);
  const topRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { topRef.current?.scrollIntoView({ block: "start" }); }, [openSurah]);

  // Escape steps back to the list first, then closes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (openSurah) setOpenSurah(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSurah, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(([num, name]) =>
      name.toLowerCase().includes(q) || String(num).startsWith(q)
    );
  }, [query]);

  const surah = openSurah ? SURAHS.find((s) => s[0] === openSurah) : null;

  const backBtn = (onClick, label) => (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        fontSize: 20, color: "var(--on-surface)",
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        transition: "background 0.3s ease",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-low)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >←</button>
  );

  return (
    <div style={pageContainerStyle} ref={topRef}>
      {surah ? (
        /* ── Step 2: choose an ayah ─────────────────────────────────────── */
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {backBtn(() => setOpenSurah(null), "Back to surah list")}
            <h1 style={{ ...pageTitleStyle, marginBottom: 0 }}>
              {surah[0]}. {surah[1]}
            </h1>
          </div>
          <p style={{
            color: "var(--on-surface-variant)", fontFamily: "'DM Sans',sans-serif",
            fontSize: 13, margin: "0 0 var(--chrome-gap) 46px",
          }}>
            {surah[2]} ayat — choose where to start
          </p>

          <button
            onClick={() => onSelect(surah[0], 1)}
            style={{
              width: "100%", padding: "14px 18px", marginBottom: "var(--block-gap)",
              borderRadius: 12, cursor: "pointer", textAlign: "left",
              border: "1px solid var(--primary-container)",
              background: "var(--primary-light)", color: "var(--primary-container)",
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600,
            }}
          >
            Read from the beginning
          </button>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))",
            gap: 8,
          }}>
            {Array.from({ length: surah[2] }, (_, i) => i + 1).map((n) => {
              const isCurrent = current.surah === surah[0] && current.ayah === n;
              return (
                <button
                  key={n}
                  onClick={() => onSelect(surah[0], n)}
                  aria-label={`Surah ${surah[1]} ayah ${n}`}
                  aria-current={isCurrent ? "true" : undefined}
                  style={{
                    padding: "12px 0", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${isCurrent ? "var(--primary-container)" : "var(--outline-ghost)"}`,
                    background: isCurrent ? "var(--primary-light)" : "var(--surface-lowest)",
                    color: isCurrent ? "var(--primary-container)" : "var(--on-surface)",
                    fontFamily: "'DM Sans',sans-serif", fontSize: 14,
                    fontWeight: isCurrent ? 700 : 500,
                    fontVariantNumeric: "tabular-nums",
                    transition: "all 0.2s ease",
                  }}
                >{n}</button>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Step 1: choose a surah ─────────────────────────────────────── */
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--chrome-gap)" }}>
            {backBtn(onClose, "Back to reading")}
            <h1 style={{ ...pageTitleStyle, marginBottom: 0 }}>Contents</h1>
          </div>

          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number..."
            aria-label="Search surahs"
            className="uline-input"
            style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box", marginBottom: "var(--block-gap)" }}
            autoComplete="off"
          />

          {/* Juz shortcuts */}
          <div style={{ marginBottom: "var(--block-gap)" }}>
            <p style={{
              fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--on-surface-variant)", margin: "0 0 10px",
            }}>Jump to Juz</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => onSelect(surahForJuz(n), 1)}
                  aria-label={`Juz ${n}`}
                  style={{
                    minWidth: 38, padding: "7px 10px", borderRadius: 40, cursor: "pointer",
                    border: "1px solid var(--outline-ghost)", background: "transparent",
                    color: "var(--on-surface-variant)",
                    fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600,
                    fontVariantNumeric: "tabular-nums", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.color = "var(--primary-container)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--on-surface-variant)"; }}
                >{n}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <p style={{ color: "var(--on-surface-variant)", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
              No surah matches that search.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(([num, name, count]) => {
              const isCurrent = current.surah === num;
              return (
                <button
                  key={num}
                  onClick={() => setOpenSurah(num)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, width: "100%",
                    padding: "13px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    border: `1px solid ${isCurrent ? "var(--primary-container)" : "var(--outline-ghost)"}`,
                    background: isCurrent ? "var(--primary-light)" : "var(--surface-lowest)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = "var(--surface-low)"; }}
                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "var(--surface-lowest)"; }}
                >
                  <span style={{
                    flexShrink: 0, minWidth: 30, textAlign: "center",
                    color: "var(--primary-container)", fontWeight: 700, fontSize: 12,
                    fontFamily: "'DM Sans',sans-serif", fontVariantNumeric: "tabular-nums",
                  }}>{num}</span>
                  <span style={{
                    flex: 1, color: "var(--on-surface)", fontSize: 15,
                    fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
                  }}>{name}</span>
                  <span style={{
                    color: "var(--on-surface-variant)", fontSize: 12,
                    fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
                  }}>{count} ayat</span>
                  <span style={{ color: "var(--on-surface-variant)", fontSize: 14, opacity: 0.6 }}>&rsaquo;</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
