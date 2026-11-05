import { PRESET_TAGS } from "../lib/tags";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchAyah } from "../lib/api";
import { dbGetAll, dbAdd, dbDelete, dbUpdate } from "../lib/db";
import { SURAHS } from "../lib/data";
import { cardStyle, verseAreaStyle, secondaryBtnStyle, primaryBtnStyle, pageContainerStyle } from "../lib/styles";
import PageHeader from "./PageHeader";
import AyahAudio from "./AyahAudio";
import TableOfContents from "./TableOfContents";
import LayerMenu from "./LayerMenu";
import EnglishSpeak from "./EnglishSpeak";
import { repeatLabel, nextRepeat, stopSpeaking } from "../lib/playback";
import { IcRepeat, IcHeart, IcBook, IcPen, IcMinus, IcPlus, GearButton } from "./icons";
import { clampFontScale, FONT_SCALE_STEP } from "../lib/fonts";

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


function skeletonLine(widthPct) {
  return {
    height: 12, borderRadius: 6, marginBottom: 12, width: `${widthPct}%`,
    background: "linear-gradient(90deg, var(--surface-low) 25%, var(--surface-lowest) 50%, var(--surface-low) 75%)",
    backgroundSize: "600px 100%", animation: "shimmer 1.6s infinite linear",
  };
}

