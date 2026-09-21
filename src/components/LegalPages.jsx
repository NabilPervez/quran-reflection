import { useEffect } from "react";
import {
  pageContainerStyle, pageTitleStyle, settingsSectionStyle,
  settingsTitleStyle, settingsDescStyle, secondaryBtnStyle,
} from "../lib/styles";

// Standalone pages at /privacy and /data. They are reachable from Settings and
// linked from the Play Store listing, so they must read well both inside the
// app and when someone lands on the URL directly.

const EFFECTIVE = "21 September 2026";
const CONTACT = "nabilpervezconsulting@gmail.com";

const bodyStyle = { ...settingsDescStyle, marginBottom: 12 };
const listStyle = { ...settingsDescStyle, paddingLeft: 20, marginBottom: 12 };
const linkStyle = { color: "var(--primary-container)", textDecoration: "underline" };

function Section({ title, children }) {
  return (
    <section style={settingsSectionStyle}>
      <h2 style={settingsTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function Shell({ title, subtitle, onBack, children }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — Quran Reflect`;
    window.scrollTo(0, 0);
    return () => { document.title = previous; };
  }, [title]);

  return (
    <main style={pageContainerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <button
          onClick={onBack}
          aria-label="Back to Quran Reflect"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            fontSize: 20, color: "var(--on-surface)", display: "flex",
            alignItems: "center", justifyContent: "center",
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          }}
        >←</button>
        <h1 style={{ ...pageTitleStyle, marginBottom: 0 }}>{title}</h1>
      </div>
      <p style={{
        color: "var(--on-surface-variant)", fontFamily: "'DM Sans',sans-serif",
        fontSize: 13, margin: "0 0 var(--chrome-gap) 50px",
      }}>{subtitle}</p>
      {children}
      <button onClick={onBack} style={{ ...secondaryBtnStyle, marginTop: 8 }}>
        ← Back to Quran Reflect
      </button>
    </main>
  );
}

const SERVICES = [
  ["AlQuran.cloud", "api.alquran.cloud", "Arabic text, translations, transliteration and the addresses of recitation audio"],
  ["Islamic Network CDN", "cdn.islamic.network", "Recitation audio files, when you press Listen"],
  ["Quran.com", "api.quran.com", "Tafsir (Ibn Kathir), when an ayah loads"],
  ["Google Fonts", "fonts.googleapis.com, fonts.gstatic.com", "The typefaces used to display Arabic and English"],
  ["Netlify", "quran-reflection.netlify.app", "Hosts the app itself"],
];

export function PrivacyPage({ onBack, onOpenData }) {
  return (
    <Shell title="Privacy Policy" subtitle={`Effective ${EFFECTIVE}`} onBack={onBack}>
      <Section title="In short">
        <p style={bodyStyle}>
          Quran Reflect has no accounts and collects no personal information. There is no
          analytics, advertising or tracking. Your reflections, favourites and settings are stored
          on your device and are never sent to us — we have no server that could receive them.
        </p>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Quran Reflect is published by Nabil Pervez Consulting (“we”, “us”). This policy covers the
          website at quran-reflection.netlify.app and the Android app, which displays that same site.
        </p>
      </Section>

      <Section title="What stays on your device">
        <ul style={listStyle}>
          <li><strong>Reflections and favourites</strong> — the verses you save, what you write and the tags you add, kept in your browser’s IndexedDB storage.</li>
          <li><strong>Preferences</strong> — theme, colour scheme, translation, reciter, reading sizes, which verse layers are shown, and your reading position, kept in local storage.</li>
          <li><strong>Cached content</strong> — verses, tafsir, fonts and recitation you have already loaded, so the app is faster and partly works offline.</li>
        </ul>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          None of this is transmitted to us or to anyone else. See{" "}
          <a href="/data" onClick={(e) => { e.preventDefault(); onOpenData(); }} style={linkStyle}>Your Data</a>{" "}
          for how to export or delete it.
        </p>
      </Section>

      <Section title="What leaves your device">
        <p style={bodyStyle}>
          To show the Quran, the app requests content from these services. Each request carries
          what any web request does — your IP address, your device and browser type, and which verse
          or file was asked for — and nothing else. They never receive your reflections,
          favourites or preferences.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "var(--on-surface-variant)" }}>
            <thead>
              <tr>
                {["Service", "Address", "Used for"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px 8px 0", color: "var(--on-surface)", borderBottom: "1px solid var(--outline-ghost)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERVICES.map(([name, host, use]) => (
                <tr key={name}>
                  <td style={{ padding: "8px 10px 8px 0", verticalAlign: "top", color: "var(--on-surface)", whiteSpace: "nowrap" }}>{name}</td>
                  <td style={{ padding: "8px 10px 8px 0", verticalAlign: "top", wordBreak: "break-word" }}>{host}</td>
                  <td style={{ padding: "8px 0", verticalAlign: "top" }}>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...bodyStyle, marginTop: 12, marginBottom: 0 }}>
          These providers handle their own server logs under their own privacy policies. We do not
          receive or have access to those logs.
        </p>
      </Section>

      <Section title="Things you choose to do">
        <ul style={{ ...listStyle, marginBottom: 0 }}>
          <li><strong>Share</strong> opens your device’s share sheet (or copies to the clipboard). The text goes only where you send it.</li>
          <li><strong>Export</strong> saves a JSON or CSV file to your device. <strong>Import</strong> reads a file you pick, on your device.</li>
        </ul>
      </Section>

      <Section title="What we don’t do">
        <ul style={{ ...listStyle, marginBottom: 0 }}>
          <li>No accounts, sign-in or email collection.</li>
          <li>No analytics, advertising, crash reporting or tracking of any kind.</li>
          <li>No cookies set by the app.</li>
          <li>No access to your location, contacts, camera, microphone or files beyond ones you choose to import.</li>
          <li>We do not sell, rent or share any data — we don’t hold any to share.</li>
        </ul>
      </Section>

      <Section title="Deleting your data">
        <p style={bodyStyle}>
          <strong>Settings → Clear All Data</strong> permanently erases your reflections and
          favourites. To remove everything, including preferences and cached content, uninstall the
          Android app, or clear storage for Quran Reflect in your phone’s app settings, or clear this
          site’s data in your browser.
        </p>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Because we never hold a copy, deletion on your device is complete, and we cannot recover
          anything for you afterwards. Export first if you want a backup.
        </p>
      </Section>

      <Section title="Children">
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Quran Reflect is suitable for all ages. It collects no personal information from anyone,
          including children.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          If this policy changes, the new version will appear on this page with a new effective
          date. Questions: <a href={`mailto:${CONTACT}`} style={linkStyle}>{CONTACT}</a>.
        </p>
      </Section>
    </Shell>
  );
}

const DATA_ROWS = [
  ["Reflections, tags and favourites", "IndexedDB on this device", "Never", "Settings → Clear All Data"],
  ["Theme, colour scheme, translation, reciter, reading sizes, verse layers", "Local storage on this device", "Never", "Clear the app’s storage"],
  ["Reading position (bookmark)", "Local storage on this device", "Never", "Bookmark icon, or clear the app’s storage"],
  ["Loaded verses, tafsir, fonts, audio", "Browser cache on this device", "Never", "Clear the app’s storage"],
];

export function DataPage({ onBack, onOpenPrivacy, onOpenSettings }) {
  return (
    <Shell title="Your Data" subtitle="Everything Quran Reflect keeps, and how to control it" onBack={onBack}>
      <Section title="Where your data lives">
        <p style={bodyStyle}>
          Everything is stored on this device only. Nothing below is ever uploaded, synced or
          backed up by Quran Reflect.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "var(--on-surface-variant)" }}>
            <thead>
              <tr>
                {["Data", "Stored in", "Sent anywhere?", "How to remove"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px 8px 0", color: "var(--on-surface)", borderBottom: "1px solid var(--outline-ghost)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DATA_ROWS.map(([what, where, sent, remove]) => (
                <tr key={what}>
                  <td style={{ padding: "8px 10px 8px 0", verticalAlign: "top", color: "var(--on-surface)" }}>{what}</td>
                  <td style={{ padding: "8px 10px 8px 0", verticalAlign: "top" }}>{where}</td>
                  <td style={{ padding: "8px 10px 8px 0", verticalAlign: "top" }}>{sent}</td>
                  <td style={{ padding: "8px 0", verticalAlign: "top" }}>{remove}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Back up or move your reflections">
        <p style={bodyStyle}>
          Because nothing is stored online, a new phone or a cleared browser starts empty. To keep
          your journal, use <strong>Settings → Export Data</strong> to save a JSON file (restorable)
          or CSV (for spreadsheets), then <strong>Settings → Import Data</strong> on the new device.
        </p>
        <button onClick={onOpenSettings} style={secondaryBtnStyle}>Open Settings</button>
      </Section>

      <Section title="Delete your data">
        <ul style={{ ...listStyle, marginBottom: 0 }}>
          <li><strong>Reflections and favourites:</strong> Settings → Clear All Data. This cannot be undone.</li>
          <li><strong>Everything, including preferences and cache:</strong> uninstall the Android app, or open your phone’s Settings → Apps → Quran Reflect → Storage → Clear storage. In a browser, clear this site’s data.</li>
        </ul>
      </Section>

      <Section title="What the app requests from the internet">
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Verse text, translations, tafsir, recitation and fonts are loaded from third-party
          services. Those requests contain no personal data. The{" "}
          <a href="/privacy" onClick={(e) => { e.preventDefault(); onOpenPrivacy(); }} style={linkStyle}>Privacy Policy</a>{" "}
          lists each service and what it receives.
        </p>
      </Section>
    </Shell>
  );
}
