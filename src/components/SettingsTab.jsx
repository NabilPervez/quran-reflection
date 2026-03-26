import { useState, useEffect } from "react";
import { dbGetAll, dbAdd, dbClear } from "../lib/db";
import { secondaryBtnStyle, settingsSectionStyle, settingsTitleStyle, settingsDescStyle, pageTitleStyle, pageSubtitleStyle } from "../lib/styles";
import ConfirmModal from "./ConfirmModal";

export default function SettingsTab({ showToast, theme, setTheme, onBack }) {
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
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div style={{ padding: "36px 24px 110px", maxWidth: 720, margin: "0 auto" }}>
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

      {/* Appearance */}
      <div style={settingsSectionStyle}>
        <h2 style={settingsTitleStyle}>Appearance</h2>
        <p style={settingsDescStyle}>Choose your colour theme. System Default follows your OS setting.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                cursor: "pointer", fontFamily: "'Inter',sans-serif",
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
          Verse data is fetched from the AlQuran.cloud API using the Saheeh International English translation.
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
