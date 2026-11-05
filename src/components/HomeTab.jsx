import { useEffect, useMemo, useState } from "react";
import { dbGetAll } from "../lib/db";
import { SURAHS } from "../lib/data";
import { pageContainerStyle, pageTitleStyle, pageSubtitleStyle, primaryBtnStyle } from "../lib/styles";
import PageHeader from "./PageHeader";

// Home — Nabil, 2026-11-05: "continue reading" plus analytics on the journal.
// Charts are hand-drawn SVG (no chart library), coloured from theme tokens.

const TOTAL_AYAHS = 6236;
const ORDINAL = (() => { const m = {}; let run = 0; for (const [n, , c] of SURAHS) { m[n] = run; run += c; } return m; })();
const DAY = 86400000;

const toDate = (v) => { const d = new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v); return isNaN(d) ? null : d; };
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isFav = (e) => (e.tags || []).includes("Favorite");
const isReflection = (e) => e.reflection && e.reflection !== "Favorited Ayah";

const card = {
  background: "var(--surface-lowest)", border: "1px solid var(--outline-ghost)",
  borderRadius: 16, padding: "var(--card-pad)",
};
const eyebrow = {
  fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em",
  textTransform: "uppercase", color: "var(--on-surface-variant)", margin: "0 0 12px",
};
const h2 = { fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, color: "var(--on-surface)" };
const muted = { fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "var(--on-surface-variant)", margin: 0 };

function computeStats(entries) {
  const now = new Date();
  const days = new Set();
  const dated = [];
  for (const e of entries) { const d = toDate(e.createdAt); if (d) { days.add(dayKey(d)); dated.push({ e, d }); } }

  // Streaks — a streak is still alive if the last activity was today or yesterday
  let current = 0;
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = new Date(cursor - DAY);
  while (days.has(dayKey(cursor))) { current++; cursor = new Date(cursor - DAY); }
  const sortedDays = [...days].map((k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m, d).getTime(); }).sort((a, b) => a - b);
  let longest = 0, run = 0, prev = null;
  for (const t of sortedDays) { run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = t; }

  // Last 12 weeks, oldest first
  const weekStart = startOfDay(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weeks = Array.from({ length: 12 }, (_, i) => ({ start: new Date(weekStart.getTime() - (11 - i) * 7 * DAY), refl: 0, fav: 0 }));
  for (const { e, d } of dated) {
    const idx = 11 - Math.floor((weekStart.getTime() + 7 * DAY - 1 - d.getTime()) / (7 * DAY));
    if (idx >= 0 && idx < 12) { if (isReflection(e)) weeks[idx].refl++; else if (isFav(e)) weeks[idx].fav++; }
  }

  // Most-visited surahs
  const bySurah = {};
  for (const e of entries) { const n = Number(e.surahNumber); if (n) bySurah[n] = (bySurah[n] || 0) + 1; }
  const topSurahs = Object.entries(bySurah).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([n, c]) => ({ n: Number(n), name: SURAHS.find((s) => s[0] === Number(n))?.[1] ?? `Surah ${n}`, c }));

  // Themes (tags other than Favorite)
  const tagCounts = {};
  for (const e of entries) for (const t of e.tags || []) if (t !== "Favorite") tagCounts[t] = (tagCounts[t] || 0) + 1;
  const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  const reflections = entries.filter(isReflection);
  const latest = reflections.slice().sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))[0];

  return {
    reflections: reflections.length,
    favorites: entries.filter(isFav).length,
    surahs: Object.keys(bySurah).length,
    current, longest, weeks, topSurahs, tags, latest,
  };
}

function WeeklyChart({ weeks }) {
  const W = 320, H = 132, padL = 22, padB = 22, padT = 8;
  const max = Math.max(1, ...weeks.map((w) => w.refl + w.fav));
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const bw = (W - padL) / weeks.length;
  const y = (v) => padT + (H - padT - padB) * (1 - v / niceMax);
  const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Entries per week, last 12 weeks" style={{ display: "block", overflow: "visible" }}>
      {[0, niceMax / 2, niceMax].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--outline-ghost)" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--on-surface-variant)" fontFamily="Outfit, sans-serif">{t}</text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const x = padL + i * bw + bw * 0.18, bwid = bw * 0.64;
        const hr = y(0) - y(w.refl), hf = y(0) - y(w.fav);
        return (
          <g key={i}>
            <title>{`Week of ${fmt(w.start)}: ${w.refl} reflections, ${w.fav} favorites`}</title>
            {w.fav > 0 && <rect x={x} y={y(0) - hf} width={bwid} height={hf} rx="2" fill="var(--primary)" opacity="0.35" />}
            {w.refl > 0 && <rect x={x} y={y(0) - hf - hr} width={bwid} height={hr} rx="2" fill="var(--primary-container)" />}
          </g>
        );
      })}
      <text x={padL} y={H - 4} fontSize="10" fill="var(--on-surface-variant)" fontFamily="Outfit, sans-serif">{fmt(weeks[0].start)}</text>
      <text x={W} y={H - 4} textAnchor="end" fontSize="10" fill="var(--on-surface-variant)" fontFamily="Outfit, sans-serif">This week</text>
    </svg>
  );
}

