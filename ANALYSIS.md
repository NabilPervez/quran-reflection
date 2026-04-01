# Quran Reflect — Codebase Analysis & Feature Roadmap

> Updated: 2026-04-01

---

## 1. Codebase Overview

### Architecture
- **Component-based SPA**: Properly split across `src/components/` (ReadTab, ReflectTab, JournalTab, SettingsTab, BottomNav, PageHeader, Toast, ConfirmModal) and `src/lib/` (api.js, db.js, data.js, styles.js). `App.jsx` is now ~220 lines.
- **State management**: Pure React `useState`/`useEffect`. No external library — appropriate for current scale.
- **Persistence**: IndexedDB via hand-rolled helpers (`openDB`, `dbAdd`, `dbGetAll`, `dbDelete`, `dbUpdate`, `dbClear`).
- **API layer**: `alquran.cloud` — Surah-level fetches for Reflect tab, individual Ayah fetches (`fetchAyah`) for Read tab, with tafsir (Ibn Kathir) included. All fetches use `AbortController` for cleanup.
- **PWA**: `vite-plugin-pwa` with Workbox `generateSW`. Manifest and service worker auto-generated.
- **Theming**: CSS custom properties, three modes (system / light / dark), persisted to `localStorage`.
- **Fonts**: Google Fonts (`Inter`, `Amiri`) loaded at runtime.

### What is Working Well
| Area | Status |
|---|---|
| Core reflect + save flow | ✅ |
| IndexedDB read/write/delete/update/clear | ✅ |
| Dark mode + system default | ✅ |
| Journal search + expand/collapse | ✅ |
| Export JSON / CSV | ✅ |
| Import JSON / CSV | ✅ |
| Read tab ayah-by-ayah navigation | ✅ |
| Surah + Juz selectors on Read tab (H2) | ✅ |
| In-page text search + highlight (H5) | ✅ |
| Keyboard shortcuts (← →, /) | ✅ (L5) |
| Bookmark + auto-resume | ✅ |
| Reflection streaks + stats bar (H3) | ✅ |
| Tags on reflections + filter chips (M2) | ✅ |
| Share Reflection via Web Share API (H4) | ✅ |
| Copy reflection text (M5) | ✅ |
| Favorites (♥ Ayah) from Read tab | ✅ |
| Back button in Settings (M6) | ✅ |
| Tafsir toggle per ayah | ✅ |
| AbortController on all fetches | ✅ |
| Page fade animation on ayah change | ✅ |
| PWA installability + service worker | ✅ |
| Shimmer skeletons on load | ✅ |
| Error state per tab | ✅ |

---

## 2. Missing Features

### 2.1 High Priority (Core UX Gaps)

| # | Feature | Why it Matters | Implementation Notes |
|---|---|---|---|
| **H1** | **PWA Install Prompt** | Users don't know they can install the app. Currently the `beforeinstallprompt` event is never surfaced. A subtle banner converts casual visitors into habitual users. | Listen for `beforeinstallprompt` in `App.jsx`, store the event in a `ref`. Show a dismissible glassmorphism pill below the header (persist dismissal in `localStorage`). |
| **H2** | **SW Update Toast** | When a new service worker is available, users silently get stale content until the next restart. | In `App.jsx`, register a `controllerchange` listener on the navigator service worker. When it fires, call `showToast("New version ready — tap to refresh", "update")` with a reload button. |
| **H3** | **Reading Progress Bar** | No visual indicator of how far the user is through the 6,236-ayah Quran. Creates a sense of progress and completion. | Compute `progress = ((surah - 1) * avgAyahs + ayah) / 6236`. Render a thin gradient bar (3–4 px) pinned to the top of ReadTab. |
| **H4** | **Transliteration Toggle** | Non-Arabic speakers benefit from seeing the Roman transliteration. The `en.transliteration` edition is available on alquran.cloud but is not fetched. | In `fetchAyah` (`lib/api.js`), add a parallel fetch for `edition=en.transliteration`. Add a tri-state toggle in ReadTab: Arabic only / + Transliteration / + English. Persist preference in `localStorage`. |

### 2.2 Medium Priority

