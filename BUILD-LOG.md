# Nota — build log

## 2026-11-18 ~21:05 WIB — Phase 1 build (coordinator)

### What was built
- Fresh static web app at `~/workspace/buildhybridai-notes/` (no existing
  notes app to reuse; layout pattern reused from Bounty Radar:
  `index.html` + `app.js` + `styles.css` + `README.md` + `LICENSE`,
  plain static, no build step, GitHub Pages-ready).
- **Product name: Nota** — "Private notes that think on your device."
- Features: notes CRUD (localStorage only), search, 2 seeded sample
  notes, word/token counter, route hint, AI actions (Summarise,
  Key points, Action items, Tags, Rewrite shorter/formal/simpler,
  Proofread, Draft reply, Deep analysis), ON DEVICE / IN CLOUD /
  LOCAL DEMO chips, "Keep my notes on this device" switch
  (ONLY_ON_DEVICE), first-run model-download progress UI, offline
  indicator, copy/apply-result, delete note.
- Hybrid routing in `app.js` via Firebase AI Logic JS SDK 12.5.0
  (import map, pinned `gstatic` URLs): `getAI` + `GoogleAIBackend`,
  `getGenerativeModel({ model, mode })`, `InferenceMode.PREFER_ON_DEVICE`
  / `PREFER_IN_CLOUD` / `ONLY_IN_CLOUD` / `ONLY_ON_DEVICE`,
  `initializeDeviceModel(progress)`, `generateContent()`, chip read
  from `response.inferenceSource`. Structured JSON via
  `responseMimeType: application/json` (+ `Schema` when exported).
- Cloud model IDs verified live 2026-11-18 (Firebase AI Logic docs
  read verbatim + JS SDK changelog): `gemini-3.8-flash` (default),
  `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview` (Deep only).
  No `gemini-2.5-*` anywhere.
- `firebase-config.js` holds PLACEHOLDER config only — no real keys.
- Local demo engine (extractive, in-browser) so every button works
  with zero setup; results always labelled LOCAL DEMO.
- README documents the exact 5-minute Firebase setup (project →
  AI Logic → config paste → App Check debug token → reload).

### Verification
- Headless Chrome 156.0.8078.4 (Playwright binary), local server
  `python3 -m http.server 8123`, 2026-11-18 ~21:10 WIB.
