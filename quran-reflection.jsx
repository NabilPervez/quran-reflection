import { useState, useEffect, useCallback, useRef } from "react";

// ── IndexedDB helpers (native, no Dexie needed in browser) ──────────────────
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

// ── Surah data (name + ayah count) ──────────────────────────────────────────
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

// ── API ──────────────────────────────────────────────────────────────────────
// Clear Quran translation ID on alquran.cloud = 131 (Mustafa Khattab)
async function fetchVerses(surahNum, startAyah, endAyah) {
  const results = { arabic: [], english: [] };
  // Fetch ayahs one by one or as a range via alquran.cloud
  // We'll fetch the full surah edition and slice
  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`),
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/en.khattab`),
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

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
        background: type === "success" ? "#1A4D2E" : "#c0392b",
        color: "#FAF9F6", padding: "10px 22px", borderRadius: 40,
        fontFamily: "'DM Serif Display', serif", fontSize: 14,
        zIndex: 9999, boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        animation: "fadeUp 0.3s ease",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}

// ── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(10,20,10,0.55)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:9000,padding:20
    }}>
      <div style={{
        background:"var(--bg)",borderRadius:16,padding:28,maxWidth:340,width:"100%",
        boxShadow:"0 8px 40px rgba(0,0,0,0.22)",border:"1px solid var(--border)"
      }}>
        <p style={{color:"var(--text)",fontFamily:"'Lora',serif",lineHeight:1.6,margin:"0 0 20px"}}>{message}</p>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{
            padding:"8px 18px",borderRadius:8,border:"1px solid var(--border)",
            background:"transparent",color:"var(--muted)",cursor:"pointer",fontFamily:"'DM Serif Display',serif"
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding:"8px 18px",borderRadius:8,border:"none",
            background: danger ? "#c0392b" : "var(--green)",
            color:"#fff",cursor:"pointer",fontFamily:"'DM Serif Display',serif"
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── REFLECT TAB ──────────────────────────────────────────────────────────────
function ReflectTab({ onSaved, showToast }) {
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

  const selectedSurah = surahIdx !== "" ? SURAHS[surahIdx] : null;
  const ayahCount = selectedSurah ? selectedSurah[2] : 0;

  const filteredSurahs = SURAHS.filter(
    (s) =>
      s[1].toLowerCase().includes(surahSearch.toLowerCase()) ||
      String(s[0]).includes(surahSearch)
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (surahRef.current && !surahRef.current.contains(e.target)) setShowSurahDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-fetch when both ayahs are selected
  useEffect(() => {
    if (!selectedSurah || !startAyah || !endAyah) return;
    setVerses(null);
    setFetchError("");
    setLoading(true);
    fetchVerses(selectedSurah[0], Number(startAyah), Number(endAyah))
      .then((v) => { setVerses(v); setLoading(false); })
      .catch((err) => { setFetchError("Failed to fetch verses. Please check your internet connection."); setLoading(false); });
  }, [surahIdx, startAyah, endAyah]);

  // Auto-resize textarea
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "auto";
      textRef.current.style.height = textRef.current.scrollHeight + "px";
    }
  }, [reflection]);

  const handleEndAyahChange = (val) => {
    const n = Number(val);
    if (startAyah && n < Number(startAyah)) return;
    setEndAyah(val);
  };

  const handleSave = async () => {
    if (!reflection.trim() || !verses || fetchError) return;
    setSaving(true);
    try {
      const record = {
        createdAt: new Date().toISOString(),
        surahNumber: selectedSurah[0],
        surahName: selectedSurah[1],
        startAyah: Number(startAyah),
        endAyah: Number(endAyah),
        arabic: verses.arabic,
        english: verses.english,
        reflection: reflection.trim(),
      };
      await dbAdd(record);
      onSaved();
      showToast("Reflection saved ✦");
      // Reset
      setSurahIdx(""); setSurahSearch(""); setStartAyah(""); setEndAyah("");
      setVerses(null); setReflection("");
    } catch (e) {
      showToast("Failed to save. Please try again.", "error");
    }
    setSaving(false);
  };

  const handleCopy = () => {
    if (!verses) return;
    const text = verses.arabic.map((a) => a.text).join(" ") + "\n\n" +
      verses.english.map((a, i) => `[${a.number}] ${a.text}`).join("\n");
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard ✦");
  };

  const canSave = reflection.trim().length > 0 && verses && !fetchError && !loading;

  return (
    <div style={{ padding: "24px 20px 100px", maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'DM Serif Display', serif", color: "var(--green)", fontSize: 26, marginBottom: 6, marginTop: 0 }}>
        New Reflection
      </h1>
      <p style={{ color: "var(--muted)", fontFamily: "'Lora', serif", fontSize: 13, marginBottom: 24, marginTop: 0 }}>
        Select a passage and record your Tadabbur
      </p>

      {/* Surah Selector */}
      <label style={labelStyle}>Surah</label>
      <div ref={surahRef} style={{ position: "relative", marginBottom: 14 }}>
        <input
          value={surahSearch}
          onChange={(e) => { setSurahSearch(e.target.value); setShowSurahDrop(true); }}
          onFocus={() => setShowSurahDrop(true)}
          placeholder={selectedSurah ? `${selectedSurah[0]}. ${selectedSurah[1]}` : "Search Surah…"}
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
        />
        {showSurahDrop && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 10, maxHeight: 220, overflowY: "auto",
            zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.13)", marginTop: 4
          }}>
            {filteredSurahs.length === 0 && (
              <div style={{ padding: "12px 16px", color: "var(--muted)", fontFamily: "'Lora', serif", fontSize: 13 }}>No results</div>
            )}
            {filteredSurahs.map((s) => (
              <div
                key={s[0]}
                onClick={() => {
                  setSurahIdx(SURAHS.indexOf(s));
                  setSurahSearch("");
                  setShowSurahDrop(false);
                  setStartAyah(""); setEndAyah(""); setVerses(null);
                }}
                style={{
                  padding: "10px 16px", cursor: "pointer",
                  fontFamily: "'Lora', serif", fontSize: 13,
                  color: "var(--text)",
                  background: surahIdx !== "" && SURAHS[surahIdx][0] === s[0] ? "var(--green-light)" : "transparent",
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--green-light)"}
                onMouseLeave={(e) => e.currentTarget.style.background = surahIdx !== "" && SURAHS[surahIdx][0] === s[0] ? "var(--green-light)" : "transparent"}
              >
                <span style={{ color: "var(--green)", fontWeight: 600, marginRight: 8 }}>{s[0]}.</span>
                {s[1]} <span style={{ color: "var(--muted)", fontSize: 11 }}>({s[2]} āyāt)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ayah Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Start Āyah</label>
          <select
            disabled={!selectedSurah}
            value={startAyah}
            onChange={(e) => { setStartAyah(e.target.value); setEndAyah(""); setVerses(null); }}
            style={{ ...selectStyle, width: "100%", opacity: !selectedSurah ? 0.4 : 1 }}
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
            disabled={!startAyah}
            value={endAyah}
            onChange={(e) => handleEndAyahChange(e.target.value)}
            style={{ ...selectStyle, width: "100%", opacity: !startAyah ? 0.4 : 1 }}
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
        <div style={verseBoxStyle}>
          <div style={skeletonLine(60)} />
          <div style={skeletonLine(80)} />
          <div style={{ ...skeletonLine(40), direction: "rtl", textAlign: "right" }} />
          <div style={{ ...skeletonLine(90), direction: "rtl", textAlign: "right" }} />
        </div>
      )}

      {fetchError && (
        <div style={{ ...verseBoxStyle, borderColor: "#c0392b22", background: "#c0392b08" }}>
          <p style={{ color: "#c0392b", fontFamily: "'Lora', serif", fontSize: 13, margin: 0 }}>⚠ {fetchError}</p>
        </div>
      )}

      {verses && !loading && !fetchError && (
        <div style={{ ...verseBoxStyle, position: "relative" }}>
          <button onClick={handleCopy} title="Copy verses" style={{
            position: "absolute", top: 14, right: 14,
            background: "transparent", border: "1px solid var(--border)",
            borderRadius: 8, padding: "4px 10px", cursor: "pointer",
            color: "var(--muted)", fontSize: 11, fontFamily: "'DM Serif Display', serif"
          }}>Copy</button>

          {/* Arabic */}
          <div style={{ textAlign: "right", direction: "rtl", marginBottom: 20 }}>
            {verses.arabic.map((a) => (
              <span key={a.number} style={{
                fontFamily: "'KFGQPC Uthman Taha Naskh', 'Scheherazade New', 'Amiri', serif",
                fontSize: 22, lineHeight: 2, color: "var(--text)", display: "inline"
              }}>
                {a.text}{" "}
                <span style={{ fontSize: 14, color: "var(--green)", opacity: 0.7 }}>﴿{a.number}﴾</span>{" "}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 16px" }} />

          {/* English */}
          <div>
            {verses.english.map((a) => (
              <p key={a.number} style={{
                fontFamily: "'Lora', serif", fontSize: 14.5, lineHeight: 1.8,
                color: "var(--text-soft)", margin: "0 0 8px"
              }}>
                <span style={{ color: "var(--green)", fontWeight: 600, fontSize: 11 }}>[{a.number}]</span>{" "}
                {a.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Reflection textarea */}
      <label style={{ ...labelStyle, marginTop: 20 }}>Your Reflection</label>
      <textarea
        ref={textRef}
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        placeholder="What are your thoughts on these verses?"
        rows={4}
        style={{
          ...inputStyle, width: "100%", boxSizing: "border-box",
          resize: "none", minHeight: 110, lineHeight: 1.7,
          fontFamily: "'Lora', serif", fontSize: 14, overflow: "hidden"
        }}
      />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        style={{
          width: "100%", marginTop: 14, padding: "14px 0",
          background: canSave && !saving ? "var(--green)" : "var(--border)",
          color: canSave && !saving ? "#FAF9F6" : "var(--muted)",
          border: "none", borderRadius: 12,
          fontFamily: "'DM Serif Display', serif", fontSize: 16,
          cursor: canSave && !saving ? "pointer" : "not-allowed",
          transition: "all 0.2s", letterSpacing: "0.02em"
        }}
      >
        {saving ? "Saving…" : "Save Reflection ✦"}
      </button>
    </div>
  );
}

// ── JOURNAL TAB ──────────────────────────────────────────────────────────────
function JournalTab({ refreshKey, showToast }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await dbGetAll()); }
    catch (e) { setEntries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleDelete = async () => {
    await dbDelete(deleteTarget.id);
    setDeleteTarget(null);
    load();
    showToast("Reflection deleted");
  };

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    await dbUpdate({ ...editEntry, reflection: editText.trim() });
    setEditEntry(null);
    load();
    showToast("Reflection updated ✦");
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontFamily: "'Lora',serif" }}>Loading…</div>;

  if (entries.length === 0) return (
    <div style={{ padding: "60px 24px", textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>✦</div>
      <h2 style={{ fontFamily: "'DM Serif Display',serif", color: "var(--green)", marginBottom: 8 }}>No reflections yet</h2>
      <p style={{ color: "var(--muted)", fontFamily: "'Lora',serif", fontSize: 14, lineHeight: 1.7 }}>
        Head over to the Reflect tab to begin your first Tadabbur.
      </p>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px 100px", maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'DM Serif Display',serif", color: "var(--green)", fontSize: 26, marginBottom: 6, marginTop: 0 }}>
        Journal
      </h1>
      <p style={{ color: "var(--muted)", fontFamily: "'Lora',serif", fontSize: 13, marginBottom: 24, marginTop: 0 }}>
        {entries.length} reflection{entries.length !== 1 ? "s" : ""} saved on this device
      </p>

      {entries.map((entry) => {
        const isExpanded = expanded[entry.id];
        const lines = entry.reflection.split("\n");
        const shouldTruncate = lines.length > 4 || entry.reflection.length > 300;
        const displayText = !shouldTruncate || isExpanded
          ? entry.reflection
          : entry.reflection.slice(0, 300) + "…";

        return (
          <div key={entry.id} style={cardStyle}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <span style={{ fontFamily: "'DM Serif Display',serif", color: "var(--green)", fontSize: 16 }}>
                  {entry.surahName}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12, fontFamily: "'Lora',serif", marginLeft: 6 }}>
                  {entry.surahNumber}:{entry.startAyah}{entry.startAyah !== entry.endAyah ? `–${entry.endAyah}` : ""}
                </span>
                <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "'Lora',serif", marginTop: 2 }}>
                  {new Date(entry.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setEditEntry(entry); setEditText(entry.reflection); }} style={actionBtn}>Edit</button>
                <button onClick={() => setDeleteTarget(entry)} style={{ ...actionBtn, color: "#c0392b", borderColor: "#c0392b44" }}>Delete</button>
              </div>
            </div>

            {/* Arabic */}
            <div style={{
              textAlign: "right", direction: "rtl", padding: "12px 14px",
              background: "var(--green-light)", borderRadius: 8, marginBottom: 10
            }}>
              {entry.arabic.map((a) => (
                <span key={a.number} style={{
                  fontFamily: "'KFGQPC Uthman Taha Naskh','Scheherazade New','Amiri',serif",
                  fontSize: 19, lineHeight: 2, color: "var(--text)"
                }}>
                  {a.text}{" "}
                  <span style={{ fontSize: 12, color: "var(--green)", opacity: 0.7 }}>﴿{a.number}﴾</span>{" "}
                </span>
              ))}
            </div>

            {/* English */}
            <div style={{ marginBottom: 12 }}>
              {entry.english.map((a) => (
                <p key={a.number} style={{
                  fontFamily: "'Lora',serif", fontSize: 13, lineHeight: 1.75,
                  color: "var(--text-soft)", margin: "0 0 6px"
                }}>
                  <span style={{ color: "var(--green)", fontSize: 10, fontWeight: 700 }}>[{a.number}]</span>{" "}{a.text}
                </p>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--border)", margin: "10px 0 12px" }} />

            {/* Reflection text */}
            <p style={{
              fontFamily: "'Lora',serif", fontSize: 14, lineHeight: 1.8,
              color: "var(--text)", margin: 0, whiteSpace: "pre-wrap"
            }}>{displayText}</p>
            {shouldTruncate && (
              <button
                onClick={() => setExpanded((p) => ({ ...p, [entry.id]: !isExpanded }))}
                style={{ background: "none", border: "none", color: "var(--green)", cursor: "pointer", fontFamily: "'Lora',serif", fontSize: 13, padding: "4px 0 0", marginTop: 4 }}
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        );
      })}

      {/* Edit Modal */}
      {editEntry && (
        <div style={{ position:"fixed",inset:0,background:"rgba(10,20,10,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,padding:20 }}>
          <div style={{ background:"var(--bg)",borderRadius:16,padding:24,maxWidth:500,width:"100%",border:"1px solid var(--border)",boxShadow:"0 8px 40px rgba(0,0,0,0.22)" }}>
            <h3 style={{ fontFamily:"'DM Serif Display',serif",color:"var(--green)",margin:"0 0 6px" }}>Edit Reflection</h3>
            <p style={{ color:"var(--muted)",fontFamily:"'Lora',serif",fontSize:12,margin:"0 0 14px" }}>
              {editEntry.surahName} {editEntry.surahNumber}:{editEntry.startAyah}{editEntry.startAyah !== editEntry.endAyah ? `–${editEntry.endAyah}` : ""}
            </p>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              style={{ ...inputStyle, width:"100%", boxSizing:"border-box", resize:"vertical", fontFamily:"'Lora',serif", fontSize:14, lineHeight:1.7 }}
            />
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:14 }}>
              <button onClick={() => setEditEntry(null)} style={{ padding:"8px 18px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--muted)",cursor:"pointer",fontFamily:"'DM Serif Display',serif" }}>Cancel</button>
              <button onClick={handleEditSave} style={{ padding:"8px 18px",borderRadius:8,border:"none",background:"var(--green)",color:"#FAF9F6",cursor:"pointer",fontFamily:"'DM Serif Display',serif" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
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

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ showToast }) {
  const [clearConfirm1, setClearConfirm1] = useState(false);
  const [clearConfirm2, setClearConfirm2] = useState(false);

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
    showToast("All data cleared");
  };

  return (
    <div style={{ padding: "24px 20px 100px", maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'DM Serif Display',serif", color: "var(--green)", fontSize: 26, marginBottom: 6, marginTop: 0 }}>Settings</h1>
      <p style={{ color: "var(--muted)", fontFamily: "'Lora',serif", fontSize: 13, marginBottom: 28, marginTop: 0 }}>
        All data is stored locally on your device only.
      </p>

      {/* Export */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Export Data</h2>
        <p style={sectionDesc}>Download all your reflections before clearing browser data or switching devices.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={exportJSON} style={settingsBtnStyle}>Export as JSON</button>
          <button onClick={exportCSV} style={settingsBtnStyle}>Export as CSV</button>
        </div>
      </section>

      {/* About */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>About</h2>
        <p style={sectionDesc}>
          Quran Reflect is a privacy-first Tadabbur journal. No accounts, no servers, no tracking.
          Verse data is fetched from the AlQuran.cloud API using the Clear Quran translation by Dr. Mustafa Khattab.
        </p>
      </section>

      {/* Danger Zone */}
      <section style={{ ...sectionStyle, borderColor: "#c0392b44" }}>
        <h2 style={{ ...sectionTitle, color: "#c0392b" }}>Danger Zone</h2>
        <p style={sectionDesc}>Permanently delete all saved reflections from this device. This action cannot be undone.</p>
        <button onClick={() => setClearConfirm1(true)} style={{ ...settingsBtnStyle, background: "#c0392b10", color: "#c0392b", borderColor: "#c0392b44" }}>
          Clear All Data
        </button>
      </section>

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
          message="This is your final warning. All data will be permanently erased."
          onConfirm={handleClearFinal}
          onCancel={() => setClearConfirm2(false)}
          confirmLabel="Erase permanently"
          danger
        />
      )}
    </div>
  );
}

// ── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "reflect", label: "Reflect", icon: "✦" },
    { id: "journal", label: "Journal", icon: "☰" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--card)", borderTop: "1px solid var(--border)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: 62, zIndex: 100,
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "8px 0",
          }}
        >
          <span style={{ fontSize: 18, color: tab === t.id ? "var(--green)" : "var(--muted)", transition: "color 0.2s" }}>
            {t.icon}
          </span>
          <span style={{
            fontSize: 11, fontFamily: "'DM Serif Display',serif",
            color: tab === t.id ? "var(--green)" : "var(--muted)",
            transition: "color 0.2s", letterSpacing: "0.04em"
          }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("reflect");
  const [toast, setToast] = useState(null);
  const [journalKey, setJournalKey] = useState(0);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("qr_seen");
    if (!seen) { setFirstVisit(true); localStorage.setItem("qr_seen", "1"); }
  }, []);

  useEffect(() => {
    if (firstVisit) {
      setTimeout(() => setFirstVisit(false), 4000);
    }
  }, [firstVisit]);

  const showToast = (msg, type = "success") => setToast({ msg, type, key: Date.now() });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap');
        :root {
          --green: #1A4D2E;
          --green-light: #1A4D2E12;
          --bg: #FAF9F6;
          --card: #FFFFFF;
          --border: #E8E4DC;
          --text: #1C1C1A;
          --text-soft: #3D3D38;
          --muted: #8A8880;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #111410;
            --card: #1A1D18;
            --border: #2A2E26;
            --text: #F0EDE6;
            --text-soft: #C8C4BB;
            --muted: #7A7870;
            --green-light: #1A4D2E22;
          }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); color: var(--text); }
        select option { background: var(--card); color: var(--text); }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0 } to { opacity: 1 }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        maxWidth: 700,
        margin: "0 auto",
        position: "relative",
      }}>
        {tab === "reflect" && <ReflectTab onSaved={() => setJournalKey((k) => k + 1)} showToast={showToast} />}
        {tab === "journal" && <JournalTab refreshKey={journalKey} showToast={showToast} />}
        {tab === "settings" && <SettingsTab showToast={showToast} />}
        <BottomNav tab={tab} setTab={setTab} />
      </div>

      {firstVisit && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "var(--green)", color: "#FAF9F6",
          padding: "10px 22px", borderRadius: 40,
          fontFamily: "'Lora',serif", fontSize: 13,
          zIndex: 9999, boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          animation: "fadeIn 0.5s ease", whiteSpace: "nowrap",
          textAlign: "center"
        }}>
          Welcome. All reflections are saved securely on your device.
        </div>
      )}

      {toast && (
        <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block", marginBottom: 6,
  fontFamily: "'DM Serif Display',serif", fontSize: 12,
  color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase"
};

const inputStyle = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "11px 14px",
  color: "var(--text)", fontSize: 14, outline: "none",
  transition: "border-color 0.2s",
  fontFamily: "'Lora',serif",
};

