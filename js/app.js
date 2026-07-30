/* VallabhaVani — core app: settings, router, home, grid views, bookmarks, toast */

/* ---------------- Settings ---------------- */
const DEFAULT_SETTINGS = {
  theme: 'light',            // light | sepia | dark | custom
  customBg: '#eaf5fb',
  customText: '#2e2a26',
  fontFamily: 'deva',        // deva | latin-serif | latin-sans
  fontSize: 1.15,            // rem
  pageMargin: 1.3,           // rem — page/card horizontal padding ("Border" in PocketBook terms)
  lineHeight: 1.95,          // ("Spacing" in PocketBook terms)
  langs: { sa: true, hi: true, en: false },
  readingMode: 'scroll',     // scroll (infinite) | paginated (fixed page boundaries)
  paginatedVertical: false,  // paginated mode only: false = swipe left/right, true = scroll down through page boundaries
  pageDividers: true,
  contentMode: 'default',    // default | tika | flow
  tikas: { amritaTarangini: false, tattvadipika: false, atHindiVyakhya: false }
};

const TIKA_DEFS = [
  // wrapArtifact: this field's embedded \n are fixed-width line-wrap marks
  // left over from how the original Sanskrit source was typed/OCR'd — never
  // a real paragraph break (verified: zero \n\n across ~700 fields each, vs.
  // atHindiVyakhya/hi which use \n\n deliberately sometimes) — so it should
  // flow naturally with the reading font-size, not force a <br> on every one.
  { key: 'amritaTarangini', label: 'अमृततरङ्गिणी', sub: 'श्रीपुरुषोत्तमकृता', available: true, wrapArtifact: true },
  { key: 'tattvadipika', label: 'तत्त्वदीपिका', sub: 'श्रीवल्लभजीमहाराजकृता', available: true, wrapArtifact: true },
  { key: 'atHindiVyakhya', label: 'अमृततरङ्गिणी हिन्दी व्याख्या', sub: 'हिन्दी अनुवाद', available: true },
  { key: 'hindiVyakhya2', label: 'हिन्दी व्याख्या (2)', sub: 'जल्द आ रहा है', available: false },
  { key: 'gujaratiVyakhya', label: 'गुर्जर-व्याख्या', sub: 'श्रीनानूलाल गांधीकृता · जल्द आ रहा है', available: false }
];

/* ---------------- Icons (inline SVG, stroke=currentColor — no emoji) ---------------- */
const ICON_SCROLL = `<svg class="icon" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="4.5" x2="17" y2="4.5"/><line x1="3" y1="9" x2="17" y2="9"/><line x1="3" y1="13.5" x2="12" y2="13.5"/><path d="M14.5 12.5l2.2 2.2 2.2-2.2"/></svg>`;
const ICON_PAGES = `<svg class="icon" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6C8.4 4.7 6.1 4.2 3.2 4.4v11c2.9-.2 5.2.3 6.8 1.6"/><path d="M10 6c1.6-1.3 3.9-1.8 6.8-1.6v11c-2.9-.2-5.2.3-6.8 1.6"/><line x1="10" y1="6" x2="10" y2="17"/></svg>`;
const ICON_CHEVRON_LEFT = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 4.5l-6 5.5 6 5.5"/></svg>`;
const ICON_CHEVRON_RIGHT = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4.5l6 5.5-6 5.5"/></svg>`;
const ICON_TIKA = `<svg class="icon" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="14" height="10" rx="2"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="6" y1="10" x2="11" y2="10"/><path d="M7 13.5l-1.6 3 3-1.8"/></svg>`;
const ICON_FLOW = `<svg class="icon" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 7c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/><path d="M2 13c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/></svg>`;
const ICON_SETTINGS = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/><circle cx="11" cy="5" r="1.9" fill="currentColor" stroke="none"/><circle cx="6" cy="10" r="1.9" fill="currentColor" stroke="none"/><circle cx="14" cy="15" r="1.9" fill="currentColor" stroke="none"/></svg>`;
const ICON_SEARCH = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8.5" r="5.5"/><line x1="16.5" y1="16.5" x2="12.7" y2="12.7"/></svg>`;
const ICON_LIST = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="7" y1="5" x2="17" y2="5"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="7" y1="15" x2="17" y2="15"/><circle cx="3.3" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="3.3" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="3.3" cy="15" r="1" fill="currentColor" stroke="none"/></svg>`;
const ICON_EYE = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.3"/></svg>`;
const ICON_BORDER = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="1.5"/><rect x="6.5" y="6.5" width="7" height="7" rx="1" stroke-dasharray="1.6 1.4"/></svg>`;
const ICON_SPACING = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="4" x2="17" y2="4"/><line x1="5" y1="10" x2="17" y2="10"/><line x1="5" y1="16" x2="17" y2="16"/><path d="M2 6.2l1.3-1.7 1.3 1.7M2 13.8l1.3 1.7 1.3-1.7"/></svg>`;
const ICON_COPY = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4.5" width="9.5" height="11.5" rx="1.4"/><path d="M4 7v9a1.4 1.4 0 0 0 1.4 1.4H12"/></svg>`;
const ICON_SHARE = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="4.5" r="2.1" fill="currentColor" stroke="none"/><circle cx="5" cy="10" r="2.1" fill="currentColor" stroke="none"/><circle cx="15" cy="15.5" r="2.1" fill="currentColor" stroke="none"/><line x1="6.8" y1="8.8" x2="13.2" y2="5.6"/><line x1="6.8" y1="11.2" x2="13.2" y2="14.4"/></svg>`;
const ICON_BOOKMARK = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5h9a1 1 0 0 1 1 1V17l-5.5-3.3L4.5 17V4.5a1 1 0 0 1 1-1z"/></svg>`;
const ICON_CLOSE = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>`;
const ICON_MENU = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="3" y1="5.5" x2="17" y2="5.5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14.5" x2="17" y2="14.5"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg class="icon" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7.5l5.5 6 5.5-6"/></svg>`;
const ICON_PREV_TRACK = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="none"><rect x="3" y="4" width="1.6" height="12"/><path d="M16 4.5v11L7 10z"/></svg>`;
const ICON_NEXT_TRACK = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="none"><rect x="15.4" y="4" width="1.6" height="12"/><path d="M4 4.5v11l9-5.5z"/></svg>`;
const ICON_WAND = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16L14.5 5.5"/><path d="M12.5 4v2M17 6.5h-2M17.5 3.5l-1.2 1.2"/><path d="M6 14l1 1"/></svg>`;
const ICON_BOOK_READ = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5.3C8.4 4.1 6.1 3.6 3.2 3.8v11.4c2.9-.2 5.2.3 6.8 1.5"/><path d="M10 5.3c1.6-1.2 3.9-1.7 6.8-1.5v11.4c-2.9-.2-5.2.3-6.8 1.5"/><line x1="10" y1="5.3" x2="10" y2="16.7"/></svg>`;
const ICON_LOCK = `<svg class="icon" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="9" width="11" height="8" rx="1.6"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9"/></svg>`;
const ICON_EDIT = `<svg class="icon" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12.9 3.6l3.5 3.5-9.6 9.6-4 .5.5-4z"/><path d="M11 5.5l3.5 3.5"/></svg>`;

