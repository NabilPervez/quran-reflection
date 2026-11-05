import { useState, useEffect } from "react";
import { dbGetAll, dbAdd, dbClear } from "../lib/db";
import { secondaryBtnStyle, settingsSectionStyle, settingsTitleStyle, settingsDescStyle, pageTitleStyle, pageSubtitleStyle , pageContainerStyle } from "../lib/styles";
import ConfirmModal from "./ConfirmModal";
import { IcBack } from "./icons";
import { REPEAT_OPTIONS, canSpeak, englishVoices, speakOnce, stopSpeaking } from "../lib/playback";
import { RECITERS } from "../lib/api";
import { FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP, clampFontScale } from "../lib/fonts";

// Older exports stored numbers as strings, verse arrays as Python-style
// strings and tags as "[]" text. Normalise all of it on import.
function parseLoose(v, fallback) {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string" || !v.trim()) return fallback;
  try { return JSON.parse(v); } catch { /* not JSON */ }
  try {
    return JSON.parse(v.replace(/'/g, '"').replace(/\bNone\b/g, "null").replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false"));
  } catch { /* still not parseable */ }
  // Last resort: pull text values out of [{'number': n, 'text': '...'}]
  const out = [...v.matchAll(/'number':\s*(\d+),\s*'text':\s*(['"])([\s\S]*?)\2\s*}/g)].map((m) => ({ number: Number(m[1]), text: m[3] }));
  return out.length ? out : fallback;
}
function normalizeRecord(r) {
  if (!r || !r.reflection || !r.surahName) return null;
  const { id: _id, ...rest } = r;
  const tags = parseLoose(r.tags, []);
  return {
    ...rest,
    surahNumber: Number(r.surahNumber),
    startAyah: Number(r.startAyah),
    endAyah: Number(r.endAyah ?? r.startAyah),
    arabic: parseLoose(r.arabic, []),
    english: parseLoose(r.english, []),
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    createdAt: r.createdAt ?? new Date().toISOString(),
  };
}

export default function SettingsTab({ onOpenPage, translation, setTranslation, reciter, setReciter, fontScales, setFontScales, showToast, theme, setTheme, colorScheme, setColorScheme, playback, setPlayback, onBack }) {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoices(englishVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); stopSpeaking(); };
  }, []);
  const setP = (patch) => setPlayback?.((p) => ({ ...p, ...patch }));
  const sample = (patch = {}) => { stopSpeaking(); const p = { ...playback, ...patch }; speakOnce("Guide us to the straight path.", { rate: p.enRate, voice: p.enVoice }); };
  const [clearConfirm1, setClearConfirm1] = useState(false);
  const [clearConfirm2, setClearConfirm2] = useState(false);
  const [entryCount, setEntryCount] = useState(null);

  useEffect(() => {
    dbGetAll().then((d) => setEntryCount(d.length)).catch(() => setEntryCount(0));
  }, []);

  const exportJSON = async () => {
    const data = await dbGetAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quran-reflections-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast("Exported as JSON ✦");
  };

  const exportCSV = async () => {
    const data = await dbGetAll();
    const headers = ["id", "createdAt", "surahName", "surahNumber", "startAyah", "endAyah", "reflection"];
    const rows = data.map((r) =>
      headers.map((h) => JSON.stringify(h === "reflection" ? r[h] : r[h] ?? "")).join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quran-reflections-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("Exported as CSV ✦");
  };

  const importJSON = async (file) => {
    try {
      const text = await file.text();
      const records = JSON.parse(text);
      if (!Array.isArray(records)) throw new Error("Invalid format");
      let count = 0;
      for (const r of records) {
        const clean = normalizeRecord(r);
        if (!clean) continue;
        await dbAdd(clean);
        count++;
      }
      setEntryCount((c) => (c ?? 0) + count);
      showToast(`Imported ${count} reflection${count !== 1 ? "s" : ""} ✦`);
    } catch {
      showToast("Import failed — invalid JSON file.", "error");
    }
  };

  const importCSV = async (file) => {
    try {
      const text = await file.text();
      const [headerLine, ...rows] = text.trim().split("\n");
      const headers = headerLine.split(",");
      let count = 0;
      for (const row of rows) {
        const vals = [];
        let cur = "", inQ = false;
        for (const ch of row) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { vals.push(cur); cur = ""; }
          else { cur += ch; }
        }
        vals.push(cur);
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = (vals[i] ?? "").replace(/^"|"$/g, ""); });
        if (!obj.reflection || !obj.surahName) continue;
        await dbAdd({
          createdAt: obj.createdAt || new Date().toISOString(),
          surahName: obj.surahName, surahNumber: Number(obj.surahNumber),
          startAyah: Number(obj.startAyah), endAyah: Number(obj.endAyah),
          reflection: obj.reflection, arabic: [], english: [],
        });
        count++;
      }
      setEntryCount((c) => (c ?? 0) + count);
      showToast(`Imported ${count} reflection${count !== 1 ? "s" : ""} ✦`);
    } catch {
      showToast("Import failed — invalid CSV file.", "error");
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.name.endsWith(".json")) importJSON(file);
    else if (file.name.endsWith(".csv")) importCSV(file);
    else showToast("Please select a .json or .csv file.", "error");
  };

  const handleClearFinal = async () => {
    await dbClear();
    setClearConfirm2(false);
    setEntryCount(0);
    showToast("All data cleared");
  };

  // Light ground, light accent, dark ground, dark accent — from index.html
  const SWATCHES = {
    default: ["#ffffff", "#c9a84c", "#131510", "#4caf7d"],
    "sacred-marble": ["#FDFBF7", "#D4AF37", "#121212", "#E5C05C"],
    andalusian: ["#F0F8FF", "#008080", "#0A192F", "#64FFDA"],
    fajr: ["#FFFCF5", "#E67E22", "#2C1E16", "#F5B041"],
    medina: ["#F0FDF4", "#10B981", "#022C22", "#34D399"],
    "gilded-amethyst": ["#EDEAFB", "#A87406", "#0F0B2E", "#FFD966"],
  };
  const themeOptions = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  const schemeOptions = [
    { value: "default", label: "Classic" },
    { value: "sacred-marble", label: "Sacred Marble" },
    { value: "andalusian", label: "Andalusian Courtyard" },
    { value: "fajr", label: "Fajr Glow" },
    { value: "medina", label: "Vibrant Medina" },
    { value: "gilded-amethyst", label: "Gilded Amethyst" },
  ];

  const translationOptions = [
    { value: "en.sahih", label: "Saheeh International" },
    { value: "en.ahmedali", label: "Ahmed Ali" },
    { value: "en.ahmedraza", label: "Ahmed Raza Khan" },
    { value: "en.arberry", label: "A. J. Arberry" },
    { value: "en.asad", label: "Muhammad Asad" },
    { value: "en.daryabadi", label: "Abdul Majid Daryabadi" },
    { value: "en.itani", label: "Clear Quran Talal Itani" },
  ];

  return (
    <div style={pageContainerStyle}>
      <div className="v2-head">
        <div>
          <p className="v2-eyebrow">Settings</p>
          <h1 className="v2-h1">Make it yours.</h1>
          <p className="v2-muted" style={{ marginTop: 8 }}>Everything is stored on this device only.</p>
        </div>
        {onBack && <button className="v2-icon-btn" onClick={onBack} aria-label="Back"><IcBack /></button>}
      </div>

      {/* Colour scheme + appearance (v2) */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Colour scheme</h2>
        <div className="v2-schemes">
          {schemeOptions.map((opt) => {
            const sw = SWATCHES[opt.value] || [];
            return (
              <button key={opt.value} id={`scheme-${opt.value}`} className="v2-scheme" aria-pressed={colorScheme === opt.value} onClick={() => setColorScheme(opt.value)}>
                <span className="sw">{sw.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Appearance</h2>
        <div className="v2-rows">
          <div className="v2-row">
            <div><div className="v2-label">Theme</div><p className="v2-muted">System follows your phone</p></div>
            <div className="v2-seg" role="group" aria-label="Theme">
              {themeOptions.map((opt) => (
                <button key={opt.value} id={`theme-${opt.value}`} aria-pressed={theme === opt.value} onClick={() => setTheme(opt.value)}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Translation */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>English Translation</h2>
        <div style={{ marginBottom: 20 }}>
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="v2-select"
          >
            {translationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reciter */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Reciter</h2>
        <p style={settingsDescStyle}>Voice used by the Arabic button on each ayah.</p>
        <div style={{ marginBottom: 20 }}>
          <select
            value={reciter}
            onChange={(e) => setReciter(e.target.value)}
            className="v2-select"
          >
            {RECITERS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Playback — Nabil, 2026-11-05 */}
      {playback && (
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Playback</h2>
        <p style={settingsDescStyle}>Arabic and English each have their own button and speed. Repeat helps you memorise an ayah.</p>
        {[
          ["pb-ar", "Arabic speed", "arRate", 0.5, 1.5],
          ...(canSpeak ? [["pb-en", "English speed", "enRate", 0.6, 1.4]] : []),
        ].map(([id, label, key, min, max]) => (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <label htmlFor={id} style={{ flex: 1, fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "var(--on-surface)" }}>{label}</label>
            <input id={id} type="range" min={min} max={max} step="0.05" value={playback[key]}
              onChange={(e) => setP({ [key]: Number(e.target.value) })}
              onPointerUp={() => key === "enRate" && sample()}
              style={{ width: "45%", accentColor: "var(--primary-container)" }} />
            <span style={{ width: 44, textAlign: "right", fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "var(--on-surface-variant)", fontVariantNumeric: "tabular-nums" }}>{Number(playback[key]).toFixed(2)}×</span>
          </div>
        ))}
        {canSpeak && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <label htmlFor="pb-voice" style={{ flex: 1, fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "var(--on-surface)" }}>English voice</label>
            <select id="pb-voice" value={playback.enVoice} onChange={(e) => { setP({ enVoice: e.target.value }); sample({ enVoice: e.target.value }); }}
            className="v2-select pill">
              <option value="">Device default</option>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <label htmlFor="pb-repeat" style={{ flex: 1, fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "var(--on-surface)" }}>Repeat each ayah</label>
          <select id="pb-repeat" value={playback.repeat} onChange={(e) => setP({ repeat: Number(e.target.value) })}
            className="v2-select pill">
            {REPEAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "var(--on-surface)" }}>Keep reading aloud</span>
            <span style={{ display: "block", fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "var(--on-surface-variant)" }}>Moves to the next ayah after playback and repeats finish</span>
          </span>
          <input type="checkbox" checked={playback.autoAdvance} onChange={(e) => setP({ autoAdvance: e.target.checked })} style={{ width: 22, height: 22, accentColor: "var(--primary-container)" }} />
        </label>
      </div>
      )}

      {/* Reading size */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Reading Size</h2>
        <p style={settingsDescStyle}>
          Set each layer independently. Sizes scale with your screen, so these
          stay comfortable on a phone and a tablet alike.
        </p>

        {/* Live preview — renders with the real tokens, so it updates as you adjust */}
        <div style={{
          background: "var(--surface-low)", borderRadius: 12,
          padding: "18px 16px", marginBottom: 18,
          border: "1px solid var(--outline-ghost)",
          overflow: "hidden",
        }}>
          <p style={{
            fontFamily: "'Noto Naskh Arabic','Amiri',serif",
            fontSize: "var(--ayah-size)", lineHeight: "var(--ayah-lh)",
            color: "var(--on-surface)", direction: "rtl", textAlign: "right",
            margin: "0 0 10px",
          }}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
          <p style={{
            fontFamily: "'Outfit',sans-serif", fontStyle: "italic",
            fontSize: "var(--translit-size)", lineHeight: "var(--translit-lh)",
            color: "var(--verse-translit)", margin: "0 0 8px",
          }}>
            Bismi Allahi ar-Rahmani ar-Raheem
          </p>
          <p style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: "var(--trans-size)", lineHeight: "var(--trans-lh)",
            color: "var(--verse-translation)", margin: 0,
          }}>
            In the name of Allah, the Entirely Merciful, the Especially Merciful.
          </p>
        </div>

        {[
          { key: "arabic",   label: "Arabic" },
          { key: "translit", label: "Transliteration" },
          { key: "trans",    label: "Translation" },
        ].map(({ key, label }) => {
          const value = fontScales[key];
          const atMin = value <= FONT_SCALE_MIN + 0.001;
          const atMax = value >= FONT_SCALE_MAX - 0.001;
          // Derive from the previous state, not the render closure, so rapid
          // taps each register instead of collapsing into a single step.
          const step = (dir) => setFontScales(prev => ({
            ...prev,
            [key]: clampFontScale(prev[key] + dir * FONT_SCALE_STEP),
          }));
          const stepBtn = (dir, disabled, glyph) => (
            <button
              onClick={() => !disabled && step(dir)}
              disabled={disabled}
              aria-label={`${dir > 0 ? "Increase" : "Decrease"} ${label.toLowerCase()} size`}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                border: "1px solid var(--outline-ghost)",
                background: "var(--surface-low)", color: "var(--on-surface)",
                fontSize: 16, fontWeight: 600, lineHeight: 1,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.35 : 1,
                fontFamily: "'Outfit',sans-serif",
              }}
            >{glyph}</button>
          );
          return (
            <div key={key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, padding: "10px 0", flexWrap: "wrap",
              borderTop: "1px solid var(--outline-ghost)",
            }}>
              <span style={{
                fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 500,
                color: "var(--on-surface)",
              }}>{label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {stepBtn(-1, atMin, "−")}
                <span style={{
                  minWidth: 52, textAlign: "center",
                  fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600,
                  color: "var(--on-surface-variant)", fontVariantNumeric: "tabular-nums",
                }}>{Math.round(value * 100)}%</span>
                {stepBtn(1, atMax, "+")}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => {
            setFontScales({ arabic: 1, translit: 1, trans: 1 });
            showToast("Reading sizes reset");
          }}
          style={{ ...secondaryBtnStyle, marginTop: 14 }}
        >
          Reset to default
        </button>
      </div>

      {/* Export */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Export Data</h2>
        <p style={settingsDescStyle}>
          Download all {entryCount !== null ? entryCount : "your"} reflection{entryCount !== 1 ? "s" : ""} before clearing browser data or switching devices.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button id="export-json" onClick={exportJSON} style={secondaryBtnStyle}>Export as JSON</button>
          <button id="export-csv" onClick={exportCSV} style={secondaryBtnStyle}>Export as CSV</button>
        </div>
      </div>

      {/* Import */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Import Data</h2>
        <p style={settingsDescStyle}>
          Restore reflections from a previously exported JSON or CSV file. Imported entries are merged with existing ones — no data is overwritten.
        </p>
        <label id="import-file-label" htmlFor="import-file-input" style={{ ...secondaryBtnStyle, display: "inline-block", cursor: "pointer" }}>
          Import JSON or CSV
        </label>
        <input id="import-file-input" type="file" accept=".json,.csv" onChange={handleImportFile} style={{ display: "none" }} />
      </div>

      {/* About */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>About</h2>
        <p style={settingsDescStyle}>
          Quran Reflections is a privacy-first Tadabbur journal. No accounts, no analytics, no tracking.
          Verses, tafsir and recitation load from public Quran APIs; your reflections and settings
          stay on this device and are never uploaded.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={() => onOpenPage("privacy")} style={secondaryBtnStyle}>Privacy Policy</button>
          <button onClick={() => onOpenPage("data")} style={secondaryBtnStyle}>Your Data</button>
        </div>
        <p style={{ ...settingsDescStyle, marginBottom: 0, fontSize: 11, opacity: 0.55 }}>Version 1.0.0 · MVP</p>
      </div>

      {/* Danger Zone */}
      <div style={{ ...settingsSectionStyle, background: "#fef2f2" }}>
        <h2 style={{ ...settingsTitleStyle, color: "#b91c1c" }}>Danger Zone</h2>
        <p style={settingsDescStyle}>Permanently delete all saved reflections from this device. This action cannot be undone.</p>
        <button
          id="clear-all-data"
          onClick={() => setClearConfirm1(true)}
          style={{ ...secondaryBtnStyle, background: "#fee2e2", color: "#b91c1c" }}
        >Clear All Data</button>
      </div>

      {clearConfirm1 && (
        <ConfirmModal
          message="Are you sure you want to delete ALL reflections? This is permanent and cannot be undone."
          onConfirm={() => { setClearConfirm1(false); setClearConfirm2(true); }}
          onCancel={() => setClearConfirm1(false)}
          confirmLabel="Yes, delete everything"
          danger
        />
      )}
      {clearConfirm2 && (
        <ConfirmModal
          message="Final warning — all reflections will be permanently erased from this device."
          onConfirm={handleClearFinal}
          onCancel={() => setClearConfirm2(false)}
          confirmLabel="Erase permanently"
          danger
        />
      )}
    </div>
  );
}
