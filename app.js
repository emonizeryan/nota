/* ==================================================================
 * Nota — private, offline-first notes with hybrid AI
 * ------------------------------------------------------------------
 * AI routing (the whole point of this app):
 *   - Short tasks (summarise, proofread, rewrite, tag, reply) run
 *     on-device with Gemini Nano via Firebase AI Logic, mode
 *     PREFER_ON_DEVICE. The SDK falls back to the cloud model only
 *     when Nano is unavailable — and we show which path answered.
 *   - Long documents (> NOTA_LONG_DOC_TOKENS, ~3,500) go straight to
 *     Gemini Flash in the cloud, with a visible note saying so.
 *   - "Deep analysis" runs ONLY in the cloud on Gemini Pro, only
 *     when you press that button. Never the default.
 *   - "Keep my notes on this device" switches the mode to
 *     ONLY_ON_DEVICE: no cloud fallback at all.
 * Every AI answer carries a chip read from the response itself:
 *   response.inferenceSource === 'ON_DEVICE' | 'IN_CLOUD'
 * (Firebase JS SDK 12.5.0+, @firebase/ai 2.5.0+).
 *
 * No Firebase project yet? The app still works end to end in
 * LOCAL DEMO mode: a small on-device algorithm does extractive
 * summaries/rewrites so every button can be tried. Demo results are
 * always labelled "LOCAL DEMO" — never shown as Nano or Flash.
 * ================================================================== */

const $ = (id) => document.getElementById(id);
const LS_NOTES = "nota.notes.v1";
const LS_ACTIVE = "nota.active.v1";
const LS_DEVICE_ONLY = "nota.deviceOnly.v1";

/* ---------------- state ---------------- */
let notes = [];
let activeId = null;
let deviceOnly = localStorage.getItem(LS_DEVICE_ONLY) === "1";
let firebaseReady = false;
let firebaseError = "";
let ai = null;          // Firebase AI service (getAI)
let hybridModel = null; // PREFER_ON_DEVICE model (gemini-3.8-flash cloud fallback)
let cloudModel = null;  // PREFER_IN_CLOUD model for long docs (gemini-3.8-flash)
let proModel = null;    // ONLY_IN_CLOUD model for Deep analysis (gemini-3.1-pro-preview)
let deviceModelState = "unknown"; // unknown | checking | downloading | available | unavailable
let deviceModelProgress = 0;
let lastResultText = "";
let lastResultKind = "";
let fb = null; // dynamically imported firebase modules

/* ---------------- helpers ---------------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function estimateTokens(text) { return Math.ceil((text || "").length / 4); }
function wordCount(text) {
  const t = (text || "").trim();
  return t ? t.split(/\s+/).length : 0;
}
function uid() {
  return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function nowLabel(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function setStatus(title, detail) {
  $("ai-status-title").textContent = title;
  $("ai-status-detail").textContent = detail;
}
function setPill(text, kind) {
  const pill = $("ai-pill");
  pill.textContent = text;
  pill.classList.toggle("ok", kind === "ok");
  pill.classList.toggle("warn", kind === "warn");
}

/* ---------------- notes store (localStorage only) ---------------- */
function seedNotes() {
  return [
    {
      id: uid(),
      title: "Why hybrid AI matters for notes",
      body: "Most AI notes apps send everything you write to a server. That means your private notes, your meeting minutes and your half-finished ideas all leave your device before you get a summary back. It also means the app stops working on a plane, and the good features sit behind a twenty dollar monthly subscription.\n\nHybrid inference flips that around. Short, everyday jobs like summarising a note, fixing grammar, rewriting a paragraph or tagging a page run on the device itself with Gemini Nano. The text never leaves your phone or laptop, it costs nothing per request, and it works with no connection at all.\n\nThe cloud still has a job. Long documents, deep analysis and anything that needs real world knowledge go to Gemini Flash or Pro in the cloud. The honest design is to show which path answered every single request, and to let the user choose. That is what Nota does: every answer carries an ON DEVICE or IN CLOUD chip, and a switch keeps your notes on this device when you want that.\n\nAction items from this note: try the Summarise button on this note, then try Rewrite simpler, then turn on Keep my notes on this device and run it again to see the difference.",
      updated: Date.now(),
      sample: true,
    },
    {
      id: uid(),
      title: "Team sync — 18 Nov",
      body: "Attendees: Maya, Rizky, Dara. Maya will send the revised launch timeline by Friday. Rizky owns the pricing page copy and needs feedback from Dara before Thursday lunch. Dara flagged that the onboarding email still links to the old help centre article and offered to rewrite it.\n\nDecisions: we launch the beta to the first 200 waitlist users next Tuesday, not Monday, because support cover is thin on Mondays. The free plan keeps 50 notes, the paid plan is unlimited.\n\nRisks: the analytics dashboard is two days behind schedule. If it slips again we cut the cohort chart from v1 and ship the rest. Maya to confirm the support rota by tomorrow morning.",
      updated: Date.now() - 3600e3,
      sample: true,
    },
  ];
}
function loadNotes() {
  try {
    const raw = localStorage.getItem(LS_NOTES);
    if (raw) {
      notes = JSON.parse(raw);
      if (!Array.isArray(notes)) notes = [];
    }
  } catch (e) { notes = []; }
  if (notes.length === 0) {
    notes = seedNotes();
    saveNotes();
  }
  activeId = localStorage.getItem(LS_ACTIVE);
  if (!notes.some((n) => n.id === activeId)) activeId = notes[0].id;
}
function saveNotes() {
  localStorage.setItem(LS_NOTES, JSON.stringify(notes));
  localStorage.setItem(LS_ACTIVE, activeId || "");
}
function activeNote() { return notes.find((n) => n.id === activeId) || notes[0]; }

