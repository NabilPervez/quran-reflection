import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchAyah } from "../lib/api";
import { dbGetAll, dbAdd, dbDelete, dbUpdate } from "../lib/db";
import { SURAHS, SURAH_START_PAGE, JUZ_START_PAGE } from "../lib/data";
import { cardStyle, labelStyle, underlineInputStyle, verseAreaStyle, secondaryBtnStyle, primaryBtnStyle, underlineSelectStyle } from "../lib/styles";
import PageHeader from "./PageHeader";

// ── Pre-compute cumulative ayah ordinals for the progress bar ─────────────────
// AYAH_ORDINALS[surahNum] = ordinal (1-based) of the first ayah in that surah
const AYAH_ORDINALS = (() => {
  const map = {};
  let running = 0;
  for (const [num, , count] of SURAHS) {
    map[num] = running + 1;
    running += count;
  }
  return map;
})();
const TOTAL_AYAHS = 6236;

const BOOKMARK_KEY = "qr_bookmark_ayah";

const PRESET_TAGS = ["Gratitude", "Dua", "Lesson", "Patience", "Tawakkul", "Tawbah", "Reflection", "Reminder"];

function skeletonLine(widthPct) {
  return {
    height: 12, borderRadius: 6, marginBottom: 12, width: `${widthPct}%`,
    background: "linear-gradient(90deg, var(--surface-low) 25%, var(--surface-lowest) 50%, var(--surface-low) 75%)",
    backgroundSize: "600px 100%", animation: "shimmer 1.6s infinite linear",
  };
}

