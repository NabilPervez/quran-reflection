// ── Playback settings (Arabic recitation + English TTS) ───────────────────────
// Nabil, 2026-11-05: separate Arabic / English buttons, per-language speed,
// repeat-an-ayah for memorising, optional hands-free "keep reading".

const KEY = "qr_playback";

export const REPEAT_OPTIONS = [
  { value: 1, label: "Off" },
  { value: 3, label: "3 times" },
  { value: 5, label: "5 times" },
  { value: 10, label: "10 times" },
  { value: 0, label: "Until I stop" }, // 0 = endless
];

export const DEFAULT_PLAYBACK = {
  arRate: 1,        // Arabic recitation speed (audio.playbackRate)
  enRate: 0.95,     // English TTS speed (utterance.rate)
  enVoice: "",      // SpeechSynthesisVoice.name, "" = device default
  repeat: 1,        // plays per ayah, 0 = until stopped
  autoAdvance: false,
};

export function loadPlayback() {
  try { return { ...DEFAULT_PLAYBACK, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { ...DEFAULT_PLAYBACK }; }
}
export function savePlayback(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
}

export const repeatLabel = (r) => (r === 1 ? "Repeat" : r === 0 ? "Repeat ∞" : `Repeat ×${r}`);
export const nextRepeat = (r) => {
  const vals = REPEAT_OPTIONS.map((o) => o.value);
  return vals[(vals.indexOf(r) + 1) % vals.length];
};

// ── English TTS (Web Speech API, same approach as Steady) ─────────────────────
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

/** Sahih International uses [brackets] for implied words; read them as plain text. */
export const cleanForSpeech = (t = "") =>
  t.replace(/<[^>]+>/g, "").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();

export function englishVoices() {
  if (!canSpeak) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("en"));
}

/** Speak once. Returns a cancel fn. */
export function speakOnce(text, { rate = 1, voice = "" } = {}, onEnd) {
  if (!canSpeak) return () => {};
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang = "en-US";
  u.rate = rate;
  const v = synth.getVoices().find((x) => x.name === voice);
  if (v) u.voice = v;
  let cancelled = false;
  u.onend = () => { if (!cancelled) onEnd?.(); };
  u.onerror = () => { if (!cancelled) onEnd?.(true); };
  synth.speak(u);
  return () => { cancelled = true; synth.cancel(); };
}

export function stopSpeaking() { if (canSpeak) window.speechSynthesis.cancel(); }