| # | Feature | Why it Matters | Implementation Notes |
|---|---|---|---|
| **M1** | **Multiple Bookmarks** | Only a single `BOOKMARK_KEY` is supported. Power users studying multiple Juz at once have no way to save multiple positions. | Replace the single key with an array of `{ label, surah, ayah, createdAt }` objects in `localStorage`. Render a "Saved Positions" sheet (bottom drawer) in ReadTab with add/delete controls. Keep the single auto-bookmark behavior as the default slot. |
| **M2** | **Recitation Audio (per Ayah)** | The Read tab is text-only. Audio brings an entirely new dimension — it's how most Muslims recite. | Use `https://cdn.islamic.network/quran/audio/128/ar.alafasy/{ayahGlobalNumber}.mp3` (free CDN, no API key). Compute global ayah number from the `SURAHS` data. Add a play/pause button per card. Preload next ayah's audio in the background. |
| **M3** | **Offline Fallback Page** | If the user is offline on first visit (before SW caches anything), they see a browser error page — not an app shell. | Add an `offline.html` to the Workbox config as a `navigationFallback`. Display a branded "You're offline — please reconnect to load new verses" screen. |
| **M4** | **Dua / Supplication Log** | Users often want to capture personal duas alongside their reflections, but the reflection field conflates them. A separate "Dua" log with its own section in Journal adds spiritual depth. | Add a new `type: "dua" | "reflection"` field to the IndexedDB schema (increment `DB_VERSION`). Add a "Log a Dua" tab or section in the Reflect tab. Filter Journal by type. |
| **M5** | **Font Size Control in Settings** | Users have different visual needs, especially for the Arabic text. Currently font size is hardcoded. | Expose two CSS variables: `--arabic-size` (default `26px`) and `--english-size` (default `14.5px`). Add a small/medium/large pill selector in SettingsTab. Persist to `localStorage` and apply via `document.documentElement.style.setProperty`. |
| **M6** | **Journal Sort Order** | Reflections always appear newest-first. Some users want to browse chronologically (oldest first) or by Surah number. | Add a `<select>` sort control above the Journal list with options: Newest first / Oldest first / Surah order. Apply a stable sort on `filtered` before `.map()`. |

### 2.3 Low Priority / Polish

| # | Feature | Why it Matters | Implementation Notes |
|---|---|---|---|
| **L1** | **Haptic Feedback** | `navigator.vibrate()` on save, bookmark, and delete feels native and satisfying on mobile. | Wrap in a small `haptic(pattern)` helper in `lib/utils.js`. Call with `haptic(10)` on save, `haptic([5, 50, 5])` on delete. Guard with `if ('vibrate' in navigator)`. |
| **L2** | **Reflection Word Count** | Writers like to see how much they've written. A live "X words" counter below the reflection textarea gives a pulse of progress. | Compute `text.trim().split(/\s+/).filter(Boolean).length` and display as a muted caption below the textarea in ReflectTab. |
| **L3** | **Last-read Indicator on Surah Dropdown** | Users often want to resume reading context-aware, but the Surah list gives no visual cue. | Decorate the active `savedBookmark`'s Surah in the dropdown with a small 🔖 icon and a distinct style. |
| **L4** | **Empty Favorites View** | Filtering by the "Favorite" tag in Journal shows nothing special — it renders like any other filter. Users expect a dedicated "Your Favorites" feel. | When `activeTag === "Favorite"`, render a subtle hero section with ♥ icon and the count before the card list. |
| **L5** | **Swipe Navigation on Mobile** | Power mobile users expect swipe-left/right to navigate ayahs. Currently only arrow-key shortcuts exist. | Use `touchstart` / `touchend` listeners in ReadTab. Call `nextAyah()` or `prevAyah()` when horizontal swipe delta > 60px and vertical delta < 40px. |
| **L6** | **CSV Export Includes Tags** | The CSV export (`SettingsTab.jsx`) includes only 7 fields and excludes `tags`. Round-tripping a CSV drops all tag data. | Add `"tags"` to the `headers` array in `exportCSV`. Serialize as a pipe-delimited string (e.g. `Gratitude|Lesson`). Update `importCSV` to split and re-attach. |

---

## 3. Existing Code Issues & Improvements

### 3.1 Architecture

| Issue | Impact | Fix |
|---|---|---|
| **`PRESET_TAGS` defined in both `ReadTab.jsx` and `ReflectTab.jsx`** | DRY violation — if the list changes, both files need updating | Hoist `PRESET_TAGS` to `lib/data.js` and import from there |
| **`skeletonLine` helper duplicated in ReadTab and ReflectTab** | Minor duplication | Extract to `lib/styles.js` or a shared `Skeleton.jsx` component |
| **No `ErrorBoundary`** | An uncaught render error in any tab crashes the whole app with a blank screen | Wrap each tab in a `<ErrorBoundary>` component using `componentDidCatch` |
| **Inline style objects defined ad-hoc inside render** | New style objects created on every render, minor GC pressure | For static styles (not dependent on state), move to `styles.js` or define outside the component |

### 3.2 Data / API

| Issue | Impact | Fix |
|---|---|---|
| **CSV import loses `arabic`/`english` verse data** | Imported CSV entries show empty verse blocks in Journal | Either warn the user ("Verse text won't be available for CSV imports"), or enrich CSV with verse columns |
| **CSV import/export drops `tags`** | Tags are silently lost on CSV round-trip | Add `tags` column (pipe-delimited) to CSV schema in both export and import |
| **No debounce on Surah dropdown filter** | Typing quickly in the Surah search input triggers a re-render on every keystroke | Debounce `setSurahSearch` by 150ms |
| **`dbUpdate` overwrites the entire record** | If a field is missing in the patch object, it gets deleted from IDB | Ensure `dbUpdate` always merges: `store.put({ ...existingRecord, ...patch })` |

