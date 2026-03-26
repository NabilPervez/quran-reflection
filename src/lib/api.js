// ── API helpers ───────────────────────────────────────────────────────────────

/** Fetch a range of verses by Surah (used by Reflect tab) */
export async function fetchVerses(surahNum, startAyah, endAyah, signal) {
  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`, { signal }),
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/en.sahih`, { signal }),
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

/** Fetch all verses on one Mus'haf page (used by Read tab) */
export async function fetchByPage(pageNum, signal) {
  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani`, { signal }),
    fetch(`https://api.alquran.cloud/v1/page/${pageNum}/en.itani`, { signal }),
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
