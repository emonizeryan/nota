# Nota — private notes that think on your device

**Built for #BuildHybridAI 2026** (Google Firebase / Devpost). A private,
offline-first notes / reading summariser & rewriter. Short tasks run
**on-device with Gemini Nano** (free, private, offline) via **Firebase AI
Logic** hybrid inference; long documents go to **Gemini Flash** in the
cloud; **Gemini Pro** runs only when you press “Deep analysis”.

- **Live demo:** _(add the GitHub Pages URL after publishing — see Deploy)_
- **License:** Apache 2.0 (see `LICENSE`)
- **No account needed. No tracking. Notes live only in your browser.**

## What it does

- **Notes CRUD** — create, edit, search, delete. Stored in `localStorage`
  only, so the app works with zero login and zero server.
- **One-click AI on any note:** Summarise (TL;DR + key points + action
  items + tags), Key points, Action items, Tags, Rewrite (shorter /
  formal / simpler), Proofread, Draft a reply.
- **Deep analysis** — an explicit button that runs in the cloud on
  Gemini Pro. Never the default.
- **A visible chip on every answer** — `ON DEVICE` or `IN CLOUD` — read
  from the response itself (`response.inferenceSource`). The routing
  rule is shown under the editor before you run anything.
- **“Keep my notes on this device”** — switches the model to
  `ONLY_ON_DEVICE`: no cloud fallback at all.
- **First-run model download UI** — press “Enable on-device AI” once;
  a progress bar shows the one-time Gemini Nano download (~2–4 GB).
- **Offline** — the core app and on-device AI keep working with no
  connection after the model is downloaded. The status bar says so.

## How the hybrid routing works

| Situation | Where it runs | How |
|---|---|---|
| Short note (≤ ~3,500 tokens), default | On-device first | Firebase AI Logic, `PREFER_ON_DEVICE`, cloud model `gemini-3.8-flash` as fallback |
| Long document (> ~3,500 tokens) | Cloud | `PREFER_IN_CLOUD` with `gemini-3.8-flash`, with a visible note explaining why |
| “Deep analysis” button | Cloud | `ONLY_IN_CLOUD` with `gemini-3.1-pro-preview` — explicit only |
| “Keep my notes on this device” on | On-device only | `ONLY_ON_DEVICE` — no fallback; fails visibly instead of going to the cloud |
| No Firebase configured | Local demo | A small extractive algorithm in the browser, always labelled `LOCAL DEMO` — never presented as Nano or Flash |

Single-turn text generation only (that is all on-device inference
supports on the web). Structured JSON output is requested for
summary / key points / actions / tags. Model calls go through
`generateContent()` in `app.js` — Firebase AI Logic is imported **and
actually called at runtime**, not just named here.

Cloud model IDs were verified on 2026-11-18 against the live Firebase
AI Logic docs and the Firebase JS SDK changelog:

- `gemini-3.8-flash` — GA 2 Sep 2026, free tier, Google's named
  replacement for `gemini-2.5-pro`.
- `gemini-3.5-flash-lite` — GA 21 Jul 2026, cheapest tier.
- `gemini-3.1-pro-preview` — paid-only preview for Deep analysis.
  **Verify it is still served on submission day** — if it is gone, the
  Deep button falls back to `gemini-3.8-flash` and says so.
- **Never `gemini-2.5-*`:** Google limited 2.5 to past users on
  18 Sep 2026 and routes 2.5-pro → 3.8-flash / 2.5-flash →
  3.5-flash-lite from 1 Dec 2026.

## Setup (about 5 minutes, free)

1. **Create a Firebase project** at
   <https://console.firebase.google.com> (no Google Analytics needed).
2. In the console go to **AI Services → AI Logic → Get started**.
   Choose the **Gemini Developer API** provider (free to start). The
   guided setup **enforces Firebase App Check** for AI Logic.
3. Register this web app in the project and copy the config object.
   Paste the values into `firebase-config.js`, replacing the
   `YOUR_…` placeholders. (These are public client identifiers, not
   secrets — but never put a Gemini API key or service-account key
   in this repo.)
4. **App Check debug token (local development):** in `app.js`, when the
   app runs on `localhost`, `self.FIREBASE_APPCHECK_DEBUG_TOKEN` is
   set to `true` before App Check initialises. Open the app locally,
   open the browser console, copy the printed
   `AppCheck debug token: "…"` and register it in the console under
   **Security → App Check → Apps → Manage debug tokens**.
   For the hosted site, add your reCAPTCHA Enterprise site key as
   `window.NOTA_RECAPTCHA_SITE_KEY` in `firebase-config.js`.
5. Reload the app. The status bar should say “Firebase connected”.
   Press **Enable on-device AI** once to download Gemini Nano.

Without steps 1–5 the app still runs end to end in **local demo
mode** — every button works, and every result is labelled
`LOCAL DEMO` so a demo result can never be mistaken for a real
Nano/Flash answer.

## Run locally

```bash
# any static server works, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

On-device Nano additionally needs **Chrome 139+ on desktop** and the
flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
set to **Enabled** (per the official Firebase hybrid docs), plus
enough free disk for the one-time model download.

## Deploy (GitHub Pages)

```bash
git init && git add . && git commit -m "Nota: private offline-first notes with Firebase AI Logic hybrid inference"
# create the repo on github.com (web UI), then:
git remote add origin https://github.com/emonizeryan/nota.git
git branch -M main && git push -u origin main
# Settings → Pages → Deploy from branch → main, folder / (root)
```

The app is plain static HTML/CSS/JS — no build step, no secrets in
the repo. After Pages is live, add the URL at the top of this README
and in the Devpost submission.

## Project layout

```
index.html          UI: notes list, editor, AI actions, status bar
styles.css          clean paper-like design, mobile-first
app.js              notes store, hybrid routing, demo engine, UI wiring
firebase-config.js  Firebase config placeholders + cloud model IDs
LICENSE             Apache 2.0
BUILD-LOG.md        what was built, what was verified, what is still open
```

## Known limits (honest)

- On-device Nano needs Chrome 139+ on desktop with the model
  downloaded; on other browsers/devices the app uses the labelled
  cloud fallback (or local demo mode without Firebase).
- On-device inference is single-turn text only — no chat, no tools,
  no image input in this app.
- The local demo engine is a simple extractive algorithm, not an AI
  model. It exists so the UI can be tried with zero setup.
- The `gemini-3.1-pro-preview` model ID must be re-checked on
  submission day (preview models retire fast).
