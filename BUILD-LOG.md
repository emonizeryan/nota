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
