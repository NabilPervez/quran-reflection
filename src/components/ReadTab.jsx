import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchAyah } from "../lib/api";
import { dbGetAll, dbAdd, dbDelete, dbUpdate } from "../lib/db";
import { SURAHS, SURAH_START_PAGE, JUZ_START_PAGE } from "../lib/data";
import { cardStyle, labelStyle, underlineInputStyle, verseAreaStyle, secondaryBtnStyle, primaryBtnStyle, underlineSelectStyle } from "../lib/styles";
import PageHeader from "./PageHeader";

const BOOKMARK_KEY = "qr_bookmark_ayah";

const PRESET_TAGS = ["Gratitude", "Dua", "Lesson", "Patience", "Tawakkul", "Tawbah", "Reflection", "Reminder"];

function skeletonLine(widthPct) {
  return {
    height: 12, borderRadius: 6, marginBottom: 12, width: `${widthPct}%`,
    background: "linear-gradient(90deg, var(--surface-low) 25%, var(--surface-lowest) 50%, var(--surface-low) 75%)",
    backgroundSize: "600px 100%", animation: "shimmer 1.6s infinite linear",
  };
}

/** Highlight matching text in a string — returns array of [text, isMatch] tuples */
function highlight(text, query) {
  if (!query) return [[text, false]];
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return [[text, false]];
  return [
    [text.slice(0, idx), false],
    [text.slice(idx, idx + query.length), true],
    ...highlight(text.slice(idx + query.length), query),
  ];
}

function HighlightedText({ text, query, style }) {
  if (!query) return <span style={style}>{text}</span>;
  const parts = highlight(text, query);
  return (
    <span style={style}>
      {parts.map(([part, isMatch], i) =>
        isMatch
          ? <mark key={i} style={{ background: "rgba(26,77,46,0.18)", color: "var(--primary-container)", borderRadius: 3, padding: "0 2px" }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
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
  const [pageSearch, setPageSearch] = useState("");   // H5 in-page search

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


  const surahRef = useRef(null);
  const topRef = useRef(null);
  const searchRef = useRef(null);

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
    setPageSearch(""); // clear search
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
      if (e.key === "/" && !isTyping) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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

  const searchQuery = pageSearch.trim().toLowerCase();

  const chipBtn = (active) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "7px 16px", borderRadius: 40,
    border: "1px solid var(--outline-ghost)",
    background: active ? "var(--primary-light)" : "transparent",
    color: "var(--primary-container)",
    fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.3s ease",
  });

  return (
    <div style={{ padding: "36px 24px 140px", maxWidth: 720, margin: "0 auto" }} ref={topRef}>
      <PageHeader title="Read & Reflect" onSettings={onSettings} />

      {/* Bookmark resume pill */}
      {savedBookmark && savedBookmark !== `${currentPos.surah}:${currentPos.ayah}` && (
        <button
          onClick={() => {
            const [s, a] = savedBookmark.split(":");
            goToAyah(Number(s), Number(a));
          }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 20, padding: "7px 16px", borderRadius: 40,
            background: "var(--primary-light)", border: "1px solid var(--outline-ghost)",
            color: "var(--primary-container)",
            fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(26,77,46,0.14)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--primary-light)"}
        >
          🔖 Resume at Surah {savedBookmark.replace(':', ' Ayah ')}
        </button>
      )}

      <details style={{ marginBottom: 24, cursor: 'pointer', outline: 'none' }}>
        <summary style={{ padding: 12, background: 'var(--surface-lowest)', borderRadius: 12, border: '1px solid var(--outline-ghost)', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
          Navigation & Search
        </summary>
        <div style={{ padding: '16px 0' }}>
      {/* Navigation Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
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
      </div>

      {/* H5 — In-page search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "var(--on-surface-variant)", fontSize: 14, pointerEvents: "none" }}>🔍</span>
          <input
            id="page-search"
            ref={searchRef}
            value={pageSearch}
            onChange={(e) => setPageSearch(e.target.value)}
            placeholder={`Search this page… (press / to focus)`}
            style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box", paddingLeft: 24, fontSize: 14 }}
          />
        </div>
      </div>
      </div>
      </details>

      {/* Page indicator + bookmark button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "0 auto 28px" }}>
        <div style={{ padding: "8px 20px", background: "var(--primary-light)", borderRadius: 40 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: "var(--primary-container)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Surah {currentPos.surah} : Ayah {currentPos.ayah}
          </span>
        </div>
        <button id="bookmark-btn" onClick={toggleBookmark}
          title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          style={{ background: bookmarked ? "var(--primary-light)" : "var(--surface-low)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, transition: "all 0.3s ease" }}
        >
          🔖
        </button>
      </div>

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

                  {/* Arabic */}
                  <p style={{ fontFamily: "'Amiri','Scheherazade New',serif", fontSize: 26, lineHeight: 2.4, color: "var(--on-surface)", direction: "rtl", textAlign: "right", margin: "0 0 20px" }}>
                    {ayah.arabic}
                  </p>

                  {/* English — with highlight */}
                  <HighlightedText
                    text={ayah.english}
                    query={searchQuery}
                    style={{ fontFamily: "'Inter',sans-serif", fontSize: 14.5, lineHeight: 1.85, color: "var(--on-surface-variant)", display: "block", marginBottom: 20, fontWeight: 400 }}
                  />

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
          ← → to navigate pages · / to search
        </p>
      )}
    </div>
  );
}
