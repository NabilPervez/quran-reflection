import re

with open("src/components/ReadTab.jsx", "r") as f:
    content = f.read()

# Replace imports
content = content.replace('import { fetchByPage } from "../lib/api";', 'import { fetchAyah } from "../lib/api";')
content = content.replace('const BOOKMARK_KEY = "qr_bookmark_page";', 'const BOOKMARK_KEY = "qr_bookmark_ayah";')

# Replace state and effects
js_to_replace = """
  const [currentPage, setCurrentPage] = useState(
    () => Number(localStorage.getItem(BOOKMARK_KEY)) || 1
  );
  const [contentKey, setContentKey] = useState(0);
  const [ayahs, setAyahs] = useState([]);
"""
new_js = """
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
"""
content = content.replace(js_to_replace, new_js)

bookmark_use_memo = """
  const savedBookmark = useMemo(
    () => Number(localStorage.getItem(BOOKMARK_KEY)) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage]
  );
"""
new_bookmark_use_memo = """
  const savedBookmark = useMemo(
    () => localStorage.getItem(BOOKMARK_KEY) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPos]
  );
"""
content = content.replace(bookmark_use_memo, new_bookmark_use_memo)

# Fetch ayah logic
fetch_effect = """
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
"""
new_fetch_effect = """
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
"""
content = content.replace(fetch_effect, new_fetch_effect)

# bookmark effect
bk_effect = """
  // Auto-bookmark when page changes
  useEffect(() => {
    localStorage.setItem(BOOKMARK_KEY, String(currentPage));
    setBookmarked(true);
  }, [currentPage]);
"""
new_bk_effect = """
  // Auto-bookmark when ayah changes
  useEffect(() => {
    localStorage.setItem(BOOKMARK_KEY, `${currentPos.surah}:${currentPos.ayah}`);
    setBookmarked(true);
  }, [currentPos]);
"""
content = content.replace(bk_effect, new_bk_effect)

kb_shortcut = """
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
"""
new_kb = """
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
"""
content = content.replace(kb_shortcut, new_kb)

t_bkmk = """
  const toggleBookmark = () => {
    if (localStorage.getItem(BOOKMARK_KEY) === String(currentPage)) {
      localStorage.removeItem(BOOKMARK_KEY);
      setBookmarked(false);
    } else {
      localStorage.setItem(BOOKMARK_KEY, String(currentPage));
      setBookmarked(true);
    }
  };
"""
n_t_bkmk = """
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
"""
content = content.replace(t_bkmk, n_t_bkmk)


surah_sel = """
    setSelectedSurahNum(surahNum);
    setSelectedJuzNum(""); // Clear juz selection when surah is selected
    setSurahSearch("");
    setShowSurahDrop(false);
    goToPage(SURAH_START_PAGE[surahNum] ?? 1);
  };
"""
n_surah_sel = """
    setSelectedSurahNum(surahNum);
    setSelectedJuzNum(""); // Clear juz selection when surah is selected
    setSurahSearch("");
    setShowSurahDrop(false);
    goToAyah(surahNum, 1);
  };
"""
content = content.replace(surah_sel, n_surah_sel)

juz_sel = """
    setSelectedJuzNum(juzNum);
    setSelectedSurahNum(null); // Clear surah selection when juz is selected
    if (juzNum) {
      goToPage(JUZ_START_PAGE[juzNum] ?? 1);
    }
  };
"""
n_juz_sel = """
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
"""
content = content.replace(juz_sel, n_juz_sel)


search_replace_h5 = """
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
"""
new_search_replace_h5 = """
  const searchQuery = pageSearch.trim().toLowerCase();
"""
content = content.replace(search_replace_h5, new_search_replace_h5)

render_part = """
    <div style={{ padding: "36px 24px 140px", maxWidth: 720, margin: "0 auto" }} ref={topRef}>
      <PageHeader title="Read" subtitle="Read the Quran and capture reflections as you go" onSettings={onSettings} />

      {/* Bookmark resume pill */}
      {savedBookmark && savedBookmark !== currentPage && (
        <button
          onClick={() => goToPage(savedBookmark)}
"""
n_render_part = """
    <div style={{ padding: "36px 24px 140px", maxWidth: 720, margin: "0 auto" }} ref={topRef}>
      <PageHeader title="Read & Reflect" onSettings={onSettings} />

      {/* Bookmark resume pill */}
      {savedBookmark && savedBookmark !== `${currentPos.surah}:${currentPos.ayah}` && (
        <button
          onClick={() => {
            const [s, a] = savedBookmark.split(":");
            goToAyah(Number(s), Number(a));
          }}
"""
content = content.replace(render_part, n_render_part)

