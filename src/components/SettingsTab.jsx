import { useState, useEffect } from "react";
import { dbGetAll, dbAdd, dbClear } from "../lib/db";
import { secondaryBtnStyle, settingsSectionStyle, settingsTitleStyle, settingsDescStyle, pageTitleStyle, pageSubtitleStyle , pageContainerStyle } from "../lib/styles";
import ConfirmModal from "./ConfirmModal";
import { RECITERS } from "../lib/api";
import { FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP, clampFontScale } from "../lib/fonts";

export default function SettingsTab({ translation, setTranslation, reciter, setReciter, fontScales, setFontScales, showToast, theme, setTheme, colorScheme, setColorScheme, onBack }) {
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
        if (!r.reflection || !r.surahName) continue;
        const { id: _id, ...rest } = r;
        await dbAdd({ ...rest, createdAt: r.createdAt ?? new Date().toISOString() });
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

  const themeOptions = [
    { value: "system", label: "System Default" },
    { value: "light", label: "Light Mode" },
    { value: "dark", label: "Dark Mode" },
  ];

  const schemeOptions = [
    { value: "default", label: "Default" },
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 20, color: "var(--on-surface)", display: "flex",
              alignItems: "center", justifyContent: "center",
              width: 38, height: 38, borderRadius: "50%",
              transition: "background 0.3s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-low)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            ←
          </button>
        )}
        <h1 style={{ ...pageTitleStyle, marginBottom: 0 }}>Settings</h1>
      </div>
      <p style={pageSubtitleStyle}>All data is stored locally on your device only.</p>

      {/* Translation */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>English Translation</h2>
        <div style={{ marginBottom: 20 }}>
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: "1px solid var(--outline-ghost)", background: "var(--surface-lowest)",
              color: "var(--on-surface)", fontFamily: "'DM Sans',sans-serif", fontSize: 14,
            }}
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
        <p style={settingsDescStyle}>Voice used by the Listen button on each ayah.</p>
        <div style={{ marginBottom: 20 }}>
          <select
            value={reciter}
            onChange={(e) => setReciter(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: "1px solid var(--outline-ghost)", background: "var(--surface-lowest)",
              color: "var(--on-surface)", fontFamily: "'DM Sans',sans-serif", fontSize: 14,
            }}
          >
            {RECITERS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

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
            fontFamily: "'Amiri','Scheherazade New',serif",
            fontSize: "var(--ayah-size)", lineHeight: "var(--ayah-lh)",
            color: "var(--on-surface)", direction: "rtl", textAlign: "right",
            margin: "0 0 10px",
          }}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
          <p style={{
            fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic",
            fontSize: "var(--translit-size)", lineHeight: "var(--translit-lh)",
            color: "var(--verse-translit)", margin: "0 0 8px",
          }}>
            Bismi Allahi ar-Rahmani ar-Raheem
          </p>
          <p style={{
            fontFamily: "'Cormorant Garamond',serif",
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
                fontFamily: "'DM Sans',sans-serif",
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
                fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500,
                color: "var(--on-surface)",
              }}>{label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {stepBtn(-1, atMin, "−")}
                <span style={{
                  minWidth: 52, textAlign: "center",
                  fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600,
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

      {/* Appearance */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Appearance Mode</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              id={`theme-${opt.value}`}
              onClick={() => setTheme(opt.value)}
              style={{
                padding: "9px 20px", borderRadius: 40,
                border: "none",
                background: theme === opt.value
                  ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)"
                  : "var(--surface-low)",
                color: theme === opt.value ? "var(--on-primary)" : "var(--on-surface-variant)",
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                fontSize: 13, fontWeight: 500, transition: "all 0.3s ease",
              }}
            >{opt.label}</button>
          ))}
        </div>

        <h2 style={settingsTitleStyle}>Color Scheme</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {schemeOptions.map((opt) => (
            <button
              key={opt.value}
              id={`scheme-${opt.value}`}
              onClick={() => setColorScheme(opt.value)}
              style={{
                padding: "9px 20px", borderRadius: 40,
                border: "none",
                background: colorScheme === opt.value
                  ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)"
                  : "var(--surface-low)",
                color: colorScheme === opt.value ? "var(--on-primary)" : "var(--on-surface-variant)",
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                fontSize: 13, fontWeight: 500, transition: "all 0.3s ease",
              }}
            >{opt.label}</button>
          ))}
        </div>
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
          Quran Reflect is a privacy-first Tadabbur journal. No accounts, no servers, no tracking.
          Verse data is fetched from the AlQuran.cloud API using your selected English translation.
          All reflections live entirely on your device in IndexedDB.
        </p>
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
