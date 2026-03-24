Code this please. 

Here is the finalized, developer-ready Product Requirements Document (PRD) for the Quran Reflection PWA.
I have removed the assumptions and explicitly integrated your confirmed architectural and feature decisions (IndexedDB, Clear Quran translation, mandatory editing, and internet-required fetching). This document is now ready to be handed off to your engineering and design teams.
Product Requirements Document: Quran Reflection PWA (Final)
1. Context & Scope (Essential)
1.1 Executive Summary
 * Elevator Pitch: A privacy-focused, mobile-first Progressive Web App (PWA) that allows users to seamlessly select Quranic verses, read the Arabic text alongside the "Clear Quran" English translation, and log personal reflections (Tadabbur) directly to their device's local memory.
 * Product Type: New Product (MVP).
 * Top 3 KPIs: * 1,000 Weekly Active Users (WAU) within 3 months of launch.
   * Average of 3 reflections saved per user per week.
   * Zero critical API fetch failures (99.9% uptime for verse retrieval).
1.2 Problem Statement
 * Problem: Muslims looking to engage in Tadabbur (Quranic contemplation) often have to switch context between a Quran app and a standard note-taking app, leading to friction and lost context.
 * Consequence: Reflections are scattered, unorganized, and disconnected from the exact verses that inspired them.
 * Status Quo: Users copy-paste Arabic text and translations into Apple Notes, Notion, or physical journals.
1.3 Value Proposition
 * Solution: A unified, distraction-free environment where the verses and the user's thoughts live side-by-side.
 * "Aha!" Moment: When the user hits "Save," the interface instantly resets for a new thought, and they seamlessly find their beautifully formatted entry waiting for them in the Review tab.
2. User Personas & Roles (Essential)
2.1 The Personas
 * The End User (The Reflective Muslim): Individuals seeking spiritual growth through active engagement with the Quran.
2.2 Role-Based Access Control (RBAC)
 * Roles: Single-tenant local user. There is no server-side user table or authentication.
 * Permissions: The user has absolute read/write/edit/delete access to the local database on their specific device.
3. User Stories & Functional Requirements (Essential)
3.1 Authentication & Onboarding
 * Sign Up: None. Frictionless entry; the app opens immediately to the core workflow to respect user privacy and eliminate barriers.
 * Onboarding: A one-time minimal toast message on first load: "Welcome. All reflections are saved securely on your device."
3.2 Core Workflow (The "Happy Path")
 * Selection: User opens the PWA. Selects a Surah (1-114) from a searchable dropdown.
 * Refinement: Two dependent dropdowns unlock: Start Ayah and End Ayah. (The UI strictly prevents the End Ayah from being a lower number than the Start Ayah).
 * Fetch: Upon selecting the Ayahs, the PWA triggers a GET request to a public API (requires internet connection).
 * Display: The app displays the Arabic text (Othmani script) and the Clear Quran English translation.
 * Input: User types their reflections in a multi-line <textarea>.
 * Action: User taps "Save".
 * Processing: Data is serialized into a JSON object (Timestamp, Surah Name, Ayah Range, Arabic Text, English Text, User Reflection) and written to the browser's IndexedDB.
 * Output: A success toast appears, the form resets entirely to its default empty state, and the user remains on the page.
3.3 Settings & Configuration
 * Data Export: Users must be able to export their local data to a .json or .csv file to prevent data loss if browser caches are cleared.
 * Clear Data: A "Danger Zone" button to wipe all local data with a strict double-confirmation modal.
 * Theme: Native OS-dependent Dark/Light mode toggle.
4. Monetization & Billing
Since this relies entirely on local storage, traditional SaaS billing doesn't apply to the MVP.
4.1 Pricing Model
 * Model: 100% Free for the MVP. No paywalls or feature gating.
5. Site Map & Information Architecture (Essential)
5.1 Global Navigation
 * Mobile Bottom Bar (Primary Navigation):
   * Reflect (Icon: Pen/Book) - The main input form.
   * Journal (Icon: List/Archive) - The saved data view.
   * Settings (Icon: Gear) - Export, UI settings.
 * Global Layout: No topbar to maximize vertical reading space, just the active view's title (e.g., "New Reflection").
5.2 URL Structure
 * Client-side routing for the PWA Single Page App (SPA):
   * / (Reflect Tab)
   * /journal (Review Tab)
   * /settings (Settings Tab)
