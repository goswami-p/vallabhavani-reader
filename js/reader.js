/* VallabhaVani — unified reader engine.
   One continuous reading surface per scope (a skandh, or a whole book).
   Opening a specific chapter just starts you there — scrolling (vertical)
   or paging (horizontal) flows on into the next chapter automatically,
   same as Kotatsu's auto chapter-advance. */

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
  return `
    <div class="verse-card" data-vkey="${meta.chapterKey}-${v.num}" data-chkey="${meta.chapterKey}">
      <div class="v-num">${meta.chapterLabel ? meta.chapterLabel + ' · ' : ''}श्लोक ${v.num}</div>
      ${blocks.join('')}
      <div class="card-actions">
        <button data-copy-v="${meta.chapterKey}-${v.num}" title="Copy">📋</button>
        <button data-share-v="${meta.chapterKey}-${v.num}" title="Share">📤</button>
      </div>
    </div>`;
}

function wireVerseCardActions(app, verseIndex){
  app.querySelectorAll('[data-copy-v]').forEach(btn => {
    btn.onclick = () => {
      const v = verseIndex[btn.dataset.copyV];
      if(v) copyText(verseAsText(v, settings.langs));
    };
  });
  app.querySelectorAll('[data-share-v]').forEach(btn => {
    btn.onclick = () => {
      const v = verseIndex[btn.dataset.shareV];
      if(v) shareText(verseAsText(v, settings.langs), 'VallabhaVani');
    };
  });
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

  let pager = null, feed = null, pages = null;

  if(settings.readingMode === 'horizontal'){
    pages = [];
    chapters.forEach(ch => ch.data.verses.forEach(v => pages.push({ ch, v })));
    content.innerHTML = `<div class="verse-pager" id="pager">
      ${pages.map(p => `<div class="page">${verseCardHtml(p.v, { chapterKey: p.ch.key, chapterLabel: p.ch.label })}</div>`).join('')}
    </div>`;
    pager = document.getElementById('pager');
    const startIdx = Math.max(0, pages.findIndex(p => p.ch.key === startKey));
    pager.scrollLeft = startIdx * pager.clientWidth;
  } else {
    content.innerHTML = `<div class="verse-feed ${settings.pageDividers?'':'no-dividers'}" id="feed"></div>`;
    feed = document.getElementById('feed');
    let html = '';
    chapters.forEach(ch => {
      html += `<div class="chapter-break" data-chkey="${ch.key}">${ch.label}</div>`;
      ch.data.verses.forEach(v => { html += verseCardHtml(v, { chapterKey: ch.key, chapterLabel: '' }); });
    });
    feed.innerHTML = html;
    const startBreak = feed.querySelector(`.chapter-break[data-chkey="${startKey}"]`);
    if(startBreak) startBreak.scrollIntoView({ block: 'start' });
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
  function jumpToVerseInChapter(chKey, verseIdx, behavior){
    const ch = chapters.find(c => c.key === chKey);
    if(!ch) return;
    const v = ch.data.verses[verseIdx];
    if(!v) return;
    if(pager){
      const pIdx = pages.findIndex(p => p.ch.key === chKey && p.v.num === v.num);
      if(pIdx >= 0) pager.scrollTo({ left: pIdx * pager.clientWidth, behavior: behavior || 'auto' });
    } else if(feed){
      const card = feed.querySelector(`[data-vkey="${chKey}-${v.num}"]`);
      if(card) card.scrollIntoView({ block: 'start', behavior: behavior || 'auto' });
    }
    setCurrentChapter(chKey);
  }
  function jumpToChapterStart(chKey){
    refreshScrubForChapter(chKey);
    setScrub(0, chapters.find(c=>c.key===chKey).data.verses.length);
    jumpToVerseInChapter(chKey, 0, 'smooth');
  }
  function setScrub(idx, n){ scrubRange.value = idx; positionLabel(idx, n); }

  refreshScrubForChapter(currentKey);
  setScrub(0, chapters.find(c=>c.key===currentKey).data.verses.length);

  scrubRange.addEventListener('input', () => {
    scrubDragging = true;
    scrubLabel.classList.add('show');
    const idx = parseInt(scrubRange.value, 10);
    const n = chapters.find(c=>c.key===currentKey).data.verses.length;
    positionLabel(idx, n);
    jumpToVerseInChapter(currentKey, idx, 'auto');
  });
  const endDrag = () => { scrubDragging = false; scrubLabel.classList.remove('show'); };
  scrubRange.addEventListener('change', endDrag);
  scrubRange.addEventListener('blur', endDrag);
  scrubRange.addEventListener('touchend', endDrag);

  prevChBtn.onclick = () => { const idx = chapters.findIndex(c=>c.key===currentKey); if(idx>0) jumpToChapterStart(chapters[idx-1].key); };
  nextChBtn.onclick = () => { const idx = chapters.findIndex(c=>c.key===currentKey); if(idx>=0 && idx<chapters.length-1) jumpToChapterStart(chapters[idx+1].key); };
  chListBtn.onclick = () => openChapterListSheet(chapters, currentKey, (key) => jumpToChapterStart(key));

  /* ---- Wire live reading-position tracking back into the scrubber + header + bookmarks ---- */
  if(pager){
    function updateFromPager(){
      const idx = Math.round(pager.scrollLeft / pager.clientWidth);
      const p = pages[idx];
      if(!p) return;
      if(p.ch.key !== currentKey) refreshScrubForChapter(p.ch.key);
      setCurrentChapter(p.ch.key);
      const vIdx = p.ch.data.verses.findIndex(v => v.num === p.v.num);
      if(!scrubDragging) setScrub(vIdx, p.ch.data.verses.length);
      saveScopeBookmark(book, skandhNum, p.ch, scopeLabel);
    }
    pager.addEventListener('scroll', debounce(updateFromPager, 150));
  } else if(feed){
    const cards = feed.querySelectorAll('.verse-card');
    if(window.IntersectionObserver){
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if(e.isIntersecting){
            const chKey = e.target.dataset.chkey;
            const ch = chapters.find(c => c.key === chKey);
            if(!ch) return;
            if(chKey !== currentKey) refreshScrubForChapter(chKey);
            setCurrentChapter(chKey);
            const num = parseInt(e.target.dataset.vkey.split('-').pop(), 10);
            const vIdx = ch.data.verses.findIndex(v => v.num === num);
            if(!scrubDragging && vIdx >= 0) setScrub(vIdx, ch.data.verses.length);
            saveScopeBookmark(book, skandhNum, ch, scopeLabel);
          }
        });
      }, { threshold: 0.6 });
      cards.forEach(c => io.observe(c));
    }
  }

  window.__vvRenderReader = () => renderReader(app, book, skandhNum, currentKey);
}

function openChapterListSheet(chapters, currentKey, onPick){
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <button class="close-x">✕</button>
      <h2>☰ अध्याय सूची / Chapters</h2>
      ${chapters.map(c => `<button class="chlist-item ${c.key===currentKey?'current':''}" data-key="${c.key}">${c.label}</button>`).join('')}
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.remove(); });
  overlay.querySelector('.close-x').onclick = () => overlay.remove();
  overlay.querySelectorAll('[data-key]').forEach(b => b.onclick = () => { overlay.remove(); onPick(b.dataset.key); });
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
