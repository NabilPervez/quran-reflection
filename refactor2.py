import re

# 1. Update App.jsx to pass showToast to ReadTab
with open("src/App.jsx", "r") as f:
    app_content = f.read()

app_content = app_content.replace(
    '<ReadTab    onReflect={handleReflect}                                                                                           onSettings={() => switchTab("settings")} />',
    '<ReadTab    onReflect={handleReflect} showToast={showToast}                                                                 onSettings={() => switchTab("settings")} />'
)

with open("src/App.jsx", "w") as f:
    f.write(app_content)

# 2. Update ReadTab.jsx
with open("src/components/ReadTab.jsx", "r") as f:
    read_content = f.read()

# Import db functions
read_content = read_content.replace(
    'import { fetchAyah } from "../lib/api";',
    'import { fetchAyah } from "../lib/api";\nimport { dbGetAll, dbAdd, dbDelete, dbUpdate } from "../lib/db";'
)

# Add showToast prop
read_content = read_content.replace(
    'export default function ReadTab({ onReflect, onSettings }) {',
    'export default function ReadTab({ onReflect, onSettings, showToast }) {'
)

# Add favorites state and loader
state_to_add = """
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
"""

read_content = read_content.replace(
    'const [pageSearch, setPageSearch] = useState("");   // H5 in-page search',
    'const [pageSearch, setPageSearch] = useState("");   // H5 in-page search\n' + state_to_add
)

# Remove the Surah Title Header
header_to_remove = """                  <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 0", borderBottom: "1px solid var(--outline-ghost)" }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600, color: "var(--on-surface-variant)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Surah {ayah.surahNum} — {surahName}
                    </span>
                  </div>"""

read_content = read_content.replace(header_to_remove, "")

# Add favorite button
buttons_code = """                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {/* Reflect button */}"""

new_buttons_code = """                  {/* Action buttons */}
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
                    {/* Reflect button */}"""

read_content = read_content.replace(buttons_code, new_buttons_code)

with open("src/components/ReadTab.jsx", "w") as f:
    f.write(read_content)

print("Patch applied")