function loadSettings(){
  try{
    const raw = localStorage.getItem('vv_settings');
    if(!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // migrate old readingMode values (vertical/horizontal conflated "infinite scroll"
    // with "swipe direction" — paginated mode can now be either direction itself)
    if(parsed.readingMode === 'vertical') parsed.readingMode = 'scroll';
    if(parsed.readingMode === 'horizontal') parsed.readingMode = 'paginated';
    return {
      ...DEFAULT_SETTINGS, ...parsed,
      langs: { ...DEFAULT_SETTINGS.langs, ...(parsed.langs||{}) },
      tikas: { ...DEFAULT_SETTINGS.tikas, ...(parsed.tikas||{}) }
    };
  }catch(e){ return { ...DEFAULT_SETTINGS }; }
}
function saveSettings(s){ localStorage.setItem('vv_settings', JSON.stringify(s)); }

let settings = loadSettings();
window.settings = settings; // exposed for devtools/debugging (kept in sync — settings is mutated in place, never reassigned)

function applySettingsToDOM(){
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme);
  if(settings.theme === 'custom'){
    root.style.setProperty('--sky', settings.customBg);
    root.style.setProperty('--sky-2', shade(settings.customBg, -6));
    root.style.setProperty('--card-bg', shade(settings.customBg, 6));
    root.style.setProperty('--ink', settings.customText);
    root.style.setProperty('--ink-soft', shade(settings.customText, 30));
  } else {
    root.style.removeProperty('--sky'); root.style.removeProperty('--sky-2');
    root.style.removeProperty('--card-bg');
    root.style.removeProperty('--ink'); root.style.removeProperty('--ink-soft');
  }
  const famMap = {
    deva: "'Tiro Devanagari Hindi','Noto Sans Devanagari',sans-serif",
    'latin-serif': "'Merriweather',Georgia,serif",
    'latin-sans': "'Inter',system-ui,sans-serif"
  };
  root.style.setProperty('--font-deva', famMap[settings.fontFamily] || famMap.deva);
  root.style.setProperty('--font-size', fontPxFromSliderT(fontSizeSliderT()) + 'px');
  root.style.setProperty('--page-margin', settings.pageMargin + 'rem');
  root.style.setProperty('--line-height', settings.lineHeight);
  const colPx = computeReadingColWidthPx();
  if(colPx != null) root.style.setProperty('--reading-col-w', colPx + 'px');
  else root.style.removeProperty('--reading-col-w');
}

// Keep in sync with the #font-size slider's own min/max below.
const FONT_SIZE_MIN = 0.9, FONT_SIZE_MAX = 2.2;
// The raw slider value (settings.fontSize, still 0.9-2.2 — unchanged, so
// nothing else that reads settings.fontSize needs to know this happened)
// is now just a POSITION (0=min end of travel, 1=max end), shared by both
// the reading-column-width formula above and the font-size curve below —
// so the column keeps narrowing smoothly across the WHOLE slider even
// during a stretch where the actual glyph size isn't changing (see
// FONT_SIZE_CURVE) — narrowing the column alone already reads as "the text
// got bigger" without the glyphs themselves needing to grow every step.
function fontSizeSliderT(){
  return Math.min(1, Math.max(0, (settings.fontSize - FONT_SIZE_MIN) / (FONT_SIZE_MAX - FONT_SIZE_MIN)));
}
// Real font size in px, as a hand-tuned piecewise curve over the slider's
// 0-1 travel — deliberately NOT a straight line. Rishi's own spec: flat at
// 20px for the whole first half (the column-narrowing above does the "it's
// getting bigger" work on its own through that stretch), a gentle ramp
// 20->24px from 50-65%, a steeper ramp 24->28px in just the next 5%, then a
// final ramp up to 35px at the very end. Anchor points only — plain linear
// interpolation between each pair, no smoothing, so the ramps stay exactly
// where specified.
const FONT_SIZE_CURVE = [
  { t: 0.00, px: 20 },
  { t: 0.50, px: 20 },
  { t: 0.65, px: 24 },
  { t: 0.70, px: 28 },
  { t: 1.00, px: 35 }
];
function fontPxFromSliderT(t){
  t = Math.min(1, Math.max(0, t));
  for(let i = 0; i < FONT_SIZE_CURVE.length - 1; i++){
    const a = FONT_SIZE_CURVE[i], b = FONT_SIZE_CURVE[i + 1];
    if(t >= a.t && t <= b.t){
      const localT = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return a.px + localT * (b.px - a.px);
    }
  }
  return FONT_SIZE_CURVE[FONT_SIZE_CURVE.length - 1].px;
}
// Reading-column width bounds. The MAX end (smallest font size) is a
// PERCENTAGE of the actual viewport width, capped by an absolute ceiling so
// an ultra-wide monitor doesn't get an unreadably long line — calibrated
// against a real annotated screenshot (a ~1882px-wide PC window, red lines
// at columns ~150/~1740, i.e. ~85% of the viewport). The MIN end (largest
// font size) is a fixed floor in real inches — the standard CSS "1in=96px"
// convention (no browser exposes true physical screen DPI, so this is the
// best available approximation) — because that end was an explicit physical
// constraint ("on a laptop screen, maximum it can shrink is 4 inches"), not
// a proportion of the screen. Smaller font size -> WIDER column (more
// words/line); larger font size -> NARROWER column down to that floor —
// glyph size and column width both push words-per-line the SAME direction
// instead of one fighting the other. Only applies on a phone lying flat
// ("sleeping") or a real PC/laptop (mouse-driven, any orientation) — see the
// matching CSS media query. Portrait handheld keeps the existing fixed
// --line-w column: that screen's already narrow, nothing to gain from the
// extra complexity there.
const READING_COL_BOUNDS = {
  pc:             { maxPct: 0.85, maxAbsPx: 1900, minIn: 4   },
  phoneLandscape: { maxPct: 0.85, maxAbsPx: 900,  minIn: 3.2 }
};
function computeReadingColWidthPx(){
  if(!window.matchMedia) return null;
  const isPC = window.matchMedia('(pointer: fine)').matches;
  // Mirror the CSS media query exactly (pointer:coarse, not just "not fine")
  // — a device that reports neither (pointer:none, rare, or a browser with
  // no pointer/hover support at all) should fall through to null here too,
  // same as the CSS query not matching, rather than being misclassified as
  // a phone.
  const isPhoneLandscape = window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(orientation: landscape)').matches;
  const bounds = isPC ? READING_COL_BOUNDS.pc : (isPhoneLandscape ? READING_COL_BOUNDS.phoneLandscape : null);
  if(!bounds) return null;
  const t = fontSizeSliderT();
  const maxPx = Math.min(window.innerWidth * bounds.maxPct, bounds.maxAbsPx);
  const minPx = bounds.minIn * 96;
  return maxPx - t * (maxPx - minPx);
}
// Device class (pointer/orientation) can change after load — a PC window
// resized narrower, a phone physically rotated — so re-derive the column
// width then too, not just when a settings slider moves. rAF-throttled so a
// dragged window edge doesn't recompute on every intermediate resize event.
let readingColResizeQueued = false;
window.addEventListener('resize', () => {
  if(readingColResizeQueued) return;
  readingColResizeQueued = true;
  requestAnimationFrame(() => { readingColResizeQueued = false; applySettingsToDOM(); });
});
window.addEventListener('orientationchange', () => applySettingsToDOM());

