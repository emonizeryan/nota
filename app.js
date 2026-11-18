/* ==================================================================
 * Nota — private, offline-first notes with hybrid AI
 * ------------------------------------------------------------------
 * AI routing (unchanged by the UI simplification):
 *   - Short tasks run on-device with Gemini Nano via Firebase AI
 *     Logic, mode PREFER_ON_DEVICE. The SDK falls back to the cloud
 *     model only when Nano is unavailable — and we show which path
 *     answered, in plain words.
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
 * always labelled "Demo" — never shown as on-device or cloud AI.
 * ================================================================== */

const $ = (id) => document.getElementById(id);
const LS_NOTES = "nota.notes.v1";
const LS_ACTIVE = "nota.active.v1";
const LS_DEVICE_ONLY = "nota.deviceOnly.v1";
const LS_LANG = "nota.lang";
const LS_HINT = "nota.hint";

/* ---------------- language ----------------
 * UI strings in Bahasa Indonesia + English. AI answers follow the
 * chosen language too (see PROMPTS: a language line is prepended).
 * Internal JSON keys stay English; only the values change. */
const I18N = {
  en: {
    tagline: "Private notes that think on your device.",
    titlePlaceholder: "Note title…",
    bodyPlaceholder: "Write or paste text here — an article, an email, meeting notes, anything.",
    summarizeMain: "✦ Summarise this note",
    more: "More ▾",
    groupTidy: "Tidy up",
    groupFind: "Find out",
    groupReply: "Reply",
    groupDeep: "Go deeper",
    actProofread: "Proofread",
    actShorter: "Shorter",
    actFormal: "More formal",
    actSimpler: "Simpler",
    actKeypoints: "Key points",
    actActions: "Action items",
    actTags: "Tags",
    actReply: "Draft a reply",
    actDeep: "Deep analysis",
    deepNote: "uses the internet",
    groupStudy: "Study",
    actFlashcards: "Flashcards",
    titleFlashcards: "Flashcards",
    fcPrev: "← Previous",
    fcNext: "Next →",
    fcShuffle: "Shuffle",
    fcKnown: "Know ✓",
    fcUnknown: "Not yet ✗",
    fcProgress: "{known} of {total} known",
    fcTap: "Tap the card to flip it",
    fcCardOf: "Card {i} of {n}",
    fcQuestion: "Question",
    fcAnswer: "Answer",
    fcEmpty: "This note is too short for flashcards — write a bit more first.",
    resultTitle: "Result",
    chipDevice: "📱 On this device",
    chipCloud: "☁️ In the cloud",
    chipDemo: "Demo",
    chipFailed: "Failed",
    noteDevice: "Made on this device — your text never left it.",
    noteCloudLong: "Made in the cloud because the document is long.",
    noteCloud: "Made in the cloud.",
    noteDemo: "Demo mode — this is a sample, not the real AI.",
    copyBtn: "Copy",
    applyBtn: "Replace note with this",
    copied: "Copied ✓",
    copyFailed: "Copy failed — select the text manually.",
    sidebarTitle: "My notes",
    newNote: "+ New note",
    searchLabel: "Search notes…",
    sidebarFoot: "Stored in this browser only.",
    noMatch: "No notes match that search.",
    untitled: "Untitled note",
    sample: "sample",
    emptyEditor: "Write or paste some text first.",
    thinking: "Thinking…",
    failedBody: "Something went wrong. Try again.",
    deleteNote: "Delete note",
    deleteConfirm: "Delete “{title}”?",
    deviceOnly: "Keep my notes on this device",
    deviceOnlyHint: "When on, no cloud AI is used.",
    statusReady: "● Ready",
    statusDemo: "● Demo",
    footer: "Free, no account. Your notes never leave this device.",
    howItWorks: "How it works",
    steps: "1 Write or paste text · 2 Tap ✦ Summarise · 3 Read the result below",
    resultEmpty: "The model returned an empty result.",
    noActions: "No clear action items found in this note.",
    lblKeyPoints: "Key points",
    lblActionItems: "Action items",
    lblTags: "Tags",
    enableAI: "Enable AI on this device",
    enableReady: "AI on this device is ready ✓",
    enableUnavailable: "AI on this device unavailable",
    stDemo: "Demo mode",
    stDemoDetail: "The app runs in demo mode for now. Everything still works.",
    stFailedDetail: "The real AI failed to load. Nota keeps working in demo mode.",
    stReadyEnable: "AI is ready to switch on",
    stReadyEnableDetail: "Tap the button below once to set up AI on this device — or just use it, setup starts by itself.",
    stReady: "AI on this device is ready",
    stReadyDetail: "Short tasks run on this device, free and offline.",
    stDownloading: "Downloading the AI…",
    stDownloadingDetail: "A one-time download. While waiting, short tasks still run via the internet.",
    stNoNano: "On-device AI isn't ready here",
    stNoNanoDetail: "This browser can't run on-device AI yet. Answers still come via the internet or demo. Everything still works.",
    stNeedSetup: "The real AI needs setup first",
    stNeedSetupDetail: "See “How it works” at the bottom of the page. Demo mode keeps working for now.",
    stEnableFailed: "On-device AI couldn't start",
    stEnableFailedDetail: "Short tasks still run via the internet and are labelled as such.",
    replyThanks: "Thanks for sharing this. My main takeaways: ",
    replyActions: "\n\nOn actions — ",
    replyClose: "\n\nLet me know if you'd like me to take any of this further.",
    routeDeep: "Deep analysis runs in the cloud — you asked for it. It is never the default.",
    routeDeviceOnly: "Device-only is on: this ran on-device, or not at all. Nothing left the device.",
    titleSummarize: "Summary",
    titleKeypoints: "Key points",
    titleActions: "Action items",
    titleTags: "Tags",
    titleRewriteShorter: "Rewrite — shorter",
    titleRewriteFormal: "Rewrite — formal",
    titleRewriteSimple: "Rewrite — simpler",
    titleProofread: "Proofread",
    titleReply: "Draft reply",
    titleDeep: "Deep analysis",
  },
  id: {
    tagline: "Catatan pribadi yang ringkas sendiri.",
    titlePlaceholder: "Judul catatan…",
    bodyPlaceholder: "Tulis atau tempel teks di sini — artikel, email, notulen rapat, apa saja.",
    summarizeMain: "✦ Ringkas catatan ini",
    more: "Lainnya ▾",
    groupTidy: "Rapikan",
    groupFind: "Cari tahu",
    groupReply: "Balas",
    groupDeep: "Mendalam",
    actProofread: "Perbaiki tulisan",
    actShorter: "Lebih singkat",
    actFormal: "Lebih formal",
    actSimpler: "Lebih sederhana",
    actKeypoints: "Poin penting",
    actActions: "Yang harus dilakukan",
    actTags: "Tag",
    actReply: "Buatkan balasan",
    actDeep: "Analisis mendalam",
    deepNote: "pakai internet",
    groupStudy: "Belajar",
    actFlashcards: "Kartu belajar",
    titleFlashcards: "Kartu belajar",
    fcPrev: "← Sebelumnya",
    fcNext: "Berikutnya →",
    fcShuffle: "Acak",
    fcKnown: "Tahu ✓",
    fcUnknown: "Belum ✗",
    fcProgress: "{known} dari {total} sudah hafal",
    fcTap: "Ketuk kartu untuk membaliknya",
    fcCardOf: "Kartu {i} dari {n}",
    fcQuestion: "Pertanyaan",
    fcAnswer: "Jawaban",
    fcEmpty: "Catatannya terlalu pendek buat kartu belajar — tulis sedikit lagi dulu.",
    resultTitle: "Hasilnya",
    chipDevice: "📱 Di HP ini",
    chipCloud: "☁️ Di cloud",
    chipDemo: "Demo",
    chipFailed: "Gagal",
    noteDevice: "Dibuat di HP ini — teksmu tidak keluar ke mana-mana.",
    noteCloudLong: "Dibuat di cloud karena dokumennya panjang.",
    noteCloud: "Dibuat di cloud.",
    noteDemo: "Mode demo — ini contoh saja, bukan AI asli.",
    copyBtn: "Salin",
    applyBtn: "Ganti catatan dengan ini",
    copied: "Tersalin ✓",
    copyFailed: "Gagal menyalin — pilih teksnya manual saja.",
    sidebarTitle: "Catatanku",
    newNote: "+ Catatan baru",
    searchLabel: "Cari catatan…",
    sidebarFoot: "Tersimpan di browser ini saja.",
    noMatch: "Belum ada catatan yang cocok.",
    untitled: "Catatan tanpa judul",
    sample: "contoh",
    emptyEditor: "Tulis dulu ya, baru bisa diringkas.",
    thinking: "Lagi mikir…",
    failedBody: "Ups, gagal. Coba lagi ya.",
    deleteNote: "Hapus catatan",
    deleteConfirm: "Hapus “{title}”?",
    deviceOnly: "Catatanku jangan keluar dari HP ini",
    deviceOnlyHint: "Kalau aktif, AI cloud tidak dipakai.",
    statusReady: "● Siap",
    statusDemo: "● Demo",
    footer: "Gratis, tanpa akun. Catatanmu tidak keluar dari HP ini.",
    howItWorks: "Cara kerja",
    steps: "1 Tulis atau tempel teks · 2 Pencet ✦ Ringkas · 3 Baca hasilnya di bawah",
    resultEmpty: "Model tidak memberikan hasil.",
    noActions: "Tidak ada yang harus dilakukan di catatan ini.",
    lblKeyPoints: "Poin penting",
    lblActionItems: "Yang harus dilakukan",
    lblTags: "Tag",
    enableAI: "Aktifkan AI di HP ini",
    enableReady: "AI di HP ini sudah siap ✓",
    enableUnavailable: "AI di HP ini tidak tersedia",
    stDemo: "Mode demo",
    stDemoDetail: "Aplikasi jalan dengan mode demo dulu. Semua tetap bisa dipakai.",
    stFailedDetail: "AI aslinya gagal dimuat. Nota tetap jalan dalam mode demo.",
    stReadyEnable: "AI siap dinyalakan",
    stReadyEnableDetail: "Pencet tombol di bawah sekali untuk menyiapkan AI di HP ini — atau langsung pakai, nanti disiapkan sendiri.",
    stReady: "AI di HP ini sudah siap",
    stReadyDetail: "Tugas pendek jalan di HP ini, gratis dan offline.",
    stDownloading: "Lagi mengunduh AI…",
    stDownloadingDetail: "Sekali saja mengunduh AI-nya. Sambil menunggu, tugas pendek tetap jalan lewat internet.",
    stNoNano: "AI di HP ini belum siap",
    stNoNanoDetail: "Browser ini belum bisa menjalankan AI di HP. Jawaban tetap dibuat lewat internet atau demo. Semua tetap jalan.",
    stNeedSetup: "AI asli butuh disiapkan dulu",
    stNeedSetupDetail: "Lihat “Cara kerja” di bawah halaman. Mode demo tetap jalan untuk sekarang.",
    stEnableFailed: "AI di HP ini gagal dinyalakan",
    stEnableFailedDetail: "Tugas pendek tetap jalan lewat internet dan diberi label.",
    replyThanks: "Makasih udah berbagi. Intinya: ",
    replyActions: "\n\nSoal yang harus dilakukan — ",
    replyClose: "\n\nKasih tahu aku ya kalau mau dilanjutin.",
    routeDeep: "Analisis mendalam jalan di cloud — kamu yang minta. Ini bukan bawaan.",
    routeDeviceOnly: "Mode hanya-di-HP aktif: ini jalan di HP, atau tidak jalan sama sekali. Tidak ada yang keluar dari HP.",
    titleSummarize: "Ringkasan",
    titleKeypoints: "Poin penting",
    titleActions: "Yang harus dilakukan",
    titleTags: "Tag",
    titleRewriteShorter: "Tulis ulang — lebih singkat",
    titleRewriteFormal: "Tulis ulang — lebih formal",
    titleRewriteSimple: "Tulis ulang — lebih sederhana",
    titleProofread: "Perbaiki tulisan",
    titleReply: "Balasan",
    titleDeep: "Analisis mendalam",
  },
};

