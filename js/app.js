/* VallabhaVani — core app: settings, router, home, grid views, bookmarks, toast */

/* ---------------- Settings ---------------- */
const DEFAULT_SETTINGS = {
  theme: 'light',            // light | sepia | dark | custom
  customBg: '#eaf5fb',
  customText: '#2e2a26',
  fontFamily: 'deva',        // deva | latin-serif | latin-sans
  fontSize: 1.15,            // rem
  lineCh: 30,                // ch units -> controls words-per-line
  lineHeight: 1.95,
  langs: { sa: true, hi: true, en: false },
  readingMode: 'scroll',     // scroll (infinite) | paginated (fixed page boundaries)
  paginatedVertical: false,  // paginated mode only: false = swipe left/right, true = scroll down through page boundaries
  pageDividers: true,
  contentMode: 'default',    // default | tika | flow
  tikas: { amritaTarangini: false, tattvadipika: false }
};

const TIKA_DEFS = [
  { key: 'amritaTarangini', label: 'अमृततरङ्गिणी', sub: 'श्रीपुरुषोत्तमकृता', available: true },
  { key: 'tattvadipika', label: 'तत्त्वदीपिका', sub: 'श्रीवल्लभजीमहाराजकृता', available: true },
  { key: 'atHindiVyakhya', label: 'अमृततरङ्गिणी हिन्दी व्याख्या', sub: 'जल्द आ रहा है', available: false },
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
const ICON_SETTINGS = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.6"/><path d="M10 3v1.6M10 15.4V17M17 10h-1.6M4.6 10H3M14.9 5.1l-1.13 1.13M6.23 13.67L5.1 14.9M14.9 14.9l-1.13-1.13M6.23 6.33L5.1 5.1"/></svg>`;
const ICON_COPY = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4.5" width="9.5" height="11.5" rx="1.4"/><path d="M4 7v9a1.4 1.4 0 0 0 1.4 1.4H12"/></svg>`;
const ICON_SHARE = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9"/><path d="M6.5 6.5L10 3l3.5 3.5"/><path d="M4 11.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4.5"/></svg>`;
const ICON_BOOKMARK = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5h9a1 1 0 0 1 1 1V17l-5.5-3.3L4.5 17V4.5a1 1 0 0 1 1-1z"/></svg>`;
const ICON_CLOSE = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>`;
const ICON_MENU = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="3" y1="5.5" x2="17" y2="5.5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14.5" x2="17" y2="14.5"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg class="icon" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7.5l5.5 6 5.5-6"/></svg>`;
const ICON_PREV_TRACK = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="none"><rect x="3" y="4" width="1.6" height="12"/><path d="M16 4.5v11L7 10z"/></svg>`;
const ICON_NEXT_TRACK = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="none"><rect x="15.4" y="4" width="1.6" height="12"/><path d="M4 4.5v11l9-5.5z"/></svg>`;
const ICON_WAND = `<svg class="icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16L14.5 5.5"/><path d="M12.5 4v2M17 6.5h-2M17.5 3.5l-1.2 1.2"/><path d="M6 14l1 1"/></svg>`;
const ICON_BOOK_READ = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5.3C8.4 4.1 6.1 3.6 3.2 3.8v11.4c2.9-.2 5.2.3 6.8 1.5"/><path d="M10 5.3c1.6-1.2 3.9-1.7 6.8-1.5v11.4c-2.9-.2-5.2.3-6.8 1.5"/><line x1="10" y1="5.3" x2="10" y2="16.7"/></svg>`;

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
  root.style.setProperty('--font-size', settings.fontSize + 'rem');
  root.style.setProperty('--line-ch', settings.lineCh + 'ch');
  root.style.setProperty('--line-height', settings.lineHeight);
}

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
function getBook(id){ return BOOKS[id]; }

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
        href: `#/book/${bookId}/adhyay/${a}`,
        data: adhyay
      });
    }
  }
  return chapters;
}

/* ---------------- Router ---------------- */
function navigate(hash){ location.hash = hash; }

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => { applySettingsToDOM(); render(); });

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

  if(parts.length === 0) return renderHome(app);
  if(parts[0] === 'reformat') return renderReformat(app);

  if(parts[0] === 'book'){
    const bookId = parts[1];
    const book = getBook(bookId);
    if(!book) return renderHome(app);

    // #/book/:id
    if(parts.length === 2) return renderBookView(app, book);

    // #/book/:id/read  -> whole-book continuous/paged reader
    if(parts[2] === 'read') return renderReader(app, book, null, null);

    if(book.hasSkandh && parts[2] === 'skandh'){
      const sk = parseInt(parts[3],10);
      if(parts.length === 4) return renderSkandhView(app, book, sk);
      if(parts[4] === 'read') return renderReader(app, book, sk, null);
      if(parts[4] === 'adhyay') return renderReader(app, book, sk, `s${sk}a${parseInt(parts[5],10)}`);
    }
    if(!book.hasSkandh && parts[2] === 'adhyay'){
      return renderReader(app, book, null, `a${parseInt(parts[3],10)}`);
    }
  }
  renderHome(app);
}

