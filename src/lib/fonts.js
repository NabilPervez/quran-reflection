// ── Reader font scaling ───────────────────────────────────────────────────────
// The user's per-layer size preference is stored as a multiplier, not an
// absolute px value, so it rides on top of the responsive clamp() base sizes
// in index.html and stays sensible across phone, tablet and orientation.

export const FONT_SCALE_MIN  = 0.8;
export const FONT_SCALE_MAX  = 1.8;
export const FONT_SCALE_STEP = 0.1;

// layer key -> [localStorage key, CSS custom property]
export const FONT_LAYERS = {
  arabic:   ["qr_font_arabic",   "--ayah-scale"],
  translit: ["qr_font_translit", "--translit-scale"],
  trans:    ["qr_font_trans",    "--trans-scale"],
};

/** Read a persisted scale, falling back to 1 for missing or out-of-range values */
export function readFontScale(storageKey) {
  const v = parseFloat(localStorage.getItem(storageKey));
  return Number.isFinite(v) && v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX ? v : 1;
}

export function loadFontScales() {
  return Object.fromEntries(
    Object.entries(FONT_LAYERS).map(([layer, [storageKey]]) => [layer, readFontScale(storageKey)])
  );
}

/** Clamp to the allowed range and round away float drift from repeated steps */
export function clampFontScale(v) {
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(v * 100) / 100));
}
