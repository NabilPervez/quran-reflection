import { useState, useEffect, useMemo, useRef } from "react";
import { fetchByPage } from "../lib/api";
import { SURAHS, SURAH_START_PAGE } from "../lib/data";
import { cardStyle, labelStyle, underlineInputStyle, verseAreaStyle, secondaryBtnStyle, primaryBtnStyle } from "../lib/styles";
import PageHeader from "./PageHeader";

const BOOKMARK_KEY = "qr_bookmark_page";

function skeletonLine(widthPct) {
  return {
    height: 12, borderRadius: 6, marginBottom: 12, width: `${widthPct}%`,
    background: "linear-gradient(90deg, var(--surface-low) 25%, var(--surface-lowest) 50%, var(--surface-low) 75%)",
    backgroundSize: "600px 100%", animation: "shimmer 1.6s infinite linear",
  };
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
  const [bookmarked, setBookmarked] = useState(false);
  const surahRef = useRef(null);
  const topRef = useRef(null);

  // Stable bookmark value — only reads localStorage when currentPage changes
  const savedBookmark = useMemo(
    () => Number(localStorage.getItem(BOOKMARK_KEY)) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage]
  );

  const filteredSurahs = SURAHS.filter(
    (s) => s[1].toLowerCase().includes(surahSearch.toLowerCase()) || String(s[0]).includes(surahSearch)
  );

  // Close dropdown on outside click
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
    fetchByPage(currentPage)
      .then((data) => { setAyahs(data); setLoading(false); setContentKey((k) => k + 1); })
      .catch(() => { setFetchError("Could not load this page. Please check your internet connection."); setLoading(false); });
  }, [currentPage]);

  // Sync bookmarked state when page changes
  useEffect(() => {
    setBookmarked(localStorage.getItem(BOOKMARK_KEY) === String(currentPage));
  }, [currentPage]);

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(604, p));
    setCurrentPage(clamped);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    setSurahSearch("");
    setShowSurahDrop(false);
    goToPage(SURAH_START_PAGE[surahNum] ?? 1);
  };

  const selectedSurahLabel = selectedSurahNum
    ? `${selectedSurahNum}. ${SURAHS.find((s) => s[0] === selectedSurahNum)?.[1] ?? ""}`
    : null;

  let lastSurah = null;

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
            background: "var(--primary-light)",
            border: "1px solid var(--outline-ghost)",
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

      {/* Surah Selector */}
      <div style={{ marginBottom: 24 }} ref={surahRef}>
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
              background: "var(--surface-lowest)",
              borderRadius: 14, maxHeight: 240, overflowY: "auto",
              zIndex: 200,
              boxShadow: "0 40px 60px rgba(26,28,26,0.06)",
              outline: "1px solid rgba(193,201,191,0.15)",
            }}>
              {filteredSurahs.length === 0 && (
                <div style={{ padding: "14px 18px", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 13 }}>No results</div>
              )}
              {filteredSurahs.map((s) => (
                <div
                  key={s[0]}
                  onClick={() => handleSurahSelect(s[0])}
                  style={{
                    padding: "11px 18px", cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", fontSize: 13,
                    color: "var(--on-surface)",
                    background: selectedSurahNum === s[0] ? "var(--primary-light)" : "transparent",
                    transition: "background 0.2s ease",
                  }}
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

      {/* Page indicator + bookmark button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "0 auto 28px" }}>
        <div style={{ padding: "8px 20px", background: "var(--primary-light)", borderRadius: 40 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: "var(--primary-container)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Page {currentPage} of 604
          </span>
        </div>
        <button
          id="bookmark-btn"
          onClick={toggleBookmark}
          title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          style={{
            background: bookmarked ? "var(--primary-light)" : "var(--surface-low)",
            border: "none", borderRadius: "50%",
            width: 34, height: 34,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16,
            transition: "all 0.3s ease",
          }}
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
          {ayahs.map((ayah) => {
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
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <span style={{ background: "var(--primary-light)", color: "var(--primary-container)", fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em" }}>
                      {ayah.surahNum}:{ayah.ayahNum}
                    </span>
                  </div>

                  <p style={{ fontFamily: "'Amiri','Scheherazade New',serif", fontSize: 26, lineHeight: 2.4, color: "var(--on-surface)", direction: "rtl", textAlign: "right", margin: "0 0 20px" }}>
                    {ayah.arabic}
                  </p>

                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14.5, lineHeight: 1.85, color: "var(--on-surface-variant)", margin: "0 0 20px", fontWeight: 400 }}>
                    {ayah.english}
                  </p>

                  <button
                    id={`reflect-${ayah.verseKey}`}
                    onClick={() => onReflect({ surahNum: ayah.surahNum, start: ayah.ayahNum, end: ayah.ayahNum })}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "7px 16px", borderRadius: 40,
                      border: "1px solid var(--outline-ghost)",
                      background: "transparent",
                      color: "var(--primary-container)",
                      fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.borderColor = "var(--primary-container)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--outline-ghost)"; }}
                  >
                    <span style={{ fontSize: 14 }}>✎</span> Reflect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {!loading && !fetchError && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
          <button
            id="prev-page"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{ ...secondaryBtnStyle, padding: "12px 24px", borderRadius: 6, opacity: currentPage <= 1 ? 0.35 : 1, cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
          >
            ← Previous
          </button>
          <button
            id="next-page"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= 604}
            style={{ ...primaryBtnStyle, padding: "12px 24px", opacity: currentPage >= 604 ? 0.35 : 1, cursor: currentPage >= 604 ? "not-allowed" : "pointer" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
