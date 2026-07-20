/* VallabhaVani — unified reader engine.
   One continuous reading surface per scope (a skandh, or a whole book).
   Opening a specific chapter just starts you there — scrolling (vertical)
   or paging (horizontal) flows on into the next chapter automatically,
   same as Kotatsu's auto chapter-advance.

   Two independent axes:
   - readingMode: vertical (continuous scroll) | horizontal (real paginated book pages)
   - contentMode: default (mula+anuvad cards) | tika (+ selected commentaries) | flow (translation-only, story-style)
   Horizontal/book mode always renders as flowing text (never fixed 1-verse-per-page
   cards) so page boundaries are real and adapt to how much content is on screen. */

const CONTENT_MODES = [
  { key: 'default', label: 'मूल + अनुवाद', sub: 'Default' },
  { key: 'tika', label: '📘 टीका मोड', sub: 'चुनी हुई टीकाएँ भी दिखेंगी' },
  { key: 'flow', label: '🌊 प्रवाह मोड', sub: 'केवल अनुवाद — कथा की तरह पढ़ें' }
];

/* ---------------- Card rendering (vertical + default/tika) ---------------- */
function verseCardHtml(v, meta){
  const langs = settings.langs;
  const blocks = [];
  if(v.speaker){
    const sp = (langs.sa && v.speaker.sa) || (langs.hi && v.speaker.hi) || v.speaker.hi || v.speaker.en;
    if(sp) blocks.push(`<div class="v-speaker">${sp}</div>`);
  }
  if(langs.sa && v.sa) blocks.push(`<div class="verse-block lang-sa"><p>${v.sa.replace(/\n/g,'<br>')}</p></div>`);
  if(langs.hi && v.hi) blocks.push(`<div class="verse-block lang-hi"><p>${v.hi.replace(/\n/g,'<br>')}</p></div>`);
  if(langs.en && v.en) blocks.push(`<div class="verse-block lang-en"><p>${v.en.replace(/\n/g,'<br>')}</p></div>`);

  let html = `
    <div class="verse-card" data-vkey="${meta.chapterKey}-${v.num}" data-chkey="${meta.chapterKey}">
      <div class="v-num">${meta.chapterLabel ? meta.chapterLabel + ' · ' : ''}श्लोक ${v.num}</div>
      ${blocks.join('')}
      <div class="card-actions">
        <button data-copy-v="${meta.chapterKey}-${v.num}" title="Copy">📋</button>
        <button data-share-v="${meta.chapterKey}-${v.num}" title="Share">📤</button>
      </div>
    </div>`;

  if(settings.contentMode === 'tika' && v.tikas){
    TIKA_DEFS.filter(t => t.available && settings.tikas[t.key]).forEach(t => {
      const txt = v.tikas[t.key];
      if(!txt) return;
      html += `
        <div class="tika-card" data-vkey="${meta.chapterKey}-${v.num}-${t.key}" data-chkey="${meta.chapterKey}">
          <div class="tika-title">📘 ${t.label} <span style="font-weight:400;color:var(--ink-soft)">· ${t.sub}</span></div>
          <div class="verse-block lang-sa"><p>${txt.replace(/\n/g,'<br>')}</p></div>
          <div class="card-actions">
            <button data-copy-tika="${meta.chapterKey}-${v.num}-${t.key}" title="Copy">📋</button>
            <button data-share-tika="${meta.chapterKey}-${v.num}-${t.key}" title="Share">📤</button>
          </div>
        </div>`;
    });
  }
  return html;
}