function renderList(filter = "") {
  const list = $("note-list");
  const q = filter.trim().toLowerCase();
  const shown = notes
    .filter((n) => !q || (n.title + " " + n.body).toLowerCase().includes(q))
    .sort((a, b) => b.updated - a.updated);
  if (shown.length === 0) {
    list.innerHTML = '<li class="nl-empty">No notes match that search.</li>';
    return;
  }
  list.innerHTML = shown.map((n) => `
    <li data-id="${n.id}" class="${n.id === activeId ? "active" : ""}">
      <div class="nl-title">${esc(n.title || "Untitled note")}</div>
      <div class="nl-preview">${esc(n.body.split("\n")[0].slice(0, 80))}</div>
      <div class="nl-date">${nowLabel(n.updated)}${n.sample ? " · sample" : ""}</div>
    </li>`).join("");
  list.querySelectorAll("li[data-id]").forEach((li) => {
    li.addEventListener("click", () => { setActive(li.dataset.id); });
  });
}
function renderEditor() {
  const n = activeNote();
  if (!n) return;
  $("note-title").value = n.title;
  $("note-body").value = n.body;
  updateMeta();
  hideResult();
}
function setActive(id) {
  activeId = id;
  saveNotes();
  renderList($("search").value);
  renderEditor();
}
function updateMeta() {
  const text = $("note-body").value;
  const tokens = estimateTokens(text);
  $("word-count").textContent = `${wordCount(text)} words`;
  $("token-est").textContent = `~${tokens.toLocaleString()} tokens`;
  const hint = $("route-hint");
  if (deviceOnly) {
    hint.textContent = "Device-only is on — this will run on-device, or not at all.";
  } else if (tokens > (window.NOTA_LONG_DOC_TOKENS || 3500)) {
    hint.textContent = "Long document — this will go to Gemini Flash in the cloud.";
  } else if (firebaseReady) {
    hint.textContent = "Short note — will try Gemini Nano on-device first.";
  } else {
    hint.textContent = "Local demo mode — connect Firebase for real Nano / Flash.";
  }
}

