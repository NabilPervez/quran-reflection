import { useEffect } from "react";

export default function Toast({ message, type = "success", onDone }) {
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
