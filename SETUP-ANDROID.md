# Publishing Quran Reflect on Google Play

The Android app is a **Trusted Web Activity (TWA)**: a thin shell that opens
`https://quran-reflection.netlify.app` full-screen in Chrome. You've done this once already for
Digital Bullet Journal, so this guide only spells out what's different, plus the answers to paste.

Because the app loads the live site, **every Netlify deploy updates the Android app.** You only
rebuild and re-upload when the app's name, icon, colours or Android settings change.

---

## What's already done in the repo

- [x] Manifest: stable `id`, `start_url` and `scope` at the root, `display: standalone`,
      `orientation: any`, colours that match the app, current description, and categories.
- [x] New icon set, green and gold to match the favicon and social image (the old icons were a
      "27/26" placeholder). The maskable icon keeps the star inside Android's safe zone.
      Play Store icon: `store-assets/android/play-icon-512.png`.
- [x] `netlify.toml`: serves `assetlinks.json` as JSON and the manifest as
      `application/manifest+json`, and adds the SPA fallback so `/privacy` and `/data` don't 404.
- [x] Service worker hands every navigation to the app shell, so those pages also work for
      installed users and offline, and keeps `/.well-known/` off the cached path.
- [x] Privacy policy at **`/privacy`** and data page at **`/data`**, both linked from
      Settings → About.
- [x] `public/.well-known/assetlinks.json` with your **upload key** fingerprint (the same key as
      Bullet Journal). The Play app signing fingerprint gets added in Part C.
- [x] `npm run twa:check` checks the live site against all of the above.
- [x] `.gitignore` blocks keystores and build outputs.
- [x] Play feature graphic: `store-assets/android/feature-graphic-1024x500.png`.

---

## Decisions

| Decision | Value | Can it change later? |
| --- | --- | --- |
| Package name | `com.nabilpervezconsulting.quranreflect` | **Never.** If you pick another, change it in `assetlinks.json` and `EXPECTED_PACKAGE` in `scripts/check-twa.mjs` to match exactly. |
| App name (Play) | `Quran Reflect` | Yes |
| Launcher name | `Quran Reflect` is 13 characters and may show as "Quran Refle…" on some phones. `QuranReflect` (12) fits. | With a new build |
| Signing key | Reuse `C:\Users\perve\bullet-journal-android\android.keystore` | — |
| Status bar | Light `#FAFAF8`, dark `#1C1F1A` | With a new build |

**Why reuse the key:** one upload key can sign many apps. You already guard that keystore and
know its password, and its fingerprint is already in `assetlinks.json`. Play generates a separate
app signing key for each app, so the apps stay independent. If you'd rather use a new key,
replace the fingerprint in `assetlinks.json` with the new one's.

---

## Part A — Get the website live (5 minutes)

1. Merge `feat/play-store-prep` into `main`. Netlify deploys it automatically.
2. When the deploy finishes, run:

   ```bash
   npm run twa:check
   ```

   **Expected:** `✓ Ready` with two warnings: the 13-character launcher name, and "Only one
   fingerprint". The second one is correct until Part C.

---

## Part B — Build the app (15 minutes)

Bubblewrap, the JDK and the Android SDK are already on your machine from Bullet Journal.

```bash
mkdir C:\Users\perve\quran-reflect-android
cd C:\Users\perve\quran-reflect-android
bubblewrap init --manifest=https://quran-reflection.netlify.app/manifest.webmanifest
```

Keep this folder **outside the repo and outside OneDrive**, as before.

Answers to the prompts:

| Prompt | Answer |
| --- | --- |
| Domain | `quran-reflection.netlify.app` |
| URL path | `/` |
| Application name | `Quran Reflect` |
| Short name | Your launcher-name choice from the table above |
| Application ID | `com.nabilpervezconsulting.quranreflect` |
| Starting version code | `1` |
| Display mode | `standalone` |
| Orientation | `default` |
| Status bar color | `#FAFAF8` |
| Splash screen color | `#FAFAF8` |
| Icon URL / Maskable icon URL | Accept the defaults it reads from the manifest |
| Monochrome icon | Skip |
| Shortcuts | No |
| Play Billing | No |
| Location delegation | No |
| Key store location | `C:\Users\perve\bullet-journal-android\android.keystore` |
| Key name (alias) | The alias you used for Bullet Journal |

Before building, open `twa-manifest.json` in that folder and add dark-mode colours so the status
bar matches when a phone is in dark mode:

```json
"themeColorDark": "#1C1F1A",
"navigationColorDark": "#1C1F1A",
```

Then:

```bash
bubblewrap build
```

