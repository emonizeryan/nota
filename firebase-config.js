/* ------------------------------------------------------------------
 * Nota — Firebase configuration
 * ------------------------------------------------------------------
 * HOW TO CONNECT FIREBASE (about 5 minutes, free):
 *   1. Go to https://console.firebase.google.com and create a project
 *      (no Google Analytics needed).
 *   2. In the console go to AI Services > AI Logic and click "Get started".
 *      Choose the "Gemini Developer API" provider (free to start).
 *      The guided setup enforces Firebase App Check for AI Logic.
 *   3. Register this web app in the project and copy the config object
 *      it shows you. Paste the values below, replacing the placeholders.
 *   4. For local development, enable the App Check debug provider:
 *      set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` BEFORE App Check
 *      is initialised (app.js does this automatically on localhost),
 *      then copy the debug token printed in the browser console and
 *      register it in the console under Security > App Check > Apps >
 *      Manage debug tokens. (Required — App Check is enforced for
 *      AI Logic since 2 Nov 2026.)
 *   5. Reload the app. The status bar will say "Firebase connected".
 *
 * SECURITY: these config values are public client identifiers, not
 * secrets — but NEVER paste a Gemini API key, service-account key or
 * any other private credential into this repo. Firebase AI Logic keeps
 * the Gemini key server-side; the browser only holds this config and
 * an App Check token.
 * ------------------------------------------------------------------ */

window.NOTA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDCbq5bp_EQRTu_VnN0279J2ojweFM4t9s",
  authDomain: "nota-92519.firebaseapp.com",
  projectId: "nota-92519",
  storageBucket: "nota-92519.firebasestorage.app",
  messagingSenderId: "829323525338",
  appId: "1:829323525338:web:427083e8b3a226381979e3"
};

/* App Check — reCAPTCHA Enterprise site key for the hosted site.
 * Registered 2026-11-18 in Firebase console > App Check for nota-web
 * (provider: Fraud Defense / reCAPTCHA Enterprise, domain
 * emonizeryan.github.io). A site key is a public client identifier,
 * not a secret — it is meant to ship in client code. Without it,
 * App Check enforcement rejects AI Logic calls and the app falls
 * back to demo mode. */
window.NOTA_RECAPTCHA_SITE_KEY = "6Lc8ViYuAAAAAMgYrpE8InW5GAIUXIh70f1ycnBD";

/* Cloud model IDs — verified 2026-11-18 against the live Firebase AI
 * Logic docs (firebase.google.com/docs/ai-logic) and the Firebase JS
 * SDK changelog (@firebase/ai 2.5.0, firebase 12.5.0):
 *   - EFFECTIVE cloud model (used by every route): gemini-3.5-flash-lite.
 *     Proven live by probe 2026-11-18 — it is the model the Firebase
 *     error message itself tells you to use, and the model the 12.5.0
 *     SDK's successor (13.4.0) defaults to. gemini-3.8-flash 500s
 *     ("high demand") and 429s on this free-tier project, so it is NOT
 *     used as the cloud model for now. NOTE: when an InferenceMode is
 *     set, the SDK ignores a top-level `model` and uses
 *     `inCloudParams.model` instead — app.js passes it explicitly.
 *   - Deep analysis: also gemini-3.5-flash-lite for now.
 *     gemini-3.1-pro-preview 429s (paid-only preview, no Spark quota).
 * NEVER use gemini-2.5-* : Google limited 2.5 to past users on
 * 18 Sep 2026 and routes 2.5-pro -> 3.8-flash / 2.5-flash ->
 * 3.5-flash-lite from 1 Dec 2026. NEVER use gemini-2.0-flash-lite:
 * retired — the 12.5.0 SDK silently substituted it as the default
 * cloud model and every AI call 404'd on it (fixed 2026-11-18 by
 * passing inCloudParams explicitly). */
window.NOTA_CLOUD_MODELS = {
  flash: "gemini-3.8-flash",
  flashLite: "gemini-3.5-flash-lite",
  pro: "gemini-3.1-pro-preview"
};

/* Route long documents to the cloud above this size (rough estimate:
 * ~1 token per 4 characters). Nano's practical context is ~2–4K tokens. */
window.NOTA_LONG_DOC_TOKENS = 3500;