/* ---------------- AI prompts ---------------- */
const PROMPTS = {
  summarize: (text) => `Summarise the following note. Reply with JSON only, no other text: {"tldr": "one or two sentences", "keyPoints": ["...", "..."], "actionItems": ["...", "..."], "tags": ["...", "..."]}\n\nNOTE:\n${text}`,
  keypoints: (text) => `List the key points of the following note. Reply with JSON only, no other text: {"keyPoints": ["...", "..."]}\n\nNOTE:\n${text}`,
  actions: (text) => `Extract the action items from the following note: who does what, by when, if stated. Reply with JSON only, no other text: {"actionItems": ["...", "..."]}\n\nNOTE:\n${text}`,
  tags: (text) => `Suggest 3 to 6 short tags for the following note. Reply with JSON only, no other text: {"tags": ["...", "..."]}\n\nNOTE:\n${text}`,
  "rewrite-shorter": (text) => `Rewrite the following note to be about half as long. Keep every important fact, drop repetition and filler. Reply with the rewritten text only.\n\nNOTE:\n${text}`,
  "rewrite-formal": (text) => `Rewrite the following note in a formal, professional tone. Keep every fact and all names, dates and numbers exactly. Reply with the rewritten text only.\n\nNOTE:\n${text}`,
  "rewrite-simple": (text) => `Rewrite the following note in plain, simple language: short sentences, everyday words, easy to read for anyone. Keep every fact. Reply with the rewritten text only.\n\nNOTE:\n${text}`,
  proofread: (text) => `Proofread the following note. Fix grammar, spelling and punctuation only — do not change the meaning, tone or facts. Reply with the corrected text only.\n\nNOTE:\n${text}`,
  reply: (text) => `Draft a short, polite reply to the following note or message. Keep it warm and to the point. Reply with the draft only.\n\nNOTE:\n${text}`,
  deep: (text) => `Analyse the following note in depth. Cover: (1) what it is really about, (2) what is missing or unclear, (3) risks or contradictions, (4) concrete next steps. Reply in clear sections with short paragraphs.\n\nNOTE:\n${text}`,
};
const ACTION_TITLES = {
  summarize: "Summary", keypoints: "Key points", actions: "Action items", tags: "Tags",
  "rewrite-shorter": "Rewrite — shorter", "rewrite-formal": "Rewrite — formal",
  "rewrite-simple": "Rewrite — simpler", proofread: "Proofread", reply: "Draft reply",
  deep: "Deep analysis",
};
const JSON_ACTIONS = new Set(["summarize", "keypoints", "actions", "tags"]);

/* ---------------- local demo engine (no Firebase) ----------------
 * Small extractive algorithm, runs entirely in the browser.
 * It is NEVER presented as Nano or Flash. */