function shade(hex, percent){
  try{
    let [r,g,b] = hexToRgb(hex);
    const amt = Math.round(2.55 * percent);
    r = Math.min(255, Math.max(0, r + amt));
    g = Math.min(255, Math.max(0, g + amt));
    b = Math.min(255, Math.max(0, b + amt));
    return `rgb(${r},${g},${b})`;
  }catch(e){ return hex; }
}
function hexToRgb(hex){
  hex = hex.replace('#','');
  if(hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const num = parseInt(hex,16);
  return [(num>>16)&255, (num>>8)&255, num&255];
}

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg){
  let el = document.getElementById('vv-toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'vv-toast'; el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 1800);
}

/* ---------------- Clipboard / Share ---------------- */
async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast('कॉपी हो गया / Copied');
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    toast('कॉपी हो गया / Copied');
  }
}
async function shareText(text, title){
  if(navigator.share){
    try{ await navigator.share({ title: title || 'VallabhaVani', text }); return; }
    catch(e){ /* user cancelled or unsupported, fall through */ }
  }
  copyText(text);
}
/* Deep-link a single verse or chapter (#/book/:id/adhyay/N or N.V, same for
   skandh books) and share/copy the actual URL instead of the verse's text. */
async function shareLink(url, title, text){
  if(navigator.share){
    try{ await navigator.share({ title: title || 'VallabhaVani', text, url }); return; }
    catch(e){ /* user cancelled or unsupported, fall through */ }
  }
  copyText(url);
}
function hashForChapter(bookId, chKey){
  // Reformat only ever has exactly one "chapter" — spelling out "adhyay/1"
  // in every copied/shared link is meaningless clutter (it never varies),
  // unlike a real book where the chapter number is the whole point. The
  // existing whole-book "/read" route already starts on the first (only)
  // chapter with no number in the path at all.
  if(bookId === 'reformat') return `#/book/${bookId}/read`;
  const skandhAdhyay = chKey.match(/^s(\d+)a(\d+)$/);
  if(skandhAdhyay) return `#/book/${bookId}/skandh/${skandhAdhyay[1]}/adhyay/${skandhAdhyay[2]}`;
  const adhyayOnly = chKey.match(/^a(\d+)$/);
  if(adhyayOnly) return `#/book/${bookId}/adhyay/${adhyayOnly[1]}`;
  return `#/book/${bookId}`;
}
function hashForVerse(bookId, chKey, verseNum){
  return `${hashForChapter(bookId, chKey)}.${verseNum}`;
}
function absoluteUrl(hash){
  return `${location.origin}${location.pathname}${hash}`;
}

/* ---------------- Bookmarks ---------------- */
function getBookmarks(){
  try{ return JSON.parse(localStorage.getItem('vv_bookmarks') || '[]'); }catch(e){ return []; }
}
function saveBookmark(bm){
  const list = getBookmarks().filter(b => b.key !== bm.key);
  list.unshift({ ...bm, ts: Date.now() });
  localStorage.setItem('vv_bookmarks', JSON.stringify(list.slice(0,30)));
  toast('बुकमार्क सेव हुआ / Bookmarked');
}
function removeBookmark(key){
  localStorage.setItem('vv_bookmarks', JSON.stringify(getBookmarks().filter(b=>b.key!==key)));
  render();
}

/* ---------------- Verse text helpers ---------------- */
function verseAsText(v, langs){
  const parts = [];
  if(v.speaker && (langs.sa||langs.hi||langs.en)){
    if(langs.sa && v.speaker.sa) parts.push(v.speaker.sa);
    else if(langs.hi && v.speaker.hi) parts.push(v.speaker.hi);
  }
  if(langs.sa && v.sa) parts.push(v.sa);
  if(langs.hi && v.hi) parts.push(v.hi);
  if(langs.en && v.en) parts.push(v.en);
  return parts.join('\n\n');
}
function chapterAsText(title, verses, langs){
  const head = title ? (title.hi || title.en || '') : '';
  const body = verses.map(v => `${v.num}. ${verseAsText(v, langs)}`).join('\n\n---\n\n');
  return [head, body].filter(Boolean).join('\n\n') + '\n\n— VallabhaVani';
}

/* ---------------- Data helpers ---------------- */
function getBook(id){
  // The reformat "book" is built at runtime from pasted text/a link — it
  // lives only in this browser (localStorage), never on the Firestore
  // backend — so a page reload needs to lazily restore it into BOOKS before
  // the router can find it, instead of it just vanishing.
  if(id === 'reformat' && !BOOKS.reformat){
    const saved = loadReformatBook();
    if(saved) BOOKS.reformat = saved;
  }
  return BOOKS[id];
}

function getAdhyay(bookId, skandhNum, adhyayNum){
  const book = getBook(bookId);
  if(!book) return null;
  if(book.hasSkandh){
    const sk = book.skandhs && book.skandhs[skandhNum];
    return (sk && sk.adhyays && sk.adhyays[adhyayNum]) || null;
  }
  return (book.adhyays && book.adhyays[adhyayNum]) || null;
}

function skandhAdhyayCount(book, skandhNum){
  return book.skandhAdhyayCounts[skandhNum-1] || 0;
}

