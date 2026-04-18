import { useState, useEffect, useRef } from "react";

const PRESET_TAGS = ["Gratitude", "Dua", "Lesson", "Patience", "Tawakkul", "Tawbah", "Reflection", "Reminder"];
import { fetchVerses } from "../lib/api";
import { dbAdd } from "../lib/db";
import { SURAHS } from "../lib/data";
import {
  labelStyle, underlineInputStyle, underlineSelectStyle,
  verseAreaStyle, primaryBtnStyle,
} from "../lib/styles";
import PageHeader from "./PageHeader";

export default function ReflectTab({ translation, onSaved, showToast, readHandoff, clearHandoff, onSettings }) {
  const [surahIdx, setSurahIdx] = useState("");
  const [startAyah, setStartAyah] = useState("");
  const [endAyah, setEndAyah] = useState("");
  const [verses, setVerses] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState([]);
  const [surahSearch, setSurahSearch] = useState("");
  const [showSurahDrop, setShowSurahDrop] = useState(false);
  const surahRef = useRef(null);
  const textRef = useRef(null);

  // Pre-fill from Read tab handoff
  useEffect(() => {
    if (!readHandoff) return;
    const { surahNum, start, end } = readHandoff;
    const idx = SURAHS.findIndex((s) => s[0] === surahNum);
    if (idx === -1) return;
    setSurahIdx(idx);
    setSurahSearch("");
    setStartAyah(String(start));
    setEndAyah(String(end));
    setVerses(null);
    setReflection("");
    if (clearHandoff) clearHandoff();
  }, [readHandoff]);

  const selectedSurah = surahIdx !== "" ? SURAHS[surahIdx] : null;
  const ayahCount = selectedSurah ? selectedSurah[2] : 0;

  const filteredSurahs = SURAHS.filter(
    (s) => s[1].toLowerCase().includes(surahSearch.toLowerCase()) || String(s[0]).includes(surahSearch)
  );

  useEffect(() => {
    const handler = (e) => {
      if (surahRef.current && !surahRef.current.contains(e.target)) setShowSurahDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!selectedSurah || !startAyah || !endAyah) return;
    setVerses(null); setFetchError(""); setLoading(true);

    const controller = new AbortController();
    fetchVerses(selectedSurah[0], Number(startAyah), Number(endAyah), controller.signal, translation)
      .then((v) => { setVerses(v); setLoading(false); })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setFetchError("Failed to fetch verses. Check your internet connection.");
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [surahIdx, startAyah, endAyah]);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "auto";
      textRef.current.style.height = textRef.current.scrollHeight + "px";
    }
  }, [reflection]);

  const handleEndAyahChange = (val) => {
    if (startAyah && Number(val) < Number(startAyah)) return;
    setEndAyah(val);
  };

  const handleSave = async () => {
    if (!reflection.trim() || !verses || fetchError) return;
    setSaving(true);
    try {
      await dbAdd({
        createdAt: new Date().toISOString(),
        surahNumber: selectedSurah[0], surahName: selectedSurah[1],
        startAyah: Number(startAyah), endAyah: Number(endAyah),
        arabic: verses.arabic, english: verses.english,
        reflection: reflection.trim(),
        tags,
      });
      onSaved();
      showToast("Reflection saved ✦");
      setSurahIdx(""); setSurahSearch(""); setStartAyah(""); setEndAyah("");
      setVerses(null); setReflection(""); setTags([]);
    } catch {
      showToast("Failed to save. Please try again.", "error");
    }
    setSaving(false);
  };

  const handleCopy = () => {
    if (!verses) return;
    const text =
      verses.arabic.map((a) => a.text).join(" ") + "\n\n" +
      verses.english.map((a) => `[${a.number}] ${a.text}`).join("\n");
    navigator.clipboard.writeText(text);
    showToast("Copied ✦");
  };

  const skeletonLine = (w) => ({
    height: 12, borderRadius: 6, marginBottom: 12, width: `${w}%`,
    background: "linear-gradient(90deg, var(--surface-low) 25%, var(--surface-lowest) 50%, var(--surface-low) 75%)",
    backgroundSize: "600px 100%", animation: "shimmer 1.6s infinite linear",
  });

  const canSave = reflection.trim().length > 0 && verses && !fetchError && !loading;

  return (
    <div style={{ padding: "36px 24px 110px", maxWidth: 720, margin: "0 auto" }}>
      <PageHeader title="New Reflection" subtitle="Select a passage and record your Tadabbur" onSettings={onSettings} />

      {/* Surah Selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Surah</label>
        <div ref={surahRef} style={{ position: "relative" }}>
          <input
            id="surah-search"
            value={surahSearch}
            onChange={(e) => { setSurahSearch(e.target.value); setShowSurahDrop(true); }}
            onFocus={() => setShowSurahDrop(true)}
            placeholder={selectedSurah ? `${selectedSurah[0]}. ${selectedSurah[1]}` : "Search by name or number…"}
            style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box" }}
            autoComplete="off"
          />
          {showSurahDrop && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
              background: "var(--surface-lowest)",
              borderRadius: 14, maxHeight: 240, overflowY: "auto",
              zIndex: 100,
              boxShadow: "0 40px 60px rgba(26,28,26,0.06)",
              outline: "1px solid rgba(193,201,191,0.15)",
            }}>
              {filteredSurahs.length === 0 && (
                <div style={{ padding: "14px 18px", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 13 }}>No results</div>
              )}
              {filteredSurahs.map((s) => (
                <div
                  key={s[0]}
                  onClick={() => {
                    setSurahIdx(SURAHS.indexOf(s));
                    setSurahSearch(""); setShowSurahDrop(false);
                    setStartAyah(""); setEndAyah(""); setVerses(null);
                  }}
                  style={{
                    padding: "11px 18px", cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", fontSize: 13,
                    color: "var(--on-surface)",
                    background: surahIdx !== "" && SURAHS[surahIdx][0] === s[0] ? "var(--primary-light)" : "transparent",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = surahIdx !== "" && SURAHS[surahIdx][0] === s[0] ? "var(--primary-light)" : "transparent"}
                >
                  <span style={{ color: "var(--primary-container)", fontWeight: 600, marginRight: 8, fontSize: 12 }}>{s[0]}.</span>
                  {s[1]}
                  <span style={{ color: "var(--on-surface-variant)", fontSize: 11, marginLeft: 6 }}>({s[2]} āyāt)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ayah Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <div>
          <label style={labelStyle}>Start Āyah</label>
          <select
            id="start-ayah"
            disabled={!selectedSurah}
            value={startAyah}
            onChange={(e) => { setStartAyah(e.target.value); setEndAyah(""); setVerses(null); }}
            style={{ ...underlineSelectStyle, width: "100%", opacity: !selectedSurah ? 0.35 : 1 }}
          >
            <option value="">—</option>
            {selectedSurah && Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>End Āyah</label>
          <select
            id="end-ayah"
            disabled={!startAyah}
            value={endAyah}
            onChange={(e) => handleEndAyahChange(e.target.value)}
            style={{ ...underlineSelectStyle, width: "100%", opacity: !startAyah ? 0.35 : 1 }}
          >
            <option value="">—</option>
            {startAyah && Array.from({ length: ayahCount - Number(startAyah) + 1 }, (_, i) => i + Number(startAyah)).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Verse Display */}
      {loading && (
        <div style={verseAreaStyle}>
          <div style={skeletonLine(55)} />
          <div style={skeletonLine(80)} />
          <div style={skeletonLine(65)} />
          <div style={{ height: 24 }} />
          <div style={skeletonLine(90)} />
          <div style={skeletonLine(75)} />
          <div style={skeletonLine(60)} />
        </div>
      )}

      {fetchError && (
        <div style={{ ...verseAreaStyle, background: "#fef2f2" }}>
          <p style={{ color: "#b91c1c", fontFamily: "'Inter',sans-serif", fontSize: 13, margin: 0 }}>⚠ {fetchError}</p>
        </div>
      )}

      {verses && !loading && !fetchError && (
        <div style={{ ...verseAreaStyle, position: "relative" }}>
          <button id="copy-verses" onClick={handleCopy} style={{
            position: "absolute", top: 16, right: 16,
            background: "transparent", border: "none",
            color: "var(--on-surface-variant)", fontSize: 12,
            fontFamily: "'Inter',sans-serif", fontWeight: 500,
            cursor: "pointer", padding: "4px 8px", borderRadius: 6,
            transition: "color 0.3s ease, background 0.3s ease",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary-container)"; e.currentTarget.style.background = "var(--primary-light)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--on-surface-variant)"; e.currentTarget.style.background = "transparent"; }}
          >Copy</button>

          <div style={{ textAlign: "center", direction: "rtl", padding: "8px 32px 32px", lineHeight: 2.6 }}>
            {verses.arabic.map((a) => (
              <span key={a.number} style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", fontSize: 26, color: "var(--on-surface)", display: "inline" }}>
                {a.text}{" "}
                <span style={{ fontSize: 14, color: "var(--primary-container)", opacity: 0.9 }}>﴿{a.number}﴾</span>{" "}
              </span>
            ))}
          </div>

          <div style={{ background: "var(--surface-lowest)", borderRadius: 12, padding: "18px 20px", boxShadow: "0 2px 16px rgba(26,28,26,0.04)" }}>
            {verses.english.map((a) => (
              <p key={a.number} style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, lineHeight: 1.85, color: "var(--on-surface-variant)", margin: "0 0 10px", fontWeight: 400 }}>
                <span style={{ color: "var(--primary-container)", fontWeight: 600, fontSize: 11, marginRight: 4 }}>[{a.number}]</span>
                {a.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Reflection input */}
      <div style={{ marginTop: 40, marginBottom: 24 }}>
        <label style={labelStyle}>Your Reflection</label>
        <textarea
          id="reflection-input"
          ref={textRef}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What are your thoughts on these verses?"
          rows={4}
          style={{
            ...underlineInputStyle,
            width: "100%", boxSizing: "border-box",
            resize: "none", minHeight: 120, lineHeight: 1.8,
            fontSize: 15, overflow: "hidden",
          }}
        />
      </div>

      {/* M2 — Tags */}
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>Tags <span style={{ opacity: 0.5, fontWeight: 400, textTransform: "none", fontSize: 10 }}>(optional)</span></label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", overflowX: "auto", whiteSpace: "nowrap" }}>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val && !tags.includes(val)) setTags([...tags, val]);
            }}
            style={{ ...underlineSelectStyle, minWidth: 140, padding: "6px 2px", height: 32 }}
          >
            <option value="">+ Add Tag</option>
            {PRESET_TAGS.filter(t => !tags.includes(t)).map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          {tags.map((tag) => (
            <button
              key={tag} type="button" onClick={() => setTags(tags.filter(t => t !== tag))}
              style={{ padding: "4px 12px", borderRadius: 40, border: "1px solid var(--primary-container)", background: "var(--primary-light)", color: "var(--primary-container)", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
            >
              {tag} <span>×</span>
            </button>
          ))}
        </div>
      </div>

      <button
        id="save-reflection"
        onClick={handleSave}
        disabled={!canSave || saving}
        style={{
          width: "100%", padding: "16px 0",
          background: canSave && !saving
            ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)"
            : "var(--surface-low)",
          color: canSave && !saving ? "var(--on-primary)" : "var(--on-surface-variant)",
          border: "none", borderRadius: 6,
          fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
          cursor: canSave && !saving ? "pointer" : "not-allowed",
          transition: "all 0.3s ease", letterSpacing: "0.02em",
          boxShadow: canSave && !saving ? "0 8px 40px rgba(0,54,26,0.18)" : "none",
        }}
      >
        {saving ? "Saving…" : "Save Reflection ✦"}
      </button>
    </div>
  );
}
