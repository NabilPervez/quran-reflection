import { useState, useEffect, useCallback, useRef } from "react";

// ── IndexedDB helpers ────────────────────────────────────────────────────────
const DB_NAME = "QuranReflectDB";
const DB_VERSION = 1;
const STORE = "reflections";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror = () => reject(req.error);
  });
}

async function dbAdd(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbUpdate(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbClear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Surah data ───────────────────────────────────────────────────────────────
const SURAHS = [
  [1,"Al-Fatihah",7],[2,"Al-Baqarah",286],[3,"Ali 'Imran",200],[4,"An-Nisa",176],
  [5,"Al-Ma'idah",120],[6,"Al-An'am",165],[7,"Al-A'raf",206],[8,"Al-Anfal",75],
  [9,"At-Tawbah",129],[10,"Yunus",109],[11,"Hud",123],[12,"Yusuf",111],
  [13,"Ar-Ra'd",43],[14,"Ibrahim",52],[15,"Al-Hijr",99],[16,"An-Nahl",128],
  [17,"Al-Isra",111],[18,"Al-Kahf",110],[19,"Maryam",98],[20,"Ta-Ha",135],
  [21,"Al-Anbiya",112],[22,"Al-Hajj",78],[23,"Al-Mu'minun",118],[24,"An-Nur",64],
  [25,"Al-Furqan",77],[26,"Ash-Shu'ara",227],[27,"An-Naml",93],[28,"Al-Qasas",88],
  [29,"Al-Ankabut",69],[30,"Ar-Rum",60],[31,"Luqman",34],[32,"As-Sajdah",30],
  [33,"Al-Ahzab",73],[34,"Saba",54],[35,"Fatir",45],[36,"Ya-Sin",83],
  [37,"As-Saffat",182],[38,"Sad",88],[39,"Az-Zumar",75],[40,"Ghafir",85],
  [41,"Fussilat",54],[42,"Ash-Shura",53],[43,"Az-Zukhruf",89],[44,"Ad-Dukhan",59],
  [45,"Al-Jathiyah",37],[46,"Al-Ahqaf",35],[47,"Muhammad",38],[48,"Al-Fath",29],
  [49,"Al-Hujurat",18],[50,"Qaf",45],[51,"Adh-Dhariyat",60],[52,"At-Tur",49],
  [53,"An-Najm",62],[54,"Al-Qamar",55],[55,"Ar-Rahman",78],[56,"Al-Waqi'ah",96],
  [57,"Al-Hadid",29],[58,"Al-Mujadila",22],[59,"Al-Hashr",24],[60,"Al-Mumtahanah",13],
  [61,"As-Saf",14],[62,"Al-Jumu'ah",11],[63,"Al-Munafiqun",11],[64,"At-Taghabun",18],
  [65,"At-Talaq",12],[66,"At-Tahrim",12],[67,"Al-Mulk",30],[68,"Al-Qalam",52],
  [69,"Al-Haqqah",52],[70,"Al-Ma'arij",44],[71,"Nuh",28],[72,"Al-Jinn",28],
  [73,"Al-Muzzammil",20],[74,"Al-Muddaththir",56],[75,"Al-Qiyamah",40],
  [76,"Al-Insan",31],[77,"Al-Mursalat",50],[78,"An-Naba",40],[79,"An-Nazi'at",46],
  [80,"Abasa",42],[81,"At-Takwir",29],[82,"Al-Infitar",19],[83,"Al-Mutaffifin",36],
  [84,"Al-Inshiqaq",25],[85,"Al-Buruj",22],[86,"At-Tariq",17],[87,"Al-A'la",19],
  [88,"Al-Ghashiyah",26],[89,"Al-Fajr",30],[90,"Al-Balad",20],[91,"Ash-Shams",15],
  [92,"Al-Layl",21],[93,"Ad-Duha",11],[94,"Ash-Sharh",8],[95,"At-Tin",8],
  [96,"Al-Alaq",19],[97,"Al-Qadr",5],[98,"Al-Bayyinah",8],[99,"Az-Zalzalah",8],
  [100,"Al-Adiyat",11],[101,"Al-Qari'ah",11],[102,"At-Takathur",8],[103,"Al-Asr",3],
  [104,"Al-Humazah",9],[105,"Al-Fil",5],[106,"Quraysh",4],[107,"Al-Ma'un",7],
  [108,"Al-Kawthar",3],[109,"Al-Kafirun",6],[110,"An-Nasr",3],[111,"Al-Masad",5],
  [112,"Al-Ikhlas",4],[113,"Al-Falaq",5],[114,"An-Nas",6],
];

// ── Surah → Mus'haf page map (standard 604-page Mus'haf) ─────────────────────
// Each entry: surahNumber → starting page
const SURAH_START_PAGE = {
  1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,
  11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,19:305,20:312,
  21:322,22:332,23:342,24:350,25:359,26:367,27:377,28:385,29:396,30:404,
  31:411,32:415,33:418,34:428,35:434,36:440,37:446,38:453,39:458,40:467,
  41:477,42:483,43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,
  51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,59:545,60:549,
  61:551,62:553,63:554,64:556,65:558,66:560,67:562,68:564,69:566,70:568,
  71:570,72:572,73:574,74:575,75:577,76:578,77:580,78:582,79:583,80:585,
  81:586,82:587,83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,
  91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,99:599,100:599,
  101:600,102:600,103:601,104:601,105:601,106:602,107:602,108:602,109:603,110:603,
  111:603,112:604,113:604,114:604,
};

// ── API ──────────────────────────────────────────────────────────────────────
async function fetchVerses(surahNum, startAyah, endAyah) {
  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`),
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/en.sahih`),
  ]);
  if (!arRes.ok || !enRes.ok) throw new Error("API fetch failed");
  const arData = await arRes.json();
  const enData = await enRes.json();
  const arAyahs = arData.data.ayahs.slice(startAyah - 1, endAyah);
  const enAyahs = enData.data.ayahs.slice(startAyah - 1, endAyah);
  return {
    arabic: arAyahs.map((a) => ({ number: a.numberInSurah, text: a.text })),
    english: enAyahs.map((a) => ({ number: a.numberInSurah, text: a.text })),
  };
}