/* Build a flat, ordered list of {chapterKey, chapterLabel, adhyay} for a scope */
function buildScope(bookId, skandhNum /* optional */){
  const book = getBook(bookId);
  const chapters = [];
  if(book.hasSkandh){
    const skandhList = skandhNum ? [skandhNum] : book.skandhAdhyayCounts.map((_,i)=>i+1);
    skandhList.forEach(sk => {
      const count = skandhAdhyayCount(book, sk);
      for(let a=1; a<=count; a++){
        const adhyay = getAdhyay(bookId, sk, a);
        chapters.push({
          key: `s${sk}a${a}`,
          label: `${book.skandhTitles.hi[sk-1]} · अध्याय ${a}`,
          href: `#/book/${bookId}/skandh/${sk}/adhyay/${a}`,
          data: adhyay
        });
      }
    });
  } else {
    for(let a=1; a<=book.adhyayCount; a++){
      const adhyay = getAdhyay(bookId, null, a);
      chapters.push({
        key: `a${a}`,
        label: adhyay ? (adhyay.title.hi || adhyay.title.en) : `अध्याय ${a}`,
        href: hashForChapter(bookId, `a${a}`),
        data: adhyay
      });
    }
  }
  return chapters;
}

/* ---------------- Router ---------------- */
function navigate(hash){ location.hash = hash; }

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  applySettingsToDOM(); render();
  // Cloud-saved admin edits load in the background and re-render in place
  // once they arrive — the static data.js content shows instantly either way.
  if(window.vvLoadOverrides) vvLoadOverrides((err, count) => { if(!err && count) refreshReaderIfOpen(); });
  window.vvOnAdminStateChange = () => refreshReaderIfOpen();
  // The Devanagari webfont loads async (display=swap) and isn't actually
  // requested from the network until the first bit of Devanagari text
  // paints — i.e. during the render() call just above. Paginated mode's
  // page boundaries are computed from real character/glyph widths
  // (computePages() in reader.js); if that measurement runs before the
  // real font has loaded, it silently uses a fallback font's metrics, and
  // the exact same chapter re-paginates differently (different page count,
  // different verse-to-page mapping) the moment anything later triggers an
  // in-place refresh (admin overrides loading, a settings change) — which
  // looked like a deep link or reading position randomly jumping to a
  // different spot. Do exactly one corrective re-layout once the real font
  // is confirmed loaded, preserving whatever verse is currently shown —
  // the pagination algorithm itself is untouched, this only guarantees its
  // inputs are trustworthy at least once per session.
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => { if(settings.readingMode === 'paginated') refreshReaderIfOpen(); });
  }
});

function route(){
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return parts;
}

function render(){
  applySettingsToDOM();
  const parts = route();
  const app = document.getElementById('app');
  window.scrollTo(0,0);
  window.__vvRenderReader = null;
  // A reader instance we're navigating away from (back button, or any other
  // route change) may have a debounced address-bar sync still pending — left
  // to fire on its own it silently rewrites the URL back to the old reading
  // position ~250ms later, even though the correct new page is on screen.
  cancelReaderHashSync();

  if(parts.length === 0) return renderHome(app);
  if(parts[0] === 'reformat') return renderReformat(app);

  if(parts[0] === 'book'){
    const bookId = parts[1];
    const book = getBook(bookId);
    if(!book) return renderHome(app);

    // #/book/:id
    if(parts.length === 2) return renderBookView(app, book);

    // #/book/:id/read  -> whole-book continuous/paged reader, optionally
    // #/book/:id/read.V to deep-link a verse within it (no chapter number in
    // the path — used for reformat, which only ever has one chapter).
    if(parts[2] === 'read' || (parts[2] && parts[2].indexOf('read.') === 0)){
      const vStr = parts[2].split('.')[1];
      return renderReader(app, book, null, null, vStr ? parseInt(vStr,10) : null);
    }

    if(book.hasSkandh && parts[2] === 'skandh'){
      const sk = parseInt(parts[3],10);
      if(parts.length === 4) return renderSkandhView(app, book, sk);
      if(parts[4] === 'read') return renderReader(app, book, sk, null);
      if(parts[4] === 'adhyay'){
        // parts[5] is "N" (chapter only) or "N.V" (deep link to verse V of chapter N)
        const [aStr, vStr] = parts[5].split('.');
        return renderReader(app, book, sk, `s${sk}a${parseInt(aStr,10)}`, vStr ? parseInt(vStr,10) : null);
      }
    }
    if(!book.hasSkandh && parts[2] === 'adhyay'){
      const [aStr, vStr] = parts[3].split('.');
      return renderReader(app, book, null, `a${parseInt(aStr,10)}`, vStr ? parseInt(vStr,10) : null);
    }
  }
  renderHome(app);
}

/* ---------------- Views ---------------- */
function renderHome(app){
  const bookmarks = getBookmarks();
  app.innerHTML = `
    <div class="topbar"><h1>वल्लभवाणी</h1>
      <button class="icon-btn" id="btn-reformat" title="Reformat text">${ICON_WAND}</button>
      <button class="icon-btn" id="btn-settings" title="Settings">${ICON_SETTINGS}</button>
    </div>
    <div class="home-content">
    <div class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="om">ॐ</div>
      <h1 class="hero-title-sa">वल्लभवाणी</h1>
      <p class="hero-title-en">VallabhaVani</p>
      <p class="hero-tagline">शान्ति से, अपनी गति से पढ़िए</p>
    </div>
    ${bookmarks.length ? `
      <div class="section-title">पढ़ना जारी रखें</div>
      <div class="bookmarks-list">
        ${bookmarks.slice(0,5).map(b => `
          <div class="bookmark-row">
            <a href="${b.href}">${b.label}</a>
            <button data-rm="${b.key}">${ICON_CLOSE}</button>
          </div>`).join('')}
      </div>` : ''}
    <div class="section-title">पुस्तकें / Books</div>
    <div class="book-grid">
      ${Object.values(BOOKS).filter(b => b.id !== 'reformat').map(b => `
        <a class="book-card" href="#/book/${b.id}">
          <span class="b-title">${b.title.hi}</span>
          <span class="b-sub">${b.tagline.hi}</span>
          ${b.sample ? '<span class="b-badge">परीक्षण डेटा · sample</span>' : ''}
        </a>`).join('')}
    </div>
    <div class="foot-links">
      <p class="foot-blessing">ॐ शान्तिः शान्तिः शान्तिः</p>
      <a href="#/reformat">${ICON_WAND} रीड-मोड बदलें (Reformat)</a>
    </div>
    </div>
    </div>
  `;
  app.querySelector('#btn-settings').onclick = () => openSettingsSheet();
  app.querySelector('#btn-reformat').onclick = () => navigate('#/reformat');
  app.querySelectorAll('[data-rm]').forEach(btn => btn.onclick = (e) => { e.preventDefault(); removeBookmark(btn.dataset.rm); });
}

