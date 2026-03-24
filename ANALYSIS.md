# Quran Reflect — Codebase Analysis & Feature Roadmap

> Generated: 2026-03-24

---

## 1. Codebase Overview

### Architecture
- **Single-file SPA**: All ~1,550 lines live in `src/App.jsx`. It is readable now but is approaching the point where splitting into component files becomes necessary.
- **State management**: Pure React `useState`/`useEffect`. No external library — appropriate for current scale.
- **Persistence**: IndexedDB via hand-rolled helpers (`openDB`, `dbAdd`, `dbGetAll`, etc.). No third-party abstraction (e.g. Dexie.js).
- **API layer**: Two API sources:
  - `alquran.cloud` — used by Reflect tab (Surah-level fetches) and Read tab (page-level fetches, Arabic + `en.itani`).
  - Both sources are cached by the PWA service worker (`StaleWhileRevalidate`, 30-day TTL, up to 620 pages).
- **PWA**: `vite-plugin-pwa` with Workbox `generateSW`. Manifest and service worker are auto-generated. Install prompt is not surfaced to the user.
- **Theming**: CSS custom properties, three modes (system / light / dark), persisted to `localStorage`.
- **Fonts**: Google Fonts (`Inter`, `Amiri`) loaded via `@import` — could block first paint.

### What is Working Well
| Area | Status |
|---|---|
| Core reflect + save flow | ✅ Solid |
| IndexedDB read/write/delete/update | ✅ |
| Dark mode + system default | ✅ |
| Journal search + expand/collapse | ✅ |
| Export JSON / CSV | ✅ |
| Import JSON / CSV | ✅ (just added) |
| Read tab page-by-page | ✅ |
| Bookmark + resume | ✅ (just added) |
| Read → Reflect handoff | ✅ |
| Page + content fade animations | ✅ (just added) |
| PWA installability + offline fonts | ✅ |
| Aggressive API caching in SW | ✅ |

---

## 2. Missing Features

### 2.1 High Priority (Core UX Gaps)

| # | Feature | Why it Matters |
|---|---|---|
| **H1** | **PWA Install Prompt** | Users don't know they can install the app. A subtle "Add to Home Screen" banner would convert casual visitors into habitual users. |
| **H2** | **Juz selector on Read tab** | The Quran has 30 Juz (parts). Many users navigate by Juz, not Surah. A Juz dropdown alongside the Surah one is a standard expectation. |
| **H3** | **Reflection streaks / stats** | A simple "You've reflected X days in a row" or total reflection count on the Journal tab creates accountability. |
| **H4** | **Share a Reflection** | Users should be able to share a reflection card as an image or plain text (Web Share API). High emotional value for social sharing. |
| **H5** | **Search in Read tab** | No way to search for a specific word or phrase across the current page. At minimum, browser Ctrl+F works, but an in-app highlight search would be premium. |

### 2.2 Medium Priority