function detectLang() {
  try {
    const saved = localStorage.getItem(LS_LANG);
    if (saved === "id" || saved === "en") return saved;
  } catch (e) { /* storage unavailable — fall through */ }
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("id")) return "id";
  return "en";
}
let lang = detectLang();
function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}
function wordsText(n) {
  return lang === "id" ? `${n} kata` : `${n} word${n === 1 ? "" : "s"}`;
}

/* ---------------- state ---------------- */
let notes = [];
let activeId = null;
let deviceOnly = false;
try { deviceOnly = localStorage.getItem(LS_DEVICE_ONLY) === "1"; } catch (e) { /* ignore */ }
let firebaseReady = false;
let justSeeded = false; // true when the sample notes were created this visit
let firebaseError = "";
let ai = null;          // Firebase AI service (getAI)
let hybridModel = null; // PREFER_ON_DEVICE model (gemini-3.8-flash cloud fallback)
let cloudModel = null;  // PREFER_IN_CLOUD model for long docs (gemini-3.8-flash)
let proModel = null;    // ONLY_IN_CLOUD model for Deep analysis (gemini-3.1-pro-preview)
let deviceModelState = "unknown"; // unknown | checking | downloading | available | unavailable
let deviceModelProgress = 0;
let lastResultText = "";
let lastResultKind = "";
let lastResultCtx = null; // {action, source} — so a language switch can re-label the visible result
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
  return new Date(ts).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function setStatus(title, detail) {
  $("ai-status-title").textContent = title;
  $("ai-status-detail").textContent = detail;
}
function setDot() {
  const dot = $("status-dot");
  const ready = firebaseReady && deviceModelState === "available";
  dot.textContent = ready ? t("statusReady") : t("statusDemo");
  dot.classList.toggle("ok", ready);
  dot.classList.toggle("warn", !ready);
}
function showStatusPanel(show) {
  $("status-panel").hidden = !show;
}

