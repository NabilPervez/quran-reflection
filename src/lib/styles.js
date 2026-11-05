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
  display: "block", marginBottom: 10,
  fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
  color: "var(--on-surface-variant)", letterSpacing: "0.08em", textTransform: "uppercase",
};

// Underline-style input — no enclosing box, bottom bar only
export const underlineInputStyle = {
  background: "transparent",
  border: "none",
  borderBottom: "2px solid rgba(193,201,191,0.4)",
  borderRadius: 0,
  padding: "10px 2px",
  color: "var(--on-surface)", fontSize: 15,
  transition: "border-color 0.3s ease, box-shadow 0.3s ease",
  fontFamily: "'Outfit', sans-serif",
};

export const underlineSelectStyle = {
  ...underlineInputStyle,
  appearance: "none", cursor: "pointer",
};

// "surface-container-low" tonal area for verse display
export const verseAreaStyle = {
  background: "var(--surface-low)",
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
export const settingsSectionStyle = {
  background: "var(--surface-lowest)",
  borderRadius: 16, padding: "22px 24px", marginBottom: 14,
  border: "1px solid var(--outline-ghost)", /* hairline, not shadow — Quiet Precision */
};

export const settingsTitleStyle = {
  fontFamily: "'Outfit',sans-serif", fontWeight: 600,
  color: "var(--on-surface)", fontSize: 15, marginBottom: 6,
};

export const settingsDescStyle = {
  fontFamily: "'Outfit',sans-serif", fontSize: 13,
  color: "var(--on-surface-variant)", lineHeight: 1.7, marginBottom: 16,
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