| # | Feature | Why it Matters |
|---|---|---|
| **M1** | **Multiple bookmarks** | Currently only one bookmark is supported. Power users will want to save multiple positions (e.g. one per Juz they're studying). |
| **M2** | **Tagging / categories on reflections** | No way to tag reflections (e.g. "gratitude", "dua", "lesson"). Makes journal hard to browse thematically. |
| **M3** | **Recitation audio** | Linking Ayahs to recitation audio (via the `api.alquran.cloud/v1/ayah/{ref}/ar.alafasy` endpoint) would add an immersive layer. |
| **M4** | **Transliteration** | Non-Arabic speakers benefit from seeing the transliteration alongside Arabic text. `en.transliteration` edition is available on alquran.cloud. |
| **M5** | **Copy Reflection card** | The journal card has no share/copy button for the reflection text itself (only verse text in Reflect tab). |
| **M6** | **Settings back-button / close** | Settings has no way to go back other than tapping the bottom nav. A back arrow makes the navigation feel more native. |

### 2.3 Low Priority / Polish

| # | Feature | Why it Matters |
|---|---|---|
| **L1** | **Haptic feedback on mobile** | `navigator.vibrate()` on save/bookmark. Subtle but very "native" feeling. |
| **L2** | **Mus'haf page number input** | A direct "Go to page" number input next to the pagination buttons. |
| **L3** | **Last-read indicator on Surah dropdown** | Show which Surah was last read so users can resume context-aware navigation. |
| **L4** | **Reading progress bar** | A thin bar at the top of the Read tab showing progress through the 604 pages. |
| **L5** | **Keyboard shortcuts** | Arrow keys for pagination, `/` for Surah search focus. |
| **L6** | **Font size control** | Users have different visual needs. A simple small/medium/large toggle for Arabic and English text. |

---

## 3. Existing Code Issues & Improvements

### 3.1 Architecture

| Issue | Impact | Fix |
|---|---|---|
| **Single 1,550-line file** | Hard to maintain, long scroll to find things | Split into `components/` (ReadTab, ReflectTab, JournalTab, SettingsTab, BottomNav, etc.) |
| **Style objects defined at module scope, after use** | `PageHeader` references `pageTitleStyle` which is defined ~800 lines later — works but fragile | Move shared style objects to a `styles.js` file |
| **`BOOKMARK_KEY` constant inside component** | Re-defined on every render | Hoist it to module scope |
| **`savedBookmark` computed inside render without `useMemo`** | Reads `localStorage` on every render (minor perf hit) | Use `useState` or `useMemo` |

### 3.2 Data / API

| Issue | Impact | Fix |
|---|---|---|
| **No loading state between tab switches** | If Reflect tab has a pending fetch and you switch back, the request is not cancelled | `useEffect` cleanup with `AbortController` |
| **alquran.cloud rate limiting** | Heavy navigation through pages in quick succession could trigger rate limiting | Debounce the `goToPage` call |
| **CSV import loses Arabic/English verse data** | CSV schema doesn't include `arabic`/`english` arrays, so imported CSV entries show empty verse displays in Journal | Either exclude verse display for CSV imports, or warn the user |
| **No error boundary** | An uncaught render error crashes the whole app | Wrap tabs in `<ErrorBoundary>` |

### 3.3 PWA / Performance

| Issue | Impact | Fix |
|---|---|---|
| **Google Fonts `@import` in JSX** | Render-blocking; causes FOUT | Move to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html` or use `font-display: swap` |
| **No offline fallback page** | If the user is offline on first visit, they see nothing | Add an offline fallback HTML to the Workbox config |
| **No install prompt UI** | PWA install is invisible to users | Add a `beforeinstallprompt` listener and show a subtle banner |
| **Service worker update notification** | Users silently get stale content until next reload | Show a "New version available — tap to refresh" toast when SW updates |

---

## 4. Implementation Gameplan

### Phase 1 — Architecture (Do First, Unblocks Everything Else)
**Time estimate: ~2–3 hours**

1. Split `App.jsx` into separate files:
   ```
   src/
     components/
       ReadTab.jsx
       ReflectTab.jsx
       JournalTab.jsx
       SettingsTab.jsx
       BottomNav.jsx
       PageHeader.jsx
       Toast.jsx
       ConfirmModal.jsx
     lib/
       db.js          ← IndexedDB helpers
       api.js         ← fetchVerses, fetchByPage
       data.js        ← SURAHS, SURAH_START_PAGE
       styles.js      ← shared style objects
     App.jsx          ← root only (~80 lines)
   ```
2. Fix `BOOKMARK_KEY` hoisting and `savedBookmark` `useMemo`.
3. Add `ErrorBoundary` component wrapping each tab.
4. Move Google Fonts to `index.html`.

### Phase 2 — High Priority Features
**Time estimate: ~3–4 hours**

1. **H1 — PWA Install Prompt**
   - Listen for `beforeinstallprompt`, store the event
   - Show a subtle glassmorphism banner at top when available
   - Dismiss button stores flag in `localStorage`

2. **H2 — Juz Selector on Read tab**
   - Add `JUZ_START_PAGE` map (30 entries, publicly documented)
   - Add a second dropdown next to the Surah one or a horizontal pill selector

3. **H3 — Stats / Streaks on Journal**
   - Compute streak from `createdAt` dates
   - Show a small stats bar: total reflections · current streak · longest streak

4. **H4 — Share Reflection (Web Share API)**
   - Add a share button on each Journal card
   - `navigator.share({ title, text })` → graceful fallback to clipboard

### Phase 3 — Medium Priority
**Time estimate: ~4–5 hours**

1. **M1 — Multiple bookmarks** — Store as a `Map<label, pageNum>` in localStorage; show a bookmark manager sheet.
2. **M2 — Reflection tags** — Add a `tags: string[]` field to the IndexedDB schema (DB_VERSION 2 migration), tag chips on the Reflect form, filter in Journal.
3. **M4 — Transliteration toggle** — Fetch `en.transliteration` in parallel in ReadTab; toggle button between Arabic-only / Arabic+Transliteration / Arabic+English.
4. **M6 — Settings back button** — Add a `← Back` header button that calls `onBack` prop (set from App to navigate to the previous tab).

### Phase 4 — Polish
**Time estimate: ~2 hours**

1. Font size control (CSS variable `--arabic-size`, `--english-size` toggled by Settings).
2. Reading progress bar (thin gradient bar top-of-page in ReadTab).
3. Offline fallback page.
4. SW update toast notification.

---

## 5. Quick Wins (Can Ship Today)

| Fix | Effort |
|---|---|
| Move `BOOKMARK_KEY` to module scope | 1 line |
| Add `AbortController` to page fetches | 10 lines |
| Add `<link rel="preconnect">` for fonts in `index.html` | 3 lines |
| Debounce `goToPage` | 5 lines |
| Add copy button to Journal cards | 10 lines |