const selectStyle = {
  ...inputStyle, appearance: "none", cursor: "pointer",
};

const verseBoxStyle = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 12, padding: 18, marginBottom: 18,
};

const cardStyle = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 14, padding: 18, marginBottom: 16,
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
};

const actionBtn = {
  background: "transparent", border: "1px solid var(--border)",
  borderRadius: 6, padding: "4px 12px", cursor: "pointer",
  color: "var(--muted)", fontSize: 12, fontFamily: "'DM Serif Display',serif"
};

const sectionStyle = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 12, padding: 20, marginBottom: 16,
};

const sectionTitle = {
  fontFamily: "'DM Serif Display',serif", color: "var(--text)",
  fontSize: 16, marginBottom: 6,
};

const sectionDesc = {
  fontFamily: "'Lora',serif", fontSize: 13, color: "var(--muted)",
  lineHeight: 1.7, marginBottom: 14,
};

const settingsBtnStyle = {
  padding: "9px 18px", borderRadius: 9,
  border: "1px solid var(--border)", background: "var(--green-light)",
  color: "var(--green)", cursor: "pointer", fontFamily: "'DM Serif Display',serif",
  fontSize: 13, transition: "all 0.15s"
};

function skeletonLine(widthPct) {
  return {
    height: 14, borderRadius: 7, marginBottom: 10, width: `${widthPct}%`,
    background: "linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%)",
    backgroundSize: "400px 100%",
    animation: "shimmer 1.4s infinite linear",
  };
}