function renderBookView(app, book){
  const items = book.hasSkandh
    ? book.skandhAdhyayCounts.map((count,i) => ({
        n: i+1, label: book.skandhTitles.hi[i], sub: `${count} अध्याय`,
        href: `#/book/${book.id}/skandh/${i+1}`, locked: false
      }))
    : Array.from({length: book.adhyayCount}, (_,i) => {
        const a = getAdhyay(book.id, null, i+1);
        return { n: i+1, label: `अ. ${i+1}`, sub: a ? '' : 'जल्द आ रहा है', href: `#/book/${book.id}/adhyay/${i+1}`, locked: !a };
      });

  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="btn-back">${ICON_CHEVRON_LEFT}</button>
      <h1>${book.title.hi}</h1>
      <button class="icon-btn" id="btn-settings">${ICON_SETTINGS}</button>
    </div>
    <div class="grid-view">
      <div class="tile-grid">
        ${items.map(it => `
          <a class="tile ${it.locked?'locked':''}" href="${it.href}">
            <span class="n">${it.n}</span>
            <span class="t">${it.sub}</span>
          </a>`).join('')}
      </div>
      <button class="read-all-btn" id="btn-read-all">${ICON_BOOK_READ} पूरी पुस्तक पढ़ें / Read whole book</button>
    </div>
  `;
  wireTopbar(app);
  app.querySelector('#btn-read-all').onclick = () => navigate(`#/book/${book.id}/read`);
}

function renderSkandhView(app, book, skandhNum){
  const count = skandhAdhyayCount(book, skandhNum);
  const items = Array.from({length: count}, (_,i) => {
    const a = getAdhyay(book.id, skandhNum, i+1);
    return { n: i+1, sub: a ? '' : 'जल्द आ रहा है', href: `#/book/${book.id}/skandh/${skandhNum}/adhyay/${i+1}`, locked: !a };
  });
  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="btn-back">${ICON_CHEVRON_LEFT}</button>
      <h1>${book.skandhTitles.hi[skandhNum-1]}</h1>
      <button class="icon-btn" id="btn-settings">${ICON_SETTINGS}</button>
    </div>
    <div class="grid-view">
      <div class="tile-grid">
        ${items.map(it => `
          <a class="tile ${it.locked?'locked':''}" href="${it.href}">
            <span class="n">${it.n}</span><span class="t">${it.sub}</span>
          </a>`).join('')}
      </div>
      <button class="read-all-btn" id="btn-read-all">${ICON_BOOK_READ} पूरा स्कन्ध पढ़ें / Read whole skandh</button>
    </div>
  `;
  wireTopbar(app);
  app.querySelector('#btn-read-all').onclick = () => navigate(`#/book/${book.id}/skandh/${skandhNum}/read`);
}

function wireTopbar(app){
  const back = app.querySelector('#btn-back');
  if(back) back.onclick = () => history.length > 1 ? history.back() : navigate('#/');
  const set = app.querySelector('#btn-settings');
  if(set) set.onclick = () => openSettingsSheet();
}

/* ---------------- Shared appearance controls: theme, font, border (page
   margin), spacing (line height) — PocketBook's font/border/spacing trio.
   Shared by the standalone settings sheet (home/book/skandh views) and the
   reader's own Settings tab so the two never drift apart. ---------------- */
function appearanceControlsHtml(){
  return `
    <div class="setting-row">
      <label>थीम / Theme</label>
      <div class="opt-row">
        ${['light','sepia','dark','custom'].map(t => `<button class="chip ${settings.theme===t?'active':''}" data-theme="${t}">${t}</button>`).join('')}
      </div>
      ${settings.theme==='custom' ? `
        <div class="opt-row" style="margin-top:.6rem">
          बैकग्राउंड <input type="color" id="custom-bg" value="${settings.customBg}">
          टेक्स्ट <input type="color" id="custom-text" value="${settings.customText}">
        </div>`: ''}
    </div>
    <div class="setting-row">
      <label>फॉन्ट फ़ैमिली / Font family</label>
      <select id="font-family">
        <option value="deva" ${settings.fontFamily==='deva'?'selected':''}>Devanagari (Tiro / Noto)</option>
        <option value="latin-serif" ${settings.fontFamily==='latin-serif'?'selected':''}>Serif (Merriweather)</option>
        <option value="latin-sans" ${settings.fontFamily==='latin-sans'?'selected':''}>Sans (Inter)</option>
      </select>
    </div>
    <div class="setting-row">
      <label>A फॉन्ट साइज़ / Font size A</label>
      <input type="range" id="font-size" min="0.9" max="2.2" step="0.05" value="${settings.fontSize}">
    </div>
    <div class="setting-row">
      <label>${ICON_BORDER} बॉर्डर / Border (page margin)</label>
      <input type="range" id="page-margin" min="0.5" max="3" step="0.1" value="${settings.pageMargin}">
    </div>
    <div class="setting-row">
      <label>${ICON_SPACING} स्पेसिंग / Spacing (line height)</label>
      <input type="range" id="line-height" min="1.3" max="2.6" step="0.05" value="${settings.lineHeight}">
    </div>
    ${adminLoginHtml()}
  `;
}

/* ---------------- Admin login (Settings tab only, sirf gpoorna ke liye) ---------------- */
function adminLoginHtml(){
  if(!window.vvIsAdmin || !vvAdminReadyYet()){
    return `<div class="setting-row admin-row"><label>${ICON_LOCK} एडमिन</label><p class="admin-hint">लोड हो रहा है…</p></div>`;
  }
  if(vvIsAdmin()){
    return `
      <div class="setting-row admin-row">
        <label>${ICON_LOCK} एडमिन मोड चालू है / Admin mode ON</label>
        <p class="admin-hint">अब हर श्लोक के पास ${ICON_EDIT} एडिट बटन दिखेगा — जो भी बदलोगे वह सबको दिखेगा।</p>
        <div class="opt-row">
          <button class="chip" id="admin-logout-btn">लॉगआउट / Logout</button>
        </div>
      </div>`;
  }
  return `
    <div class="setting-row admin-row">
      <label>${ICON_LOCK} एडमिन लॉगिन / Admin login</label>
      <div class="admin-login-box">
        <input type="text" id="admin-username" placeholder="Username" autocomplete="username">
        <input type="password" id="admin-password" placeholder="Password" autocomplete="current-password">
        <button class="chip" id="admin-login-btn">लॉगिन</button>
      </div>
      <p class="admin-error" id="admin-error" hidden></p>
    </div>`;
}
function wireAdminLogin(container, onChange){
  const loginBtn = container.querySelector('#admin-login-btn');
  if(loginBtn){
    const doLogin = () => {
      const u = container.querySelector('#admin-username').value;
      const p = container.querySelector('#admin-password').value;
      loginBtn.disabled = true; loginBtn.textContent = '...';
      vvAdminLogin(u, p, (err) => {
        const errEl = container.querySelector('#admin-error');
        if(err){
          loginBtn.disabled = false; loginBtn.textContent = 'लॉगिन';
          errEl.textContent = err; errEl.hidden = false;
        } else {
          onChange(); // will re-render this panel via vvOnAdminStateChange too, but do it right away for snappiness
        }
      });
    };
    loginBtn.onclick = doLogin;
    container.querySelector('#admin-password').addEventListener('keydown', (e) => { if(e.key === 'Enter') doLogin(); });
  }
  const logoutBtn = container.querySelector('#admin-logout-btn');
  if(logoutBtn) logoutBtn.onclick = () => { vvAdminLogout(); onChange(); };
}

