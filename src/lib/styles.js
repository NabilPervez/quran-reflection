// ── Shared style objects ──────────────────────────────────────────────────────

export const pageTitleStyle = {
  fontFamily: "'Outfit',sans-serif", fontWeight: 600,
  color: "var(--on-surface)", fontSize: "var(--title-size)",
  marginBottom: 6, marginTop: 0, letterSpacing: "-0.027em", fontWeight: 600, textWrap: "balance",
};

export const pageSubtitleStyle = {
  color: "var(--on-surface-variant)", fontFamily: "'Outfit',sans-serif",
  fontSize: 14, marginBottom: "var(--chrome-gap)", marginTop: 0, fontWeight: 400,
};

export const labelStyle = {
  display: "block", marginBottom: 8,
  fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 500,
  color: "var(--on-surface)",
};

// v2 (2026-11-05): boxed hairline field replaces the underline input
export const underlineInputStyle = {
  background: "var(--surface-lowest)",
  border: "1px solid var(--outline-ghost)",
  borderRadius: 12,
  padding: "13px 16px",
  color: "var(--on-surface)", fontSize: 16,
  fontFamily: "'Outfit', sans-serif",
};

export const underlineSelectStyle = {
  ...underlineInputStyle,
  appearance: "none", cursor: "pointer",
  backgroundImage: "linear-gradient(45deg, transparent 50%, var(--on-surface-variant) 50%), linear-gradient(135deg, var(--on-surface-variant) 50%, transparent 50%)",
  backgroundPosition: "calc(100% - 20px) 50%, calc(100% - 15px) 50%",
  backgroundSize: "5px 5px", backgroundRepeat: "no-repeat", paddingRight: 40,
};

// "surface-container-low" tonal area for verse display
export const verseAreaStyle = {
  background: "var(--surface-lowest)",
  border: "1px solid var(--outline-ghost)",
  borderRadius: 16, padding: "var(--card-pad)",
  marginBottom: 0,
};

// Cards = surface-lowest, lifted above surface-low page
export const cardStyle = {
  background: "var(--surface-lowest)",
  borderRadius: 16, padding: "var(--card-pad)",
  marginBottom: 16,
  border: "1px solid var(--outline-ghost)", /* hairline, not shadow — Quiet Precision */
};

// Chip buttons (Edit / Delete on journal cards)
export const chipBtnStyle = {
  background: "var(--surface-low)",
  border: "none",
  borderRadius: 40, padding: "5px 14px", cursor: "pointer",
  color: "var(--on-surface-variant)", fontSize: 12,
  fontFamily: "'Outfit',sans-serif", fontWeight: 500,
};

// Primary button (gradient)
export const primaryBtnStyle = {
  padding: "11px 22px", borderRadius: 999, border: "none",
  background: "var(--primary-container)",
  color: "var(--on-primary)", cursor: "pointer",
  fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600,
  
};

// Ghost button (cancel actions)
export const ghostBtnStyle = {
  padding: "11px 22px", borderRadius: 999,
  border: "1px solid var(--outline-ghost)",
  background: "transparent", color: "var(--on-surface-variant)",
  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
  fontSize: 13, fontWeight: 500,
};

// Secondary button (settings actions)
export const secondaryBtnStyle = {
  padding: "9px 20px", borderRadius: 40,
  border: "none", background: "var(--surface-low)",
  color: "var(--on-surface-variant)", cursor: "pointer",
  fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500,
};

// Settings section — tonal card (surface-lowest)
// v2: sections are open, separated by space + hairline rows, not boxed cards
export const settingsSectionStyle = {
  padding: "0 0 8px", marginBottom: 32,
};

export const settingsTitleStyle = {
  fontFamily: "'Outfit',sans-serif", fontWeight: 600, letterSpacing: "-0.02em",
  color: "var(--on-surface)", fontSize: 22, margin: "0 0 8px",
};

export const settingsDescStyle = {
  fontFamily: "'Outfit',sans-serif", fontSize: 14,
  color: "var(--on-surface-variant)", lineHeight: 1.6, marginBottom: 16, marginTop: 0,
};

export function skeletonLine(widthPct) {
  return {
    height: 12, borderRadius: 6, marginBottom: 12, width: `${widthPct}%`,
    background: "linear-gradient(90deg, var(--surface-low) 25%, var(--surface-lowest) 50%, var(--surface-low) 75%)",
    backgroundSize: "600px 100%",
    animation: "shimmer 1.6s infinite linear",
  };
}

// ── Page shell ────────────────────────────────────────────────────────────────
// Shared by every tab so padding and measure stay consistent, and so the
// landscape breakpoints in index.html can retune all of them at once.
export const pageContainerStyle = {
  padding: "var(--pad-top) var(--pad-x) var(--pad-bottom)",
  maxWidth: "var(--content-max)",
  margin: "0 auto",
};
