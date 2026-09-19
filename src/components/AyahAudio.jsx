import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAyahAudio, DEFAULT_RECITER } from "../lib/api";

// Module-level cache so re-visiting an ayah never re-hits the API
const urlCache = new Map(); // `${reciter}|${surah}:${ayah}` -> [url, ...mirrors]

async function getUrls(surahNum, ayahNum, reciter, signal) {
  const key = `${reciter}|${surahNum}:${ayahNum}`;
  if (urlCache.has(key)) return urlCache.get(key);
  const { primary, fallbacks } = await fetchAyahAudio(surahNum, ayahNum, signal, reciter);
  const urls = [primary, ...fallbacks];
  urlCache.set(key, urls);
  return urls;
}

/**
 * Play/pause button for a single ayah's recitation.
 * Audio URLs are fetched lazily on first play and cached, so the button costs
 * nothing until the user actually asks to listen.
 */
export default function AyahAudio({
  surahNum,
  ayahNum,
  reciter = DEFAULT_RECITER,
  onError,
  compact = false,
  style,
}) {
  const [state, setState] = useState("idle"); // idle | loading | playing | paused
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  // Tear down whenever the ayah or reciter changes, and on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [surahNum, ayahNum, reciter]);

  useEffect(() => { setState("idle"); }, [surahNum, ayahNum, reciter]);

  /** Try each mirror in turn; resolves once one actually starts playing */
  const playFrom = useCallback(async (urls) => {
    for (const url of urls) {
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      try {
        await audio.play();
        return true;
      } catch {
        audio.src = "";
        // fall through to the next mirror
      }
    }
    return false;
  }, []);

  const handleClick = async () => {
    // Pause an in-flight playback
    if (state === "playing") {
      audioRef.current?.pause();
      setState("paused");
      return;
    }
    // Resume where we left off
    if (state === "paused" && audioRef.current) {
      try {
        await audioRef.current.play();
        setState("playing");
      } catch {
        setState("idle");
      }
      return;
    }
    if (state === "loading") return;

    setState("loading");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const urls = await getUrls(surahNum, ayahNum, reciter, controller.signal);
      const ok = await playFrom(urls);
      setState(ok ? "playing" : "idle");
      if (!ok) onError?.("Could not play this recitation.");
    } catch (err) {
      if (err.name === "AbortError") return;
      setState("idle");
      onError?.("Recitation unavailable. Check your connection.");
    }
  };

  const label =
    state === "loading" ? "Loading…" :
    state === "playing" ? "Pause"    :
    state === "paused"  ? "Resume"   : "Listen";

  const icon =
    state === "loading" ? "◌" :
    state === "playing" ? "❚❚" : "▶";

  const active = state === "playing" || state === "paused";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${label} recitation of ayah ${surahNum}:${ayahNum}`}
      title={`${label} recitation`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: compact ? "4px 10px" : "7px 16px",
        borderRadius: 40,
        border: `1px solid ${active ? "var(--primary-container)" : "var(--outline-ghost)"}`,
        background: active ? "var(--primary-light)" : "transparent",
        color: active ? "var(--primary-container)" : "var(--on-surface-variant)",
        fontFamily: "'DM Sans',sans-serif",
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        cursor: state === "loading" ? "wait" : "pointer",
        transition: "all 0.3s ease",
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.borderColor = "var(--primary-container)"; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? "var(--primary-light)" : "transparent";
        e.currentTarget.style.borderColor = active ? "var(--primary-container)" : "var(--outline-ghost)";
      }}
    >
      <span style={{
        fontSize: compact ? 10 : 12,
        display: "inline-block",
        animation: state === "loading" ? "spin 1s linear infinite" : "none",
      }}>{icon}</span>
      {label}
    </button>
  );
}