// Fetch one Mus'haf page from Quran.com v4 with Clear Quran translation (131)
async function fetchByPage(pageNum) {
  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani`),
    fetch(`https://api.alquran.cloud/v1/page/${pageNum}/en.itani`),
  ]);
  if (!arRes.ok || !enRes.ok) throw new Error("Page fetch failed");
  const [arData, enData] = await Promise.all([arRes.json(), enRes.json()]);
  const arAyahs = arData.data.ayahs;
  const enAyahs = enData.data.ayahs;
  return arAyahs.map((a, i) => ({
    verseKey: `${a.surah.number}:${a.numberInSurah}`,
    surahNum: a.surah.number,
    ayahNum:  a.numberInSurah,
    arabic:   a.text,
    english:  enAyahs[i]?.text ?? "",
  }));
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
      background: type === "success"
        ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)"
        : "#b91c1c",
      color: "var(--on-primary)", padding: "12px 26px", borderRadius: 40,
      fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
      zIndex: 9999,
      boxShadow: "0 8px 48px rgba(26,77,46,0.22)",
      animation: "fadeUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(26,28,26,0.48)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9000, padding: 20,
      animation: "fadeIn 0.25s ease",
    }}>
      <div style={{
        background: "var(--surface-lowest)",
        borderRadius: 20, padding: 32, maxWidth: 360, width: "100%",
        boxShadow: "0 40px 80px rgba(26,28,26,0.06)",
      }}>
        <p style={{
          color: "var(--on-surface)", fontFamily: "'Inter', sans-serif",
          lineHeight: 1.7, margin: "0 0 24px", fontSize: 15, fontWeight: 400,
        }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button id="modal-cancel" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
          <button id="modal-confirm" onClick={onConfirm} style={{
            ...primaryBtnStyle,
            background: danger ? "linear-gradient(135deg,#991b1b,#b91c1c)" : primaryBtnStyle.background,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Page Header (shared across Read / Reflect / Journal) ─────────────────────
function PageHeader({ title, subtitle, onSettings }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
      <div>
        <h1 style={pageTitleStyle}>{title}</h1>
        {subtitle && <p style={pageSubtitleStyle}>{subtitle}</p>}
      </div>
      {onSettings && (
        <button
          id="settings-btn"
          onClick={onSettings}
          aria-label="Settings"
          style={{
            background: "var(--surface-low)",
            border: "none",
            borderRadius: "50%",
            width: 38, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            color: "var(--on-surface-variant)",
            fontSize: 17,
            flexShrink: 0,
            marginTop: 4,
            transition: "background 0.3s ease, color 0.3s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.color = "var(--primary-container)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-low)"; e.currentTarget.style.color = "var(--on-surface-variant)"; }}
        >
          ⚙️
        </button>
      )}
    </div>
  );
}

// ── REFLECT TAB ───────────────────────────────────────────────────────────────
function ReflectTab({ onSaved, showToast, readHandoff, clearHandoff, onSettings }) {
  const [surahIdx, setSurahIdx] = useState("");
  const [startAyah, setStartAyah] = useState("");
  const [endAyah, setEndAyah] = useState("");
  const [verses, setVerses] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
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
    fetchVerses(selectedSurah[0], Number(startAyah), Number(endAyah))
      .then((v) => { setVerses(v); setLoading(false); })
      .catch(() => { setFetchError("Failed to fetch verses. Check your internet connection."); setLoading(false); });
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
      });
      onSaved();
      showToast("Reflection saved ✦");
      setSurahIdx(""); setSurahSearch(""); setStartAyah(""); setEndAyah("");
      setVerses(null); setReflection("");
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

      {/* Verse Display — surface-container-low tonal area */}
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

          {/* Arabic — centered as per DESIGN.md */}
          <div style={{
            textAlign: "center", direction: "rtl",
            padding: "8px 32px 32px",
            lineHeight: 2.6,
          }}>
            {verses.arabic.map((a) => (
              <span key={a.number} style={{
                fontFamily: "'Amiri', 'Scheherazade New', serif",
                fontSize: 26, color: "var(--on-surface)", display: "inline",
              }}>
                {a.text}{" "}
                <span style={{ fontSize: 14, color: "var(--primary-container)", opacity: 0.9 }}>﴿{a.number}﴾</span>{" "}
              </span>
            ))}
          </div>

          {/* English — left-aligned, surface-lowest "lifted" card inside the area */}
          <div style={{
            background: "var(--surface-lowest)",
            borderRadius: 12, padding: "18px 20px",
            boxShadow: "0 2px 16px rgba(26,28,26,0.04)",
          }}>
            {verses.english.map((a) => (
              <p key={a.number} style={{
                fontFamily: "'Inter', sans-serif", fontSize: 15, lineHeight: 1.85,
                color: "var(--on-surface-variant)", margin: "0 0 10px",
                fontWeight: 400,
              }}>
                <span style={{ color: "var(--primary-container)", fontWeight: 600, fontSize: 11, marginRight: 4 }}>[{a.number}]</span>
                {a.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Reflection input — underline style, floating label */}
      <div style={{ marginTop: 40, marginBottom: 32 }}>
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

      {/* Primary button with gradient */}
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

// ── JOURNAL TAB ───────────────────────────────────────────────────────────────
function JournalTab({ refreshKey, showToast, onSettings }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const editRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await dbGetAll()); }
    catch { setEntries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (editRef.current) {
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [editText]);

  const handleDelete = async () => {
    await dbDelete(deleteTarget.id);
    setDeleteTarget(null);
    load();
    showToast("Reflection deleted");
  };

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    await dbUpdate({ ...editEntry, reflection: editText.trim() });
    setEditEntry(null); load();
    showToast("Reflection updated ✦");
  };

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.surahName.toLowerCase().includes(q) ||
      e.reflection.toLowerCase().includes(q) ||
      String(e.surahNumber).includes(q)
    );
  });

  if (loading) return (
    <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif" }}>
      Loading…
    </div>
  );

  return (
    <div style={{ padding: "36px 24px 110px", maxWidth: 720, margin: "0 auto" }}>
      <PageHeader
        title="Journal"
        subtitle={`${entries.length} reflection${entries.length !== 1 ? "s" : ""} saved on this device`}
        onSettings={onSettings}
      />

      {/* Search */}
      {entries.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <input
            id="journal-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reflections…"
            style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.25 }}>✦</div>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, color: "var(--on-surface)", marginBottom: 10, fontSize: 20 }}>
            No reflections yet
          </h2>
          <p style={{ color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 14, lineHeight: 1.7 }}>
            Head over to the Reflect tab to begin your first Tadabbur.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 14, textAlign: "center", padding: "48px 0" }}>
          No reflections match "{search}"
        </p>
      ) : (
        filtered.map((entry) => {
          const isExpanded = expanded[entry.id];
          const shouldTruncate = entry.reflection.split("\n").length > 4 || entry.reflection.length > 300;
          const displayText = !shouldTruncate || isExpanded
            ? entry.reflection
            : entry.reflection.slice(0, 300) + "…";

          return (
            // card = surface-lowest lifted above surface-container-low page bg
            <div key={entry.id} style={cardStyle}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "'Inter',sans-serif", color: "var(--on-surface)", fontSize: 17, fontWeight: 600 }}>
                    {entry.surahName}
                    <span style={{ color: "var(--on-surface-variant)", fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
                      {entry.surahNumber}:{entry.startAyah}{entry.startAyah !== entry.endAyah ? `–${entry.endAyah}` : ""}
                    </span>
                  </div>
                  <div style={{ color: "var(--on-surface-variant)", fontSize: 11, fontFamily: "'Inter',sans-serif", marginTop: 3, fontWeight: 400 }}>
                    {new Date(entry.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditEntry(entry); setEditText(entry.reflection); }} style={chipBtnStyle}>Edit</button>
                  <button onClick={() => setDeleteTarget(entry)} style={{ ...chipBtnStyle, color: "#b91c1c" }}>Delete</button>
                </div>
              </div>

              {/* Arabic — centered per DESIGN.md */}
              <div style={{
                textAlign: "center", direction: "rtl",
                background: "var(--surface-low)",
                borderRadius: 12, padding: "20px 24px",
                marginBottom: 20, lineHeight: 2.6,
              }}>
                {entry.arabic.map((a) => (
                  <span key={a.number} style={{
                    fontFamily: "'Amiri','Scheherazade New',serif",
                    fontSize: 22, color: "var(--on-surface)",
                  }}>
                    {a.text}{" "}
                    <span style={{ fontSize: 12, color: "var(--primary-container)", opacity: 0.85 }}>﴿{a.number}﴾</span>{" "}
                  </span>
                ))}
              </div>

              {/* English — left-aligned */}
              <div style={{ marginBottom: 24 }}>
                {entry.english.map((a) => (
                  <p key={a.number} style={{
                    fontFamily: "'Inter',sans-serif", fontSize: 13.5, lineHeight: 1.8,
                    color: "var(--on-surface-variant)", margin: "0 0 8px", fontWeight: 400,
                  }}>
                    <span style={{ color: "var(--primary-container)", fontSize: 10, fontWeight: 600, marginRight: 4 }}>[{a.number}]</span>
                    {a.text}
                  </p>
                ))}
              </div>

              {/* Reflection — separated by spacing, not a divider line */}
              <p style={{
                fontFamily: "'Inter',sans-serif", fontSize: 14.5, lineHeight: 1.9,
                color: "var(--on-surface)", margin: 0, whiteSpace: "pre-wrap", fontWeight: 400,
              }}>{displayText}</p>
              {shouldTruncate && (
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [entry.id]: !isExpanded }))}
                  style={{
                    background: "none", border: "none",
                    color: "var(--primary-container)", cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
                    padding: "8px 0 0", transition: "opacity 0.3s ease",
                  }}
                >
                  {isExpanded ? "Show less ↑" : "Read more ↓"}
                </button>
              )}
            </div>
          );
        })
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(26,28,26,0.48)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9000, padding: 20, animation: "fadeIn 0.25s ease",
        }}>
          <div style={{
            background: "var(--surface-lowest)", borderRadius: 20,
            padding: 32, maxWidth: 560, width: "100%",
            boxShadow: "0 40px 80px rgba(26,28,26,0.06)",
          }}>
            <h3 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, color: "var(--on-surface)", margin: "0 0 4px", fontSize: 18 }}>
              Edit Reflection
            </h3>
            <p style={{ color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 12, margin: "0 0 20px" }}>
              {editEntry.surahName} {editEntry.surahNumber}:{editEntry.startAyah}
              {editEntry.startAyah !== editEntry.endAyah ? `–${editEntry.endAyah}` : ""}
            </p>
            <textarea
              id="edit-reflection-input"
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              style={{
                ...underlineInputStyle, width: "100%", boxSizing: "border-box",
                resize: "none", fontSize: 14, lineHeight: 1.8, overflow: "hidden",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setEditEntry(null)} style={ghostBtnStyle}>Cancel</button>
              <button onClick={handleEditSave} style={primaryBtnStyle}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete your reflection on ${deleteTarget.surahName} ${deleteTarget.surahNumber}:${deleteTarget.startAyah}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────────────────────
function SettingsTab({ showToast, theme, setTheme }) {
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
      <h1 style={pageTitleStyle}>Settings</h1>
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
        <label
          id="import-file-label"
          htmlFor="import-file-input"
          style={{ ...secondaryBtnStyle, display: "inline-block", cursor: "pointer" }}
        >
          Import JSON or CSV
        </label>
        <input
          id="import-file-input"
          type="file"
          accept=".json,.csv"
          onChange={handleImportFile}
          style={{ display: "none" }}
        />
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

// ── READ TAB ──────────────────────────────────────────────────────────────────────
function ReadTab({ onReflect, onSettings }) {
  const BOOKMARK_KEY = "qr_bookmark_page";
  const [currentPage, setCurrentPage] = useState(
    () => Number(localStorage.getItem(BOOKMARK_KEY)) || 1
  );
  const [contentKey, setContentKey] = useState(0); // triggers fade on page change
  const [ayahs, setAyahs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [surahSearch, setSurahSearch] = useState("");
  const [showSurahDrop, setShowSurahDrop] = useState(false);
  const [selectedSurahNum, setSelectedSurahNum] = useState(null);
  const [bookmarked, setBookmarked] = useState(
    () => Number(localStorage.getItem(BOOKMARK_KEY)) === (Number(localStorage.getItem(BOOKMARK_KEY)) || 1)
  );
  const surahRef = useRef(null);
  const topRef = useRef(null);

  const savedBookmark = Number(localStorage.getItem(BOOKMARK_KEY)) || null;

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

  // Keep bookmarked state in sync with currentPage
  useEffect(() => {
    setBookmarked(localStorage.getItem("qr_bookmark_page") === String(currentPage));
  }, [currentPage]);

  const handleSurahSelect = (surahNum) => {
    setSelectedSurahNum(surahNum);
    setSurahSearch("");
    setShowSurahDrop(false);
    const page = SURAH_START_PAGE[surahNum] ?? 1;
    goToPage(page);
  };

  const selectedSurahLabel = selectedSurahNum
    ? `${selectedSurahNum}. ${SURAHS.find((s) => s[0] === selectedSurahNum)?.[1] ?? ""}`
    : null;

  // Group ayahs by Surah for sub-headers
  let lastSurah = null;

  return (
    <div style={{ padding: "36px 24px 140px", maxWidth: 720, margin: "0 auto" }} ref={topRef}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <PageHeader title="Read" subtitle="Read the Quran and capture reflections as you go" onSettings={onSettings} />
        </div>
      </div>

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
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, margin: "0 auto 28px",
      }}>
        <div style={{
          padding: "8px 20px",
          background: "var(--primary-light)",
          borderRadius: 40,
        }}>
          <span style={{
            fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
            color: "var(--primary-container)", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
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
          {bookmarked ? "🔖" : "🔖"}
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
        <div
          key={contentKey}
          style={{ display: "flex", flexDirection: "column", gap: 20, animation: "pageFade 0.35s ease" }}
        >
          {ayahs.map((ayah) => {
            const isNewSurah = ayah.surahNum !== lastSurah;
            if (isNewSurah) lastSurah = ayah.surahNum;
            const surahName = SURAHS.find((s) => s[0] === ayah.surahNum)?.[1] ?? "";
            return (
              <div key={ayah.verseKey}>
                {/* Surah sub-header */}
                {isNewSurah && (
                  <div style={{
                    textAlign: "center", marginBottom: 16,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--outline-ghost)",
                  }}>
                    <span style={{
                      fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
                      color: "var(--on-surface-variant)", letterSpacing: "0.1em", textTransform: "uppercase",
                    }}>
                      Surah {ayah.surahNum} — {surahName}
                    </span>
                  </div>
                )}

                {/* Ayah card */}
                <div style={{ ...cardStyle, padding: "24px" }}>
                  {/* Ayah number badge */}
                  <div style={{
                    display: "flex", justifyContent: "flex-end", marginBottom: 12,
                  }}>
                    <span style={{
                      background: "var(--primary-light)",
                      color: "var(--primary-container)",
                      fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                      padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em",
                    }}>
                      {ayah.surahNum}:{ayah.ayahNum}
                    </span>
                  </div>

                  {/* Arabic */}
                  <p style={{
                    fontFamily: "'Amiri','Scheherazade New',serif",
                    fontSize: 26, lineHeight: 2.4,
                    color: "var(--on-surface)",
                    direction: "rtl", textAlign: "right",
                    margin: "0 0 20px",
                  }}>
                    {ayah.arabic}
                  </p>

                  {/* English */}
                  <p style={{
                    fontFamily: "'Inter',sans-serif", fontSize: 14.5, lineHeight: 1.85,
                    color: "var(--on-surface-variant)",
                    margin: "0 0 20px", fontWeight: 400,
                  }}>
                    {ayah.english}
                  </p>

                  {/* Reflect button */}
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
                      cursor: "pointer",
                      transition: "all 0.3s ease",
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
        <div style={{
          display: "flex", gap: 12, justifyContent: "center", marginTop: 40,
        }}>
          <button
            id="prev-page"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              ...secondaryBtnStyle,
              padding: "12px 24px", borderRadius: 6,
              opacity: currentPage <= 1 ? 0.35 : 1,
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Previous
          </button>
          <button
            id="next-page"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= 604}
            style={{
              ...primaryBtnStyle,
              padding: "12px 24px",
              opacity: currentPage >= 604 ? 0.35 : 1,
              cursor: currentPage >= 604 ? "not-allowed" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── BOTTOM NAV — Glassmorphism ────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "read",     label: "Read",     icon: "📖" },
    { id: "reflect",  label: "Reflect",  icon: "✦" },
    { id: "journal",  label: "Journal",  icon: "📋" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(250,249,246,0.72)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: 68, zIndex: 100,
      // Ghost border top only — 15% opacity per DESIGN.md
      borderTop: "1px solid rgba(193,201,191,0.15)",
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`nav-${t.id}`}
          onClick={() => setTab(t.id)}
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: "10px 0",
          }}
        >
          <span style={{
            fontSize: 20,
            color: tab === t.id ? "var(--primary-container)" : "var(--on-surface-variant)",
            transition: "color 0.3s ease, transform 0.3s ease",
            transform: tab === t.id ? "scale(1.15)" : "scale(1)",
            display: "block",
          }}>{t.icon}</span>
          <span style={{
            fontSize: 10, fontFamily: "'Inter',sans-serif", fontWeight: 600,
            color: tab === t.id ? "var(--primary-container)" : "var(--on-surface-variant)",
            transition: "color 0.3s ease", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("read");
  const [toast, setToast] = useState(null);
  const [journalKey, setJournalKey] = useState(0);
  const [firstVisit, setFirstVisit] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("qr_theme") || "system");
  const [readHandoff, setReadHandoff] = useState(null);

  const handleReflect = (handoff) => {
    setReadHandoff(handoff);
    setTab("reflect");
  };

  useEffect(() => {
    const seen = localStorage.getItem("qr_seen");
    if (!seen) { setFirstVisit(true); localStorage.setItem("qr_seen", "1"); }
  }, []);

  useEffect(() => {
    if (firstVisit) setTimeout(() => setFirstVisit(false), 4500);
  }, [firstVisit]);

  useEffect(() => {
    localStorage.setItem("qr_theme", theme);
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else if (theme === "light") root.setAttribute("data-theme", "light");
  }, [theme]);

  const showToast = (msg, type = "success") => setToast({ msg, type, key: Date.now() });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap');

        /* ── Design Token Surface Hierarchy ── */
        :root {
          /* Greens */
          --primary:            #00361a;
          --primary-container:  #1a4d2e;
          --primary-light:      rgba(26,77,46,0.07);
          --on-primary:         #ffffff;

          /* Surfaces — "stacked paper" layers */
          --surface:            #faf9f6;   /* the desk */
          --surface-low:        #f4f3f1;   /* reading areas / content zones */
          --surface-lowest:     #ffffff;   /* lifted cards */

          /* Text */
          --on-surface:         #1a1c1a;   /* ink-on-paper, never pure black */
          --on-surface-variant: #4f5350;

          /* Ghost border */
          --outline-ghost:      rgba(193,201,191,0.15);
        }

        /* Manual dark override */
        [data-theme="dark"] {
          --primary:            #4caf7d;
          --primary-container:  #2d6a4f;
          --primary-light:      rgba(76,175,125,0.1);
          --on-primary:         #001a0b;
          --surface:            #131510;
          --surface-low:        #1c1f1a;
          --surface-lowest:     #242722;
          --on-surface:         #e8e6e0;
          --on-surface-variant: #9e9e96;
          --outline-ghost:      rgba(100,110,100,0.18);
        }
        [data-theme="light"] {
          --primary:            #00361a;
          --primary-container:  #1a4d2e;
          --primary-light:      rgba(26,77,46,0.07);
          --on-primary:         #ffffff;
          --surface:            #faf9f6;
          --surface-low:        #f4f3f1;
          --surface-lowest:     #ffffff;
          --on-surface:         #1a1c1a;
          --on-surface-variant: #4f5350;
          --outline-ghost:      rgba(193,201,191,0.15);
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme]) {
            --primary:            #4caf7d;
            --primary-container:  #2d6a4f;
            --primary-light:      rgba(76,175,125,0.1);
            --on-primary:         #001a0b;
            --surface:            #131510;
            --surface-low:        #1c1f1a;
            --surface-lowest:     #242722;
            --on-surface:         #e8e6e0;
            --on-surface-variant: #9e9e96;
            --outline-ghost:      rgba(100,110,100,0.18);
          }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { -webkit-tap-highlight-color: transparent; }
        body { background: var(--surface-low); color: var(--on-surface); font-family: 'Inter', sans-serif; }
        select option { background: var(--surface-lowest); color: var(--on-surface); }

        /* Underline input focus */
        .uline-input:focus {
          outline: none;
          border-bottom-color: var(--primary-container) !important;
          box-shadow: 0 2px 0 0 var(--primary-container);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(14px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pageFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }

        /* Slow ease-in-out transitions per DESIGN.md — 300ms+ */
        button { transition: all 0.3s ease; }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--outline-ghost); border-radius: 2px; }

        button:active { opacity: 0.75; }
      `}</style>

      {/* Page background = surface-low (reading area) */}
      <div style={{ minHeight: "100vh", background: "var(--surface-low)", maxWidth: 720, margin: "0 auto", position: "relative" }}>
        <div key={tab} style={{ animation: "pageFade 0.28s ease" }}>
          {tab === "read"     && <ReadTab onReflect={handleReflect} onSettings={() => setTab("settings")} />}
          {tab === "reflect"  && <ReflectTab onSaved={() => setJournalKey((k) => k + 1)} showToast={showToast} readHandoff={readHandoff} clearHandoff={() => setReadHandoff(null)} onSettings={() => setTab("settings")} />}
          {tab === "journal"  && <JournalTab refreshKey={journalKey} showToast={showToast} onSettings={() => setTab("settings")} />}
          {tab === "settings" && <SettingsTab showToast={showToast} theme={theme} setTheme={setTheme} />}
        </div>
        <BottomNav tab={tab} setTab={setTab} />
      </div>

      {/* Welcome toast */}
      {firstVisit && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
          color: "var(--on-primary)",
          padding: "12px 28px", borderRadius: 40,
          fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
          zIndex: 9999, boxShadow: "0 8px 40px rgba(0,54,26,0.20)",
          animation: "fadeIn 0.5s ease", whiteSpace: "nowrap",
        }}>
          Welcome ✦ All reflections are saved securely on your device.
        </div>
      )}

      {toast && (
        <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}

// ── Shared style objects ──────────────────────────────────────────────────────

const pageTitleStyle = {
  fontFamily: "'Inter', sans-serif", fontWeight: 700,
  color: "var(--on-surface)", fontSize: 28,
  marginBottom: 6, marginTop: 0, letterSpacing: "-0.02em",
};

const pageSubtitleStyle = {
  color: "var(--on-surface-variant)", fontFamily: "'Inter', sans-serif",
  fontSize: 14, marginBottom: 36, marginTop: 0, fontWeight: 400,
};

const labelStyle = {
  display: "block", marginBottom: 10,
  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
  color: "var(--on-surface-variant)", letterSpacing: "0.08em", textTransform: "uppercase",
};

// Underline-style input — no enclosing box, bottom bar only per DESIGN.md
const underlineInputStyle = {
  background: "transparent",
  border: "none",
  borderBottom: "2px solid rgba(193,201,191,0.4)",
  borderRadius: 0,
  padding: "10px 2px",
  color: "var(--on-surface)", fontSize: 15,
  transition: "border-color 0.3s ease, box-shadow 0.3s ease",
  fontFamily: "'Inter', sans-serif",
  className: "uline-input",
};

const underlineSelectStyle = {
  ...underlineInputStyle,
  appearance: "none", cursor: "pointer",
};

// "surface-container-low" tonal area for verse display
const verseAreaStyle = {
  background: "var(--surface-low)",
  borderRadius: 16, padding: "28px 24px",
  marginBottom: 0,
};

// Cards = surface-lowest, lifted above surface-low page
const cardStyle = {
  background: "var(--surface-lowest)",
  borderRadius: 16, padding: "24px",
  marginBottom: 16,
  boxShadow: "0 2px 40px rgba(26,28,26,0.04)",
};

// Chip buttons (Edit / Delete on journal cards)
const chipBtnStyle = {
  background: "var(--surface-low)",
  border: "none",
  borderRadius: 40, padding: "5px 14px", cursor: "pointer",
  color: "var(--on-surface-variant)", fontSize: 12,
  fontFamily: "'Inter',sans-serif", fontWeight: 500,
};

// Primary button (gradient)
const primaryBtnStyle = {
  padding: "10px 22px", borderRadius: 6, border: "none",
  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
  color: "var(--on-primary)", cursor: "pointer",
  fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600,
  boxShadow: "0 4px 20px rgba(0,54,26,0.16)",
};

// Ghost button (cancel actions)
const ghostBtnStyle = {
  padding: "10px 22px", borderRadius: 6,
  border: "1px solid var(--outline-ghost)",
  background: "transparent", color: "var(--on-surface-variant)",
  cursor: "pointer", fontFamily: "'Inter',sans-serif",
  fontSize: 13, fontWeight: 500,
};

// Secondary button (settings actions)
const secondaryBtnStyle = {
  padding: "9px 20px", borderRadius: 40,
  border: "none", background: "var(--surface-low)",
  color: "var(--on-surface-variant)", cursor: "pointer",
  fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
};

// Settings section — tonal card (surface-lowest)
const settingsSectionStyle = {
  background: "var(--surface-lowest)",
  borderRadius: 16, padding: "22px 24px", marginBottom: 14,
  boxShadow: "0 2px 40px rgba(26,28,26,0.04)",
};

const settingsTitleStyle = {
  fontFamily: "'Inter',sans-serif", fontWeight: 600,
  color: "var(--on-surface)", fontSize: 15, marginBottom: 6,
};

const settingsDescStyle = {
  fontFamily: "'Inter',sans-serif", fontSize: 13,
  color: "var(--on-surface-variant)", lineHeight: 1.7, marginBottom: 16,
};

function skeletonLine(widthPct) {
  return {
    height: 12, borderRadius: 6, marginBottom: 12, width: `${widthPct}%`,
    background: "linear-gradient(90deg, var(--surface-low) 25%, var(--surface-lowest) 50%, var(--surface-low) 75%)",
    backgroundSize: "600px 100%",
    animation: "shimmer 1.6s infinite linear",
  };
}
