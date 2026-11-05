import { useState, useEffect, useRef } from "react";

const PRESET_TAGS = ["Gratitude", "Dua", "Lesson", "Patience", "Tawakkul", "Tawbah", "Reflection", "Reminder"];
import { fetchVerses } from "../lib/api";
import { dbAdd } from "../lib/db";
import { SURAHS } from "../lib/data";
import {
  labelStyle, underlineInputStyle, underlineSelectStyle,
  verseAreaStyle, primaryBtnStyle, pageContainerStyle } from "../lib/styles";
import { GearButton } from "./icons";
import AyahAudio from "./AyahAudio";

export default function ReflectTab({ translation, reciter, onSaved, showToast, readHandoff, clearHandoff, onSettings }) {
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
    <div style={pageContainerStyle}>
      <div className="v2-head">
        <div>
          <p className="v2-eyebrow">Reflect</p>
          <h1 className="v2-h1">{selectedSurah ? <>{selectedSurah[1]}{startAyah ? ` ${startAyah}${endAyah && endAyah !== startAyah ? "–" + endAyah : ""}` : ""}.</> : <>New reflection. <span className="soft">Record your tadabbur.</span></>}</h1>
        </div>
        {onSettings && <GearButton onClick={onSettings} />}
      </div>

      {/* Surah Selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle} htmlFor="surah-search">Surah</label>
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
              border: "1px solid var(--outline-ghost)",
            }}>
              {filteredSurahs.length === 0 && (
                <div style={{ padding: "14px 18px", color: "var(--on-surface-variant)", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>No results</div>
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
                    fontFamily: "'Outfit',sans-serif", fontSize: 13,
                    color: "var(--on-surface)",
                    background: surahIdx !== "" && SURAHS[surahIdx][0] === s[0] ? "var(--primary-light)" : "transparent",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = surahIdx !== "" && SURAHS[surahIdx][0] === s[0] ? "var(--primary-light)" : "transparent"}
                >
                  <span style={{ color: "var(--ink-accent)", fontWeight: 600, marginRight: 8, fontSize: 12 }}>{s[0]}.</span>
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
          <label style={labelStyle} htmlFor="start-ayah">Start ayah</label>
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
          <label style={labelStyle} htmlFor="end-ayah">End ayah</label>
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
          <p style={{ color: "#b91c1c", fontFamily: "'Outfit',sans-serif", fontSize: 13, margin: 0 }}>⚠ {fetchError}</p>
        </div>
      )}

      {verses && !loading && !fetchError && (
        <div style={{ ...verseAreaStyle, position: "relative" }}>
          <button id="copy-verses" onClick={handleCopy} style={{
            position: "absolute", top: 16, right: 16,
            background: "transparent", border: "none",
            color: "var(--on-surface-variant)", fontSize: 12,
            fontFamily: "'Outfit',sans-serif", fontWeight: 500,
            cursor: "pointer", padding: "4px 8px", borderRadius: 6,
            transition: "color 0.3s ease, background 0.3s ease",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary-container)"; e.currentTarget.style.background = "var(--primary-light)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--on-surface-variant)"; e.currentTarget.style.background = "transparent"; }}
          >Copy</button>

          <div style={{ textAlign: "center", direction: "rtl", padding: "8px 0 var(--block-gap)", lineHeight: "var(--ayah-lh)" }}>
            {verses.arabic.map((a) => (
              <span key={a.number} style={{ fontFamily: "'Noto Naskh Arabic','Amiri',serif", fontSize: "var(--ayah-size)", color: "var(--on-surface)", display: "inline" }}>
                {a.text}{" "}
                <span style={{ fontSize: 14, color: "var(--ink-accent)", opacity: 0.9 }}>﴿{a.number}﴾</span>{" "}
              </span>
            ))}
          </div>

          <div style={{ background: "var(--surface-lowest)", borderRadius: 12, padding: "18px 20px", border: "1px solid var(--outline-ghost)" }}>
            {verses.english.map((a) => (
              <p key={a.number} style={{ fontFamily: "\'Outfit\', serif", fontSize: "var(--trans-size)", lineHeight: "var(--trans-lh)", color: "var(--verse-translation)", margin: "0 0 10px", fontWeight: 400 }}>
                <span style={{ color: "var(--ink-accent)", fontWeight: 600, fontSize: 11, marginRight: 4 }}>[{a.number}]</span>
                {a.text}
                {selectedSurah && (
                  <AyahAudio
                    key={`audio-${selectedSurah[0]}:${a.number}-${reciter}`}
                    surahNum={selectedSurah[0]}
                    ayahNum={a.number}
                    reciter={reciter}
                    onError={(msg) => showToast && showToast(msg, "error")}
                    compact
                    style={{ marginLeft: 8, verticalAlign: "middle" }}
                  />
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Reflection input */}
      <div style={{ marginTop: 40, marginBottom: 24 }}>
        <label style={labelStyle} htmlFor="reflection-input">Your reflection</label>
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
            fontSize: 16, overflow: "hidden",
          }}
        />
      </div>

      {/* Tags — tap to toggle (v2) */}
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>Tags <span style={{ color: "var(--on-surface-variant)", fontWeight: 400 }}>(optional)</span></label>
        <div className="v2-chips">
          {PRESET_TAGS.map((tag) => (
            <button key={tag} type="button" className="v2-chip" aria-pressed={tags.includes(tag)}
              onClick={() => setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])}>
              {tag}
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
          background: canSave && !saving ? "var(--primary-container)" : "var(--surface-lowest)",
          color: canSave && !saving ? "var(--on-primary)" : "var(--on-surface-variant)",
          border: canSave && !saving ? "none" : "1px solid var(--outline-ghost)", borderRadius: 999,
          fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 500,
          cursor: canSave && !saving ? "pointer" : "not-allowed",
          transition: "all 0.3s ease", letterSpacing: "0.02em",

        }}
      >
        {saving ? "Saving…" : "Save reflection"}
      </button>
    </div>
  );
}