/* ---------------- Views ---------------- */
function renderHome(app){
  const bookmarks = getBookmarks();
  app.innerHTML = `
    <div class="topbar"><h1>VallabhaVani</h1>
      <button class="icon-btn" id="btn-reformat" title="Reformat text">${ICON_WAND}</button>
      <button class="icon-btn" id="btn-settings" title="Settings">${ICON_SETTINGS}</button>
    </div>
    <div class="hero">
      <div class="om">🕉️</div>
      <h1>VallabhaVani</h1>
      <p>शान्ति से, अपनी गति से पढ़िए</p>
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
      ${Object.values(BOOKS).map(b => `
        <a class="book-card" href="#/book/${b.id}">
          <span class="b-title">${b.title.hi}</span>
          <span class="b-sub">${b.tagline.hi}</span>
          ${b.sample ? '<span class="b-badge">परीक्षण डेटा · sample</span>' : ''}
        </a>`).join('')}
    </div>
    <div class="foot-links">
      <a href="#/reformat">${ICON_WAND} रीड-मोड बदलें (Reformat)</a>
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

/* ---------------- Settings sheet ---------------- */
function openSettingsSheet(){
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <button class="close-x">${ICON_CLOSE}</button>
      <h2>${ICON_SETTINGS} रीडिंग सेटिंग्स</h2>

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
        <label>फॉन्ट / Font</label>
        <select id="font-family">
          <option value="deva" ${settings.fontFamily==='deva'?'selected':''}>Devanagari (Tiro / Noto)</option>
          <option value="latin-serif" ${settings.fontFamily==='latin-serif'?'selected':''}>Serif (Merriweather)</option>
          <option value="latin-sans" ${settings.fontFamily==='latin-sans'?'selected':''}>Sans (Inter)</option>
        </select>
      </div>

      <div class="setting-row">
        <label>फॉन्ट साइज़ / Font size — ${settings.fontSize.toFixed(2)}rem</label>
        <input type="range" id="font-size" min="0.9" max="2.2" step="0.05" value="${settings.fontSize}">
      </div>

      <div class="setting-row">
        <label>लाइन की चौड़ाई / Words per line — ~${Math.round(settings.lineCh/3)} words</label>
        <input type="range" id="line-ch" min="16" max="48" step="1" value="${settings.lineCh}">
      </div>

      <div class="setting-row">
        <label>भाषाएँ / Languages</label>
        <div class="opt-row">
          ${['sa','hi','en'].map(l => `<button class="chip ${settings.langs[l]?'active':''}" data-lang="${l}">${({sa:'संस्कृत',hi:'हिन्दी',en:'English'})[l]}</button>`).join('')}
        </div>
      </div>

      <div class="setting-row">
        <label>पेज डिवाइडर / Page dividers (vertical mode)</label>
        <div class="opt-row">
          <button class="chip ${settings.pageDividers?'active':''}" id="toggle-dividers">${settings.pageDividers?'चालू / On':'बंद / Off'}</button>
        </div>
      </div>

      <div class="setting-row">
        <label>टीकाएँ / Commentaries — इन्हें दिखाने के लिए "टीका मोड" चुनें (⋮ मेनू से)</label>
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

  overlay.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { settings.theme = b.dataset.theme; saveSettings(settings); close(); openSettingsSheet(); });
  const cbg = overlay.querySelector('#custom-bg'); if(cbg) cbg.oninput = () => { settings.customBg = cbg.value; saveSettings(settings); applySettingsToDOM(); };
  const ctx = overlay.querySelector('#custom-text'); if(ctx) ctx.oninput = () => { settings.customText = ctx.value; saveSettings(settings); applySettingsToDOM(); };
  overlay.querySelector('#font-family').onchange = (e) => { settings.fontFamily = e.target.value; saveSettings(settings); applySettingsToDOM(); };
  overlay.querySelector('#font-size').oninput = (e) => { settings.fontSize = parseFloat(e.target.value); saveSettings(settings); applySettingsToDOM(); };
  overlay.querySelector('#line-ch').oninput = (e) => { settings.lineCh = parseInt(e.target.value,10); saveSettings(settings); applySettingsToDOM(); };
  overlay.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => {
    const l = b.dataset.lang; settings.langs[l] = !settings.langs[l]; saveSettings(settings); close(); openSettingsSheet();
  });
  const dv = overlay.querySelector('#toggle-dividers');
  if(dv) dv.onclick = () => { settings.pageDividers = !settings.pageDividers; saveSettings(settings); close(); openSettingsSheet(); };
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
    if(url){
      status.textContent = 'लिंक से टेक्स्ट लाया जा रहा है...';
      try{
        const res = await fetch('https://r.jina.ai/' + url);
        if(!res.ok) throw new Error('fetch failed');
        text = await res.text();
        status.textContent = 'लिंक से टेक्स्ट सफलतापूर्वक लाया गया।';
      }catch(e){
        status.textContent = 'लिंक से टेक्स्ट नहीं ला सके — कृपया टेक्स्ट सीधे पेस्ट करें। (Could not fetch automatically — please paste the text instead.)';
        return;
      }
    }
    if(!text){ status.textContent = 'कृपया टेक्स्ट या लिंक दें।'; return; }
    const paras = text.split(/\n{2,}|\r?\n/).map(p=>p.trim()).filter(Boolean);
    const out = app.querySelector('#rf-output');
    out.innerHTML = `
      <div class="verse-feed no-dividers" style="padding-left:0;padding-right:0;margin-top:1rem">
        ${paras.map(p => `
          <div class="verse-card">
            <div class="verse-block lang-hi"><p>${escapeHtml(p)}</p></div>
          </div>`).join('')}
      </div>
      <button class="primary-btn" id="rf-copy">${ICON_COPY} पूरा फॉर्मेटेड टेक्स्ट कॉपी करें</button>
    `;
    out.querySelector('#rf-copy').onclick = () => copyText(paras.join('\n\n'));
  };
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