function wireVerseCardActions(app, verseIndex){
  app.querySelectorAll('[data-copy-v]').forEach(btn => {
    btn.onclick = () => { const v = verseIndex[btn.dataset.copyV]; if(v) copyText(verseAsText(v, settings.langs)); };
  });
  app.querySelectorAll('[data-share-v]').forEach(btn => {
    btn.onclick = () => { const v = verseIndex[btn.dataset.shareV]; if(v) shareText(verseAsText(v, settings.langs), 'VallabhaVani'); };
  });
  app.querySelectorAll('[data-copy-tika]').forEach(btn => {
    btn.onclick = () => {
      const [chKey, vnum, tKey] = btn.dataset.copyTika.split('-').length === 3 ? btn.dataset.copyTika.split('-') : parseTikaKey(btn.dataset.copyTika);
      const v = verseIndex[`${chKey}-${vnum}`];
      const t = TIKA_DEFS.find(x => x.key === tKey);
      if(v && t && v.tikas && v.tikas[tKey]) copyText(`${t.label} — श्लोक ${vnum}\n\n${v.tikas[tKey]}`);
    };
  });
  app.querySelectorAll('[data-share-tika]').forEach(btn => {
    btn.onclick = () => {
      const [chKey, vnum, tKey] = parseTikaKey(btn.dataset.shareTika);
      const v = verseIndex[`${chKey}-${vnum}`];
      const t = TIKA_DEFS.find(x => x.key === tKey);
      if(v && t && v.tikas && v.tikas[tKey]) shareText(`${t.label} — श्लोक ${vnum}\n\n${v.tikas[tKey]}`, t.label);
    };
  });
}
function parseTikaKey(s){
  // chapterKey itself may contain hyphens/letters+digits (e.g. "s1a2" or "a1") — tika key and vnum are always the last two segments
  const parts = s.split('-');
  const tKey = parts.pop();
  const vnum = parts.pop();
  return [parts.join('-'), vnum, tKey];
}

/* ---------------- Flowing (non-card) verse rendering — used by flow mode and book/page mode ---------------- */
function verseFlowHtml(v, meta){
  const langs = settings.langs;
  const mode = settings.contentMode;
  const parts = [];
  const vnumTag = `<sup class="flow-vnum">${meta.chapterLabel ? meta.chapterLabel + ' ' : ''}${v.num}</sup>`;

  if(mode === 'flow'){
    const txt = (langs.hi && v.hi) || v.hi || (langs.en && v.en) || v.en || '';
    parts.push(`${vnumTag} ${txt}`);
  } else {
    if(v.speaker){
      const sp = (langs.sa && v.speaker.sa) || (langs.hi && v.speaker.hi) || v.speaker.hi || v.speaker.en;
      if(sp) parts.push(`<em class="flow-speaker">${sp}</em> `);
    }
    if(langs.sa && v.sa) parts.push(`${vnumTag} <span class="flow-sa">${v.sa.replace(/\n/g,' ')}</span> `);
    else parts.push(vnumTag + ' ');
    if(langs.hi && v.hi) parts.push(`<span class="flow-hi">${v.hi}</span> `);
    if(langs.en && v.en) parts.push(`<span class="flow-en">${v.en}</span> `);
    if(mode === 'tika' && v.tikas){
      TIKA_DEFS.filter(t => t.available && settings.tikas[t.key]).forEach(t => {
        const txt = v.tikas[t.key];
        if(txt) parts.push(`<span class="flow-tika"><b class="flow-tika-label">📘 ${t.label}:</b> ${txt.replace(/\n/g,' ')}</span> `);
      });
    }
  }
  return `<p class="flow-p" data-chkey="${meta.chapterKey}" data-vnum="${v.num}">${parts.join('')}</p>`;
}

function buildFlowHtml(chapters){
  let html = '';
  chapters.forEach(ch => {
    html += `<h2 class="chapter-break" data-chkey="${ch.key}">${ch.label}</h2>`;
    ch.data.verses.forEach(v => { html += verseFlowHtml(v, { chapterKey: ch.key, chapterLabel: '' }); });
  });
  return html;
}