const STOPWORDS = new Set(("a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,into,through,after,over,between,out,against,during,without,before,under,around,among,of,to,in,on,from,as,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,shall,should,can,could,may,might,must,i,you,he,she,it,we,they,this,that,these,those,am,an,my,your,his,her,its,our,their,me,him,us,them,what,which,who,whom,how,why,not,no,yes,so,very,just,also,than,too,more,most,other,some,any,only,own,same,such,each,few,more,most,all,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,don,should,now").split(","));
function splitSentences(text) {
  return (text || "").replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["')\]]*\s*/g) || (text ? [text] : []);
}
function demoAnalyze(text) {
  const sentences = splitSentences(text);
  const words = (text.toLowerCase().match(/[a-z][a-z\-']{2,}/g) || []).filter((w) => !STOPWORDS.has(w));
  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  const score = (s) => (s.toLowerCase().match(/[a-z][a-z\-']{2,}/g) || [])
    .reduce((acc, w) => acc + (freq[w] || 0), 0) / Math.max(1, s.split(/\s+/).length);
  const ranked = sentences.map((s) => ({ s: s.trim(), score: score(s) }))
    .filter((x) => x.s.length > 12).sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3).map((x) => x.s);
  // TL;DR is ONE sentence, capped so it reads as a summary, not a paragraph.
  const tldrRaw = top[0] || "";
  const tldr = tldrRaw.length > 200 ? tldrRaw.slice(0, 197).trimEnd() + "…" : tldrRaw;
  // Action items must add something new: drop sentences already used as
  // key points, so the two lists stop repeating each other verbatim.
  const topSet = new Set(top);
  const actions = sentences.map((s) => s.trim()).filter((s) =>
    !topSet.has(s) &&
    /\b(will|should|need to|must|todo|action|by (monday|tuesday|wednesday|thursday|friday|tomorrow|friday)|confirm|review|fix|update|complete|finish)\b/i.test(s)).slice(0, 5);
  const tags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
  return { tldr, keyPoints: top, actionItems: actions, tags };
}
function demoRewrite(text, kind) {
  const sentences = splitSentences(text);
  if (kind === "rewrite-shorter") {
    const ranked = sentences.map((s) => ({ s: s.trim(), score: s.length }))
      .sort((a, b) => b.score - a.score);
    const keep = Math.max(1, Math.ceil(sentences.length / 2));
    return ranked.slice(0, keep).map((x) => x.s).join(" ");
  }
  if (kind === "rewrite-simple") {
    const simple = { utilize: "use", facilitate: "help", approximately: "about", demonstrate: "show", furthermore: "also", however: "but", therefore: "so", consequently: "so", commence: "start", terminate: "end", purchase: "buy", sufficient: "enough", require: "need", obtain: "get", numerous: "many" };
    return text.replace(/\b(utilize|facilitate|approximately|demonstrate|furthermore|however|therefore|consequently|commence|terminate|purchase|sufficient|require|obtain|numerous)\b/gi, (m) => simple[m.toLowerCase()] || m);
  }
  if (kind === "rewrite-formal") {
    return text.replace(/\b(can't|won't|don't|isn't|aren't|it's|that's|we're|you're|i'm)\b/gi, (m) => ({
      "can't": "cannot", "won't": "will not", "don't": "do not", "isn't": "is not",
      "aren't": "are not", "it's": "it is", "that's": "that is", "we're": "we are",
      "you're": "you are", "i'm": "I am",
    }[m.toLowerCase()] || m)).replace(/(^|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  }
  if (kind === "proofread") {
    return text.replace(/teh\b/gi, "the").replace(/  +/g, " ")
      .replace(/\.([A-Z])/g, ". $1").replace(/\bi\b/g, "I")
      .replace(/(^|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  }
  if (kind === "reply") {
    const a = demoAnalyze(text);
    return `Thanks for sharing this. My main takeaways: ${a.keyPoints.slice(0, 2).join(" ")}${a.actionItems.length ? `\n\nOn actions — ${a.actionItems[0]}` : ""}\n\nLet me know if you'd like me to take any of this further.`;
  }
  return text;
}
function runDemo(action, text) {
  const a = demoAnalyze(text);
  if (action === "summarize") return { kind: "json", data: a };
  if (action === "keypoints") return { kind: "json", data: { keyPoints: a.keyPoints } };
  if (action === "actions") return { kind: "json", data: { actionItems: a.actionItems } };
  if (action === "tags") return { kind: "json", data: { tags: a.tags } };
  return { kind: "text", data: demoRewrite(text, action) };
}

/* ---------------- result rendering ---------------- */
function showResult(title, chipText, chipClass, bodyHtml, note, plainText, kind) {
  const box = $("ai-result");
  box.hidden = false;
  $("ai-result-title").textContent = title;
  const chip = $("ai-result-chip");
  chip.textContent = chipText;
  chip.className = "chip " + chipClass;
  $("ai-result-body").innerHTML = bodyHtml;
  $("ai-result-note").textContent = note || "";
  lastResultText = plainText || "";
  lastResultKind = kind || "text";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideResult() { $("ai-result").hidden = true; }
function jsonToHtml(data) {
  let html = "";
  if (data.tldr) html += `<p><strong>TL;DR:</strong> ${esc(data.tldr)}</p>`;
  if (data.keyPoints && data.keyPoints.length) {
    html += "<p><strong>Key points</strong></p><ul>" + data.keyPoints.map((p) => `<li>${esc(p)}</li>`).join("") + "</ul>";
  }
  if (data.actionItems && data.actionItems.length) {
    html += "<p><strong>Action items</strong></p><ul>" + data.actionItems.map((p) => `<li>${esc(p)}</li>`).join("") + "</ul>";
  } else if (data.actionItems) {
    html += "<p><em>No clear action items found in this note.</em></p>";
  }
  if (data.tags && data.tags.length) {
    html += "<p><strong>Tags</strong></p><p>" + data.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("") + "</p>";
  }
  return html || "<p><em>The model returned an empty result.</em></p>";
}
function jsonToPlain(data) {
  const lines = [];
  if (data.tldr) lines.push("TL;DR: " + data.tldr);
  if (data.keyPoints) lines.push("", "Key points:", ...data.keyPoints.map((p) => "- " + p));
  if (data.actionItems) lines.push("", "Action items:", ...data.actionItems.map((p) => "- " + p));
  if (data.tags) lines.push("", "Tags: " + data.tags.join(", "));
  return lines.join("\n");
}
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { return null; }
}

/* ---------------- Firebase AI Logic (real path) ---------------- */
function firebaseConfigured() {
  const c = window.NOTA_FIREBASE_CONFIG || {};
  return c.apiKey && !String(c.apiKey).includes("YOUR_") && c.projectId && !String(c.projectId).includes("YOUR_");
}

async function initFirebase() {
  if (!firebaseConfigured()) {
    setPill("AI: local demo", "warn");
    setStatus("On-device AI: not connected",
      "Firebase is not configured yet, so Nota runs in local demo mode. Follow the 5-minute setup in the README to unlock real Gemini Nano + Gemini Flash.");
    $("firebase-note").hidden = false;
    probeNanoAvailability();
    return;
  }
  try {
    const [appMod, aiMod, checkMod] = await Promise.all([
      import("firebase/app"),
      import("firebase/ai"),
      import("firebase/app-check"),
    ]);
    fb = { ...appMod, ...aiMod, ...checkMod };
    const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
    if (isLocal) {
      // Debug provider for local development (official flow — see README step 4).
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const app = fb.initializeApp(window.NOTA_FIREBASE_CONFIG);
    // App Check: enforced for AI Logic. If a reCAPTCHA Enterprise site key
    // is provided in firebase-config.js we use it; otherwise App Check
    // initialisation is attempted with the debug provider on localhost and
    // the status bar says exactly what is missing.
    try {
      if (window.NOTA_RECAPTCHA_SITE_KEY) {
        fb.initializeAppCheck(app, { provider: new fb.ReCaptchaEnterpriseProvider(window.NOTA_RECAPTCHA_SITE_KEY) });
      } else if (isLocal) {
        fb.initializeAppCheck(app, { provider: new fb.ReCaptchaV3Provider("debug") });
      }
    } catch (e) {
      console.warn("Nota: App Check init skipped:", e);
    }
    ai = fb.getAI(app, { backend: new fb.GoogleAIBackend() });
    const models = window.NOTA_CLOUD_MODELS || {};
    const flash = models.flash || "gemini-3.8-flash";
    hybridModel = fb.getGenerativeModel(ai, { model: flash, mode: fb.InferenceMode.PREFER_ON_DEVICE });
    cloudModel = fb.getGenerativeModel(ai, { model: flash, mode: fb.InferenceMode.PREFER_IN_CLOUD });
    proModel = fb.getGenerativeModel(ai, { model: models.pro || "gemini-3.1-pro-preview", mode: fb.InferenceMode.ONLY_IN_CLOUD });
    firebaseReady = true;
    $("firebase-note").hidden = true;
    setPill("AI: Firebase connected", "ok");
    setStatus("On-device AI: ready to enable",
      "Firebase AI Logic is connected. Press “Enable on-device AI” once to download Gemini Nano, or just run an action — the first run starts the download.");
    probeNanoAvailability();
  } catch (e) {
    firebaseReady = false;
    firebaseError = String(e && e.message ? e.message : e);
    console.error("Nota: Firebase init failed:", e);
    setPill("AI: local demo", "warn");
    setStatus("On-device AI: Firebase failed to load",
      "Firebase could not be initialised (" + firebaseError + "). Nota keeps working in local demo mode — check the README setup steps.");
    probeNanoAvailability();
  }
}

/* Enable-button states: never present a big green CTA that can only fail. */
function setEnableButton(state, reason) {
  const btn = $("btn-enable-ai");
  if (state === "unavailable") {
    btn.disabled = true;
    btn.title = reason || "Gemini Nano is not available in this browser.";
    btn.textContent = "On-device AI unavailable";
  } else if (state === "ready") {
    btn.disabled = true;
    btn.title = "Gemini Nano is downloaded and ready.";
    btn.textContent = "On-device AI ready ✓";
  } else {
    btn.disabled = false;
    btn.title = "";
    btn.textContent = "Enable on-device AI";
  }
}

async function probeNanoAvailability() {
  try {
    if (typeof LanguageModel === "undefined") {
      if (deviceModelState === "unknown") {
        setStatus("On-device AI: not available in this browser",
          "This browser does not expose the Chrome Prompt API (LanguageModel). On-device Nano needs Chrome 139+ on desktop. " +
          (firebaseReady ? "Cloud fallback still works." : "Local demo mode still works."));
        deviceModelState = "unavailable";
        setEnableButton("unavailable", "This browser does not expose the Chrome Prompt API (LanguageModel). On-device Nano needs Chrome 139+ on desktop.");
      }
      return;
    }
    deviceModelState = "checking";
    const avail = await LanguageModel.availability();
    if (avail === "available") {
      deviceModelState = "available";
      setEnableButton("enabled");
      setStatus("On-device AI: Gemini Nano is on this device",
        "The on-device model is downloaded and ready. Short tasks will run on-device, free and offline.");
    } else if (avail === "downloading" || avail === "downloadable") {
      deviceModelState = "downloading";
      setEnableButton("enabled");
      setStatus("On-device AI: model " + (avail === "downloading" ? "downloading…" : "ready to download"),
        "Press “Enable on-device AI” to start (or finish) the one-time model download. Until it is ready, short tasks use the cloud fallback and say so.");
    } else {
      deviceModelState = "unavailable";
      setEnableButton("unavailable", "Gemini Nano reported availability “" + avail + "” on this device, so the on-device model cannot run here.");
      setStatus("On-device AI: unavailable on this device",
        "Gemini Nano reported availability “" + avail + "” here, so the on-device model cannot run on this device. " + (firebaseReady ? "Cloud fallback still works and is labelled IN CLOUD." : "Local demo mode still works."));
    }
  } catch (e) {
    deviceModelState = "unavailable";
    setEnableButton("unavailable");
  }
}

async function enableOnDeviceAI(progressNote) {
  if (!firebaseReady || !hybridModel) {
    setStatus("On-device AI: connect Firebase first",
      "The real on-device model needs a Firebase project (README, 5-minute setup). Until then, Nota runs in local demo mode.");
    return false;
  }
  deviceModelState = "downloading";
  $("model-progress").hidden = false;
  expandAiDetails();
  setStatus("On-device AI: downloading model…", "First run downloads Gemini Nano once (~2–4 GB). You can keep using the app — short tasks will use the cloud until the download finishes.");
  try {
    await hybridModel.initializeDeviceModel((fraction) => {
      deviceModelProgress = Math.round(fraction * 10000) / 100;
      $("model-progress-bar").style.width = deviceModelProgress + "%";
      setStatus("On-device AI: downloading model… " + deviceModelProgress + "%",
        "First run downloads Gemini Nano once (~2–4 GB). Short tasks use the cloud fallback until it is ready.");
    });
    deviceModelState = "available";
    $("model-progress").hidden = true;
    setEnableButton("ready");
    setStatus("On-device AI: Gemini Nano is on this device",
      "The on-device model is downloaded and ready. Short tasks will run on-device, free and offline.");
    return true;
  } catch (e) {
    deviceModelState = "unavailable";
    $("model-progress").hidden = true;
    setStatus("On-device AI: could not start the model (" + (e && e.message ? e.message : e) + ")",
      "Short tasks will use the Gemini Flash cloud fallback and say so (IN CLOUD chip).");
    return false;
  }
}

/* ---------------- running an AI action ---------------- */
async function runAction(action, opts = {}) {
  const note = activeNote();
  const text = ($("note-body").value || "").trim();
  if (!text) {
    showResult(ACTION_TITLES[action], "—", "", "<p><em>Write or paste some text first.</em></p>", "", "", "text");
    return;
  }
  const tokens = estimateTokens(text);
  const isLong = tokens > (window.NOTA_LONG_DOC_TOKENS || 3500);
  const deep = action === "deep";
  const buttons = document.querySelectorAll("[data-action]");
  buttons.forEach((b) => { b.disabled = true; });
  showResult(ACTION_TITLES[action], "… working", "", "<p><em>Thinking…</em></p>", "", "", "text");

  try {
    /* --- no Firebase: local demo, clearly labelled --- */
    if (!firebaseReady) {
      await new Promise((r) => setTimeout(r, 350)); // let the UI paint
      const out = runDemo(action, text);
      const noteTxt = "LOCAL DEMO — connect Firebase (README) for real Gemini Nano / Flash. This result was made in your browser by a simple local algorithm, not by an AI model.";
      if (out.kind === "json") {
        showResult(ACTION_TITLES[action], "LOCAL DEMO", "chip-demo", jsonToHtml(out.data), noteTxt, jsonToPlain(out.data), "json");
      } else {
        showResult(ACTION_TITLES[action], "LOCAL DEMO", "chip-demo", `<p>${esc(out.data)}</p>`, noteTxt, out.data, "text");
      }
      return;
    }

    /* --- real Firebase path --- */
    if (!deep && deviceModelState !== "available") {
      // First user gesture: initialise the on-device model (required by the
      // API: initializeDeviceModel must be called after/on a user interaction).
      enableOnDeviceAI().catch(() => {});
    }

    let model;
    let routeNote = "";
    if (deep) {
      model = proModel;
      routeNote = "Deep analysis runs in the cloud on Gemini Pro — you asked for it. It is never the default.";
    } else if (deviceOnly) {
      model = fb.getGenerativeModel(ai, {
        model: (window.NOTA_CLOUD_MODELS || {}).flash || "gemini-3.8-flash",
        mode: fb.InferenceMode.ONLY_ON_DEVICE,
      });
      routeNote = "Device-only is on: this ran on-device, or not at all. Nothing left the device.";
    } else if (isLong) {
      model = cloudModel;
      routeNote = `Long document (~${tokens.toLocaleString()} tokens, over the ~${(window.NOTA_LONG_DOC_TOKENS || 3500).toLocaleString()} token on-device limit) — routed to Gemini Flash in the cloud.`;
    } else {
      model = hybridModel;
      routeNote = "";
    }

    const prompt = PROMPTS[action](text);
    let result;
    if (JSON_ACTIONS.has(action) && !deep) {
      // Structured JSON output (supported on-device and in the cloud).
      const genConfig = { responseMimeType: "application/json" };
      if (fb.Schema) {
        genConfig.responseSchema = fb.Schema.object({
          properties: {
            tldr: fb.Schema.string(),
            keyPoints: fb.Schema.array({ items: fb.Schema.string() }),
            actionItems: fb.Schema.array({ items: fb.Schema.string() }),
            tags: fb.Schema.array({ items: fb.Schema.string() }),
          },
        });
      }
      result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: genConfig });
    } else {
      result = await model.generateContent(prompt);
    }
    const response = result.response;
    const source = response.inferenceSource; // 'ON_DEVICE' | 'IN_CLOUD' | undefined
    const raw = response.text();
    const chip = source === "ON_DEVICE"
      ? ["ON DEVICE", "chip-device"]
      : source === "IN_CLOUD"
        ? ["IN CLOUD", "chip-cloud"]
        : deep ? ["IN CLOUD", "chip-cloud"] : ["IN CLOUD", "chip-cloud"];
    const srcNote = source === "ON_DEVICE"
      ? "Ran on-device with Gemini Nano — free, private, and your text never left this device."
      : source === "IN_CLOUD"
        ? "Ran in the cloud with Gemini Flash. " + routeNote
        : "Cloud model answered (the SDK did not report a source for this call). " + routeNote;

    if (JSON_ACTIONS.has(action) && !deep) {
      const data = extractJson(raw);
      if (data) {
        showResult(ACTION_TITLES[action], chip[0], chip[1], jsonToHtml(data), srcNote, jsonToPlain(data), "json");
      } else {
        showResult(ACTION_TITLES[action], chip[0], chip[1], `<p>${esc(raw)}</p>`, srcNote + " (The model did not return JSON, so the raw text is shown.)", raw, "text");
      }
    } else {
      showResult(ACTION_TITLES[action], chip[0], chip[1], `<p>${esc(raw)}</p>`, deep ? routeNote : srcNote, raw, "text");
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.error("Nota: AI action failed:", e);
    showResult(ACTION_TITLES[action], "FAILED", "chip-demo",
      `<p><em>The AI call failed: ${esc(msg)}</em></p><p>Nothing was silently faked. If the on-device model is still downloading, wait and try again — or check the Firebase setup in the README.</p>`,
      "", "", "text");
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
}

function expandAiDetails() {
  $("ai-details").hidden = false;
  const btn = $("btn-ai-details");
  btn.setAttribute("aria-expanded", "true");
  btn.textContent = "Hide details";
}

/* ---------------- wiring ---------------- */
function bindUI() {
  $("btn-new").addEventListener("click", () => {
    const n = { id: uid(), title: "", body: "", updated: Date.now() };
    notes.unshift(n);
    setActive(n.id);
    $("note-title").focus();
  });
  $("search").addEventListener("input", (e) => renderList(e.target.value));
  $("note-title").addEventListener("input", () => {
    const n = activeNote();
    n.title = $("note-title").value;
    n.updated = Date.now();
    saveNotes();
    renderList($("search").value);
  });
  $("note-body").addEventListener("input", () => {
    const n = activeNote();
    n.body = $("note-body").value;
    n.updated = Date.now();
    saveNotes();
    updateMeta();
  });
  document.querySelectorAll("[data-action]").forEach((b) => {
    b.addEventListener("click", () => runAction(b.dataset.action));
  });
  $("btn-enable-ai").addEventListener("click", () => enableOnDeviceAI());
  // Slim AI banner: Details expands the full panel, ✕ dismisses it to a
  // small "AI status" pill in the top bar (so the banner never hides the
  // product on a phone's first screen).
  const detailsBtn = $("btn-ai-details");
  const showDetails = (show) => {
    $("ai-details").hidden = !show;
    detailsBtn.setAttribute("aria-expanded", String(show));
    detailsBtn.textContent = show ? "Hide details" : "Details";
  };
  detailsBtn.addEventListener("click", () => showDetails($("ai-details").hidden));
  $("btn-ai-dismiss").addEventListener("click", () => {
    $("ai-status").hidden = true;
    $("btn-ai-reopen").hidden = false;
  });
  $("btn-ai-reopen").addEventListener("click", () => {
    $("ai-status").hidden = false;
    $("btn-ai-reopen").hidden = true;
  });
  $("toggle-device-only").checked = deviceOnly;
  $("toggle-device-only").addEventListener("change", (e) => {
    deviceOnly = e.target.checked;
    localStorage.setItem(LS_DEVICE_ONLY, deviceOnly ? "1" : "0");
    updateMeta();
  });
  $("btn-copy-result").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lastResultText); $("ai-result-note").textContent = "Copied."; } catch (e) { $("ai-result-note").textContent = "Copy failed — select the text manually."; }
  });
  $("btn-apply-result").addEventListener("click", () => {
    if (!lastResultText) return;
    const n = activeNote();
    n.body = lastResultText;
    n.updated = Date.now();
    saveNotes();
    renderEditor();
    renderList($("search").value);
  });
  // Delete button: quiet muted text, not a loud red control.
  const del = document.createElement("button");
  del.className = "btn btn-quiet";
  del.type = "button";
  del.textContent = "Delete note";
  del.addEventListener("click", () => {
    const n = activeNote();
    if (!n) return;
    if (!confirm(`Delete “${n.title || "Untitled note"}”?`)) return;
    notes = notes.filter((x) => x.id !== n.id);
    if (notes.length === 0) notes = seedNotes();
    activeId = notes[0].id;
    saveNotes();
    renderList($("search").value);
    renderEditor();
  });
  document.querySelector(".editor-meta").appendChild(del);

  // Network indicator.
  const net = () => {
    const pill = $("net-pill");
    pill.textContent = navigator.onLine ? "● online" : "● offline — on-device still works";
    pill.classList.toggle("warn", !navigator.onLine);
  };
  window.addEventListener("online", net);
  window.addEventListener("offline", net);
  net();
}

/* ---------------- boot ---------------- */
loadNotes();
bindUI();
renderList("");
renderEditor();
initFirebase().catch((e) => console.error("Nota boot:", e));
window.__notaReady = true;

/* Self-test hook (used by headless verification only): ?selftest=1 runs
 * the Summarise action on the active note through the real code path
 * and exposes the outcome in the DOM for --dump-dom checks. */
if (new URLSearchParams(location.search).has("selftest")) {
  setTimeout(async () => {
    await runAction("summarize");
    const chip = document.getElementById("ai-result-chip").textContent;
    const body = document.getElementById("ai-result-body").textContent || "";
    const probe = document.createElement("div");
    probe.id = "selftest-result";
    probe.style.display = "none"; // keep ?selftest screenshots clean
    probe.textContent = "SELFTEST chip=" + chip + " :: " + body.slice(0, 400);
    document.body.appendChild(probe);
    document.title = "SELFTEST:" + chip;
  }, 600);
}
