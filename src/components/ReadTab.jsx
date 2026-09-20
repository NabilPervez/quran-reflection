import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchAyah } from "../lib/api";
import { dbGetAll, dbAdd, dbDelete, dbUpdate } from "../lib/db";
import { SURAHS } from "../lib/data";
import { cardStyle, verseAreaStyle, secondaryBtnStyle, primaryBtnStyle, pageContainerStyle } from "../lib/styles";
import PageHeader from "./PageHeader";
import AyahAudio from "./AyahAudio";
import TableOfContents from "./TableOfContents";

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

export default function ReadTab({ translation, reciter, onReflect, showToast, onSettings }) {
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
  const [bookmarked, setBookmarked] = useState(false);
  const [showContents, setShowContents] = useState(false);

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

  const topRef = useRef(null);
  const touchStartRef = useRef(null); // L5 swipe

  const savedBookmark = useMemo(
    () => localStorage.getItem(BOOKMARK_KEY) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPos]
  );

  // Fetch ayah whenever currentPos changes
  useEffect(() => {
    setAyah(null);
    setFetchError("");
    setLoading(true);
    setShowTafsir(false); // hide tafsir initially

    const controller = new AbortController();
    fetchAyah(currentPos.surah, currentPos.ayah, controller.signal, translation)
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

  const chipBtn = (active) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "7px 16px", borderRadius: 40,
    border: "1px solid var(--outline-ghost)",
    background: active ? "var(--primary-light)" : "transparent",
    color: "var(--primary-container)",
    fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.3s ease",
  });

  // H3 — Reading progress percentage
  const readingProgress = useMemo(() => {
    const ordinal = (AYAH_ORDINALS[currentPos.surah] ?? 1) + currentPos.ayah - 1;
    return Math.min(100, (ordinal / TOTAL_AYAHS) * 100);
  }, [currentPos]);

  if (showContents) {
    return (
      <TableOfContents
        current={currentPos}
        onSelect={(surah, ayah) => { setShowContents(false); goToAyah(surah, ayah); }}
        onClose={() => setShowContents(false)}
      />
    );
  }

  return (
    <div style={pageContainerStyle} ref={topRef}>
      {/* H3 — Reading Progress Bar */}
      <div style={{
        position: "sticky", top: 0, left: 0, right: 0, zIndex: 50,
        height: 3, background: "var(--outline-ghost)",
        marginBottom: "var(--block-gap)",
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
      <div className="landscape-hide" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--chrome-gap)", flexWrap: "wrap" }}>
        <button id="bookmark-btn" onClick={toggleBookmark}
          title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          style={{ background: bookmarked ? "var(--primary-light)" : "var(--surface-low)", color: bookmarked ? "var(--primary-container)" : "var(--on-surface-variant)", border: bookmarked ? "1px solid var(--primary-container)" : "1px solid var(--outline-ghost)", borderRadius: 40, padding: "7px 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", transition: "all 0.3s ease" }}
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
              fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface-lowest)"}
          >
            Resume at Surah {savedBookmark.replace(':', ' Ayah ')}
          </button>
        )}
      </div>

      {/* Contents — opens the full Surah/Ayah browser */}
      <button
        onClick={() => setShowContents(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          marginBottom: "var(--block-gap)",
          padding: "9px 18px", borderRadius: 40, cursor: "pointer",
          border: "1px solid var(--outline-ghost)", background: "var(--surface-lowest)",
          color: "var(--on-surface-variant)",
          fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.color = "var(--primary-container)"; e.currentTarget.style.borderColor = "var(--primary-container)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-lowest)"; e.currentTarget.style.color = "var(--on-surface-variant)"; e.currentTarget.style.borderColor = "var(--outline-ghost)"; }}
      >
        <span aria-hidden="true">☰</span> Contents
        <span style={{ opacity: 0.7, fontWeight: 500 }}>
          · {SURAHS.find((s) => s[0] === currentPos.surah)?.[1] ?? ""} {currentPos.ayah}
        </span>
      </button>


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
          <p style={{ color: "#b91c1c", fontFamily: "'DM Sans',sans-serif", fontSize: 13, margin: 0 }}>⚠ {fetchError}</p>
        </div>
      )}

      {/* Ayah list — fades on page change */}
      {!loading && !fetchError && ayah && (
        <div key={contentKey} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "pageFade 0.35s ease" }}>
          {(() => {
            const surahName = SURAHS.find((s) => s[0] === ayah.surahNum)?.[1] ?? "";
            return (
              <div key={ayah.verseKey}>


                <div style={cardStyle}>
                  {/* Verse toolbar — reference, tafsir and layer toggles share
                      one row so the verse itself starts higher up the card. */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8, flexWrap: "wrap", marginBottom: "var(--block-gap)",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "var(--primary-light)", color: "var(--primary-container)", fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em" }}>
                      {ayah.surahNum}:{ayah.ayahNum}
                    </span>
                    <button
                      onClick={() => setShowTafsir(!showTafsir)}
                      style={{
                        background: showTafsir ? "var(--primary-light)" : "transparent",
                        border: "1px solid var(--primary-container)", borderRadius: 20,
                        padding: "3px 10px", fontSize: 10, fontWeight: 700,
                        color: "var(--primary-container)", cursor: "pointer",
                        fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em",
                        transition: "all 0.2sease"
                      }}
                    >
                      {showTafsir ? "Hide Tafsir" : "Tafsir"}
                    </button>
                  </div>

                  {/* H4 — Independent verse layer toggles */}
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
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
                          fontFamily: "'DM Sans',sans-serif", cursor: disabled ? "not-allowed" : "pointer",
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
                  </div>

                  {/* Arabic */}
                  {showArabic && (
                  <p style={{ fontFamily: "'Amiri','Scheherazade New',serif", fontSize: "var(--ayah-size)", lineHeight: "var(--ayah-lh)", color: "var(--on-surface)", direction: "rtl", textAlign: "right", margin: "0 0 var(--block-gap)", textWrap: "pretty" }}>
                    {ayah.arabic}
                  </p>
                  )}

                  {/* Transliteration */}
                  {showTranslit && ayah.transliteration && (
                    <p style={{ fontFamily: "\'Cormorant Garamond\',serif", fontSize: "var(--translit-size)", lineHeight: "var(--translit-lh)", color: "var(--primary-container)", fontStyle: "italic", margin: "0 0 14px", opacity: 0.8, maxWidth: "var(--trans-measure)" }}>
                      {ayah.transliteration}
                    </p>
                  )}

                  {/* English — text */}
                  {showEnglish && (
                  <span style={{ fontFamily: "\'Cormorant Garamond\',serif", fontSize: "var(--trans-size)", lineHeight: "var(--trans-lh)", color: "var(--on-surface-variant)", display: "block", marginBottom: "var(--block-gap)", fontWeight: 400, maxWidth: "var(--trans-measure)" }}>
                    {ayah.english}
                  </span>
                  )}

                  {showTafsir && (
                    <div style={{ padding: "16px", marginBottom: "20px", background: "var(--surface-lowest)", borderRadius: 8, border: "1px solid var(--outline-ghost)" }}>
                      <h4 style={{ margin: "0 0 8px 0", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "var(--primary-container)", textTransform: "uppercase" }}>Tafsir (Ibn Kathir)</h4>
                      <div style={{ fontFamily: "\'Cormorant Garamond\',serif", fontSize: "var(--trans-size)", color: "var(--on-surface-variant)", lineHeight: "var(--trans-lh)", maxWidth: "var(--trans-measure)" }} dangerouslySetInnerHTML={{ __html: ayah.tafsir }} />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {/* Listen button */}
                    <AyahAudio
                      key={`audio-${ayah.verseKey}-${reciter}`}
                      surahNum={ayah.surahNum}
                      ayahNum={ayah.ayahNum}
                      reciter={reciter}
                      onError={(msg) => showToast && showToast(msg, "error")}
                    />
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: "var(--chrome-gap)" }}>
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
        <p className="landscape-hide" style={{ textAlign: "center", color: "var(--on-surface-variant)", fontFamily: "'DM Sans',sans-serif", fontSize: 11, opacity: 0.5, marginTop: 16 }}>
          ← → to navigate pages
        </p>
      )}
    </div>
  );
}