6. Page-by-Page Component Breakdown (Essential)
Page 1: "Reflect" (Dashboard / Input Form)
 * Goal: Fetch a verse and write a reflection.
 * Layout: Single-column, vertical scroll.
 * Components:
   * Dropdown 1: Surah (Searchable select, 1-114).
   * Dropdown 2 & 3: Start Ayah, End Ayah. (Disabled until Surah is selected. Dynamically populates based on the number of Ayahs in the chosen Surah).
   * Loading State: A skeleton loader replaces the verse display area while the API fetches data.
   * Verse Display Box: Renders the fetched Arabic and English (Clear Quran) text. Includes a "Copy" icon button.
   * Input Field: <textarea> with an auto-expanding height. Placeholder: "What are your thoughts on these verses?"
   * Action Button: Primary solid button: "Save Reflection". Disabled if the textarea is empty or API fetch failed.
   * Post-Action: Form clears, dropdowns reset, user stays on the page.
Page 2: "Journal" (List/Table View)
 * Goal: Review and manage past reflections.
 * Layout: Feed of cards ordered by Date Created (Descending).
 * Components:
   * Card Anatomy:
     * Header: Surah Name + Ayah Range (e.g., Al-Baqarah, 2:1-5) & Timestamp.
     * Body (Quran): Arabic text (Right-to-Left formatting) and English text.
     * Body (Reflection): User's text. If longer than 4 lines, truncated with a "Read More" expander.
   * Row Actions (Critical): * "Edit": Opens a full-screen modal or inline editor to update the reflection text and save changes back to IndexedDB.
     * "Delete": Triggers a confirmation toast: "Are you sure you want to delete this reflection?"
   * Empty State: Friendly graphic with text: "You haven't saved any reflections yet. Head over to the Reflect tab to start."
7. Technical Requirements (Essential)
7.1 Stack Preferences
 * Frontend: React.js or Next.js (Static Export). This ensures snappy client-side rendering perfect for a PWA.
 * Styling: Tailwind CSS for rapid, responsive UI building.
 * Database: IndexedDB via Dexie.js. This is required over standard localStorage to safely handle larger volumes of text data asynchronously without blocking the main browser thread.
 * Hosting: Vercel, Netlify, or GitHub Pages (free, incredibly fast static hosting).
7.2 Performance & Reliability
 * Load Time: < 1 second.
 * Offline Capabilities: Must be configured as a PWA with a Service Worker. The app shell, UI assets, and Journal tab will be available offline. Note: Fetching new verses on the Reflect tab strictly requires an internet connection (verses are not bundled into the app payload to save storage space).
7.3 Integrations & APIs
 * Data Source: Quran.com API v4 (or comparable reliable free tier).
 * Translation Parameter: The API call must specifically request the "Clear Quran" translation ID (e.g., Dr. Mustafa Khattab's translation) and ignore all other translation options.
8. Data & Analytics (Optional but Recommended)
8.1 Internal Events
 * Given the highly personal/religious nature of the app, analytics must be heavily anonymized.
 * Use a privacy-first tracker (like Plausible Analytics) strictly to track page views and "Save Clicked" events (without recording the content of the text).
9. Design System & UI Rules (Optional)
 * Typography: * English UI & Translation: Inter or Roboto.
   * Arabic Text: KFGQPC Uthman Taha Naskh (standard Quranic font). Must be embedded to ensure it renders beautifully on all devices.
 * Color Palette: Serene, minimal.
   * Primary: Deep Forest Green (#1A4D2E)
   * Background: Off-white/Cream (#FAF9F6) to mimic paper and reduce eye strain.
 * Responsiveness: Mobile-first design. On desktop, the app should be centered with a max-width (e.g., max-w-2xl) so text lines don't get uncomfortably long to read.
10. Roadmap & Phasing (Essential)
10.1 MVP (Phase 1) - Current Scope
 * PWA setup with Service Worker.
 * Surah/Ayah selection and API fetching (Requires Internet).
 * Hardcoded "Clear Quran" English translation.
 * IndexedDB saving, retrieving, and editing functionality.
 * Journal list view with Edit/Delete capabilities.
 * Data export to JSON/CSV.
10.2 V1.1 / V2 (Future)
 * Cloud Sync (Supabase/Firebase integration via Google Auth) for cross-device backup.
 * Search bar in the Journal tab to find past reflections by keyword.
 * Tagging system (e.g., #patience, #mercy) for categorization.