/* ---------------- notes store (localStorage only) ---------------- */
function seedNotes() {
  return [
    {
      id: uid(),
      title: "Rapat tim — 18 Nov",
      body: "Hadir: Maya, Rizky, Dara.\n\nMaya kirim revisi timeline launching hari Jumat. Rizky pegang teks halaman harga, minta feedback Dara sebelum Kamis siang. Dara bilang email onboarding masih nunjuk ke artikel bantuan lama — dia yang betulin.\n\nKeputusan: beta dibuka buat 200 pengguna waitlist hari Selasa, bukan Senin.",
      updated: Date.now(),
      sample: true,
    },
    {
      id: uid(),
      title: "Belanja mingguan",
      body: "Beras 5 kg, telur 1 kg, ayam 1 ekor, sayur bayam 2 ikat, pisang 1 sisir.\n\nJangan lupa beli kopi — stok di rumah tinggal buat 2 hari.",
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
    justSeeded = true;
    saveNotes();
  }
  try {
    activeId = localStorage.getItem(LS_ACTIVE);
  } catch (e) { activeId = null; }
  if (!notes.some((n) => n.id === activeId)) activeId = notes[0].id;
}
function saveNotes() {
  try {
    localStorage.setItem(LS_NOTES, JSON.stringify(notes));
    localStorage.setItem(LS_ACTIVE, activeId || "");
  } catch (e) { /* storage unavailable — notes live in memory only */ }
}
function activeNote() { return notes.find((n) => n.id === activeId) || notes[0]; }

function renderList(filter = "") {
  const list = $("note-list");
  const q = filter.trim().toLowerCase();
  const shown = notes
    .filter((n) => !q || (n.title + " " + n.body).toLowerCase().includes(q))
    .sort((a, b) => b.updated - a.updated);
  if (shown.length === 0) {
    list.innerHTML = `<li class="nl-empty">${esc(t("noMatch"))}</li>`;
    return;
  }
  list.innerHTML = shown.map((n) => `
    <li data-id="${n.id}" class="${n.id === activeId ? "active" : ""}">
      <div class="nl-title">${esc(n.title || t("untitled"))}</div>
      <div class="nl-preview">${esc(n.body.split("\n")[0].slice(0, 80))}</div>
      <div class="nl-date">${nowLabel(n.updated)}${n.sample ? " · " + t("sample") : ""}</div>
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
  // Reopening a note shows its saved flashcard deck again.
  maybeShowDeckForActive();
}
function setActive(id) {
  activeId = id;
  saveNotes();
  renderList($("search").value);
  renderEditor();
}
function updateMeta() {
  const text = $("note-body").value;
  $("word-count").textContent = wordsText(wordCount(text));
}

/* ---------------- language ---------------- */
function applyLang(next) {
  lang = next === "id" || next === "en" ? next : detectLang();
  try { localStorage.setItem(LS_LANG, lang); } catch (e) { /* ignore */ }
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (I18N[lang][key] !== undefined) el.textContent = I18N[lang][key];
  });
  $("note-title").placeholder = t("titlePlaceholder");
  $("note-body").placeholder = t("bodyPlaceholder");
  $("search").placeholder = t("searchLabel");
  $("btn-summarize").textContent = t("summarizeMain");
  $("btn-more").textContent = t("more");
  $("btn-delete-note").textContent = t("deleteNote");
  $("btn-enable-ai").textContent =
    deviceModelState === "available" ? t("enableReady") :
    deviceModelState === "unavailable" ? t("enableUnavailable") : t("enableAI");
  document.querySelectorAll(".lang-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
  setDot();
  renderList($("search").value);
  updateMeta();
  // Re-label the visible result (its body stays as generated).
  if (!$("ai-result").hidden && lastResultCtx) {
    $("ai-result-title").textContent = actionTitle(lastResultCtx.action);
    const chip = $("ai-result-chip");
    const map = { device: [t("chipDevice"), "chip-device"], cloud: [t("chipCloud"), "chip-cloud"], demo: [t("chipDemo"), "chip-demo"], failed: [t("chipFailed"), "chip-demo"] };
    const c = map[lastResultCtx.source] || map.demo;
    chip.textContent = c[0];
    chip.className = "chip " + c[1];
    $("ai-result-note").textContent = lastResultCtx.note || "";
    // A flashcard deck re-renders its controls in the new language.
    if (lastResultKind === "flashcards" && currentDeck) renderDeck();
  }
  maybeShowHint();
}
function setLang(next) { applyLang(next); }

/* ---------------- first-run hint ---------------- */
function maybeShowHint() {
  let dismissed = false;
  try { dismissed = localStorage.getItem(LS_HINT) === "1"; } catch (e) { /* ignore */ }
  const n = activeNote();
  const empty = !n || !(n.body || "").trim();
  $("first-run").hidden = dismissed || !(justSeeded || empty);
}

/* ---------------- AI prompts ----------------
 * The reply language follows the UI language. JSON keys stay
 * English; only the values are answered in the chosen language. */
function langLine() {
  return lang === "id"
    ? "Jawab dalam Bahasa Indonesia. (Kunci JSON tetap bahasa Inggris.)\n\n"
    : "Reply in English.\n\n";
}
const PROMPTS = {
  summarize: (text) => langLine() + `Summarise the following note. Reply with JSON only, no other text: {"tldr": "one or two sentences", "keyPoints": ["...", "..."], "actionItems": ["...", "..."], "tags": ["...", "..."]}\n\nNOTE:\n${text}`,
  keypoints: (text) => langLine() + `List the key points of the following note. Reply with JSON only, no other text: {"keyPoints": ["...", "..."]}\n\nNOTE:\n${text}`,
  actions: (text) => langLine() + `Extract the action items from the following note: who does what, by when, if stated. Reply with JSON only, no other text: {"actionItems": ["...", "..."]}\n\nNOTE:\n${text}`,
  tags: (text) => langLine() + `Suggest 3 to 6 short tags for the following note. Reply with JSON only, no other text: {"tags": ["...", "..."]}\n\nNOTE:\n${text}`,
  "rewrite-shorter": (text) => langLine() + `Rewrite the following note to be about half as long. Keep every important fact, drop repetition and filler. Reply with the rewritten text only.\n\nNOTE:\n${text}`,
  "rewrite-formal": (text) => langLine() + `Rewrite the following note in a formal, professional tone. Keep every fact and all names, dates and numbers exactly. Reply with the rewritten text only.\n\nNOTE:\n${text}`,
  "rewrite-simple": (text) => langLine() + `Rewrite the following note in plain, simple language: short sentences, everyday words, easy to read for anyone. Keep every fact. Reply with the rewritten text only.\n\nNOTE:\n${text}`,
  proofread: (text) => langLine() + `Proofread the following note. Fix grammar, spelling and punctuation only — do not change the meaning, tone or facts. Reply with the corrected text only.\n\nNOTE:\n${text}`,
  reply: (text) => langLine() + `Draft a short, polite reply to the following note or message. Keep it warm and to the point. Reply with the draft only.\n\nNOTE:\n${text}`,
  deep: (text) => langLine() + `Analyse the following note in depth. Cover: (1) what it is really about, (2) what is missing or unclear, (3) risks or contradictions, (4) concrete next steps. Reply in clear sections with short paragraphs.\n\nNOTE:\n${text}`,
  flashcards: (text) => langLine() + `Make 5 to 8 study flashcards from the following note. Each card asks one question that tests understanding of a fact in the note (not a question that just repeats the text), and the answer is short: one or two sentences. Reply with JSON only, no other text: {"cards": [{"q": "...", "a": "..."}, ...]}\n\nNOTE:\n${text}`,
};
const ACTION_TITLES = {
  summarize: () => t("titleSummarize"),
  keypoints: () => t("titleKeypoints"),
  actions: () => t("titleActions"),
  tags: () => t("titleTags"),
  "rewrite-shorter": () => t("titleRewriteShorter"),
  "rewrite-formal": () => t("titleRewriteFormal"),
  "rewrite-simple": () => t("titleRewriteSimple"),
  proofread: () => t("titleProofread"),
  reply: () => t("titleReply"),
  deep: () => t("titleDeep"),
  flashcards: () => t("titleFlashcards"),
};
function actionTitle(action) {
  const fn = ACTION_TITLES[action];
  return fn ? fn() : t("resultTitle");
}
const JSON_ACTIONS = new Set(["summarize", "keypoints", "actions", "tags", "flashcards"]);

/* ---------------- local demo engine (no Firebase) ----------------
 * Small extractive algorithm, runs entirely in the browser.
 * It is NEVER presented as on-device or cloud AI. */
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
    return `${t("replyThanks")}${a.keyPoints.slice(0, 2).join(" ")}${a.actionItems.length ? `${t("replyActions")}${a.actionItems[0]}` : ""}${t("replyClose")}`;
  }
  return text;
}
function demoFlashcards(text) {
  // Honest fallback: cloze-deletion cards. Take the most informative
  // sentences, blank out a content word inside the sentence, and ask the
  // reader to fill it in. No fake "AI" wording — the chip still says Demo.
  // Skip short/header-like lines ("Hadir: Maya, Rizky, Dara.") and never
  // blank the sentence's first word (usually a label or a name).
  const a = demoAnalyze(text);
  const seen = new Set();
  const candidates = [];
  [...a.keyPoints, ...splitSentences(text).map((s) => s.trim())].forEach((s) => {
    if (s && s.length > 30 && !seen.has(s)) { seen.add(s); candidates.push(s); }
  });
  const cards = [];
  for (const s of candidates) {
    if (cards.length >= 8) break;
    const content = [...s.matchAll(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-']{2,}/g)]
      .filter((m) => m.index > 0 && !STOPWORDS.has(m[0].toLowerCase()))
      .map((m) => m[0]);
    if (content.length < 3) continue;
    const blank = content.reduce((best, w) => (w.length > best.length ? w : best), "");
    if (blank.length < 3) continue;
    const q = s.replace(new RegExp(blank.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "______");
    if (q === s) continue;
    cards.push({ q, a: `${blank} — ${s}` });
  }
  return cards;
}
function runDemo(action, text) {
  const a = demoAnalyze(text);
  if (action === "summarize") return { kind: "json", data: a };
  if (action === "keypoints") return { kind: "json", data: { keyPoints: a.keyPoints } };
  if (action === "actions") return { kind: "json", data: { actionItems: a.actionItems } };
  if (action === "tags") return { kind: "json", data: { tags: a.tags } };
  if (action === "flashcards") return { kind: "flashcards", data: { cards: demoFlashcards(text) } };
  return { kind: "text", data: demoRewrite(text, action) };
}

/* ---------------- result rendering ---------------- */
function showResult(title, chipText, chipClass, bodyHtml, note, plainText, kind, ctx) {
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
  lastResultCtx = ctx || null;
  if (lastResultCtx) lastResultCtx.note = note || "";
  // "Replace note with this" makes no sense for a flashcard deck.
  $("btn-apply-result").style.display = lastResultKind === "flashcards" ? "none" : "";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideResult() { $("ai-result").hidden = true; lastResultCtx = null; currentDeck = null; }
function jsonToHtml(data) {
  let html = "";
  if (data.tldr) html += `<p><strong>TL;DR:</strong> ${esc(data.tldr)}</p>`;
  if (data.keyPoints && data.keyPoints.length) {
    html += `<p><strong>${esc(t("lblKeyPoints"))}</strong></p><ul>` + data.keyPoints.map((p) => `<li>${esc(p)}</li>`).join("") + "</ul>";
  }
  if (data.actionItems && data.actionItems.length) {
    html += `<p><strong>${esc(t("lblActionItems"))}</strong></p><ul>` + data.actionItems.map((p) => `<li>${esc(p)}</li>`).join("") + "</ul>";
  } else if (data.actionItems) {
    html += `<p><em>${esc(t("noActions"))}</em></p>`;
  }
  if (data.tags && data.tags.length) {
    html += `<p><strong>${esc(t("lblTags"))}</strong></p><p>` + data.tags.map((tg) => `<span class="tag">${esc(tg)}</span>`).join("") + "</p>";
  }
  return html || `<p><em>${esc(t("resultEmpty"))}</em></p>`;
}
function jsonToPlain(data) {
  const lines = [];
  if (data.tldr) lines.push("TL;DR: " + data.tldr);
  if (data.keyPoints) lines.push("", t("lblKeyPoints") + ":", ...data.keyPoints.map((p) => "- " + p));
  if (data.actionItems) lines.push("", t("lblActionItems") + ":", ...data.actionItems.map((p) => "- " + p));
  if (data.tags) lines.push("", t("lblTags") + ": " + data.tags.join(", "));
  return lines.join("\n");
}
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { return null; }
}

/* ---------------- flashcards deck ----------------
 * A deck belongs to one note: cards + known marks persist in
 * localStorage under nota.flashcards.<noteId>, keyed by a signature
 * of the note text — edit the note and the deck regenerates. */
const LS_FLASH_PREFIX = "nota.flashcards.";
let currentDeck = null; // {noteId, text, cards, order, pos, flipped, known:Set, source, note}
function deckSig(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return text.length + ":" + h;
}
function loadStoredDeck(noteId, text) {
  try {
    const raw = localStorage.getItem(LS_FLASH_PREFIX + noteId);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.cards) || d.cards.length === 0) return null;
    if (d.sig !== deckSig(text)) return null; // note changed — regenerate
    return { noteId, cards: d.cards, known: new Set(d.known || []), source: d.source || "demo", note: d.note || t("noteDemo") };
  } catch (e) { return null; }
}
function saveStoredDeck(deck) {
  try {
    localStorage.setItem(LS_FLASH_PREFIX + deck.noteId, JSON.stringify({
      cards: deck.cards, known: [...deck.known], sig: deckSig(deck.text), source: deck.source, note: deck.note,
    }));
  } catch (e) { /* storage unavailable — deck lives in memory only */ }
}
function normalizeCards(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c.q === "string" && typeof c.a === "string" && c.q.trim() && c.a.trim())
    .slice(0, 8).map((c) => ({ q: c.q.trim(), a: c.a.trim() }));
}
function deckPlainText(deck) {
  return deck.cards.map((c, i) => `Q${i + 1}: ${c.q}\nA${i + 1}: ${c.a}`).join("\n\n");
}
function renderFlashcards(cards, source, noteText, storedKnown) {
  const note = activeNote();
  const clean = normalizeCards(cards);
  if (clean.length === 0) {
    showResult(actionTitle("flashcards"), t("chipDemo"), "chip-demo",
      `<p><em>${esc(t("fcEmpty"))}</em></p>`, "", "", "text", { action: "flashcards", source: "demo" });
    return;
  }
  currentDeck = {
    noteId: note ? note.id : "",
    text: ($("note-body").value || "").trim(),
    cards: clean,
    order: clean.map((_, i) => i),
    pos: 0,
    flipped: false,
    known: storedKnown instanceof Set ? storedKnown : new Set(),
    source,
    note: noteText,
  };
  saveStoredDeck(currentDeck);
  const chip = source === "device" ? [t("chipDevice"), "chip-device"]
    : source === "cloud" ? [t("chipCloud"), "chip-cloud"] : [t("chipDemo"), "chip-demo"];
  showResult(actionTitle("flashcards"), chip[0], chip[1], "", noteText, deckPlainText(currentDeck), "flashcards", { action: "flashcards", source });
  renderDeck();
}
function renderDeck() {
  const deck = currentDeck;
  if (!deck || $("ai-result").hidden) return;
  const id = deck.order[deck.pos];
  const card = deck.cards[id];
  const total = deck.cards.length;
  $("ai-result-body").innerHTML = `
    <div class="fc-wrap">
      <div class="fc-card${deck.flipped ? " flipped" : ""}" id="fc-card" role="button" tabindex="0" aria-label="${esc(t("fcTap"))}">
        <div class="fc-card-inner">
          <div class="fc-face fc-front"><span class="fc-label">${esc(t("fcQuestion"))}</span><p>${esc(card.q)}</p></div>
          <div class="fc-face fc-back"><span class="fc-label">${esc(t("fcAnswer"))}</span><p>${esc(card.a)}</p></div>
        </div>
      </div>
      <p class="fc-hint">${esc(t("fcTap"))}</p>
      <p class="fc-count">${esc(t("fcCardOf").replace("{i}", deck.pos + 1).replace("{n}", total))}</p>
      <div class="fc-controls">
        <button class="btn" data-fc="prev" type="button">${esc(t("fcPrev"))}</button>
        <button class="btn" data-fc="next" type="button">${esc(t("fcNext"))}</button>
        <button class="btn" data-fc="shuffle" type="button">${esc(t("fcShuffle"))}</button>
        <button class="btn${deck.known.has(id) ? " fc-known-on" : ""}" data-fc="known" type="button">${esc(t("fcKnown"))}</button>
        <button class="btn" data-fc="unknown" type="button">${esc(t("fcUnknown"))}</button>
      </div>
      <p class="fc-progress">${esc(t("fcProgress").replace("{known}", deck.known.size).replace("{total}", total))}</p>
    </div>`;
  $("fc-card").addEventListener("click", () => {
    deck.flipped = !deck.flipped;
    $("fc-card").classList.toggle("flipped", deck.flipped);
  });
  $("ai-result-body").querySelectorAll("[data-fc]").forEach((b) => {
    b.addEventListener("click", () => fcControl(b.dataset.fc));
  });
}
function fcControl(which) {
  const deck = currentDeck;
  if (!deck) return;
  const n = deck.cards.length;
  if (which === "prev") { deck.pos = (deck.pos - 1 + n) % n; deck.flipped = false; }
  else if (which === "next") { deck.pos = (deck.pos + 1) % n; deck.flipped = false; }
  else if (which === "shuffle") {
    for (let i = deck.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck.order[i], deck.order[j]] = [deck.order[j], deck.order[i]];
    }
    deck.pos = 0; deck.flipped = false;
  } else if (which === "known") {
    deck.known.add(deck.order[deck.pos]);
    saveStoredDeck(deck);
    if (deck.pos < n - 1) deck.pos += 1;
    deck.flipped = false;
  } else if (which === "unknown") {
    deck.known.delete(deck.order[deck.pos]);
    saveStoredDeck(deck);
    if (deck.pos < n - 1) deck.pos += 1;
    deck.flipped = false;
  }
  renderDeck();
}
function maybeShowDeckForActive() {
  const note = activeNote();
  if (!note) return;
  const text = ($("note-body").value || "").trim();
  if (!text) return;
  const stored = loadStoredDeck(note.id, text);
  if (stored) renderFlashcards(stored.cards, stored.source, stored.note, stored.known);
}

/* ---------------- Firebase AI Logic (real path) ---------------- */
function firebaseConfigured() {
  const c = window.NOTA_FIREBASE_CONFIG || {};
  return c.apiKey && !String(c.apiKey).includes("YOUR_") && c.projectId && !String(c.projectId).includes("YOUR_");
}

async function initFirebase() {
  if (!firebaseConfigured()) {
    setDot();
    setStatus(t("stDemo"), t("stDemoDetail"));
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
    // the status panel says exactly what is missing.
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
    // THE cloud model that actually gets called. When `mode` is set, the
    // SDK IGNORES the top-level `model` and uses `inCloudParams.model`,
    // defaulting to RETIRED gemini-2.0-flash-lite (404) if omitted —
    // Firebase AI SDK 12.5.0 getGenerativeModel source, proven live
    // 2026-11-18 (every InferenceMode path 404'd on 2.0-flash-lite).
    // Always pass inCloudParams explicitly. gemini-3.5-flash-lite is the
    // model proven live by probe: 3.8-flash 500s/429s on this free-tier
    // project, and 3.1-pro-preview 429s (paid-only preview, no Spark
    // quota), so Deep also uses flash-lite for now.
    const cloud = models.flashLite || "gemini-3.5-flash-lite";
    hybridModel = fb.getGenerativeModel(ai, { mode: fb.InferenceMode.PREFER_ON_DEVICE, inCloudParams: { model: cloud } });
    cloudModel = fb.getGenerativeModel(ai, { mode: fb.InferenceMode.PREFER_IN_CLOUD, inCloudParams: { model: cloud } });
    proModel = fb.getGenerativeModel(ai, { mode: fb.InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model: cloud } });
    firebaseReady = true;
    setDot();
    setStatus(t("stReadyEnable"), t("stReadyEnableDetail"));
    probeNanoAvailability();
  } catch (e) {
    firebaseReady = false;
    firebaseError = String(e && e.message ? e.message : e);
    console.error("Nota: Firebase init failed:", e);
    setDot();
    setStatus(t("stDemo"), t("stFailedDetail"));
    probeNanoAvailability();
  }
}

/* Enable-button states: never present a big green CTA that can only fail. */
function setEnableButton(state) {
  const btn = $("btn-enable-ai");
  if (state === "unavailable") {
    btn.disabled = true;
    btn.textContent = t("enableUnavailable");
  } else if (state === "ready") {
    btn.disabled = true;
    btn.textContent = t("enableReady");
  } else {
    btn.disabled = false;
    btn.textContent = t("enableAI");
  }
}

async function probeNanoAvailability() {
  try {
    if (typeof LanguageModel === "undefined") {
      if (deviceModelState === "unknown") {
        deviceModelState = "unavailable";
        setEnableButton("unavailable");
        setStatus(t("stNoNano"), t("stNoNanoDetail"));
        setDot();
      }
      return;
    }
    deviceModelState = "checking";
    const avail = await LanguageModel.availability();
    if (avail === "available") {
      deviceModelState = "available";
      setEnableButton("ready");
      setStatus(t("stReady"), t("stReadyDetail"));
      setDot();
    } else if (avail === "downloading" || avail === "downloadable") {
      deviceModelState = "downloading";
      setEnableButton("enabled");
      setStatus(t("stDownloading"), t("stDownloadingDetail"));
      setDot();
    } else {
      deviceModelState = "unavailable";
      setEnableButton("unavailable");
      setStatus(t("stNoNano"), t("stNoNanoDetail"));
      setDot();
    }
  } catch (e) {
    deviceModelState = "unavailable";
    setEnableButton("unavailable");
    setDot();
  }
}

async function enableOnDeviceAI() {
  if (!firebaseReady || !hybridModel) {
    setStatus(t("stNeedSetup"), t("stNeedSetupDetail"));
    showStatusPanel(true);
    return false;
  }
  deviceModelState = "downloading";
  $("model-progress").hidden = false;
  showStatusPanel(true);
  setStatus(t("stDownloading"), t("stDownloadingDetail"));
  try {
    await hybridModel.initializeDeviceModel((fraction) => {
      deviceModelProgress = Math.round(fraction * 10000) / 100;
      $("model-progress-bar").style.width = deviceModelProgress + "%";
      setStatus(`${t("stDownloading")} ${deviceModelProgress}%`, t("stDownloadingDetail"));
    });
    deviceModelState = "available";
    $("model-progress").hidden = true;
    setEnableButton("ready");
    setStatus(t("stReady"), t("stReadyDetail"));
    setDot();
    return true;
  } catch (e) {
    deviceModelState = "unavailable";
    $("model-progress").hidden = true;
    setStatus(t("stEnableFailed"), t("stEnableFailedDetail"));
    setDot();
    return false;
  }
}

/* ---------------- running an AI action ---------------- */
async function runAction(action) {
  const note = activeNote();
  const text = ($("note-body").value || "").trim();
  if (!text) {
    showResult(actionTitle(action), "—", "", `<p><em>${esc(t("emptyEditor"))}</em></p>`, "", "", "text", { action, source: "failed" });
    return;
  }
  const tokens = estimateTokens(text);
  const isLong = tokens > (window.NOTA_LONG_DOC_TOKENS || 3500);
  const deep = action === "deep";
  // A saved deck for this exact note text opens instantly — no new AI call.
  if (action === "flashcards") {
    const stored = loadStoredDeck(note.id, text);
    if (stored) {
      $("more-panel").hidden = true;
      $("btn-more").setAttribute("aria-expanded", "false");
      renderFlashcards(stored.cards, stored.source, stored.note, stored.known);
      return;
    }
  }
  const buttons = document.querySelectorAll("[data-action]");
  buttons.forEach((b) => { b.disabled = true; });
  showResult(actionTitle(action), "…", "", `<p><em>${esc(t("thinking"))}</em></p>`, "", "", "text", { action, source: "demo" });
  // Close the "More" panel after picking an action — one pattern to learn.
  $("more-panel").hidden = true;
  $("btn-more").setAttribute("aria-expanded", "false");

  try {
    /* --- no Firebase: local demo, clearly labelled --- */
    if (!firebaseReady) {
      await new Promise((r) => setTimeout(r, 350)); // let the UI paint
      const out = runDemo(action, text);
      const noteTxt = t("noteDemo");
      if (out.kind === "flashcards") {
        renderFlashcards(out.data.cards, "demo", noteTxt);
      } else if (out.kind === "json") {
        showResult(actionTitle(action), t("chipDemo"), "chip-demo", jsonToHtml(out.data), noteTxt, jsonToPlain(out.data), "json", { action, source: "demo" });
      } else {
        showResult(actionTitle(action), t("chipDemo"), "chip-demo", `<p>${esc(out.data)}</p>`, noteTxt, out.data, "text", { action, source: "demo" });
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
    let routeKey = "cloud";
    if (deep) {
      model = proModel;
      routeNote = t("routeDeep");
      routeKey = "cloud";
    } else if (deviceOnly) {
      // ONLY_ON_DEVICE never calls the cloud, but pass inCloudParams
      // anyway: the SDK defaults an omitted one to retired
      // gemini-2.0-flash-lite (see initFirebase note above).
      model = fb.getGenerativeModel(ai, {
        mode: fb.InferenceMode.ONLY_ON_DEVICE,
        inCloudParams: { model: (window.NOTA_CLOUD_MODELS || {}).flashLite || "gemini-3.5-flash-lite" },
      });
      routeNote = t("routeDeviceOnly");
      routeKey = "device";
    } else if (isLong) {
      model = cloudModel;
      routeNote = t("noteCloudLong");
      routeKey = "cloud";
    } else {
      model = hybridModel;
      routeNote = "";
      routeKey = "cloud";
    }

    const prompt = PROMPTS[action](text);
    let result;
    if (JSON_ACTIONS.has(action) && !deep) {
      // Structured JSON output (supported on-device and in the cloud).
      // The schema is per-action; if the SDK rejects it, the JSON-only
      // prompt still works — never let the schema break the call.
      const genConfig = { responseMimeType: "application/json" };
      if (fb.Schema) {
        try {
          genConfig.responseSchema = action === "flashcards"
            ? fb.Schema.object({
              properties: {
                cards: fb.Schema.array({
                  items: fb.Schema.object({
                    properties: { q: fb.Schema.string(), a: fb.Schema.string() },
                  }),
                }),
              },
            })
            : fb.Schema.object({
              properties: {
                tldr: fb.Schema.string(),
                keyPoints: fb.Schema.array({ items: fb.Schema.string() }),
                actionItems: fb.Schema.array({ items: fb.Schema.string() }),
                tags: fb.Schema.array({ items: fb.Schema.string() }),
              },
            });
        } catch (e) { /* schema is a bonus only */ }
      }
      result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: genConfig });
    } else {
      result = await model.generateContent(prompt);
    }
    const response = result.response;
    // NOTE: the SDK returns lowercase "on_device" / "in_cloud", not the
    // "ON_DEVICE" / "IN_CLOUD" the docs show (InferenceSource enum in
    // the SDK source) — compare case-insensitively, or a real Nano
    // answer would be mislabelled as cloud.
    const source = response.inferenceSource;
    const raw = response.text();
    const onDevice = String(source || "").toUpperCase() === "ON_DEVICE";
    const chip = onDevice ? [t("chipDevice"), "chip-device"] : [t("chipCloud"), "chip-cloud"];
    const srcNote = onDevice
      ? t("noteDevice")
      : (routeNote || t("noteCloud"));

    if (action === "flashcards") {
      const data = extractJson(raw);
      const cards = data ? normalizeCards(data.cards) : [];
      if (cards.length) {
        renderFlashcards(cards, onDevice ? "device" : "cloud", srcNote);
      } else {
        showResult(actionTitle(action), chip[0], chip[1], `<p><em>${esc(t("fcEmpty"))}</em></p>`, srcNote, "", "text", { action, source: onDevice ? "device" : "cloud" });
      }
    } else if (JSON_ACTIONS.has(action) && !deep) {
      const data = extractJson(raw);
      if (data) {
        showResult(actionTitle(action), chip[0], chip[1], jsonToHtml(data), srcNote, jsonToPlain(data), "json", { action, source: onDevice ? "device" : "cloud" });
      } else {
        showResult(actionTitle(action), chip[0], chip[1], `<p>${esc(raw)}</p>`, srcNote, raw, "text", { action, source: onDevice ? "device" : "cloud" });
      }
    } else {
      showResult(actionTitle(action), chip[0], chip[1], `<p>${esc(raw)}</p>`, deep ? routeNote : srcNote, raw, "text", { action, source: onDevice ? "device" : "cloud" });
    }
  } catch (e) {
    console.error("Nota: AI action failed, falling back to demo:", e);
    // Safety net: a failed real-AI call must never dead-end on "Gagal".
    // Show the local demo result instead, clearly labelled Demo.
    try {
      const out = runDemo(action, text);
      const noteTxt = t("noteDemo");
      if (out.kind === "json") {
        showResult(actionTitle(action), t("chipDemo"), "chip-demo", jsonToHtml(out.data), noteTxt, jsonToPlain(out.data), "json", { action, source: "demo" });
      } else {
        showResult(actionTitle(action), t("chipDemo"), "chip-demo", `<p>${esc(out.data)}</p>`, noteTxt, out.data, "text", { action, source: "demo" });
      }
    } catch (e2) {
      console.error("Nota: demo fallback also failed:", e2);
      showResult(actionTitle(action), t("chipFailed"), "chip-demo",
        `<p><em>${esc(t("failedBody"))}</em></p>`,
        "", "", "text", { action, source: "failed" });
    }
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
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
    maybeShowHint();
  });
  document.querySelectorAll("[data-action]").forEach((b) => {
    b.addEventListener("click", () => runAction(b.dataset.action));
  });
  $("btn-enable-ai").addEventListener("click", () => enableOnDeviceAI());
  // Status dot: tap to open the small status panel (no big banner).
  $("status-dot").addEventListener("click", () => {
    showStatusPanel($("status-panel").hidden);
  });
  // Language toggle: segmented ID | EN, switches every label live.
  document.querySelectorAll(".lang-toggle button").forEach((b) => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });
  // "More" panel: one extra tap reveals the other 9 actions, grouped.
  $("btn-more").addEventListener("click", () => {
    const panel = $("more-panel");
    const open = panel.hidden;
    panel.hidden = !open;
    $("btn-more").setAttribute("aria-expanded", String(open));
  });
  // Note ⋯ menu: Delete lives here now, with confirmation.
  $("btn-note-menu").addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = $("note-menu");
    const open = menu.hidden;
    menu.hidden = !open;
    $("btn-note-menu").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    const menu = $("note-menu");
    if (!menu.hidden && !e.target.closest(".editor-head")) menu.hidden = true;
  });
  $("btn-delete-note").addEventListener("click", () => {
    const n = activeNote();
    if (!n) return;
    if (!confirm(t("deleteConfirm").replace("{title}", n.title || t("untitled")))) return;
    notes = notes.filter((x) => x.id !== n.id);
    if (notes.length === 0) notes = seedNotes();
    activeId = notes[0].id;
    saveNotes();
    renderList($("search").value);
    renderEditor();
    maybeShowHint();
  });
  $("btn-hint-dismiss").addEventListener("click", () => {
    try { localStorage.setItem(LS_HINT, "1"); } catch (e) { /* ignore */ }
    $("first-run").hidden = true;
  });
  $("toggle-device-only").checked = deviceOnly;
  $("toggle-device-only").addEventListener("change", (e) => {
    deviceOnly = e.target.checked;
    try { localStorage.setItem(LS_DEVICE_ONLY, deviceOnly ? "1" : "0"); } catch (err) { /* ignore */ }
    updateMeta();
  });
  $("btn-copy-result").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lastResultText); $("ai-result-note").textContent = t("copied"); } catch (e) { $("ai-result-note").textContent = t("copyFailed"); }
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
}

/* ---------------- boot ---------------- */
// ?lang=id|en deep-link (also used by headless verification).
const qsLang = new URLSearchParams(location.search).get("lang");
if (qsLang === "id" || qsLang === "en") lang = qsLang;
loadNotes();
bindUI();
applyLang(lang);
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