function wireAppearanceControls(container, onRebuildNeeded){
  wireAdminLogin(container, onRebuildNeeded);
  container.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { settings.theme = b.dataset.theme; saveSettings(settings); onRebuildNeeded(); });
  const cbg = container.querySelector('#custom-bg'); if(cbg) cbg.oninput = () => { settings.customBg = cbg.value; saveSettings(settings); applySettingsToDOM(); };
  const ctx = container.querySelector('#custom-text'); if(ctx) ctx.oninput = () => { settings.customText = ctx.value; saveSettings(settings); applySettingsToDOM(); };
  const ff = container.querySelector('#font-family'); if(ff) ff.onchange = (e) => { settings.fontFamily = e.target.value; saveSettings(settings); applySettingsToDOM(); };

  // These three sliders each trigger a full-page reflow (hundreds of verse/
  // tika blocks reference the CSS vars they control) — rAF-throttle the
  // actual DOM update so dragging stays responsive instead of visibly
  // lagging behind the finger while still tracking every input tick.
  function throttledSlider(id, apply){
    const el = container.querySelector('#' + id);
    if(!el) return;
    let raf = null;
    el.oninput = (e) => {
      apply(e.target.value);
      if(raf) return;
      raf = requestAnimationFrame(() => { saveSettings(settings); applySettingsToDOM(); raf = null; });
    };
  }
  throttledSlider('font-size', v => settings.fontSize = parseFloat(v));
  throttledSlider('page-margin', v => settings.pageMargin = parseFloat(v));
  throttledSlider('line-height', v => settings.lineHeight = parseFloat(v));
}

/* ---------------- Settings sheet (standalone — home/book/skandh views) ---------------- */
function openSettingsSheet(){
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <button class="close-x">${ICON_CLOSE}</button>
      <h2>${ICON_SETTINGS} रीडिंग सेटिंग्स</h2>
      ${appearanceControlsHtml()}
      <div class="setting-row">
        <label>भाषाएँ / Languages</label>
        <div class="opt-row">
          ${['sa','hi','en'].map(l => `<button class="chip ${settings.langs[l]?'active':''}" data-lang="${l}">${({sa:'संस्कृत',hi:'हिन्दी',en:'English'})[l]}</button>`).join('')}
        </div>
      </div>

      <div class="setting-row">
        <label>पेज डिवाइडर / Page dividers (scroll mode)</label>
        <div class="opt-row">
          <button class="chip ${settings.pageDividers?'active':''}" id="toggle-dividers">${settings.pageDividers?'चालू / On':'बंद / Off'}</button>
        </div>
      </div>

      <div class="setting-row">
        <label>टीकाएँ / Commentaries — इन्हें दिखाने के लिए "टीका मोड" चुनें</label>
        <div class="tika-list">
          ${TIKA_DEFS.map(t => `
            <label class="tika-row ${t.available?'':'disabled'}">
              <input type="checkbox" data-tika="${t.key}" ${settings.tikas[t.key]?'checked':''} ${t.available?'':'disabled'}>
              <span class="t-label">${t.label}</span>
              <span class="t-sub">${t.sub}</span>
            </label>`).join('')}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
  overlay.querySelector('.close-x').onclick = close;
  function close(){ overlay.remove(); refreshReaderIfOpen(); }
  function rebuild(){ close(); openSettingsSheet(); }

  wireAppearanceControls(overlay, rebuild);
  overlay.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => {
    const l = b.dataset.lang; settings.langs[l] = !settings.langs[l]; saveSettings(settings); rebuild();
  });
  const dv = overlay.querySelector('#toggle-dividers');
  if(dv) dv.onclick = () => { settings.pageDividers = !settings.pageDividers; saveSettings(settings); rebuild(); };
  overlay.querySelectorAll('[data-tika]').forEach(cb => cb.onchange = () => {
    settings.tikas[cb.dataset.tika] = cb.checked;
    // Ticking a tika should show it immediately — don't make the user separately
    // hunt for a mode switch in another menu just to see what they just selected.
    if(cb.checked) settings.contentMode = 'tika';
    saveSettings(settings); refreshReaderIfOpen();
  });
}
function refreshReaderIfOpen(){ if(window.__vvRenderReader) window.__vvRenderReader(); else render(); }