/* ---- Unified reader: a scope (skandh or whole book), optionally starting at one chapter ---- */
function renderReader(app, book, skandhNum, startChapterKey){
  const allChapters = buildScope(book.id, skandhNum);
  const chapters = allChapters.filter(c => c.data && c.data.verses && c.data.verses.length);
  const scopeLabel = skandhNum ? book.skandhTitles.hi[skandhNum-1] : book.title.hi;
  const backHref = skandhNum ? `#/book/${book.id}/skandh/${skandhNum}` : `#/book/${book.id}`;

  let startKey = startChapterKey && chapters.find(c => c.key === startChapterKey) ? startChapterKey : (chapters[0] && chapters[0].key);
  if(startChapterKey && startKey !== startChapterKey){
    toast('यह अध्याय अभी खाली है — उपलब्ध सामग्री दिखा रहे हैं / This chapter is empty — showing available content');
  }
  const modeInfo = CONTENT_MODES.find(m => m.key === settings.contentMode) || CONTENT_MODES[0];

  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="btn-back">←</button>
      <h1 id="reader-title">${scopeLabel}</h1>
      <button class="icon-btn" id="btn-copy-all" title="Copy chapter">📋</button>
      <button class="icon-btn" id="btn-share-all" title="Share chapter">📤</button>
      <button class="icon-btn" id="btn-bookmark" title="Bookmark">🔖</button>
      <button class="icon-btn" id="btn-settings">⚙️</button>
    </div>
    <div class="reader-toolbar">
      <div class="mode-toggle" id="mode-toggle">
        <button data-mode="vertical" class="${settings.readingMode==='vertical'?'active':''}">⬇️ वर्टिकल स्क्रोल</button>
        <button data-mode="horizontal" class="${settings.readingMode==='horizontal'?'active':''}">📖 बुक मोड (पेज पलटें)</button>
      </div>
      <span class="chip active" style="pointer-events:none">${modeInfo.label}</span>
    </div>
    <div id="reader-root"></div>
  `;

  const titleEl = app.querySelector('#reader-title');
  app.querySelector('#btn-back').onclick = () => navigate(backHref);
  app.querySelector('#btn-settings').onclick = () => openSettingsSheet();

  let currentKey = startKey;
  function currentChapter(){ return chapters.find(c => c.key === currentKey); }
  function setCurrentChapter(key){
    if(!key || key === currentKey) return;
    currentKey = key;
    const ch = currentChapter();
    if(ch) titleEl.textContent = ch.label;
  }

  app.querySelector('#btn-bookmark').onclick = () => {
    const ch = currentChapter();
    if(!ch) return;
    const bmKey = skandhNum ? `${book.id}-s${skandhNum}-${ch.key}` : `${book.id}-${ch.key}`;
    saveBookmark({ key: bmKey, label: ch.label, href: ch.href });
  };
  app.querySelector('#btn-copy-all').onclick = () => {
    const ch = currentChapter();
    if(ch) copyText(chapterAsText(ch.data.title, ch.data.verses, settings.langs));
  };
  app.querySelector('#btn-share-all').onclick = () => {
    const ch = currentChapter();
    if(ch) shareText(chapterAsText(ch.data.title, ch.data.verses, settings.langs), ch.label);
  };

  app.querySelector('#mode-toggle').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
    settings.readingMode = b.dataset.mode; saveSettings(settings);
    renderReader(app, book, skandhNum, currentKey); // keep reading position across mode switch
  });

  const root = document.getElementById('reader-root');

  if(!chapters.length){
    root.innerHTML = `<div class="empty-note">अभी तक कोई सामग्री उपलब्ध नहीं है।<br>No content available yet in this section.</div>`;
    app.querySelector('#btn-copy-all').style.display = 'none';
    app.querySelector('#btn-share-all').style.display = 'none';
    app.querySelector('#btn-bookmark').style.display = 'none';
    return;
  }
  titleEl.textContent = currentChapter().label;

  const verseIndex = {};
  chapters.forEach(ch => ch.data.verses.forEach(v => verseIndex[`${ch.key}-${v.num}`] = v));

  root.innerHTML = `
    <div id="reader-content"></div>
    ${settings.readingMode === 'vertical' ? `
    <button class="next-verse-fab" id="nextVerseFab" title="अगला श्लोक — टैप करें">
      <span class="nv-arrow">⌄</span>
      <span class="nv-ref" id="nvRef">…</span>
    </button>` : ''}
    <div class="scrub-bar" id="scrubBar">
      <button class="nav-btn" id="prevChBtn" title="Previous chapter">⏮</button>
      <div class="scrub-track-wrap">
        <div class="scrub-label" id="scrubLabel">1</div>
        <input type="range" class="scrub-range" id="scrubRange" min="0" max="0" value="0" step="1">
        <div class="scrub-dots" id="scrubDots"></div>
      </div>
      <button class="nav-btn" id="nextChBtn" title="Next chapter">⏭</button>
      <button class="chlist-btn" id="chListBtn" title="Chapter list">☰</button>
    </div>
  `;
  const content = document.getElementById('reader-content');
  const nextVerseFab = document.getElementById('nextVerseFab');
  const nvRef = document.getElementById('nvRef');

  // jumpTo(chKey, verseIdx, behavior) and an onScrollPosition callback get set by whichever branch runs below
  let jumpTo = () => {};
  let bookFlow = null, pager = null, feed = null;

  if(settings.readingMode === 'horizontal'){
    /* ---- Book mode: real paginated pages via CSS multi-column reflow.
       Page count adapts to how much content is on screen (mode-dependent),
       not fixed at one verse per page. ---- */
    content.innerHTML = `
      <div class="book-flow-wrap" id="bookFlowWrap">
        <div class="book-flow" id="bookFlow">${buildFlowHtml(chapters)}</div>
        <div class="book-tap-zone left" id="tapPrev"></div>
        <div class="book-tap-zone right" id="tapNext"></div>
      </div>`;
    bookFlow = document.getElementById('bookFlow');
    const wrap = document.getElementById('bookFlowWrap');

    function pageWidth(){ return wrap.clientWidth; }
    function goToPageIndex(idx, behavior){
      bookFlow.scrollTo({ left: Math.max(0, idx) * pageWidth(), behavior: behavior || 'auto' });
    }
    document.getElementById('tapPrev').onclick = () => goToPageIndex(Math.round(bookFlow.scrollLeft/pageWidth()) - 1, 'smooth');
    document.getElementById('tapNext').onclick = () => goToPageIndex(Math.round(bookFlow.scrollLeft/pageWidth()) + 1, 'smooth');

    jumpTo = (chKey, verseIdx, behavior) => {
      const ch = chapters.find(c => c.key === chKey);
      const v = ch && ch.data.verses[verseIdx];
      if(!v) return;
      const p = bookFlow.querySelector(`.flow-p[data-chkey="${chKey}"][data-vnum="${v.num}"]`);
      if(p) goToPageIndex(Math.round(p.offsetLeft / pageWidth()), behavior);
      setCurrentChapter(chKey);
    };

    let snapTimer;
    bookFlow.addEventListener('scroll', () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const idx = Math.round(bookFlow.scrollLeft / pageWidth());
        goToPageIndex(idx, 'smooth');
        updatePositionFromBookFlow();
      }, 120);
    });
    function updatePositionFromBookFlow(){
      const targetLeft = bookFlow.scrollLeft;
      const paras = bookFlow.querySelectorAll('.flow-p');
      let best = null;
      for(const p of paras){ if(p.offsetLeft <= targetLeft + 4) best = p; else break; }
      if(!best && paras.length) best = paras[0];
      if(best) onPositionChange(best.dataset.chkey, parseInt(best.dataset.vnum,10));
    }
    // expose for initial jump + scrubber sync
    jumpTo.__updateFromScroll = updatePositionFromBookFlow;

  } else if(settings.contentMode === 'flow'){
    /* ---- Vertical + flow mode: continuous "read like a story" scroll, no cards ---- */
    content.innerHTML = `<div class="flow-feed" id="flowFeed">${buildFlowHtml(chapters)}</div>`;
    feed = document.getElementById('flowFeed');
    jumpTo = (chKey, verseIdx, behavior) => {
      const ch = chapters.find(c => c.key === chKey);
      const v = ch && ch.data.verses[verseIdx];
      if(!v) return;
      const p = feed.querySelector(`.flow-p[data-chkey="${chKey}"][data-vnum="${v.num}"]`);
      if(p) p.scrollIntoView({ block: 'start', behavior: behavior || 'auto' });
      setCurrentChapter(chKey);
    };
    const startP = feed.querySelector(`.flow-p[data-chkey="${startKey}"]`);
    if(startP) startP.scrollIntoView({ block: 'start' });
    if(window.IntersectionObserver){
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if(e.isIntersecting) onPositionChange(e.target.dataset.chkey, parseInt(e.target.dataset.vnum,10)); });
      }, { rootMargin: '0px 0px -75% 0px', threshold: 0 }); // scrollspy-style: "current" = topmost item that has crossed into the top 25% of the viewport. Plain 60%-visible-area threshold falsely flags multiple short verses as simultaneously "current" on tall phone screens.
      feed.querySelectorAll('.flow-p').forEach(p => io.observe(p));
    }

  } else {
    /* ---- Vertical + default/tika mode: card feed ---- */
    content.innerHTML = `<div class="verse-feed ${settings.pageDividers?'':'no-dividers'}" id="feed"></div>`;
    feed = document.getElementById('feed');
    let html = '';
    chapters.forEach(ch => {
      html += `<div class="chapter-break" data-chkey="${ch.key}">${ch.label}</div>`;
      ch.data.verses.forEach(v => { html += verseCardHtml(v, { chapterKey: ch.key, chapterLabel: '' }); });
    });
    feed.innerHTML = html;
    jumpTo = (chKey, verseIdx, behavior) => {
      const ch = chapters.find(c => c.key === chKey);
      const v = ch && ch.data.verses[verseIdx];
      if(!v) return;
      const card = feed.querySelector(`[data-vkey="${chKey}-${v.num}"]`);
      if(card) card.scrollIntoView({ block: 'start', behavior: behavior || 'auto' });
      setCurrentChapter(chKey);
    };
    const startBreak = feed.querySelector(`.chapter-break[data-chkey="${startKey}"]`);
    if(startBreak) startBreak.scrollIntoView({ block: 'start' });
    if(window.IntersectionObserver){
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if(e.isIntersecting){
            const num = parseInt(e.target.dataset.vkey.split('-')[1], 10);
            onPositionChange(e.target.dataset.chkey, num);
          }
        });
      }, { rootMargin: '0px 0px -75% 0px', threshold: 0 }); // scrollspy-style: "current" = topmost item that has crossed into the top 25% of the viewport. Plain 60%-visible-area threshold falsely flags multiple short verses as simultaneously "current" on tall phone screens.
      feed.querySelectorAll('.verse-card').forEach(c => io.observe(c));
    }
  }
  wireVerseCardActions(app, verseIndex);

  /* ---- Position scrubber: chapter-relative, two-way synced with reading position ---- */
  const scrubRange = document.getElementById('scrubRange');
  const scrubLabel = document.getElementById('scrubLabel');
  const scrubDots = document.getElementById('scrubDots');
  const prevChBtn = document.getElementById('prevChBtn');
  const nextChBtn = document.getElementById('nextChBtn');
  const chListBtn = document.getElementById('chListBtn');
  let scrubDragging = false;

  function positionLabel(idx, n){
    scrubLabel.textContent = (idx+1) + ' / ' + n;
    const pct = n <= 1 ? 0 : (idx/(n-1))*100;
    scrubLabel.style.left = pct + '%';
  }
  function refreshScrubForChapter(key){
    const ch = chapters.find(c => c.key === key);
    const n = ch ? ch.data.verses.length : 0;
    scrubRange.max = Math.max(0, n-1);
    const dotCount = Math.min(n, 16);
    scrubDots.innerHTML = Array.from({length: dotCount}, () => '<span></span>').join('');
    const idx = chapters.findIndex(c => c.key === key);
    prevChBtn.disabled = idx <= 0;
    nextChBtn.disabled = idx < 0 || idx >= chapters.length - 1;
  }
  function setScrub(idx, n){ scrubRange.value = idx; positionLabel(idx, n); }
  function jumpToChapterStart(chKey){
    refreshScrubForChapter(chKey);
    setScrub(0, chapters.find(c=>c.key===chKey).data.verses.length);
    jumpTo(chKey, 0, 'smooth');
  }
  function onPositionChange(chKey, vnum){
    const ch = chapters.find(c => c.key === chKey);
    if(!ch) return;
    if(chKey !== currentKey) refreshScrubForChapter(chKey);
    setCurrentChapter(chKey);
    const vIdx = ch.data.verses.findIndex(v => v.num === vnum);
    if(!scrubDragging && vIdx >= 0) setScrub(vIdx, ch.data.verses.length);
    if(nvRef) nvRef.textContent = verseRefLabel(book, chKey, vnum);
    saveScopeBookmark(book, skandhNum, ch, scopeLabel);
  }

  refreshScrubForChapter(currentKey);
  setScrub(0, chapters.find(c=>c.key===currentKey).data.verses.length);
  jumpTo(currentKey, 0, 'auto'); // ensure initial scroll/page position lands exactly on startKey (needed for book mode's layout-dependent offsets)
  if(nvRef){
    const firstV = chapters.find(c=>c.key===currentKey).data.verses[0];
    if(firstV) nvRef.textContent = verseRefLabel(book, currentKey, firstV.num);
  }
  if(nextVerseFab){
    nextVerseFab.onclick = () => {
      const ch = currentChapter();
      const idx = parseInt(scrubRange.value, 10);
      if(idx + 1 < ch.data.verses.length){ jumpTo(currentKey, idx + 1, 'smooth'); }
      else {
        const chIdx = chapters.findIndex(c => c.key === currentKey);
        if(chIdx >= 0 && chIdx < chapters.length - 1) jumpToChapterStart(chapters[chIdx+1].key);
      }
    };
  }

  scrubRange.addEventListener('input', () => {
    scrubDragging = true;
    scrubLabel.classList.add('show');
    const idx = parseInt(scrubRange.value, 10);
    const n = chapters.find(c=>c.key===currentKey).data.verses.length;
    positionLabel(idx, n);
    jumpTo(currentKey, idx, 'auto');
  });
  const endDrag = () => { scrubDragging = false; scrubLabel.classList.remove('show'); };
  scrubRange.addEventListener('change', endDrag);
  scrubRange.addEventListener('blur', endDrag);
  scrubRange.addEventListener('touchend', endDrag);

  prevChBtn.onclick = () => { const idx = chapters.findIndex(c=>c.key===currentKey); if(idx>0) jumpToChapterStart(chapters[idx-1].key); };
  nextChBtn.onclick = () => { const idx = chapters.findIndex(c=>c.key===currentKey); if(idx>=0 && idx<chapters.length-1) jumpToChapterStart(chapters[idx+1].key); };
  chListBtn.onclick = () => openChapterListSheet(app, book, skandhNum, chapters, currentKey, (key) => jumpToChapterStart(key));

  window.__vvRenderReader = () => renderReader(app, book, skandhNum, currentKey);
}

function openChapterListSheet(app, book, skandhNum, chapters, currentKey, onPick){
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <button class="close-x">✕</button>
      <h2>☰ पढ़ने का तरीका / Chapters</h2>
      <div class="setting-row">
        <label>कंटेंट मोड / Content mode</label>
        <div class="mode-tabs">
          ${CONTENT_MODES.map(m => `<button class="mode-tab ${settings.contentMode===m.key?'active':''}" data-m="${m.key}">${m.label}<span class="m-sub">${m.sub}</span></button>`).join('')}
        </div>
      </div>
      <div class="setting-row">
        <label>अध्याय सूची / Chapters</label>
        ${chapters.map(c => `<button class="chlist-item ${c.key===currentKey?'current':''}" data-key="${c.key}">${c.label}</button>`).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.remove(); });
  overlay.querySelector('.close-x').onclick = () => overlay.remove();
  overlay.querySelectorAll('[data-key]').forEach(b => b.onclick = () => { overlay.remove(); onPick(b.dataset.key); });
  overlay.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    settings.contentMode = b.dataset.m; saveSettings(settings);
    overlay.remove();
    renderReader(app, book, skandhNum, currentKey);
  });
}

function verseRefLabel(book, chapterKey, verseNum){
  const skandhAdhyay = chapterKey.match(/^s(\d+)a(\d+)$/);
  if(skandhAdhyay) return `${skandhAdhyay[1]}.${skandhAdhyay[2]}.${verseNum}`;
  const adhyayOnly = chapterKey.match(/^a(\d+)$/);
  if(adhyayOnly) return `${adhyayOnly[1]}.${verseNum}`;
  return `${verseNum}`;
}

function saveScopeBookmark(book, skandhNum, chapter, scopeLabel){
  if(!chapter) return;
  const key = `${book.id}-scope-${skandhNum||'all'}`;
  const list = getBookmarks().filter(b => b.key !== key);
  list.unshift({ key, label: `${scopeLabel} · ${chapter.label}`, href: chapter.href, ts: Date.now() });
  localStorage.setItem('vv_bookmarks', JSON.stringify(list.slice(0,30)));
}

function debounce(fn, ms){
  let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}