bkmk_text = """
          🔖 Resume at Page {savedBookmark}
"""
n_bkmk_text = """
          🔖 Resume at Surah {savedBookmark.replace(':', ' Ayah ')}
"""
content = content.replace(bkmk_text, n_bkmk_text)


nav_selectors = """
      {/* Navigation Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
"""
n_nav_selectors = """
      <details style={{ marginBottom: 24, cursor: 'pointer', outline: 'none' }}>
        <summary style={{ padding: 12, background: 'var(--surface-lowest)', borderRadius: 12, border: '1px solid var(--outline-ghost)', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
          Navigation & Search
        </summary>
        <div style={{ padding: '16px 0' }}>
      {/* Navigation Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
"""
content = content.replace(nav_selectors, n_nav_selectors)


search_clear = """
        {searchQuery && (
          <div style={{ marginTop: 6, fontFamily: "'Inter',sans-serif", fontSize: 12, color: "var(--on-surface-variant)" }}>
            {matchCount === 0 ? "No matches on this page" : `${matchCount} verse${matchCount !== 1 ? "s" : ""} match`}
            {" · "}
            <button onClick={() => setPageSearch("")} style={{ background: "none", border: "none", color: "var(--primary-container)", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, padding: 0 }}>Clear</button>
          </div>
        )}
      </div>
"""
n_search_clear = """
      </div>
      </div>
      </details>
"""
content = content.replace(search_clear, n_search_clear)


page_ind = """
      {/* Page indicator + bookmark button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "0 auto 28px" }}>
        <div style={{ padding: "8px 20px", background: "var(--primary-light)", borderRadius: 40 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: "var(--primary-container)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Page {currentPage} of 604
          </span>
        </div>
"""
n_page_ind = """
      {/* Page indicator + bookmark button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "0 auto 28px" }}>
        <div style={{ padding: "8px 20px", background: "var(--primary-light)", borderRadius: 40 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: "var(--primary-container)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Surah {currentPos.surah} : Ayah {currentPos.ayah}
          </span>
        </div>
"""
content = content.replace(page_ind, n_page_ind)

skel = """
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
"""
n_skel = """
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
"""
content = content.replace(skel, n_skel)

ayahs_list = """
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
"""
n_ayahs_list = """
      {/* Ayah list — fades on page change */}
      {!loading && !fetchError && ayah && (
        <div key={contentKey} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "pageFade 0.35s ease" }}>
          {(() => {
            const surahName = SURAHS.find((s) => s[0] === ayah.surahNum)?.[1] ?? "";
            return (
              <div key={ayah.verseKey}>
                  <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 0", borderBottom: "1px solid var(--outline-ghost)" }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600, color: "var(--on-surface-variant)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Surah {ayah.surahNum} — {surahName}
                    </span>
                  </div>

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
"""
content = content.replace(ayahs_list, n_ayahs_list)


pagin = """
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
"""

n_pagin = """
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
"""

content = content.replace(pagin, n_pagin)

with open("src/components/ReadTab.jsx", "w") as f:
    f.write(content)

with open("src/components/BottomNav.jsx", "r") as f:
    bnav = f.read()

b_nav_old = '''    { id: "read",    label: "Read",    icon: "📖" },
    { id: "reflect", label: "Reflect", icon: "✦" },
    { id: "journal", label: "Journal", icon: "📋" },'''

b_nav_new = '''    { id: "read",    label: "Read",    icon: "✧" },
    { id: "reflect", label: "Reflect", icon: "✦" },
    { id: "journal", label: "Journal", icon: "✴" },'''

bnav = bnav.replace(b_nav_old, b_nav_new)

with open("src/components/BottomNav.jsx", "w") as f:
    f.write(bnav)
