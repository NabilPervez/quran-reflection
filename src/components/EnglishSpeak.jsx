import { useState, useEffect, useRef } from "react";
import { canSpeak, speakOnce } from "../lib/playback";
import { IcSpeak, IcStop } from "./icons";

/**
 * Reads the ayah's English translation aloud with the device voice.
 * Shares the repeat / speed settings with the Arabic recitation button.
 */
export default function EnglishSpeak({ text, rate = 1, voice = "", repeat = 1, autoStart = false, onComplete, onPlayStart, register, variant }) {
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const cancelRef = useRef(null);
  const settings = useRef({ rate, voice, repeat, onComplete });
  settings.current = { rate, voice, repeat, onComplete };

  const stop = () => { cancelRef.current?.(); cancelRef.current = null; setPlaying(false); setPlays(0); };

  const playFrom = (n) => {
    setPlays(n);
    const { rate: r, voice: v } = settings.current;
    cancelRef.current = speakOnce(text, { rate: r, voice: v }, (err) => {
      const rep = settings.current.repeat;
      if (!err && (rep === 0 || n + 1 < rep)) return playFrom(n + 1);
      cancelRef.current = null; setPlaying(false); setPlays(0);
      if (!err) settings.current.onComplete?.();
    });
  };

  const start = () => {
    if (!canSpeak) return;
    onPlayStart?.();
    cancelRef.current?.();
    setPlaying(true);
    playFrom(0);
  };

  // Parent can stop us when Arabic starts or the screen changes
  useEffect(() => { register?.(stop); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelRef.current?.(), []);
  useEffect(() => { if (autoStart) start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!canSpeak) return null;

  const label = playing
    ? (repeat !== 1 ? `English ${plays + 1}${repeat ? "/" + repeat : ""}` : "Stop")
    : "English";

  if (variant === "action") {
    return (
      <button type="button" className="v2-action" onClick={() => (playing ? stop() : start())} aria-pressed={playing}
        aria-label={playing ? "Stop reading English aloud" : "Read English translation aloud"}>
        {playing ? <IcStop /> : <IcSpeak />}{label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (playing ? stop() : start())}
      aria-pressed={playing}
      aria-label={playing ? "Stop reading English aloud" : "Read English translation aloud"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 16px", minHeight: 40, borderRadius: 40,
        border: `1px solid ${playing ? "var(--primary-container)" : "var(--outline-ghost)"}`,
        background: playing ? "var(--primary-light)" : "transparent",
        color: playing ? "var(--ink-accent)" : "var(--on-surface-variant)",
        fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500,
        cursor: "pointer", transition: "all 0.3s ease",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {playing ? <rect x="6" y="6" width="12" height="12" rx="2" /> : <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6" /></>}
      </svg>
      {label}
    </button>
  );
}