It asks for the keystore and key passwords, then writes **`app-release-bundle.aab`**. That's
the file you upload.

---

## Part C — Play Console

### C1. Create the app and upload

1. **Create app** → name `Quran Reflect`, App, Free.
2. Upload `app-release-bundle.aab` to a testing track. If your account requires a closed test
   before production (12 testers for 14 days on newer personal accounts, and it applies to each
   new app), start it now, since it's the longest step. You did this for Bullet Journal.

### C2. Add the Play app signing fingerprint — this is what hides the address bar

1. Play Console → **App integrity → App signing** (under *Test and release*, or *Setup* on older layouts).
2. Under **App signing key certificate** (not the upload key), copy the **SHA-256** value.
3. Add it as a second entry in `public/.well-known/assetlinks.json`:

   ```json
   "sha256_cert_fingerprints": [
     "13:36:F9:28:F5:E0:8C:50:8B:9A:18:DA:0E:1F:E0:06:F9:A9:92:9A:2E:F3:F0:65:CD:BD:E2:79:2A:58:DA:71",
     "PASTE_THE_APP_SIGNING_SHA256_HERE"
   ]
   ```

4. Commit, push, wait for the deploy, run `npm run twa:check`. The fingerprint warning should
   be gone.

### C3. Store listing

| Field | Use |
| --- | --- |
| App icon | `store-assets/android/play-icon-512.png` |
| Feature graphic (1024×500) | `store-assets/android/feature-graphic-1024x500.png` |
| Phone screenshots (2–8) | From the installed app: the reader, Contents, the Journal, Settings |
| Short description (≤80) | `Read the Quran ayah by ayah and keep a private reflection journal.` |
| Full description | See below |
| Category | Books & Reference |
| Contact email | nabilpervezconsulting@gmail.com |
| Privacy policy | `https://quran-reflection.netlify.app/privacy` |

Full description:

> Quran Reflect is a quiet place to read the Quran and reflect on it, one ayah at a time.
>
> • Arabic text with transliteration and translation, each shown or hidden as you like
> • Tafsir Ibn Kathir for every ayah
> • Recitation from eight reciters, including Mishary Alafasy, Al-Husary and Al-Minshawi
> • Seven English translations, including Saheeh International and The Clear Quran
> • Browse by surah, ayah or juz, and pick up where you left off
> • Adjustable reading sizes, light and dark modes, and six colour themes
> • A private journal for your reflections, with tags, favourites, and export to JSON or CSV
>
> Private by design: no account, no ads, no analytics. Your reflections are stored only on your
> device and are never uploaded.

### C4. App content forms

| Form | Answer |
| --- | --- |
| **Privacy policy** | `https://quran-reflection.netlify.app/privacy` |
| **Ads** | No ads |
| **App access** | All functionality is available without special access |
| **Content rating** | Reference app. No violence, no user-to-user interaction or sharing (reflections are private), no personal data collection. |
| **Target audience** | Choose 13+ age groups. Including under-13 is allowed, since the app collects nothing, but it enrols you in Google's Families policy and extra review. |
| **Data safety** | See below |
| **Government / financial / health apps** | No |

**Data safety:**

- *Does your app collect or share any of the required user data types?* **No.**
- Why that's accurate: Google counts data as "collected" when the app sends it off the device.
  Reflections, favourites and settings never leave it. The requests for verses, tafsir, audio and
  fonts carry no user data beyond the IP address that every web request carries, and nothing uses
  it to derive location. The policy discloses these services anyway.
- *Is data encrypted in transit?* Yes (HTTPS only).
- *Can users request deletion?* Not applicable: nothing is collected. Deletion on the device is
  explained at `/data`.

---

## If the address bar still shows

Work down this list; it's ordered by how often each is the cause.

1. **The Play signing fingerprint is missing or wrong.** It must come from **App signing key
   certificate**, not the upload key. `npm run twa:check` shows how many fingerprints are live.
2. **The phone cached a failed check.** Chrome remembers the result. After fixing
   `assetlinks.json`: on the phone, open Settings → Apps → **Chrome** → Storage → *Clear
   storage* (or at least *Clear cache*), then uninstall Quran Reflect and reinstall it from Play.
3. **Google hasn't picked up the change yet.** Its verifier caches for up to about an hour.
   Check what it currently sees:

   ```bash
   curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://quran-reflection.netlify.app&relation=delegate_permission/common.handle_all_urls"
   ```

   Both fingerprints should appear.
4. **The page left the site.** A bar appearing only on some screens means a link opened another
   domain, which is expected TWA behaviour.
