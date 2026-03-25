import { useState, useEffect, Component } from "react";
import ReadTab     from "./components/ReadTab";
import ReflectTab  from "./components/ReflectTab";
import JournalTab  from "./components/JournalTab";
import SettingsTab from "./components/SettingsTab";
import BottomNav   from "./components/BottomNav";
import Toast       from "./components/Toast";

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "60px 24px", maxWidth: 480, margin: "0 auto", textAlign: "center",
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: "var(--on-surface)", marginBottom: 10, fontSize: 20, fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ color: "var(--on-surface-variant)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "10px 24px", borderRadius: 6, border: "none",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
              color: "var(--on-primary)", cursor: "pointer",
              fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]               = useState("read");
  const [toast, setToast]           = useState(null);
  const [journalKey, setJournalKey] = useState(0);
  const [firstVisit, setFirstVisit] = useState(false);
  const [theme, setTheme]           = useState(() => localStorage.getItem("qr_theme") || "system");
  const [readHandoff, setReadHandoff] = useState(null);

  const handleReflect = (handoff) => {
    setReadHandoff(handoff);
    setTab("reflect");
  };

  useEffect(() => {
    const seen = localStorage.getItem("qr_seen");
    if (!seen) { setFirstVisit(true); localStorage.setItem("qr_seen", "1"); }
  }, []);

  useEffect(() => {
    if (firstVisit) setTimeout(() => setFirstVisit(false), 4500);
  }, [firstVisit]);

  useEffect(() => {
    localStorage.setItem("qr_theme", theme);
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    if (theme === "dark")  root.setAttribute("data-theme", "dark");
    if (theme === "light") root.setAttribute("data-theme", "light");
  }, [theme]);

  const showToast = (msg, type = "success") => setToast({ msg, type, key: Date.now() });

  return (
    <>
      <div style={{ minHeight: "100vh", background: "var(--surface-low)", maxWidth: 720, margin: "0 auto", position: "relative" }}>
        <div key={tab} style={{ animation: "pageFade 0.28s ease" }}>
          <ErrorBoundary key={`eb-${tab}`}>
            {tab === "read"     && <ReadTab    onReflect={handleReflect}                                                                                           onSettings={() => setTab("settings")} />}
            {tab === "reflect"  && <ReflectTab onSaved={() => setJournalKey((k) => k + 1)} showToast={showToast} readHandoff={readHandoff} clearHandoff={() => setReadHandoff(null)} onSettings={() => setTab("settings")} />}
            {tab === "journal"  && <JournalTab refreshKey={journalKey} showToast={showToast}                                                                       onSettings={() => setTab("settings")} />}
            {tab === "settings" && <SettingsTab showToast={showToast} theme={theme} setTheme={setTheme} />}
          </ErrorBoundary>
        </div>
        <BottomNav tab={tab} setTab={setTab} />
      </div>

      {/* Welcome toast */}
      {firstVisit && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
          color: "var(--on-primary)",
          padding: "12px 28px", borderRadius: 40,
          fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
          zIndex: 9999, boxShadow: "0 8px 40px rgba(0,54,26,0.20)",
          animation: "fadeIn 0.5s ease", whiteSpace: "nowrap",
        }}>
          Welcome ✦ All reflections are saved securely on your device.
        </div>
      )}

      {toast && (
        <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}
