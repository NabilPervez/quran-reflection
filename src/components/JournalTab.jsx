import { useState, useEffect, useCallback, useRef } from "react";
import { dbGetAll, dbDelete, dbUpdate } from "../lib/db";
import { cardStyle, chipBtnStyle, primaryBtnStyle, ghostBtnStyle, underlineInputStyle } from "../lib/styles";
import PageHeader from "./PageHeader";
import ConfirmModal from "./ConfirmModal";

const PRESET_TAGS = ["Gratitude", "Dua", "Lesson", "Patience", "Tawakkul", "Tawbah", "Reflection", "Reminder"];

/** H4 — Share a reflection as formatted text using Web Share API with clipboard fallback */
async function shareEntry(entry, showToast) {
  const verseRef = `${entry.surahName} ${entry.surahNumber}:${entry.startAyah}${entry.startAyah !== entry.endAyah ? `–${entry.endAyah}` : ""}`;
  const arabicText = entry.arabic?.map((a) => a.text).join(" ") ?? "";
  const englishText = entry.english?.map((a) => `[${a.number}] ${a.text}`).join("\n") ?? "";
  const date = new Date(entry.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const text = `${verseRef}\n\n${arabicText}\n\n${englishText}\n\n— My Reflection (${date}):\n${entry.reflection}\n\n✦ Quran Reflect`;

  if (navigator.share) {
    try {
      await navigator.share({ title: `Reflection on ${verseRef}`, text });
      return;
    } catch {
      // user cancelled — don't show error
      return;
    }
  }
  // Fallback: copy to clipboard
  await navigator.clipboard.writeText(text);
  showToast("Copied to clipboard ✦");
}

export default function JournalTab({ refreshKey, showToast, onSettings }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null); // M2 tag filter
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

  // M5 — Copy just the reflection text
  const handleCopyReflection = (entry) => {
    const verseRef = `${entry.surahName} ${entry.surahNumber}:${entry.startAyah}${entry.startAyah !== entry.endAyah ? `–${entry.endAyah}` : ""}`;
    navigator.clipboard.writeText(`${verseRef}\n\n${entry.reflection}`);
    showToast("Reflection copied ✦");
  };

  // M2 — Gather all unique tags that exist across entries
  const allTags = [...new Set(entries.flatMap((e) => e.tags ?? []))].filter(Boolean);

  // Combined filter: text search + tag filter
  const filtered = entries.filter((e) => {
    const matchesSearch = !search.trim() || (() => {
      const q = search.toLowerCase();
      return (
        e.surahName.toLowerCase().includes(q) ||
        e.reflection.toLowerCase().includes(q) ||
        String(e.surahNumber).includes(q) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    })();
    const matchesTag = !activeTag || (e.tags ?? []).includes(activeTag);
    return matchesSearch && matchesTag;
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
        <div style={{ marginBottom: 20 }}>
          <input
            id="journal-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reflections, verses, or tags…"
            style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* M2 — Tag filter chips */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {allTags.map((tag) => {
            const active = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(active ? null : tag)}
                style={{
                  padding: "5px 14px", borderRadius: 40,
                  border: "1px solid var(--outline-ghost)",
                  background: active ? "var(--primary-light)" : "transparent",
                  color: active ? "var(--primary-container)" : "var(--on-surface-variant)",
                  fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: "pointer", transition: "all 0.2s ease",
                }}
              >
                {active ? "✓ " : ""}{tag}
              </button>
            );
          })}
          {activeTag && (
            <button onClick={() => setActiveTag(null)} style={{ padding: "5px 14px", borderRadius: 40, border: "1px solid var(--outline-ghost)", background: "transparent", color: "var(--on-surface-variant)", fontFamily: "'Inter',sans-serif", fontSize: 12, cursor: "pointer" }}>
              × Clear
            </button>
          )}
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
          No reflections match {activeTag ? `"${activeTag}"` : `"${search}"`}.
        </p>
      ) : (
        filtered.map((entry) => {
          const isExpanded = expanded[entry.id];
          const shouldTruncate = entry.reflection.split("\n").length > 4 || entry.reflection.length > 300;
          const displayText = !shouldTruncate || isExpanded
            ? entry.reflection
            : entry.reflection.slice(0, 300) + "…";

          return (
            <div key={entry.id} style={cardStyle}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
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
                  {/* M5 — Copy reflection */}
                  <button onClick={() => handleCopyReflection(entry)} style={chipBtnStyle} title="Copy reflection text">📋</button>
                  {/* H4 — Share */}
                  <button onClick={() => shareEntry(entry, showToast)} style={chipBtnStyle} title="Share reflection">↗</button>
                  <button onClick={() => { setEditEntry(entry); setEditText(entry.reflection); }} style={chipBtnStyle}>Edit</button>
                  <button onClick={() => setDeleteTarget(entry)} style={{ ...chipBtnStyle, color: "#b91c1c" }}>Delete</button>
                </div>
              </div>

              {/* M2 — Tags row */}
              {(entry.tags ?? []).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {(entry.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      style={{
                        padding: "3px 10px", borderRadius: 40,
                        background: activeTag === tag ? "var(--primary-light)" : "var(--surface-low)",
                        color: "var(--primary-container)",
                        fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s ease",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Arabic */}
              <div style={{ textAlign: "center", direction: "rtl", background: "var(--surface-low)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, lineHeight: 2.6 }}>
                {entry.arabic.map((a) => (
                  <span key={a.number} style={{ fontFamily: "'Amiri','Scheherazade New',serif", fontSize: 22, color: "var(--on-surface)" }}>
                    {a.text}{" "}
                    <span style={{ fontSize: 12, color: "var(--primary-container)", opacity: 0.85 }}>﴿{a.number}﴾</span>{" "}
                  </span>
                ))}
              </div>

              {/* English */}
              <div style={{ marginBottom: 24 }}>
                {entry.english.map((a) => (
                  <p key={a.number} style={{ fontFamily: "'Inter',sans-serif", fontSize: 13.5, lineHeight: 1.8, color: "var(--on-surface-variant)", margin: "0 0 8px", fontWeight: 400 }}>
                    <span style={{ color: "var(--primary-container)", fontSize: 10, fontWeight: 600, marginRight: 4 }}>[{a.number}]</span>
                    {a.text}
                  </p>
                ))}
              </div>

              {/* Reflection */}
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14.5, lineHeight: 1.9, color: "var(--on-surface)", margin: 0, whiteSpace: "pre-wrap", fontWeight: 400 }}>
                {displayText}
              </p>
              {shouldTruncate && (
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [entry.id]: !isExpanded }))}
                  style={{ background: "none", border: "none", color: "var(--primary-container)", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, padding: "8px 0 0", transition: "opacity 0.3s ease" }}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,28,26,0.48)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, padding: 20, animation: "fadeIn 0.25s ease" }}>
          <div style={{ background: "var(--surface-lowest)", borderRadius: 20, padding: 32, maxWidth: 560, width: "100%", boxShadow: "0 40px 80px rgba(26,28,26,0.06)" }}>
            <h3 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, color: "var(--on-surface)", margin: "0 0 4px", fontSize: 18 }}>Edit Reflection</h3>
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
              style={{ ...underlineInputStyle, width: "100%", boxSizing: "border-box", resize: "none", fontSize: 14, lineHeight: 1.8, overflow: "hidden" }}
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