### 3.3 PWA / Performance

| Issue | Impact | Fix |
|---|---|---|
| **Google Fonts loaded via JS `@import`** | Render-blocking or FOUT on cold start | Move to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html` |
| **No offline fallback page** | First visit offline = browser error page | Add `navigationFallback` to Workbox config pointing to `offline.html` |
| **No install prompt UI** | PWA install is invisible to users | Implement H1 above |
| **Service worker update notification missing** | Users run stale code after deploys | Implement H2 above |
| **Audio assets not precached** | Recitation audio (M2) would always require network | Add a Workbox `NetworkFirst` route for the `cdn.islamic.network` CDN matching audio files |

---

## 4. Implementation Gameplan

### Phase 1 — High-Impact, Low-Effort Quick Wins
**Time estimate: ~1–2 hours**

1. **L6 — Fix CSV tags export/import** — Add `tags` column to `exportCSV` and parse it in `importCSV`.
2. **L1 — Haptic feedback** — Add a `haptic()` helper and wire to save/delete/bookmark.
3. **L2 — Reflection word count** — 3-line addition below the textarea in ReflectTab.
4. **Move `PRESET_TAGS` to `lib/data.js`** — Remove duplication from ReadTab and ReflectTab.
5. **Move Google Fonts to `index.html`** — Improve first-paint time.

### Phase 2 — Core Missing Features
**Time estimate: ~3–5 hours**

1. **H1 — PWA Install Prompt**
   - Listen for `beforeinstallprompt` in `App.jsx`, store event in `ref`
   - Render a dismissible pill below the BottomNav (or as a top banner)
   - Store `"pwa_install_dismissed"` key in `localStorage`

2. **H2 — SW Update Toast**
   - In `main.jsx` or `App.jsx`, listen for `navigator.serviceWorker.addEventListener('controllerchange', ...)`
   - `showToast("New version available — tap to refresh")` with a reload CTA

3. **H3 — Reading Progress Bar**
   - Map `currentPos` to a `0–100` percentage based on ayah ordinal
   - Render a `position: sticky; top: 0` bar in ReadTab with a gradient fill

4. **M5 — Font Size Control in Settings**
   - Add two CSS vars `--arabic-size` and `--english-size` to `index.css`
   - Add a pill toggle in SettingsTab: Small / Medium / Large
   - Persist to `localStorage` and apply via `document.documentElement.style.setProperty`

5. **M6 — Journal Sort Order**
   - Add sort `<select>` above entries: Newest / Oldest / Surah order
   - Sort `filtered` before rendering

### Phase 3 — Richer Features
**Time estimate: ~4–6 hours**

1. **H4 — Transliteration Toggle**
   - Extend `fetchAyah` to also fetch `en.transliteration` in parallel (`Promise.all`)
   - Store in ayah state as `ayah.transliteration`
   - Add a tri-state button in ReadTab: Arabic / + Transliteration / + English

2. **M2 — Recitation Audio**
   - Compute global ayah number: sum of ayah counts for all preceding surahs + current ayah
   - Render `<audio>` element per card with controls, or a custom play/pause button
   - Preload next ayah audio on idle

3. **M1 — Multiple Bookmarks**
   - Store `qr_bookmarks` as a JSON array in `localStorage`
   - Add a "Save Position" button in ReadTab that opens a name-input popover
   - Show saved positions as chips in ReadTab navigation

4. **M3 — Offline Fallback**
   - Create `public/offline.html`
   - Update `vite.config.js` Workbox config with `navigationFallback: '/offline.html'`

### Phase 4 — Nice to Have
**Time estimate: ~2 hours**

1. **M4 — Dua Log** — IndexedDB schema v2, new `type` field, separate Dua section in Journal.
2. **L5 — Swipe Navigation** — Touch event listeners in ReadTab.
3. **L3 — Last-read indicator in Surah dropdown** — Decorate the bookmarked surah with 🔖.
4. **L4 — Favorites hero section** — Special header when filtering by Favorite tag.

---

## 5. Quick Wins (Can Ship Today)

| Fix | File | Effort |
|---|---|---|
| Move `PRESET_TAGS` to `lib/data.js` | `ReadTab.jsx`, `ReflectTab.jsx`, `lib/data.js` | 5 min |
| Add `tags` column to CSV export/import | `SettingsTab.jsx` | 15 min |
| Add `haptic()` helper + wire to 3 actions | `lib/utils.js`, `ReadTab.jsx`, `JournalTab.jsx` | 20 min |
| Word count below reflection textarea | `ReflectTab.jsx` | 5 min |
| Move Google Fonts to `<link>` in `index.html` | `index.html` | 5 min |
| Add swipe navigation | `ReadTab.jsx` | 30 min |
| Journal sort order dropdown | `JournalTab.jsx` | 20 min |