export default function ReadTab({ onReflect, onSettings, showToast }) {
  const [currentPos, setCurrentPos] = useState(() => {
    const saved = localStorage.getItem(BOOKMARK_KEY);
    if (saved) {
      const [s, a] = saved.split(":");
      return { surah: Number(s), ayah: Number(a) };
    }
    return { surah: 1, ayah: 1 };
  });
  const [contentKey, setContentKey] = useState(0);
  const [ayah, setAyah] = useState(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [surahSearch, setSurahSearch] = useState("");
  const [showSurahDrop, setShowSurahDrop] = useState(false);
  const [selectedSurahNum, setSelectedSurahNum] = useState(null);
  const [selectedJuzNum, setSelectedJuzNum] = useState("");
  const [bookmarked, setBookmarked] = useState(false);

  // H4 — Independent verse layer toggles: each can be on/off independently
  const [showArabic, setShowArabic] = useState(
    () => localStorage.getItem("qr_show_arabic") !== "0"
  );
  const [showTranslit, setShowTranslit] = useState(
    () => localStorage.getItem("qr_show_translit") === "1"
  );
  const [showEnglish, setShowEnglish] = useState(
    () => localStorage.getItem("qr_show_english") === "1"
  );

  const [favorites, setFavorites] = useState({}); // map of verseKey -> entryId

  // Load favorites
  useEffect(() => {
    dbGetAll().then(entries => {
      const favs = {};
      entries.forEach(e => {
        if (e.tags && e.tags.includes("Favorite")) {
          favs[`${e.surahNumber}:${e.startAyah}`] = e.id;
        }
      });
      setFavorites(favs);
    });
  }, [currentPos]);

  const handleFavorite = async (ayahObj) => {
    const surahName = SURAHS.find((s) => s[0] === ayahObj.surahNum)?.[1] ?? "";
    const ayahKey = `${ayahObj.surahNum}:${ayahObj.ayahNum}`;
    
    if (favorites[ayahKey]) {
      // Un-favorite
      const entryId = favorites[ayahKey];
      const entries = await dbGetAll();
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        const newTags = (entry.tags || []).filter(t => t !== "Favorite");
        if (newTags.length === 0 && entry.reflection === "Favorited Ayah") {
          await dbDelete(entryId);
        } else {
          await dbUpdate({ ...entry, tags: newTags });
        }
      }
      setFavorites(prev => { const n = {...prev}; delete n[ayahKey]; return n; });
      if (showToast) showToast("Removed from favorites");
    } else {
      // Favorite
      const record = {
        surahNumber: ayahObj.surahNum,
        surahName: surahName,
        startAyah: ayahObj.ayahNum,
        endAyah: ayahObj.ayahNum,
        arabic: [{ number: ayahObj.ayahNum, text: ayahObj.arabic }],
        english: [{ number: ayahObj.ayahNum, text: ayahObj.english }],
        reflection: "Favorited Ayah",
        tags: ["Favorite"],
        createdAt: Date.now()
      };
      const newId = await dbAdd(record);
      setFavorites(prev => ({ ...prev, [ayahKey]: newId }));
      if (showToast) showToast("Added to favorites ♥");
    }
  };


  // H4 — Persist each toggle independently
  useEffect(() => { localStorage.setItem("qr_show_arabic",  showArabic  ? "1" : "0"); }, [showArabic]);
  useEffect(() => { localStorage.setItem("qr_show_translit", showTranslit ? "1" : "0"); }, [showTranslit]);
  useEffect(() => { localStorage.setItem("qr_show_english",  showEnglish  ? "1" : "0"); }, [showEnglish]);

  const surahRef = useRef(null);
  const topRef = useRef(null);
  const touchStartRef = useRef(null); // L5 swipe

  const savedBookmark = useMemo(
    () => localStorage.getItem(BOOKMARK_KEY) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPos]
  );

  const filteredSurahs = SURAHS.filter(
    (s) => s[1].toLowerCase().includes(surahSearch.toLowerCase()) || String(s[0]).includes(surahSearch)
  );

  // Close Surah dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (surahRef.current && !surahRef.current.contains(e.target)) setShowSurahDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch ayah whenever currentPos changes
  useEffect(() => {
    setAyah(null);
    setFetchError("");
    setLoading(true);
    setShowTafsir(false); // hide tafsir initially

    const controller = new AbortController();
    fetchAyah(currentPos.surah, currentPos.ayah, controller.signal)
      .then((data) => { setAyah(data); setLoading(false); setContentKey((k) => k + 1); })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setFetchError("Could not load this Ayah. Please check your internet connection.");
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentPos]);

  // Auto-bookmark when ayah changes
  useEffect(() => {
    localStorage.setItem(BOOKMARK_KEY, `${currentPos.surah}:${currentPos.ayah}`);
    setBookmarked(true);
  }, [currentPos]);

  const goToAyah = useCallback((surah, ayah) => {
    const sData = SURAHS.find((s) => s[0] === surah);
    if (!sData) return;
    setCurrentPos({ surah, ayah });
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const nextAyah = useCallback(() => {
    const sData = SURAHS.find((s) => s[0] === currentPos.surah);
    if (!sData) return;
    const maxAyahs = sData[2];
    if (currentPos.ayah < maxAyahs) {
      goToAyah(currentPos.surah, currentPos.ayah + 1);
    } else if (currentPos.surah < 114) {
      goToAyah(currentPos.surah + 1, 1);
    }
  }, [currentPos, goToAyah]);

  const prevAyah = useCallback(() => {
    if (currentPos.ayah > 1) {
      goToAyah(currentPos.surah, currentPos.ayah - 1);
    } else if (currentPos.surah > 1) {
      const prevSurah = SURAHS.find((s) => s[0] === currentPos.surah - 1);
      goToAyah(currentPos.surah - 1, prevSurah[2]);
    }
  }, [currentPos, goToAyah]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "ArrowLeft"  && !isTyping) { e.preventDefault(); prevAyah(); }
      if (e.key === "ArrowRight" && !isTyping) { e.preventDefault(); nextAyah(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextAyah, prevAyah]);

  // L5 — Swipe navigation
  useEffect(() => {
    const onTouchStart = (e) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
      touchStartRef.current = null;
      if (Math.abs(dx) < 60 || dy > 40) return; // not a clean horizontal swipe
      if (dx < 0) nextAyah(); else prevAyah();
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [nextAyah, prevAyah]);

  const toggleBookmark = () => {
    const currentStr = `${currentPos.surah}:${currentPos.ayah}`;
    if (localStorage.getItem(BOOKMARK_KEY) === currentStr) {
      localStorage.removeItem(BOOKMARK_KEY);
      setBookmarked(false);
    } else {
      localStorage.setItem(BOOKMARK_KEY, currentStr);
      setBookmarked(true);
    }
  };

  const handleSurahSelect = (surahNum) => {
    setSelectedSurahNum(surahNum);
    setSelectedJuzNum(""); // Clear juz selection when surah is selected
    setSurahSearch("");
    setShowSurahDrop(false);
    goToAyah(surahNum, 1);
  };

  const handleJuzSelect = (juzNum) => {
    setSelectedJuzNum(juzNum);
    setSelectedSurahNum(null); // Clear surah selection when juz is selected
    if (juzNum) {
      // Find surah that starts exactly at this Juz page, fallback to Surah 1
      const startPage = JUZ_START_PAGE[juzNum] ?? 1;
      let targetSurah = 1;
      for (const [surah, pg] of Object.entries(SURAH_START_PAGE)) {
        if (pg <= startPage) targetSurah = Number(surah);
        else break;
      }
      goToAyah(targetSurah, 1);
    }
  };

  const selectedSurahLabel = selectedSurahNum
    ? `${selectedSurahNum}. ${SURAHS.find((s) => s[0] === selectedSurahNum)?.[1] ?? ""}`
    : null;

  const chipBtn = (active) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "7px 16px", borderRadius: 40,
    border: "1px solid var(--outline-ghost)",
    background: active ? "var(--primary-light)" : "transparent",
    color: "var(--primary-container)",
    fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.3s ease",
  });

  // H3 — Reading progress percentage
  const readingProgress = useMemo(() => {
    const ordinal = (AYAH_ORDINALS[currentPos.surah] ?? 1) + currentPos.ayah - 1;
    return Math.min(100, (ordinal / TOTAL_AYAHS) * 100);
  }, [currentPos]);

  return (
    <div style={{ padding: "36px 24px 140px", maxWidth: 720, margin: "0 auto" }} ref={topRef}>
      {/* H3 — Reading Progress Bar */}
      <div style={{
        position: "sticky", top: 0, left: 0, right: 0, zIndex: 50,
        height: 3, background: "var(--outline-ghost)",
        marginBottom: 20,
      }}>
        <div style={{
          height: "100%",
          width: `${readingProgress}%`,
          background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)",
          transition: "width 0.4s ease",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>

      <PageHeader title="Read & Reflect" onSettings={onSettings} />

      {/* Bookmark actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button id="bookmark-btn" onClick={toggleBookmark}
          title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          style={{ background: bookmarked ? "var(--primary-light)" : "var(--surface-low)", color: bookmarked ? "var(--primary-container)" : "var(--on-surface-variant)", border: bookmarked ? "1px solid var(--primary-container)" : "1px solid var(--outline-ghost)", borderRadius: 40, padding: "7px 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif", transition: "all 0.3s ease" }}
        >
          🔖 {bookmarked ? "Saved" : "Save Bookmark"}
        </button>
        {savedBookmark && savedBookmark !== `${currentPos.surah}:${currentPos.ayah}` && (
          <button
            onClick={() => {
              const [s, a] = savedBookmark.split(":");
              goToAyah(Number(s), Number(a));
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 40,
              background: "var(--surface-lowest)", border: "1px solid var(--outline-ghost)",
              color: "var(--primary-container)",
              fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface-lowest)"}
          >
            Resume at Surah {savedBookmark.replace(':', ' Ayah ')}
          </button>
        )}
      </div>

      <details style={{ marginBottom: 24, cursor: 'pointer', outline: 'none' }}>
        <summary style={{ padding: 12, background: 'var(--surface-lowest)', borderRadius: 12, border: '1px solid var(--outline-ghost)', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
          Navigation
        </summary>
        <div style={{ padding: '16px 0' }}>
      {/* Navigation Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Surah Selector */}
        <div ref={surahRef}>
          <label style={labelStyle}>Jump to Surah</label>
          <div style={{ position: "relative" }}>
          <input
            id="read-surah-search"
            value={surahSearch}
            onChange={(e) => { setSurahSearch(e.target.value); setShowSurahDrop(true); }}
            onFocus={() => setShowSurahDrop(true)}
            placeholder={selectedSurahLabel ?? "Search by name or number…"}
            style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box" }}
            autoComplete="off"
          />
            {showSurahDrop && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "var(--surface-lowest)", borderRadius: 14,
                maxHeight: 240, overflowY: "auto", zIndex: 200,
                boxShadow: "0 40px 60px rgba(26,28,26,0.06)",
                outline: "1px solid rgba(193,201,191,0.15)",
              }}>
                {filteredSurahs.length === 0 && (
                  <div style={{ padding: "14px 18px", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 13 }}>No results</div>
                )}
                {filteredSurahs.map((s) => (
                  <div key={s[0]} onClick={() => handleSurahSelect(s[0])}
                    style={{ padding: "11px 18px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--on-surface)", background: selectedSurahNum === s[0] ? "var(--primary-light)" : "transparent", transition: "background 0.2s ease" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedSurahNum === s[0] ? "var(--primary-light)" : "transparent"}
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

        {/* Juz Selector */}
        <div>
          <label style={labelStyle}>Jump to Juz</label>
          <select
            id="read-juz-select"
            value={selectedJuzNum}
            onChange={(e) => handleJuzSelect(e.target.value)}
            style={{ ...underlineSelectStyle, width: "100%", boxSizing: "border-box", padding: "10px 2px" }}
          >
            <option value="">Select Juz…</option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>Juz {n}</option>
            ))}
          </select>
        </div>

        {/* Ayah Selector */}
        <div>
          <label style={labelStyle}>Jump to Ayah</label>
          <div style={{ position: "relative" }}>
            <input
              id="read-ayah-select"
              type="number"
              min="1"
              max={SURAHS.find(s => s[0] === currentPos.surah)?.[2] || 1}
              value={currentPos.ayah || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  const maxAyah = SURAHS.find(s => s[0] === currentPos.surah)?.[2] || 1;
                  if (val >= 1 && val <= maxAyah) {
                    goToAyah(currentPos.surah, val);
                  }
                }
              }}
              placeholder={`1 - ${SURAHS.find(s => s[0] === currentPos.surah)?.[2] || 1}`}
              style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box" }}
            />
          </div>
        </div>
      </div>
      </div>
      </details>

      {/* (Page indicator removed as requested) */}
      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ ...verseAreaStyle, padding: "28px 24px" }}>
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <div style={{ ...skeletonLine(70), marginLeft: "auto", marginBottom: 10 }} />
                <div style={{ ...skeletonLine(85), marginLeft: "auto", marginBottom: 10 }} />
                <div style={{ ...skeletonLine(55), marginLeft: "auto" }} />
              </div>
              <div style={skeletonLine(90)} />
              <div style={skeletonLine(75)} />
              <div style={skeletonLine(60)} />
            </div>
        </div>
      )}

      {/* Error */}
      {fetchError && !loading && (
        <div style={{ ...verseAreaStyle, background: "#fef2f2" }}>
          <p style={{ color: "#b91c1c", fontFamily: "'Inter',sans-serif", fontSize: 13, margin: 0 }}>⚠ {fetchError}</p>
        </div>
      )}

      {/* Ayah list — fades on page change */}
      {!loading && !fetchError && ayah && (
        <div key={contentKey} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "pageFade 0.35s ease" }}>
          {(() => {
            const surahName = SURAHS.find((s) => s[0] === ayah.surahNum)?.[1] ?? "";
            return (
              <div key={ayah.verseKey}>


                <div style={{ ...cardStyle, padding: "24px" }}>
                  {/* Ayah badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <button
                      onClick={() => setShowTafsir(!showTafsir)}
                      style={{
                        background: showTafsir ? "var(--primary-light)" : "transparent",
                        border: "1px solid var(--primary-container)", borderRadius: 20,
                        padding: "3px 10px", fontSize: 10, fontWeight: 700,
                        color: "var(--primary-container)", cursor: "pointer",
                        fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em",
                        transition: "all 0.2sease"
                      }}
                    >
                      {showTafsir ? "Hide Tafsir" : "Tafsir"}
                    </button>
                    <span style={{ background: "var(--primary-light)", color: "var(--primary-container)", fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em" }}>
                      {ayah.surahNum}:{ayah.ayahNum}
                    </span>
                  </div>

                  {/* H4 — Independent verse layer toggles */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 18, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {[
                      { label: "Arabic",           active: showArabic,   toggle: () => setShowArabic(v => !v),   disabled: false },
                      { label: "Transliteration",  active: showTranslit,  toggle: () => setShowTranslit(v => !v), disabled: !ayah.transliteration },
                      { label: "English",          active: showEnglish,   toggle: () => setShowEnglish(v => !v),  disabled: false },
                    ].map(({ label, active, toggle, disabled }) => (
                      <button
                        key={label}
                        onClick={() => !disabled && toggle()}
                        disabled={disabled}
                        style={{
                          padding: "4px 12px", borderRadius: 40, fontSize: 11, fontWeight: 600,
                          fontFamily: "'Inter',sans-serif", cursor: disabled ? "not-allowed" : "pointer",
                          border: `1px solid ${active && !disabled ? "var(--primary-container)" : "var(--outline-ghost)"}`,
                          background: active && !disabled ? "var(--primary-light)" : "transparent",
                          color: active && !disabled ? "var(--primary-container)" : "var(--on-surface-variant)",
                          opacity: disabled ? 0.35 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Arabic */}
                  {showArabic && (
                  <p style={{ fontFamily: "'Amiri','Scheherazade New',serif", fontSize: 26, lineHeight: 2.4, color: "var(--on-surface)", direction: "rtl", textAlign: "right", margin: "0 0 20px" }}>
                    {ayah.arabic}
                  </p>
                  )}

                  {/* Transliteration */}
                  {showTranslit && ayah.transliteration && (
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13.5, lineHeight: 1.85, color: "var(--primary-container)", fontStyle: "italic", margin: "0 0 14px", opacity: 0.8 }}>
                      {ayah.transliteration}
                    </p>
                  )}

                  {/* English — text */}
                  {showEnglish && (
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14.5, lineHeight: 1.85, color: "var(--on-surface-variant)", display: "block", marginBottom: 20, fontWeight: 400 }}>
                    {ayah.english}
                  </span>
                  )}

                  {showTafsir && (
                    <div style={{ padding: "16px", marginBottom: "20px", background: "var(--surface-lowest)", borderRadius: 8, border: "1px solid var(--outline-ghost)" }}>
                      <h4 style={{ margin: "0 0 8px 0", fontFamily: "'Inter',sans-serif", fontSize: 12, color: "var(--primary-container)", textTransform: "uppercase" }}>Tafsir (Ibn Kathir)</h4>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: ayah.tafsir }} />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {/* Favorite button */}
                    <button
                      onClick={() => handleFavorite(ayah)}
                      style={{ ...chipBtn(favorites[`${ayah.surahNum}:${ayah.ayahNum}`]), color: favorites[`${ayah.surahNum}:${ayah.ayahNum}`] ? 'inherit' : 'var(--on-surface-variant)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.borderColor = "var(--primary-container)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = favorites[`${ayah.surahNum}:${ayah.ayahNum}`] ? "var(--primary-light)" : "transparent"; e.currentTarget.style.borderColor = "var(--outline-ghost)"; }}
                    >
                      <span style={{ fontSize: 14, color: favorites[`${ayah.surahNum}:${ayah.ayahNum}`] ? '#e11d48' : 'inherit' }}>♥</span> Favorite
                    </button>
                    {/* Reflect button */}
                    <button
                      id={`reflect-${ayah.verseKey}`}
                      onClick={() => onReflect({ surahNum: ayah.surahNum, start: ayah.ayahNum, end: ayah.ayahNum })}
                      style={chipBtn(false)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.borderColor = "var(--primary-container)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--outline-ghost)"; }}
                    >
                      <span style={{ fontSize: 14 }}>✦</span> Reflect
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Pagination controls */}
      {!fetchError && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 40 }}>
          <button id="prev-ayah" onClick={prevAyah} disabled={currentPos.surah === 1 && currentPos.ayah === 1 || loading}
            style={{ ...secondaryBtnStyle, padding: "12px 24px", borderRadius: 40, opacity: (currentPos.surah === 1 && currentPos.ayah === 1 || loading) ? 0.35 : 1, cursor: (currentPos.surah === 1 && currentPos.ayah === 1 || loading) ? "not-allowed" : "pointer", flex: 1 }}
          >
            ← Prev Ayah
          </button>
          <button id="next-ayah" onClick={nextAyah} disabled={currentPos.surah === 114 && currentPos.ayah === 6 || loading}
            style={{ ...primaryBtnStyle, padding: "12px 24px", borderRadius: 40, opacity: (currentPos.surah === 114 && currentPos.ayah === 6 || loading) ? 0.35 : 1, cursor: (currentPos.surah === 114 && currentPos.ayah === 6 || loading) ? "not-allowed" : "pointer", flex: 1 }}
          >
            Next Ayah →
          </button>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {!fetchError && ayah && (
        <p style={{ textAlign: "center", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 11, opacity: 0.5, marginTop: 16 }}>
          ← → to navigate pages
        </p>
      )}
    </div>
  );
}
