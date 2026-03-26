import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchByPage } from "../lib/api";
import { SURAHS, SURAH_START_PAGE, JUZ_START_PAGE } from "../lib/data";
import { cardStyle, labelStyle, underlineInputStyle, verseAreaStyle, secondaryBtnStyle, primaryBtnStyle, underlineSelectStyle } from "../lib/styles";
import PageHeader from "./PageHeader";

const BOOKMARK_KEY = "qr_bookmark_page";

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


export default function ReadTab({ onReflect, onSettings }) {
  const [currentPage, setCurrentPage] = useState(
    () => Number(localStorage.getItem(BOOKMARK_KEY)) || 1
  );
  const [contentKey, setContentKey] = useState(0);
  const [ayahs, setAyahs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [surahSearch, setSurahSearch] = useState("");
  const [showSurahDrop, setShowSurahDrop] = useState(false);
  const [selectedSurahNum, setSelectedSurahNum] = useState(null);
  const [selectedJuzNum, setSelectedJuzNum] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [pageSearch, setPageSearch] = useState("");   // H5 in-page search

  const surahRef = useRef(null);
  const topRef = useRef(null);
  const searchRef = useRef(null);

  const savedBookmark = useMemo(
    () => Number(localStorage.getItem(BOOKMARK_KEY)) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage]
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

  // Fetch page whenever currentPage changes
  useEffect(() => {
    setAyahs([]);
    setFetchError("");
    setLoading(true);
    setPageSearch(""); // clear search on page change

    const controller = new AbortController();
    fetchByPage(currentPage, controller.signal)
      .then((data) => { setAyahs(data); setLoading(false); setContentKey((k) => k + 1); })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setFetchError("Could not load this page. Please check your internet connection.");
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentPage]);

  // Sync bookmarked state when page changes
  useEffect(() => {
    setBookmarked(localStorage.getItem(BOOKMARK_KEY) === String(currentPage));
  }, [currentPage]);

  // L5 — Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "ArrowLeft"  && !isTyping) { e.preventDefault(); goToPage(currentPage - 1); }
      if (e.key === "ArrowRight" && !isTyping) { e.preventDefault(); goToPage(currentPage + 1); }
      if (e.key === "/" && !isTyping) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage]);

  const goToPage = useCallback((p) => {
    const clamped = Math.max(1, Math.min(604, p));
    setCurrentPage(clamped);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const toggleBookmark = () => {
    if (localStorage.getItem(BOOKMARK_KEY) === String(currentPage)) {
      localStorage.removeItem(BOOKMARK_KEY);
      setBookmarked(false);
    } else {
      localStorage.setItem(BOOKMARK_KEY, String(currentPage));
      setBookmarked(true);
    }
  };

  const handleSurahSelect = (surahNum) => {
    setSelectedSurahNum(surahNum);
    setSelectedJuzNum(""); // Clear juz selection when surah is selected
    setSurahSearch("");
    setShowSurahDrop(false);
    goToPage(SURAH_START_PAGE[surahNum] ?? 1);
  };

  const handleJuzSelect = (juzNum) => {
    setSelectedJuzNum(juzNum);
    setSelectedSurahNum(null); // Clear surah selection when juz is selected
    if (juzNum) {
      goToPage(JUZ_START_PAGE[juzNum] ?? 1);
    }
  };

  const selectedSurahLabel = selectedSurahNum
    ? `${selectedSurahNum}. ${SURAHS.find((s) => s[0] === selectedSurahNum)?.[1] ?? ""}`
    : null;

  // H5 — filter ayahs by search query
  const searchQuery = pageSearch.trim().toLowerCase();
  const visibleAyahs = searchQuery
    ? ayahs.filter((a) =>
        a.arabic.toLowerCase().includes(searchQuery) ||
        a.english.toLowerCase().includes(searchQuery)
      )
    : ayahs;

  const matchCount = searchQuery ? visibleAyahs.length : 0;

  let lastSurah = null;

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
      <PageHeader title="Read" subtitle="Read the Quran and capture reflections as you go" onSettings={onSettings} />

      {/* Bookmark resume pill */}
      {savedBookmark && savedBookmark !== currentPage && (
        <button
          onClick={() => goToPage(savedBookmark)}
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
          🔖 Resume at Page {savedBookmark}
        </button>
      )}

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
        {searchQuery && (
          <div style={{ marginTop: 6, fontFamily: "'Inter',sans-serif", fontSize: 12, color: "var(--on-surface-variant)" }}>
            {matchCount === 0 ? "No matches on this page" : `${matchCount} verse${matchCount !== 1 ? "s" : ""} match`}
            {" · "}
            <button onClick={() => setPageSearch("")} style={{ background: "none", border: "none", color: "var(--primary-container)", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, padding: 0 }}>Clear</button>
          </div>
        )}
      </div>

      {/* Page indicator + bookmark button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "0 auto 28px" }}>
        <div style={{ padding: "8px 20px", background: "var(--primary-light)", borderRadius: 40 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: "var(--primary-container)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Page {currentPage} of 604
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ ...verseAreaStyle, padding: "28px 24px" }}>
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <div style={{ ...skeletonLine(70), marginLeft: "auto", marginBottom: 10 }} />
                <div style={{ ...skeletonLine(85), marginLeft: "auto", marginBottom: 10 }} />
                <div style={{ ...skeletonLine(55), marginLeft: "auto" }} />
              </div>
              <div style={skeletonLine(90)} />
              <div style={skeletonLine(75)} />
              <div style={skeletonLine(60)} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {fetchError && !loading && (
        <div style={{ ...verseAreaStyle, background: "#fef2f2" }}>
          <p style={{ color: "#b91c1c", fontFamily: "'Inter',sans-serif", fontSize: 13, margin: 0 }}>⚠ {fetchError}</p>
        </div>
      )}

      {/* Ayah list — fades on page change */}
      {!loading && !fetchError && ayahs.length > 0 && (
        <div key={contentKey} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "pageFade 0.35s ease" }}>
          {visibleAyahs.length === 0 && searchQuery && (
            <p style={{ textAlign: "center", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 14, padding: "40px 0" }}>
              No verses match "{pageSearch}" on this page.
            </p>
          )}
          {visibleAyahs.map((ayah) => {
            const isNewSurah = ayah.surahNum !== lastSurah;
            if (isNewSurah) lastSurah = ayah.surahNum;
            const surahName = SURAHS.find((s) => s[0] === ayah.surahNum)?.[1] ?? "";
            return (
              <div key={ayah.verseKey}>
                {isNewSurah && (
                  <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 0", borderBottom: "1px solid var(--outline-ghost)" }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600, color: "var(--on-surface-variant)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Surah {ayah.surahNum} — {surahName}
                    </span>
                  </div>
                )}

                <div style={{ ...cardStyle, padding: "24px" }}>
                  {/* Ayah badge */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
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

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

                    {/* Reflect button */}
                    <button
                      id={`reflect-${ayah.verseKey}`}
                      onClick={() => onReflect({ surahNum: ayah.surahNum, start: ayah.ayahNum, end: ayah.ayahNum })}
                      style={chipBtn(false)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.borderColor = "var(--primary-container)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--outline-ghost)"; }}
                    >
                      <span style={{ fontSize: 14 }}>✎</span> Reflect
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {!fetchError && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
          <button id="prev-page" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1 || loading}
            style={{ ...secondaryBtnStyle, padding: "12px 24px", borderRadius: 6, opacity: (currentPage <= 1 || loading) ? 0.35 : 1, cursor: (currentPage <= 1 || loading) ? "not-allowed" : "pointer" }}
          >
            ← Previous
          </button>
          <button id="next-page" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= 604 || loading}
            style={{ ...primaryBtnStyle, padding: "12px 24px", opacity: (currentPage >= 604 || loading) ? 0.35 : 1, cursor: (currentPage >= 604 || loading) ? "not-allowed" : "pointer" }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {!fetchError && ayahs.length > 0 && (
        <p style={{ textAlign: "center", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 11, opacity: 0.5, marginTop: 16 }}>
          ← → to navigate pages · / to search
        </p>
      )}
    </div>
  );
}
