// ── API helpers ───────────────────────────────────────────────────────────────

/** Fetch a range of verses by Surah (used by Reflect tab) */
export async function fetchVerses(surahNum, startAyah, endAyah, signal, edition = "en.sahih") {
  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`, { signal }),
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/${edition}`, { signal }),
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

/** Fetch a specific Ayah with Tafsir and Transliteration (used by Read tab) */
export async function fetchAyah(surahNum, ayahNum, signal, edition = "en.sahih") {
  const [arRes, enRes, tafsirRes, translitRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/quran-uthmani`, { signal }),
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/${edition}`, { signal }),
    fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surahNum}:${ayahNum}`, { signal }),
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/en.transliteration`, { signal }),
  ]);

  if (!arRes.ok || !enRes.ok) throw new Error("Ayah fetch failed");

  const [arData, enData, tafsirData, translitData] = await Promise.all([
    arRes.json(),
    enRes.json(),
    tafsirRes.ok ? tafsirRes.json() : Promise.resolve(null),
    translitRes.ok ? translitRes.json() : Promise.resolve(null),
  ]);

  return {
    verseKey: `${surahNum}:${ayahNum}`,
    surahNum,
    ayahNum,
    arabic: arData.data.text,
    english: enData.data.text,
    transliteration: translitData?.data?.text ?? null,
    tafsir: tafsirData?.tafsir?.text || "Tafsir currently unavailable for this ayah.",
  };
}

// ── Recitation audio ──────────────────────────────────────────────────────────

/** Reciters available on the AlQuran.cloud audio editions */
export const RECITERS = [
  { value: "ar.alafasy",            label: "Mishary Rashid Alafasy" },
  { value: "ar.abdulbasitmurattal", label: "Abdul Basit (Murattal)" },
  { value: "ar.abdurrahmaansudais", label: "Abdurrahmaan As-Sudais" },
  { value: "ar.husary",             label: "Mahmoud Khalil Al-Husary" },
  { value: "ar.husarymujawwad",     label: "Al-Husary (Mujawwad)" },
  { value: "ar.minshawi",           label: "Mohamed Siddiq Al-Minshawi" },
  { value: "ar.muhammadayyoub",     label: "Muhammad Ayyoub" },
  { value: "ar.shaatree",           label: "Abu Bakr Ash-Shaatree" },
];

export const DEFAULT_RECITER = "ar.alafasy";

/**
 * Fetch the recitation audio URLs for a single ayah.
 * Returns { primary, fallbacks } — `fallbacks` are alternate CDN mirrors that
 * AlQuran.cloud returns for the same recitation.
 */
export async function fetchAyahAudio(surahNum, ayahNum, signal, reciter = DEFAULT_RECITER) {
  const res = await fetch(
    `https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/${reciter}`,
    { signal }
  );
  if (!res.ok) throw new Error("Audio fetch failed");
  const data = await res.json();
  const primary = data?.data?.audio;
  if (!primary) throw new Error("No recitation available for this ayah");
  return { primary, fallbacks: data?.data?.audioSecondary ?? [] };
}