export default function HomeTab({ setTab, onSettings }) {
  const [entries, setEntries] = useState(null);
  useEffect(() => { dbGetAll().then(setEntries).catch(() => setEntries([])); }, []);
  const stats = useMemo(() => (entries ? computeStats(entries) : null), [entries]);

  const bookmark = (() => { try { return localStorage.getItem("qr_bookmark_ayah"); } catch { return null; } })();
  const [bs, ba] = (bookmark || "1:1").split(":").map(Number);
  const surahName = SURAHS.find((s) => s[0] === bs)?.[1] ?? "Al-Fatihah";
  const ordinal = (ORDINAL[bs] ?? 0) + ba;
  const pct = (ordinal / TOTAL_AYAHS) * 100;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const topMax = stats?.topSurahs[0]?.c || 1;

  return (
    <div style={pageContainerStyle}>
      <PageHeader title="Home" onSettings={onSettings} />
      <p style={{ ...pageSubtitleStyle, fontFamily: "'Outfit',sans-serif", fontSize: 16 }}>
        {greet} <span style={{ color: "var(--on-surface-variant)" }}>One ayah at a time.</span>
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {/* Continue reading */}
        <section style={card}>
          <p style={eyebrow}>Continue reading</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={h2}>{surahName} · {bs}:{ba}</h2>
              <p style={{ ...muted, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                {ordinal.toLocaleString()} of {TOTAL_AYAHS.toLocaleString()} ayahs · {pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%
              </p>
            </div>
            <button style={primaryBtnStyle} onClick={() => setTab("read")}>Resume</button>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: "var(--outline-ghost)", marginTop: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(1, pct)}%`, background: "var(--primary-container)", borderRadius: 4 }} />
          </div>
        </section>

        {/* Headline numbers */}
        <section aria-label="Your practice" style={{
          display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          border: "1px solid var(--outline-ghost)", borderRadius: 16, overflow: "hidden",
          background: "var(--outline-ghost)", gap: 1,
        }}>
          {[
            [stats?.current, "day streak", stats ? `Best: ${stats.longest} days` : ""],
            [stats?.reflections, "reflections", stats ? `Across ${stats.surahs} surahs` : ""],
            [stats?.favorites, "favorite ayahs", ""],
            [`${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%`, "of the Quran read", ""],
          ].map(([v, l, sub], i) => (
            <div key={i} style={{ background: "var(--surface-lowest)", padding: "16px 18px", minWidth: 0 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--on-surface)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                {v ?? "–"}
              </div>
              <p style={{ ...muted, color: "var(--on-surface)" }}>{l}</p>
              {sub && <p style={{ ...muted, fontSize: 12 }}>{sub}</p>}
            </div>
          ))}
        </section>

        {/* Weekly activity */}
        {stats && (
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <p style={{ ...eyebrow, margin: 0 }}>Last 12 weeks</p>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ ...muted, display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--primary-container)" }} />Reflections</span>
                <span style={{ ...muted, display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--primary)", opacity: 0.35 }} />Favorites</span>
              </div>
            </div>
            <WeeklyChart weeks={stats.weeks} />
          </section>
        )}

        {/* Most visited surahs */}
        {stats && stats.topSurahs.length > 0 && (
          <section style={card}>
            <p style={eyebrow}>Surahs you return to</p>
            <div style={{ display: "grid", gap: 12 }}>
              {stats.topSurahs.map((s) => (
                <div key={s.n} style={{ display: "grid", gridTemplateColumns: "minmax(0,8.5rem) minmax(0,1fr) 2.5rem", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--surface-low)" }}>
                    <div style={{ height: "100%", width: `${(s.c / topMax) * 100}%`, background: "var(--primary-container)", borderRadius: 4 }} />
                  </div>
                  <span style={{ ...muted, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{s.c}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Themes */}
        {stats && stats.tags.length > 0 && (
          <section style={card}>
            <p style={eyebrow}>Themes in your reflections</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {stats.tags.map(([t, c]) => (
                <span key={t} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, padding: "6px 12px", borderRadius: 999, border: "1px solid var(--outline-ghost)", color: "var(--on-surface)" }}>
                  {t} <span style={{ color: "var(--ink-accent)", fontVariantNumeric: "tabular-nums" }}>{c}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Latest reflection */}
        {stats?.latest && (
          <section style={card}>
            <p style={eyebrow}>Latest reflection</p>
            <h2 style={{ ...h2, fontSize: 18 }}>{stats.latest.surahName} {stats.latest.startAyah}{Number(stats.latest.endAyah) !== Number(stats.latest.startAyah) ? `–${stats.latest.endAyah}` : ""}</h2>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, lineHeight: 1.7, color: "var(--on-surface)", margin: "8px 0 0", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {stats.latest.reflection}
            </p>
            <button onClick={() => setTab("journal")} style={{ marginTop: 12, background: "none", border: "none", padding: 0, color: "var(--ink-accent)", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Open journal →
            </button>
          </section>
        )}

        {entries && entries.length === 0 && (
          <section style={{ ...card, textAlign: "center" }}>
            <h2 style={{ ...h2, fontSize: 18 }}>Your numbers start here.</h2>
            <p style={{ ...muted, marginTop: 8 }}>Favorite or reflect on an ayah in Read, and your streak and charts will appear.</p>
          </section>
        )}
      </div>
    </div>
  );
}