- **Renders, zero JS errors.** Console log (`--enable-logging=stderr`)
  shows only two Chrome INFO lines about the LanguageModel API (no
  output language specified; "model was available but there was not an
  execution config available for the feature") — no `Uncaught`, no
  failed requests. Screenshots: `shots/desktop-1280.png` (1280x800),
  `shots/mobile-390b.png` (390x844), `shots/desktop-selftest.png`
  (1280x1400, after running Summarise).
- **Seed notes render** (2 sample notes listed, active note in editor,
  209 words / ~292 tokens, route hint shown).
- **Summarise end-to-end via `?selftest=1`** (real code path, `--dump-dom`
  check): result panel renders TL;DR + Key points + Action items +
  Tags with chip `LOCAL DEMO`. DOM probe: `SELFTEST chip=LOCAL DEMO`.
  All 10 action buttons render and are enabled.
- **Sidebar overflow bug found + fixed:** `.note-list` grid items
  forced the track wider than the sidebar (horizontal scrollbar on
  desktop + mobile). Fixed with `min-width: 0` + `overflow: hidden`
  on items and `overflow-x: hidden` on the list; re-verified in
  `mobile-390b.png` and `desktop-selftest.png` (previews ellipsis).
- **Demo action-item false positive fixed:** bare "send" matched
  non-action sentences; removed from the trigger list ("will send"
  still matches via "will").
- **On-device Nano: UNVERIFIED on this VM — and here is exactly why.**
  `LanguageModel` exists in Chrome 156, but `LanguageModel.availability()`
  returns `"unavailable"` in this headless Linux VM (no execution config
  for the feature; no model download possible here). The app reports
  this honestly in the status bar ("unavailable on this device") and
  keeps working in demo mode. A real Nano run needs a desktop Chrome
  139+ with the `#prompt-api-for-gemini-nano-multimodal-input` flag
  and the one-time model download — that step is still open and must
  be done on a real machine (or the user's laptop once fixed) before
  the demo video is recorded.
- **Firebase NOT connected yet** (no project exists): app correctly
  detects placeholder config, shows "AI: local demo" + setup note,
  and never attempts a Firebase call. No secrets anywhere in the repo
  (config file holds `YOUR_…` placeholders only — verified by grep,
  see below).
- `node --check app.js` OK; `index.html` parses OK (HTMLParser).
- Secrets scan: clean — the only `YOUR_` hit outside
  `firebase-config.js` is the placeholder-detection check in `app.js`
  itself. No `gemini-2.5-*` model ID anywhere in code (all "2.5"
  mentions are "never use 2.5" comments); the only "2.5.0" is the
  Firebase JS SDK version (12.5.0 / @firebase/ai 2.5.0).

### Design review — Violet, 2026-11-18 ~21:15 WIB: FIX LIST (9 items)
Verdict was FIX LIST, not GO. All 9 applied and re-verified with
fresh renders (`shots/desktop-1280-v3.png`, `shots/mobile-390-v2.png`,
`shots/desktop-selftest-v3.png`, zero console errors, self-test still
`SELFTEST chip=LOCAL DEMO`):
1. Sidebar grid blowout — added `grid-template-columns: minmax(0, 1fr)`
   to `.note-list` (belt-and-braces on top of the earlier fix).
2. Duplicated "(unavailable)" — status title now reads once; the
   reason lives in the detail line.
3. "Enable on-device AI" disabled with an explanatory `title` when
   Nano is unavailable; on success it becomes "On-device AI ready ✓".
4. Status panel demoted to a slim one-line banner (title + Details +
   ✕); full panel behind Details; dismiss parks it as an "AI status"
   pill in the top bar. Mobile first screen now shows Notes, not the
   config notice.
5. + 6. Actions below the fold / sliced last line — root cause was
   `rows="14"` on the textarea beating the CSS min-height. Now
   `rows="7"` + `min-height: 209px` (7 full 26.4px lines + padding);
   v3 render shows exactly 7 complete lines and all 10 action buttons
   above the fold at 1280×800.
7. Summarise is now solid green (`.btn-ai.btn-primary` combined rule
   — the first attempt exposed a real cascade bug: `.btn-ai` overrode
   the background but left white text, i.e. white-on-pale; fixed with
   an explicit combined selector).
8. "Delete note" is now a quiet muted text button (`.btn-quiet`).
9. Demo content — TL;DR is one sentence (capped ~200 chars); action
   items exclude sentences already used as key points, so the lists no
   longer repeat verbatim; empty actions render honestly as "No clear
   action items found in this note."

### Still open
- Firebase project not created yet (needs parent/user, ~5 min).
- GitHub repo not created (connector cannot create repos — needs the
  parent via the signed-in browser), nothing pushed.
- Demo video (user records on his phone later) and Devpost submission.
- Real on-device Nano run (see verification section).

### Design review
- Violet FIX LIST — all 9 applied + re-verified (see above). No
  second review round requested; v3 renders are the evidence.

## v4 — Simplified UI + ID/EN language menu (2026-11-18 ~21:40–22:00 WIB, user-approved)
User feedback: "masih bingung pakenya, UI harusnya lebih simple dan friendly" + ID/EN language menu. Applied all 13 items of Violet's UI-SIMPLIFY-PLAN.md:
1. Top bar: segmented ID | EN toggle (active = green), small status dot (● Siap / ● Demo); "online" + "AI: local demo" pills removed; tagline hidden ≤760px.
2. AI status banner removed; status now a small popover opened by tapping the dot (friendly copy, no "unavailable" headline).
3. Mobile-first order: editor (+ main button) → result card → "Catatanku" list. ✦ Ringkas visible on the 390px first screen without scrolling.
4. One big green full-width primary button ✦ Ringkas / Summarise; other 9 actions behind "Lainnya ▾" in 4 labelled groups (Rapikan / Cari tahu / Balas / Mendalam); panel closes after picking an action.
5. All copy switched to plan §3 table (ID + EN); no banned jargon in any rendered text (verified: innerText grep = 0 hits for PREFER_ON_DEVICE, InferenceMode, tokens, localStorage, Firebase, Gemini, ON DEVICE, IN CLOUD, App Check, "local demo mode").
6. Editor meta = word count only ("47 kata" / "47 words").
7. Result chips now "📱 Di HP ini" / "☁️ Di cloud" / "Demo" + one plain sentence.
8. Delete moved to a ⋯ menu next to the note title, still with confirmation.
9. Sidebar foot = one line ("Tersimpan di browser ini saja."); footer = one line + "Cara kerja" link.
10. Seed notes replaced with two short Indonesian notes ("Rapat tim — 18 Nov", "Belanja mingguan").
11. First-run 3-step hint ("1 Tulis… · 2 Pencet ✦ Ringkas · 3 Baca hasilnya di bawah"), shown on first visit / empty note, dismissible (persisted).
12. Language: toggle switches every label + <html lang> + AI answer language (prompt carries "Jawab dalam Bahasa Indonesia" / "Reply in English"); choice persisted in localStorage (nota.lang); initial = browser language (id/en), fallback EN; ?lang=id|en deep-link also works.
13. Verification from renders (see below).

Two real bugs found by render, not by reading code, and fixed:
- `.more-panel { display:grid }` overrode the `hidden` attribute, so the "More" panel rendered open on first load. Fixed with a global `[hidden]{display:none!important}` rule.
- DOM is editor-first (mobile-first), so desktop grid auto-placement put the sidebar on the RIGHT. Fixed with explicit `.layout .sidebar{grid-column:1} .layout .editor{grid-column:2}`.

One deliberate deviation from the plan: its §3 demo note says "Mode demo — sambungkan Firebase untuk AI asli", but §5 bans the word "Firebase" from visible UI. The ban wins: the demo note now reads "Mode demo — ini contoh saja, bukan AI asli." / "Demo mode — this is a sample, not the real AI."

README "Live demo" line updated to https://emonizeryan.github.io/nota/.

### v4 verification (headless Chrome 156, 2026-11-18 ~21:45–22:00 WIB)
- Screenshots: shots/desktop-1280-v4-en.png, shots/desktop-1280-v4-id.png, shots/mobile-390-v4-en.png, shots/mobile-390-v4-id.png, shots/desktop-selftest-v4.png, shots/desktop-1280-v4-cdp.png — all viewed.
- (a) ✦ Ringkas visible on the 390px first screen in both languages — CONFIRMED in mobile-390-v4-id.png and mobile-390-v4-en.png.
- (b) Banned jargon: 0 hits in rendered innerText (CDP check, both languages).
- (c) Toggle verified by REAL CDP click on #lang-id: lang en→id, main button "✦ Summarise this note"→"✦ Ringkas catatan ini", choice persisted (localStorage nota.lang=id); "More" panel opens with all 4 groups + 9 actions labelled.
- (d) ?selftest=1 still runs: SELFTEST chip=Demo, TL;DR + Key points + Tags render (EN and ?lang=id runs both probed).
- (e) Console errors: 0 when Chrome runs through the local egress proxy (Firebase SDK loads, init succeeds — no "Firebase init failed"). Without the proxy, Chrome on this VM cannot reach gstatic at all (ERR_TUNNEL_CONNECTION_FAILED) and the app degrades gracefully to demo mode; that is environmental, not a code error.
- No gemini-2.5 model ID anywhere in code (only "NEVER use gemini-2.5" comments/docs). `node --check` clean for app.js + firebase-config.js.
- Hybrid routing, models, Firebase wiring untouched (UI + copy + i18n only).

### Still open (unchanged)
- Real on-device Nano run (needs a real desktop Chrome; VM cannot download the model).
- Push v4 to GitHub (parent handles it) + verify Pages.
- Demo video (user records on his phone later) and Devpost submission.

## v5 — Flashcards for studying (2026-11-18 ~22:00 WIB, user-picked)
User picked "Flashcard belajar dari catatan" from the feature options. One new
action, "Flashcards" / "Kartu belajar", in a new "Study" / "Belajar" group
inside "Lainnya ▾" — nothing new on the first screen.

1. Same hybrid routing as the other actions (short note → on-device,
   long note → cloud, deep never default); `flashcards` added to
   `JSON_ACTIONS`, prompt asks for 5–8 Q&A cards as
   `{"cards": [{"q", "a"}]}` in the UI language.
2. The JSON response schema is now per-action (cards schema for
   flashcards, summary schema for the rest). Schema building is wrapped
   in try/catch — if the SDK rejects it, the JSON-only prompt still
   works; the schema must never break the call.
3. Study view renders in the result card: tap the card to flip
   (3D flip, question front / answer back), Previous / Next / Shuffle,
   "Know ✓" / "Not yet ✗" with a progress line ("3 of 8 known").
   Marking a card advances to the next one.
4. Decks persist per note in `localStorage` (`nota.flashcards.<noteId>`:
   cards + known marks + a signature of the note text). Tapping
   Flashcards on an unchanged note reopens its saved deck instantly;
   editing the note regenerates it. Reopening a note shows its deck.
5. All labels in the i18n table (ID + EN); "Replace note with this"
   is hidden for flashcard results; Copy copies the deck as Q/A text.
6. Demo mode: cloze-deletion cards (blank the longest content word
   of the most informative sentences) — honest fallback, chip "Demo".
7. Bug fixed along the way: `applyLang` assigned the `ACTION_TITLES`
   function itself to the result title instead of calling it, so
   switching language with a visible result showed function source as
   the title. It now uses `actionTitle(...)`, and a visible deck
   re-renders its controls in the new language.

### v5 verification (headless Chrome 156, 2026-11-18, local demo mode)
- Screenshots: shots/desktop-1280-v5-more.png, shots/desktop-1280-v5-id.png, shots/desktop-1280-v5-flipped.png, shots/mobile-390-v5-more.png, shots/mobile-390-v5-id.png, shots/mobile-390-v5-flipped.png, shots/desktop-selftest-v5.png — deck + flipped card confirmed visually (see below).
- CDP clicks: "Lainnya ▾" opens 5 groups incl. "Belajar" with "Kartu belajar"; tap generates a 4-card demo deck from the "Rapat tim" seed note (chip Demo, first card blanks "feedback"); tap card flips to the answer; "Tahu ✓" → "1 dari 4 sudah hafal" and advances; Berikutnya/Acak work; reload reopens the deck with progress kept; ID→EN switch re-labels the deck ("1 of 4 known", title "Flashcards"); ?selftest=1 still runs (chip=Demo).
- Banned jargon: 0 hits in rendered innerText. `node --check` clean. No gemini-2.5 anywhere.
- Two real bugs found by render and fixed: (a) `.fc-face.back` never matched (element class is `fc-back`), so the flipped answer face was invisible — fixed to `.fc-face.fc-back`; (b) the stored-deck shortcut returned before closing the "More" panel — fixed to close it. A third fix from the same run: demo cloze skipped header-like lines and never blanks the first word (the first version produced "______: Maya, Rizky, Dara.").
- Console errors: only the known environmental "Firebase init failed: Failed to fetch dynamically imported module (gstatic)" — no egress proxy in this run, so Firebase never loads and the app degrades to demo mode, exactly as in v4. No errors from the new code.
- NOT verified: the real-AI flashcards path (JSON schema + model call). The live cloud-AI test fails for ALL actions right now (Firebase AI SDK 12.5.0 substitutes retired gemini-2.0-flash-lite → 404; parent is probing a fix separately). Re-test flashcards against the real model after that fix lands.

## v5.1 — Cloud AI fix: inCloudParams + demo fallback (2026-11-18 ~22:16 WIB)
Live cloud test FAILED 22:01: every AI action ended "Gagal". Root cause proven from SDK source + live repro: Firebase AI SDK 12.5.0 `getGenerativeModel` IGNORES top-level `model` when `mode` is set and uses `inCloudParams || {model: "gemini-2.0-flash-lite"}` — the app never passed inCloudParams, so all InferenceMode paths 404'd on retired gemini-2.0-flash-lite. App Check was not the problem.
Fix (FIX.patch, 5 hunks, verified in a copy first): all three models + the device-only branch now pass `inCloudParams: { model: gemini-3.5-flash-lite }` explicitly. gemini-3.8-flash 500s/429s on this free-tier project and gemini-3.1-pro-preview 429s (paid-only), so Deep also uses flash-lite for now. Secondary fix: `response.inferenceSource` is lowercase "on_device"/"in_cloud" — comparison is now case-insensitive, or a real Nano answer would be mislabelled cloud. Safety net: a failed real-AI call now falls back to the local demo result labelled "Demo" instead of "Gagal".
Copy verification (CDP, real AppCheck): short Ringkas chip "☁️ Di cloud" with real Indonesian summary; long doc "Di cloud"; Deep "Di cloud" (2,852 chars); selftest passes; 6× HTTP 200 to gemini-3.5-flash-lite:generateContent; 0 console errors. Forced failure (bogus model) → chip "Demo", no "Gagal" anywhere. Full report: buildhybridai-notes-fixprobe/FIX-REPORT.md.
