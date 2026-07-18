import { useState } from "react";
import PageHeader from "./PageHeader";
import { SURAHS } from "../lib/data";

export default function SelectTab({ onSettings, onSelectSurah }) {
  const [selectedSurah, setSelectedSurah] = useState(null);

  const handleSelect = (surahNum) => {
    if (selectedSurah === surahNum) {
      setSelectedSurah(null);
    } else {
      setSelectedSurah(surahNum);
    }
  };

  const handleOpenSurah = (surahNum) => {
    onSelectSurah(surahNum);
  }

  return (
    <div style={{ padding: "36px 24px 140px", maxWidth: 720, margin: "0 auto", animation: "pageFade 0.35s ease" }}>
      <PageHeader title={
        <>
          Select a <br />
          Surah
        </>
      } subtitle={`${SURAHS.length} surahs · Full Ayahs`} onSettings={onSettings} />

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {SURAHS.map((surah) => {
          const isSelected = selectedSurah === surah[0];
          return (
            <div key={surah[0]} style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => handleSelect(surah[0])}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isSelected ? "var(--primary-container)" : "var(--outline-ghost)"}`,
                  borderRadius: 16,
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.25s",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: isSelected ? "0 4px 24px var(--primary-light)" : "none"
                }}
              >
                {/* Left golden bar */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: 3,
                  background: "var(--primary-container)",
                  opacity: isSelected ? 1 : 0,
                  transition: "opacity 0.25s"
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--primary-container)", marginBottom: 6, fontSize: 9, fontWeight: 500 }}>
                      SURAH {surah[0]}
                    </p>
                    <h2 style={{ marginBottom: 4, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 24, color: "var(--on-surface)" }}>
                      {surah[1]}
                    </h2>
                    <p style={{ color: "var(--on-surface-variant)", marginTop: 8, fontSize: 13, fontWeight: 300 }}>
                      {surah[2]} Ayahs
                    </p>
                  </div>
                  <span style={{
                    fontSize: 24,
                    color: "var(--on-surface-variant)",
                    transition: "transform 0.3s ease",
                    transform: isSelected ? "rotate(90deg)" : "rotate(0deg)"
                  }}>
                    ›
                  </span>
                </div>
              </div>

              {isSelected && (
                <div style={{
                  background: "var(--surface-lowest)",
                  border: "1px solid var(--outline-ghost)",
                  borderTop: "none",
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  marginTop: -16,
                  padding: "32px 20px 20px",
                  animation: "fadeUp 0.3s ease"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--outline-ghost)" }}>
                    <span style={{ fontSize: 13, color: "var(--on-surface-variant)", fontFamily: "'DM Sans', sans-serif" }}>
                      {surah[2]} Ayahs
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div
                      onClick={() => handleOpenSurah(surah[0])}
                      style={{
                        padding: "16px",
                        background: "var(--surface)",
                        border: "1px solid var(--outline-ghost)",
                        borderRadius: 12,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary-container)"; e.currentTarget.style.background = "var(--primary-light)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--outline-ghost)"; e.currentTarget.style.background = "var(--surface)"; }}
                    >
                      <div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500, color: "var(--on-surface)", marginBottom: 4 }}>
                          Read Surah
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--on-surface-variant)" }}>
                          Start from Ayah 1
                        </div>
                      </div>
                      <span style={{ color: "var(--primary-container)", fontSize: 20 }}>→</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
