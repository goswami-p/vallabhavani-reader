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
  readingMode: 'vertical',   // vertical | horizontal  (used in skandh/book scope)
  pageDividers: true
};

function loadSettings(){
  try{
    const raw = localStorage.getItem('vv_settings');
    if(!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw), langs: { ...DEFAULT_SETTINGS.langs, ...(JSON.parse(raw).langs||{}) } };
  }catch(e){ return { ...DEFAULT_SETTINGS }; }
}
function saveSettings(s){ localStorage.setItem('vv_settings', JSON.stringify(s)); }

let settings = loadSettings();

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
      <button class="icon-btn" id="btn-reformat" title="Reformat text">🪄</button>
      <button class="icon-btn" id="btn-settings" title="Settings">⚙️</button>
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
            <button data-rm="${b.key}">✕</button>
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
      <a href="#/reformat">🪄 रीड-मोड बदलें (Reformat)</a>
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
      <button class="back-btn" id="btn-back">←</button>
      <h1>${book.title.hi}</h1>
      <button class="icon-btn" id="btn-settings">⚙️</button>
    </div>
    <div class="grid-view">
      <div class="tile-grid">
        ${items.map(it => `
          <a class="tile ${it.locked?'locked':''}" href="${it.href}">
            <span class="n">${it.n}</span>
            <span class="t">${it.sub}</span>
          </a>`).join('')}
      </div>
      <button class="read-all-btn" id="btn-read-all">📖 पूरी पुस्तक पढ़ें / Read whole book</button>
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
      <button class="back-btn" id="btn-back">←</button>
      <h1>${book.skandhTitles.hi[skandhNum-1]}</h1>
      <button class="icon-btn" id="btn-settings">⚙️</button>
    </div>
    <div class="grid-view">
      <div class="tile-grid">
        ${items.map(it => `
          <a class="tile ${it.locked?'locked':''}" href="${it.href}">
            <span class="n">${it.n}</span><span class="t">${it.sub}</span>
          </a>`).join('')}
      </div>
      <button class="read-all-btn" id="btn-read-all">📖 पूरा स्कन्ध पढ़ें / Read whole skandh</button>
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
      <button class="close-x">✕</button>
      <h2>⚙️ रीडिंग सेटिंग्स</h2>

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
}
function refreshReaderIfOpen(){ if(window.__vvRenderReader) window.__vvRenderReader(); else render(); }

/* ---------------- Reformat tool ---------------- */
function renderReformat(app){
  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="btn-back">←</button>
      <h1>🪄 आसान पढ़ने का रूप</h1>
      <button class="icon-btn" id="btn-settings">⚙️</button>
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
      <button class="primary-btn" id="rf-copy">📋 पूरा फॉर्मेटेड टेक्स्ट कॉपी करें</button>
    `;
    out.querySelector('#rf-copy').onclick = () => copyText(paras.join('\n\n'));
  };
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
