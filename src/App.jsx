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
  const [prevTab, setPrevTab]       = useState("read");
  const [toast, setToast]           = useState(null);
  const [journalKey, setJournalKey] = useState(0);
  const [firstVisit, setFirstVisit] = useState(false);
  const [theme, setTheme]           = useState(() => localStorage.getItem("qr_theme") || "system");
  const [colorScheme, setColorScheme] = useState(() => localStorage.getItem("qr_color_scheme") || "default");
  const [readHandoff, setReadHandoff] = useState(null);
  const [returnToRead, setReturnToRead] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const switchTab = (newTab) => {
    if (tab !== "settings" && newTab === "settings") {
      setPrevTab(tab);
    }
    if (newTab !== "reflect" && newTab !== "settings") {
      setReturnToRead(false);
    }
    setTab(newTab);
  };

  const handleReflect = (handoff) => {
    setReadHandoff(handoff);
    setReturnToRead(true);
    switchTab("reflect");
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
    localStorage.setItem("qr_color_scheme", colorScheme);
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    root.removeAttribute("data-color-scheme");
    
    if (theme === "dark")  root.setAttribute("data-theme", "dark");
    if (theme === "light") root.setAttribute("data-theme", "light");
    if (colorScheme !== "default") root.setAttribute("data-color-scheme", colorScheme);
  }, [theme, colorScheme]);

  // Listen for PWA install prompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      // Only show if user hasn't dismissed it previously
      if (localStorage.getItem("qr_install_dismissed") !== "1") {
        setDeferredPrompt(e);
        setShowInstallPrompt(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    localStorage.setItem("qr_install_dismissed", "1");
    setShowInstallPrompt(false);
  };

  const showToast = (msg, type = "success") => setToast({ msg, type, key: Date.now() });

  return (
    <>
      <div style={{ minHeight: "100vh", background: "var(--surface-low)", maxWidth: 720, margin: "0 auto", position: "relative" }}>
        <div key={tab} style={{ animation: "pageFade 0.28s ease" }}>
          <ErrorBoundary key={`eb-${tab}`}>
            {tab === "read"     && <ReadTab    onReflect={handleReflect} showToast={showToast}                                                                 onSettings={() => switchTab("settings")} />}
            {tab === "reflect"  && <ReflectTab onSaved={() => {
              setJournalKey((k) => k + 1);
              if (returnToRead) {
                switchTab("read");
                setReturnToRead(false);
              }
            }} showToast={showToast} readHandoff={readHandoff} clearHandoff={() => setReadHandoff(null)} onSettings={() => switchTab("settings")} />}
            {tab === "journal"  && <JournalTab refreshKey={journalKey} showToast={showToast}                                                                       onSettings={() => switchTab("settings")} setTab={switchTab} />}
            {tab === "settings" && <SettingsTab showToast={showToast} theme={theme} setTheme={setTheme} colorScheme={colorScheme} setColorScheme={setColorScheme} onBack={() => setTab(prevTab)} />}
          </ErrorBoundary>
        </div>
        <BottomNav tab={tab} setTab={switchTab} />
      </div>

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(250,249,246,0.9)", backdropFilter: "blur(12px)",
          border: "1px solid var(--outline-ghost)",
          padding: "12px 16px", borderRadius: 12,
          fontFamily: "'Inter',sans-serif", fontSize: 13,
          zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
          animation: "fadeIn 0.5s ease",
          display: "flex", alignItems: "center", gap: 12,
          color: "var(--on-surface)"
        }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Install Quran Reflect</div>
            <div style={{ color: "var(--on-surface-variant)", fontSize: 11 }}>Add to home screen for offline access</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleDismissInstall} style={{
              background: "transparent", border: "none", color: "var(--on-surface-variant)",
              fontSize: 12, cursor: "pointer", fontWeight: 500, padding: "4px 8px"
            }}>Not now</button>
            <button onClick={handleInstallClick} style={{
              background: "var(--primary-container)", border: "none", color: "white",
              fontSize: 12, cursor: "pointer", fontWeight: 600, padding: "6px 12px", borderRadius: 6
            }}>Install</button>
          </div>
        </div>
      )}

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