/* ---------------- Reformat tool ---------------- */
function renderReformat(app){
  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="btn-back">${ICON_CHEVRON_LEFT}</button>
      <h1>${ICON_WAND} आसान पढ़ने का रूप</h1>
      <button class="icon-btn" id="btn-settings">${ICON_SETTINGS}</button>
    </div>
    <div class="reformat-wrap">
      <label style="font-size:.85rem;color:var(--ink-soft)">वेब लिंक (वैकल्पिक) / Paste a link (optional)</label>
      <input type="text" id="rf-url" placeholder="https://...">
      <label style="font-size:.85rem;color:var(--ink-soft)">या यहाँ टेक्स्ट पेस्ट करें / Or paste text directly</label>
      <textarea id="rf-text" placeholder="यहाँ टेक्स्ट पेस्ट करें..."></textarea>
      <button class="primary-btn" id="rf-go">फॉर्मेट करें / Format for reading</button>
      <div class="status-note" id="rf-status"></div>
      <div id="rf-output"></div>
    </div>
  `;
  wireTopbar(app);
  app.querySelector('#rf-go').onclick = async () => {
    const url = app.querySelector('#rf-url').value.trim();
    const status = app.querySelector('#rf-status');
    let text = app.querySelector('#rf-text').value.trim();
    let title = null;
    if(url){
      status.textContent = 'लिंक से टेक्स्ट लाया जा रहा है...';
      try{
        const res = await fetch('https://r.jina.ai/' + url);
        if(!res.ok) throw new Error('fetch failed');
        const raw = await res.text();
        // r.jina.ai prefixes the real article with its own metadata block
        // (Title:, URL Source:, Published Time:, Markdown Content:) — pull
        // the title out to show as a heading, drop the rest of the preamble.
        const parsed = parseJinaArticle(raw);
        title = parsed.title;
        text = parsed.body;
        status.textContent = 'लिंक से टेक्स्ट सफलतापूर्वक लाया गया।';
      }catch(e){
        status.textContent = 'लिंक से टेक्स्ट नहीं ला सके — कृपया टेक्स्ट सीधे पेस्ट करें। (Could not fetch automatically — please paste the text instead.)';
        return;
      }
    }
    if(!text){ status.textContent = 'कृपया टेक्स्ट या लिंक दें।'; return; }
    let paras = text.split(/\n{2,}|\r?\n/).map(p=>p.trim()).filter(Boolean).filter(p => !isBoilerplatePara(p));
    // Some pages (mainly lead-gen/enrollment sites) flatten an entire <select>
    // dropdown or multi-step form into dozens/hundreds of one-word "paragraphs"
    // (country names, year lists, form field labels) — no single line looks
    // like nav/an ad on its own, but a long RUN of very short, unpunctuated
    // lines back-to-back never happens in real prose. Sweep those runs out.
    paras = dropFragmentRuns(paras, 6);
    // Some articles' own first heading just repeats the page title (jina puts
    // the same string in both the Title: field and as the body's own "# ...")
    // — drop that echo so the title isn't shown twice in a row.
    if(title && paras.length){
      const firstPlain = paras[0].replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
      if(firstPlain.toLowerCase() === title.toLowerCase()) paras.shift();
    }
    // Once we hit real site-footer/cookie-consent-banner chrome, everything
    // after it is guaranteed non-article — cut there rather than trying to
    // pattern-match every individual footer widget line. Only honored once
    // some real content has already accumulated, so a false hit near the very
    // top (rare, but possible) can't wipe out the whole article.
    let cutAt = -1, charsSoFar = 0;
    for(let i = 0; i < paras.length; i++){
      if(isHardStopPara(paras[i]) && charsSoFar > 400){ cutAt = i; break; }
      charsSoFar += paras[i].length;
    }
    if(cutAt !== -1) paras = paras.slice(0, cutAt);
    if(!paras.length){ status.textContent = 'कोई अनुच्छेद नहीं मिला।'; return; }
    // Opens in the SAME reader engine as the Gita/Bhagavata (card mode, both
    // paginated sub-modes, the vertical scroll pad, the bottom scrub-bar —
    // all of it for free, no separate implementation to keep in sync) by
    // building one throwaway "book" with a single chapter, one verse per
    // paragraph. Lives only in this browser's localStorage — never sent to
    // Firestore — so pasting a long article never touches the cloud database.
    const book = buildReformatBook(paras, title);
    BOOKS.reformat = book;
    saveReformatBook(book);
    // Default a freshly-formatted article to page mode with vertical
    // scrolling on, per explicit ask — reading mode is a single shared
    // setting (not per-book), so this does carry over to whatever's read
    // next too, same as every other appearance setting already does.
    settings.readingMode = 'paginated';
    settings.paginatedVertical = true;
    saveSettings(settings);
    navigate('#/book/reformat/read');
  };
}
function buildReformatBook(paras, articleTitle){
  // No generic "Formatted text"/"Pasted text" placeholder label — the
  // topbar/bookmark title is the article's own real title when we have one,
  // or just blank when reading raw pasted text (nothing meaningful to show).
  const title = { hi: articleTitle || '', en: articleTitle || '' };
  // Escaped first (this text can come from a fetched URL — untrusted
  // third-party content — and verseCardHtml()/verseFlowHtml() insert `hi`
  // straight into innerHTML), THEN a minimal markdown pass converts
  // **bold**/*italic*/# headings into real tags — safe because it only ever
  // inserts fixed <b>/<i> tags, never re-parses user content as markup.
  const verses = paras.map((p, i) => ({
    num: i + 1,
    hi: mdBlockToHtml(escapeHtml(p)),
    // No natural "verse number" for an arbitrary paragraph of prose —
    // renderers skip the श्लोक N / sup-number badge for these and show a
    // plain page number instead (see noNum handling in reader.js).
    noNum: true
  }));
  if(articleTitle){
    // Kept in its own tagged span (rf-title, see style.css) instead of being
    // funneled through mdBlockToHtml's generic heading handling — the page
    // title should read bigger/bolder than an in-article heading, not the same.
    verses.unshift({ num: 0, hi: `<b class="rf-title">${mdInline(escapeHtml(articleTitle))}</b>`, noNum: true });
  }
  return {
    id: 'reformat',
    title,
    tagline: { hi: 'यह पाठ केवल आपके ब्राउज़र में सेव है / saved only in this browser' },
    languages: ['hi'],
    hasSkandh: false,
    adhyayCount: 1,
    adhyays: { '1': { title, verses } }
  };
}
function parseJinaArticle(raw){
  const titleMatch = raw.match(/^Title:\s*(.+)$/m);
  const contentMatch = raw.match(/Markdown Content:\s*\n([\s\S]*)$/);
  let body = (contentMatch ? contentMatch[1] : raw).trim();
  // Defensive: if the Markdown Content: marker wasn't found (format drift,
  // fetch error page, etc.) `body` falls back to the whole raw response —
  // which starts with the same Title:/URL Source:/Published Time: preamble
  // already pulled out above. Left in, that preamble becomes its own
  // paragraph and shows up literally as "Title: ..." in the reader. Strip
  // any such metadata lines (plus blank lines) ONLY from the very top, so a
  // real paragraph deeper in the article that happens to start with one of
  // these words is never touched.
  const lines = body.split('\n');
  let i = 0;
  while(i < lines.length){
    const line = lines[i].trim();
    if(line === '' || /^(Title|URL Source|Published Time|Warning|Markdown Content):/i.test(line)){ i++; continue; }
    break;
  }
  body = lines.slice(i).join('\n').trim();
  return { title: titleMatch ? titleMatch[1].trim() : null, body };
}
// r.jina.ai's readability extraction is usually clean, but on pages where it
// falls back to a raw scrape (404s, JS-only pages, sites its heuristics don't
// suit) whole nav menus, "sign up"/newsletter/cookie banners, share-this
// rows and related-article teaser links leak straight into the "paragraphs"
// (each is its own line after the split in the click handler above). Real
// prose is never JUST a bare link or one of these UI labels on its own line,
// so this is high-precision even though it's just a heuristic.
const BOILERPLATE_WHOLE_RE = /^(menu|search|close|tags?|comments?|related|related articles?|popular topics?|share|share this|share this article|advertisement|sponsored|sponsored content|submit|submit search form|search form|back accept ?&? ?submit|accept ?&? ?submit|enter your email|email address)$/i;
const BOILERPLATE_PREFIX_RE = /^(sign up|sign in|log ?in|subscribe|newsletter|we use cookies|accept cookies|cookie (settings|policy|notice)|skip to (main )?content|follow us|remember me|join medium|get .+('s|’s) stories in your inbox)/i;
function isBoilerplatePara(p){
  const t = p.trim();
  if(!t) return true;
  if(/^[-*_\s]{3,}$/.test(t)) return true; // "* * *" / "---" style dividers
  if(/^\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\.?$/.test(t)) return true; // logo/banner image wrapped in a link

  // Strip a leading bullet/number-list marker, then remove EVERY markdown
  // link/image construct entirely (not just its label). Real prose that
  // happens to contain a link always has substantial text left outside the
  // brackets; a nav item, breadcrumb crumb, or table-of-contents entry has
  // nothing left over but maybe a stray "/" — no matter how long its own
  // label text is (a plain word-count check would miss a heading-length nav
  // label like a breadcrumb's own category name).
  const noPrefix = t.replace(/^(\*|-|\d{1,3}\.)\s+/, '');
  const hadLink = /!?\[[^\]]*\]\([^)]+\)/.test(noPrefix);
  if(hadLink){
    const remainder = noPrefix.replace(/!?\[[^\]]*\]\([^)]+\)/g, '').replace(/[\s/:.\-–—]+/g, '');
    if(remainder.length <= 2) return true;
  }
  // Breadcrumb crumb with no link at all (the last crumb = current page,
  // just repeats the title) — short, numbered, no sentence-ending punctuation.
  if(!hadLink && /^\d{1,2}\.\s+\S/.test(t)){
    const rest = t.replace(/^\d{1,2}\.\s+/, '').trim();
    if(!/[.!?]$/.test(rest) && rest.split(/\s+/).length <= 10) return true;
  }
  if(BOILERPLATE_WHOLE_RE.test(t)) return true;
  if(BOILERPLATE_PREFIX_RE.test(t)) return true;
  return false;
}
// A line short enough (<=6 words) and unpunctuated enough (no sentence-ending
// ./!/?) to plausibly be one flattened <option>/form-field/menu entry rather
// than a fragment of real prose. One or two of these in a row can easily be
// genuine (a short aside, a one-word list item) — only a long unbroken RUN of
// them (see dropFragmentRuns) is treated as non-article content.
function isFragmentLine(t){
  const s = t.trim();
  const words = s.split(/\s+/).filter(Boolean);
  if(words.length > 6) return false;
  if(/[.!?]$/.test(s)) return false;
  return true;
}
function dropFragmentRuns(paras, runThreshold){
  const out = [];
  let i = 0;
  while(i < paras.length){
    if(isFragmentLine(paras[i])){
      let j = i;
      while(j < paras.length && isFragmentLine(paras[j])) j++;
      if((j - i) < runThreshold){ for(let k = i; k < j; k++) out.push(paras[k]); }
      i = j;
    }else{ out.push(paras[i]); i++; }
  }
  return out;
}
// Cookie-consent banners, share-widget rows, and related-article grids use
// near-identical boilerplate phrasing across most of the web (OneTrust-style
// consent centers especially) — once one of these shows up, the rest of the
// dump to the end of the page is guaranteed to be footer chrome, not article.
const HARD_STOP_RE = /^(share this( story| article)?|related articles?( in)?|related resources?|unlock your potential|manage (cookies? settings|consent preferences)|privacy\s*\/?\s*cookie disclaimer|do not sell my personal information|strictly necessary cookies|performance cookies|targeting cookies|social media cookies|cookie list|confirm my choices|sale of personal data)$/i;
function isHardStopPara(t){
  if(HARD_STOP_RE.test(t)) return true;
  if(/all rights reserved/i.test(t)) return true;
  if(/^©\s*\d{4}/.test(t)) return true;
  return false;
}
function mdBlockToHtml(escaped){
  const heading = escaped.match(/^#{1,6}\s+(.+)$/);
  if(heading) return `<b class="rf-heading">${mdInline(heading[1])}</b>`;
  return mdInline(escaped);
}
function mdInline(s){
  // Inline citation/source links (e.g. "According to [a 2023 study](url)...")
  // are common in real articles — left as raw markdown they'd show the whole
  // URL as ugly literal text in the middle of a sentence. Real, clickable
  // link, just the label visible, matching how any reader-mode view treats
  // them. (A paragraph that's NOTHING but a bare link was already dropped
  // earlier by isBoilerplatePara — this only runs on links sitting inside
  // real surrounding prose.)
  //
  // Links are pulled out into placeholders FIRST, before any emphasis
  // matching — a real URL can contain a literal, unescaped underscore
  // (e.g. ".../session-126062800181_1.html"; jina escapes SOME literal
  // underscores as "\_" but not ones sitting inside a URL like this one),
  // and the emphasis regexes below pair up underscores across the WHOLE
  // string. Left unprotected, that one stray URL underscore shifts which
  // underscore pairs with which for the rest of the paragraph, leaving a
  // later "_word_" only half-converted with one delimiter still visible as
  // literal text. Placeholders make the URL invisible to that scan; the
  // underscore/asterisk pair immediately around a placeholder (e.g. real
  // articles routinely italicize a linked publication name — `_[CNN](url)_`)
  // still matches correctly since the placeholder token sits right where the
  // link used to be.
  const links = [];
  let out = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
    links.push({ label, url });
    return `\x01L${links.length - 1}\x01`;
  });
  // Underscore emphasis (`_word_`, common for "_The Hindu_ reported...")
  // needs its own pass — asterisk-only handling left every one of these
  // with the literal underscores still visible. The `(?<!\\)` guards skip a
  // backslash-escaped `_`/`*` (unescaped again below) so an intentionally
  // literal one in running prose isn't mistaken for emphasis.
  out = out.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/__(.+?)__/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/(?<!\\)_(.+?)(?<!\\)_/g, '<i>$1</i>')
    .replace(/\\_/g, '_').replace(/\\\*/g, '*');
  return out.replace(/\x01L(\d+)\x01/g, (_, i) => {
    const { label, url } = links[Number(i)];
    return `<a class="rf-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
}
function saveReformatBook(book){
  try{ localStorage.setItem('vv_reformat_book', JSON.stringify(book)); }catch(e){ /* storage full/unavailable — book still works for this session */ }
}
function loadReformatBook(){
  try{ const raw = localStorage.getItem('vv_reformat_book'); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