export default function ReadTab({ translation, reciter, onReflect, showToast, onSettings, playback, setPlayback, setFontScales }) {
  // Hands-free reading: which player should auto-start on the next ayah
  const [autoKind, setAutoKind] = useState(null);
  const [arNonce, setArNonce] = useState(0);
  const enStopRef = useRef(null);
  useEffect(() => () => stopSpeaking(), []);
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

  // Manual navigation cancels hands-free mode and any speech
  const manualNext = useCallback(() => { setAutoKind(null); enStopRef.current?.(); nextAyah(); }, [nextAyah]);
  const manualPrev = useCallback(() => { setAutoKind(null); enStopRef.current?.(); prevAyah(); }, [prevAyah]);
  const handleComplete = (kind) => {
    if (!playback?.autoAdvance) return;
    if (currentPos.surah === 114 && currentPos.ayah === 6) return;
    setAutoKind(kind);
    nextAyah();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "ArrowLeft"  && !isTyping) { e.preventDefault(); manualPrev(); }
      if (e.key === "ArrowRight" && !isTyping) { e.preventDefault(); manualNext(); }
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
      if (dx < 0) manualNext(); else manualPrev();
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [manualNext, manualPrev]);

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
    color: "var(--ink-accent)",
    fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600,
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

  const sData = SURAHS.find((s) => s[0] === currentPos.surah);
  const favKey = `${currentPos.surah}:${currentPos.ayah}`;
  const isFirst = currentPos.surah === 1 && currentPos.ayah === 1;
  const isLast = currentPos.surah === 114 && currentPos.ayah === 6;
  const bumpSize = (dir) => setFontScales?.((prev) => {
    const next = {};
    for (const k of Object.keys(prev)) next[k] = clampFontScale(prev[k] + dir * FONT_SCALE_STEP);
    return next;
  });
  const layerChips = [
    { key: "arabic", label: "Arabic", on: showArabic, set: setShowArabic },
    { key: "translit", label: "Transliteration", on: showTranslit, set: setShowTranslit },
    { key: "english", label: "English", on: showEnglish, set: setShowEnglish },
  ];
  const rep = playback?.repeat ?? 1;

  return (
    <div style={pageContainerStyle} ref={topRef}>
      {/* Sticky surah bar — tap the name for contents (Nabil, 2026-11-05: prototype layout) */}
      <div className="v2-read-top">
        <div className="row1">
          <button className="v2-surah-btn" id="contents-btn" onClick={() => setShowContents(true)} aria-label="Choose surah">
            <b>{sData?.[1] ?? ""} ▾</b>
            <span>{currentPos.surah}:{currentPos.ayah} · Ayah {currentPos.ayah} of {sData?.[2]}</span>
          </button>
          <button className="v2-icon-btn" onClick={() => bumpSize(-1)} aria-label="Smaller text"><IcMinus /></button>
          <button className="v2-icon-btn" onClick={() => bumpSize(1)} aria-label="Larger text"><IcPlus /></button>
          {onSettings && <GearButton onClick={onSettings} />}
        </div>
        <div className="v2-progress" aria-label={`${readingProgress.toFixed(2)}% of the Quran`}><i style={{ width: `${Math.max(0.5, readingProgress)}%` }} /></div>
      </div>

      <div className="v2-chips" style={{ margin: "16px 0 0" }}>
        {layerChips.map((c) => (
          <button key={c.key} className="v2-chip" aria-pressed={c.on}
            disabled={c.key === "translit" && ayah && !ayah.transliteration}
            onClick={() => {
              const others = layerChips.filter((x) => x.key !== c.key).some((x) => x.on);
              if (c.on && !others) return; // keep at least one layer visible
              c.set((v) => !v);
            }}>{c.label}</button>
        ))}
      </div>

      {loading && (
        <div className="v2-focus" aria-busy="true">
          <div style={{ ...skeletonLine(30), margin: "0 auto 28px" }} />
          <div style={{ ...skeletonLine(85), height: 22, margin: "0 auto 14px" }} />
          <div style={{ ...skeletonLine(65), height: 22, margin: "0 auto 28px" }} />
          <div style={{ ...skeletonLine(90), margin: "0 auto 12px" }} />
          <div style={{ ...skeletonLine(70), margin: "0 auto" }} />
        </div>
      )}

      {fetchError && !loading && (
        <div className="v2-focus" style={{ textAlign: "center" }}>
          <p className="v2-h2" style={{ fontSize: 18 }}>This ayah didn't load.</p>
          <p className="v2-muted" style={{ marginTop: 8 }}>Check your connection, then try again.</p>
          <div style={{ marginTop: 16 }}><button className="v2-btn ghost" onClick={() => goToAyah(currentPos.surah, currentPos.ayah)}>Try again</button></div>
        </div>
      )}

      {!loading && !fetchError && ayah && (
        <div key={contentKey} className="v2-focus">
          {showArabic && <p className="v2-ar">{ayah.arabic}</p>}
          {showTranslit && ayah.transliteration && <p className="v2-tr">{ayah.transliteration}</p>}
          {showEnglish && <p className="v2-en">{ayah.english}</p>}

          {showTafsir && (
            <div className="v2-tafsir">
              <h4>Tafsir Ibn Kathir</h4>
              <div dangerouslySetInnerHTML={{ __html: ayah.tafsir }} />
            </div>
          )}

          <div className="v2-actions">
            <AyahAudio
              key={`audio-${ayah.verseKey}-${reciter}-${arNonce}`}
              variant="action"
              surahNum={ayah.surahNum}
              ayahNum={ayah.ayahNum}
              reciter={reciter}
              rate={playback?.arRate ?? 1}
              repeat={rep}
              autoStart={autoKind === "ar"}
              onPlayStart={() => { enStopRef.current?.(); setAutoKind((k) => (k === "ar" ? k : null)); }}
              onComplete={() => handleComplete("ar")}
              onError={(msg) => showToast && showToast(msg, "error")}
            />
            <EnglishSpeak
              key={`en-${ayah.verseKey}`}
              variant="action"
              text={ayah.english}
              rate={playback?.enRate ?? 1}
              voice={playback?.enVoice ?? ""}
              repeat={rep}
              autoStart={autoKind === "en"}
              register={(fn) => { enStopRef.current = fn; }}
              onPlayStart={() => { setArNonce((n) => n + 1); setAutoKind((k) => (k === "en" ? k : null)); }}
              onComplete={() => handleComplete("en")}
            />
            <button className="v2-action" aria-pressed={rep !== 1} onClick={() => {
              const r = nextRepeat(rep);
              setPlayback?.((p) => ({ ...p, repeat: r }));
              showToast?.(r === 1 ? "Repeat off" : r === 0 ? "Repeats until you stop it" : `Repeats ${r} times`);
            }}><IcRepeat />{repeatLabel(rep)}</button>
            <button className="v2-action fav" aria-pressed={!!favorites[favKey]} onClick={() => handleFavorite(ayah)}>
              <IcHeart />{favorites[favKey] ? "Favorited" : "Favorite"}
            </button>
            <button className="v2-action" aria-pressed={showTafsir} aria-expanded={showTafsir} onClick={() => setShowTafsir(!showTafsir)}>
              <IcBook />Tafsir
            </button>
            <button className="v2-action" id={`reflect-${ayah.verseKey}`}
              onClick={() => onReflect({ surahNum: ayah.surahNum, start: ayah.ayahNum, end: ayah.ayahNum })}>
              <IcPen />Reflect
            </button>
          </div>
        </div>
      )}

      {!fetchError && (
        <div className="v2-pager">
          <button className="v2-btn ghost" id="prev-ayah" onClick={manualPrev} disabled={isFirst || loading}>← Previous</button>
          <span className="count">Ayah {currentPos.ayah} of {sData?.[2]}</span>
          <button className="v2-btn" id="next-ayah" onClick={manualNext} disabled={isLast || loading}>Next →</button>
        </div>
      )}
    </div>
  );
}
