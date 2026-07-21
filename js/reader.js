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
  { key: 'tika', label: 'टीका मोड', sub: 'चुनी हुई टीकाएँ भी दिखेंगी' },
  { key: 'flow', label: 'प्रवाह मोड', sub: 'केवल अनुवाद — कथा की तरह पढ़ें' }
];

const CONTENT_MODE_ICONS = { default: '', tika: ICON_TIKA, flow: ICON_FLOW };

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
        <button data-copy-v="${meta.chapterKey}-${v.num}" title="Copy">${ICON_COPY}</button>
        <button data-share-v="${meta.chapterKey}-${v.num}" title="Share">${ICON_SHARE}</button>
      </div>
    </div>`;

  if(settings.contentMode === 'tika' && v.tikas){
    TIKA_DEFS.filter(t => t.available && settings.tikas[t.key]).forEach(t => {
      const txt = v.tikas[t.key];
      if(!txt) return;
      html += `
        <div class="tika-card" data-vkey="${meta.chapterKey}-${v.num}-${t.key}" data-chkey="${meta.chapterKey}">
          <div class="tika-title">${ICON_TIKA} ${t.label} <span style="font-weight:400;color:var(--ink-soft)">· ${t.sub}</span></div>
          <div class="verse-block lang-sa"><p>${txt.replace(/\n/g,'<br>')}</p></div>
          <div class="card-actions">
            <button data-copy-tika="${meta.chapterKey}-${v.num}-${t.key}" title="Copy">${ICON_COPY}</button>
            <button data-share-tika="${meta.chapterKey}-${v.num}-${t.key}" title="Share">${ICON_SHARE}</button>
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
        if(txt) parts.push(`<span class="flow-tika"><b class="flow-tika-label">${ICON_TIKA} ${t.label}:</b> ${txt.replace(/\n/g,' ')}</span> `);
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

/* ---------------- Paginated mode: fixed page boundaries ----------------
   A page's boundary is decided once, from a reference font size — not
   recalculated every time the reader picks a bigger/smaller reading font.
   If a page's content overflows the viewport at the reader's actual font
   size, they just scroll within that page normally (like scrolling a
   single long post); only once they reach the page's real, pre-decided
   end do they get a page turn. This mirrors how a real PDF/EPUB reflow
   engine keeps page breaks tied to content, not to whatever happens to
   fit on screen at the moment. */
const PAGINATION_REF = { fontSize: 1.15, lineHeight: 1.95, lineCh: 30 };

function buildPageBlocks(chapters){
  const blocks = [];
  chapters.forEach(ch => {
    blocks.push({ chKey: ch.key, vnum: null, html: `<h2 class="chapter-break" data-chkey="${ch.key}">${ch.label}</h2>` });
    ch.data.verses.forEach(v => {
      blocks.push({ chKey: ch.key, vnum: v.num, html: verseFlowHtml(v, { chapterKey: ch.key, chapterLabel: '' }) });
    });
  });
  return blocks;
}

function computePages(blocks, containerWidth, containerHeight){
  const measure = document.createElement('div');
  measure.className = 'page-content';
  measure.style.cssText = `position:absolute; left:-9999px; top:0; width:${containerWidth}px; visibility:hidden;`;
  measure.style.setProperty('--font-size', PAGINATION_REF.fontSize + 'rem');
  measure.style.setProperty('--line-height', PAGINATION_REF.lineHeight);
  measure.style.setProperty('--line-ch', PAGINATION_REF.lineCh + 'ch');
  document.body.appendChild(measure);

  const els = blocks.map(b => {
    const wrap = document.createElement('div');
    wrap.innerHTML = b.html;
    const el = wrap.firstElementChild;
    measure.appendChild(el);
    return el;
  });

  const pages = [];
  let pageStart = 0;
  let pageStartTop = els.length ? els[0].offsetTop : 0;
  for(let i = 0; i < els.length; i++){
    const bottom = els[i].offsetTop + els[i].offsetHeight - pageStartTop;
    if(bottom > containerHeight && i > pageStart){
      pages.push({ start: pageStart, end: i });
      pageStart = i;
      pageStartTop = els[i].offsetTop;
    }
  }
  pages.push({ start: pageStart, end: els.length || 0 });

  document.body.removeChild(measure);
  return pages;
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
      <button class="back-btn" id="btn-back">${ICON_CHEVRON_LEFT}</button>
      <h1 id="reader-title">${scopeLabel}</h1>
      <button class="icon-btn" id="btn-copy-all" title="Copy chapter">${ICON_COPY}</button>
      <button class="icon-btn" id="btn-share-all" title="Share chapter">${ICON_SHARE}</button>
      <button class="icon-btn" id="btn-bookmark" title="Bookmark">${ICON_BOOKMARK}</button>
      <button class="icon-btn" id="btn-settings">${ICON_SETTINGS}</button>
    </div>
    <div class="reader-toolbar">
      <div class="mode-toggle" id="mode-toggle">
        <button data-mode="scroll" class="${settings.readingMode==='scroll'?'active':''}">${ICON_SCROLL} स्क्रॉल</button>
        <button data-mode="paginated" class="${settings.readingMode==='paginated'?'active':''}">${ICON_PAGES} पेज</button>
      </div>
      ${settings.readingMode === 'paginated' ? `
      <label class="vswitch" id="vertScrollSwitch" title="Vertical Scrolling">
        <input type="checkbox" id="vertScrollToggle" ${settings.paginatedVertical ? 'checked' : ''}>
        <span class="vswitch-track"><span class="vswitch-thumb"></span></span>
        <span class="vswitch-label">वर्टिकल स्क्रॉलिंग</span>
      </label>` : ''}
      <span class="chip active" style="pointer-events:none">${CONTENT_MODE_ICONS[settings.contentMode] || ''} ${modeInfo.label}</span>
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
  const vertScrollToggle = app.querySelector('#vertScrollToggle');
  if(vertScrollToggle) vertScrollToggle.onchange = () => {
    settings.paginatedVertical = vertScrollToggle.checked; saveSettings(settings);
    renderReader(app, book, skandhNum, currentKey);
  };

  const toolbarEl = app.querySelector('.reader-toolbar');
  if(toolbarEl) toolbarEl.classList.add('show');

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

  const showVScroll = settings.readingMode === 'scroll' || (settings.readingMode === 'paginated' && settings.paginatedVertical);
  root.innerHTML = `
    <div id="reader-content"></div>
    ${showVScroll ? `
    <button class="next-verse-fab" id="nextVerseFab" title="अगला श्लोक — टैप करें">
      <span class="nv-arrow">${ICON_CHEVRON_DOWN}</span>
      <span class="nv-ref" id="nvRef">…</span>
    </button>
    <div class="vscroll-track" id="vscrollTrack">
      <div class="vscroll-label" id="vscrollLabel"></div>
      <div class="vscroll-thumb" id="vscrollThumb"></div>
    </div>` : ''}
    <div class="scrub-bar" id="scrubBar">
      <button class="nav-btn" id="prevChBtn" title="Previous chapter">${ICON_PREV_TRACK}</button>
      <div class="scrub-track-wrap">
        <div class="scrub-label" id="scrubLabel">1</div>
        <input type="range" class="scrub-range" id="scrubRange" min="0" max="0" value="0" step="1">
        <div class="scrub-dots" id="scrubDots"></div>
      </div>
      <button class="nav-btn" id="nextChBtn" title="Next chapter">${ICON_NEXT_TRACK}</button>
      <button class="chlist-btn" id="chListBtn" title="Chapter list">${ICON_MENU}</button>
    </div>
  `;
  const content = document.getElementById('reader-content');
  const nextVerseFab = document.getElementById('nextVerseFab');
  const nvRef = document.getElementById('nvRef');
  const vscrollTrack = document.getElementById('vscrollTrack');
  const vscrollThumb = document.getElementById('vscrollThumb');
  const vscrollLabel = document.getElementById('vscrollLabel');

  // jumpTo(chKey, verseIdx, behavior) and an onScrollPosition callback get set by whichever branch runs below
  let jumpTo = () => {};
  let pager = null, feed = null;

  if(settings.readingMode === 'paginated'){
    const blocks = buildPageBlocks(chapters);
    const topbarH = (document.querySelector('.topbar') || {}).offsetHeight || 57;
    const scrubH = (document.getElementById('scrubBar') || {}).offsetHeight || 64;
    const pageH = Math.max(200, window.innerHeight - topbarH - scrubH - 16);
    const pages = computePages(blocks, content.clientWidth, pageH);
    pager = { blocks, pages };

    function pageIndexForVerse(chKey, vnum){
      const bi = blocks.findIndex(b => b.chKey === chKey && b.vnum === vnum);
      const pi = bi < 0 ? 0 : pages.findIndex(p => bi >= p.start && bi < p.end);
      return pi < 0 ? 0 : pi;
    }
    function pageHtml(pi){
      const p = pages[pi]; if(!p) return '';
      return blocks.slice(p.start, p.end).map(b => b.html).join('');
    }
    function firstVerseOfPage(pi){
      const p = pages[pi]; if(!p) return null;
      for(let i = p.start; i < p.end; i++){ if(blocks[i].vnum != null) return blocks[i]; }
      return null;
    }

    let currentPage = 0;

    if(settings.paginatedVertical){
      /* ---- Paginated + vertical: pages stacked in one scrollable column.
         Each page gets a min-height of one screen so a short page still
         occupies a full slot (visible boundary) — scrolling past its
         bottom carries you straight into the next page's top, PocketBook
         "Vertical Scrolling ON" style. ---- */
      content.innerHTML = `<div class="page-stack" id="pageStack" style="--page-min-h:${pageH}px">${
        pages.map((p, pi) => `<div class="page-slot" data-page="${pi}">${pageHtml(pi)}</div>`).join('')
      }</div>`;
      const stack = document.getElementById('pageStack');
      jumpTo = (chKey, verseIdx, behavior) => {
        const ch = chapters.find(c => c.key === chKey);
        const v = ch && ch.data.verses[verseIdx];
        if(!v) return;
        const pi = pageIndexForVerse(chKey, v.num);
        const slot = stack.querySelector(`.page-slot[data-page="${pi}"]`);
        if(slot) slot.scrollIntoView({ block: 'start', behavior: behavior || 'auto' });
        setCurrentChapter(chKey);
      };
      if(window.IntersectionObserver){
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if(e.isIntersecting){
              currentPage = parseInt(e.target.dataset.page, 10);
              const fv = firstVerseOfPage(currentPage);
              if(fv) onPositionChange(fv.chKey, fv.vnum);
            }
          });
        }, { rootMargin: '0px 0px -75% 0px', threshold: 0 });
        stack.querySelectorAll('.page-slot').forEach(s => io.observe(s));
      }

    } else {
      /* ---- Paginated + horizontal: only the current page exists in the
         DOM; a left/right swipe swaps it for the next/previous page's
         content outright — no CSS multi-column reflow, so there's no
         rounding drift between a measured width and the rendered layout
         to land the viewport between two pages. ---- */
      content.innerHTML = `
        <div class="page-single-wrap" id="pageSingleWrap" style="height:${pageH}px">
          <div class="page-single" id="pageSingle"></div>
          <div class="book-tap-zone left" id="tapPrev"></div>
          <div class="book-tap-zone right" id="tapNext"></div>
        </div>`;
      const wrap = document.getElementById('pageSingleWrap');
      const singleEl = document.getElementById('pageSingle');

      function renderPage(pi){
        pi = Math.max(0, Math.min(pages.length - 1, pi));
        currentPage = pi;
        singleEl.scrollTop = 0;
        singleEl.innerHTML = pageHtml(pi);
        const fv = firstVerseOfPage(pi);
        if(fv){ setCurrentChapter(fv.chKey); onPositionChange(fv.chKey, fv.vnum); }
      }
      document.getElementById('tapPrev').onclick = () => renderPage(currentPage - 1);
      document.getElementById('tapNext').onclick = () => renderPage(currentPage + 1);

      let touchStartX = null, touchStartY = null;
      wrap.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
      }, { passive: true });
      wrap.addEventListener('touchend', (e) => {
        if(touchStartX == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        touchStartX = null;
        if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5){
          if(dx < 0) renderPage(currentPage + 1); else renderPage(currentPage - 1);
        }
      }, { passive: true });

      jumpTo = (chKey, verseIdx, behavior) => {
        const ch = chapters.find(c => c.key === chKey);
        const v = ch && ch.data.verses[verseIdx];
        if(!v) return;
        renderPage(pageIndexForVerse(chKey, v.num));
      };
    }

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

  /* ---- Whole-book verse index — lets the right-edge scroll pad represent
     position across all of `chapters` (the entire book, for a non-skandh
     book like the Gita) instead of just the chapter currently in view. The
     bottom scrub-bar stays chapter-relative on purpose (prev/next-chapter
     buttons, "verse X of N in this chapter"); only the pad is book-wide. ---- */
  const chapterOffset = {};
  let totalVerses = 0;
  chapters.forEach(ch => { chapterOffset[ch.key] = totalVerses; totalVerses += ch.data.verses.length; });
  function globalIndexOf(chKey, idxInCh){ return chapterOffset[chKey] + idxInCh; }
  function chapterForGlobalIndex(gIdx){
    for(const ch of chapters){
      const n = ch.data.verses.length;
      if(gIdx < chapterOffset[ch.key] + n) return { chKey: ch.key, idxInCh: gIdx - chapterOffset[ch.key] };
    }
    const last = chapters[chapters.length-1];
    return { chKey: last.key, idxInCh: last.data.verses.length - 1 };
  }

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
  function positionVThumb(chKey, idxInCh){
    if(!vscrollThumb) return;
    const gIdx = globalIndexOf(chKey, idxInCh);
    const pct = totalVerses <= 1 ? 0 : (gIdx/(totalVerses-1))*100;
    vscrollThumb.style.top = pct + '%';
    vscrollLabel.style.top = pct + '%';
    const ch = chapters.find(c=>c.key===chKey);
    vscrollLabel.textContent = verseRefLabel(book, chKey, (ch && ch.data.verses[idxInCh] || {}).num || '');
  }
  function setScrub(idx, n){ scrubRange.value = idx; positionLabel(idx, n); positionVThumb(currentKey, idx); }
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

  /* ---- Mode-toggle bar auto-hides while scrolling down, reappears on
     scroll-up so it's reachable without hogging screen space permanently.
     Armed on a short delay so that landing deep in the book (e.g. opening
     chapter 5 directly, which itself fires a couple of settling scroll
     events as the initial jumpTo above lands) isn't mistaken for a
     scroll-down gesture that immediately hides the bar. ---- */
  if(window.__vvToolbarScrollHandler) window.removeEventListener('scroll', window.__vvToolbarScrollHandler);
  if(toolbarEl){
    let lastY = window.scrollY;
    const onToolbarScroll = () => {
      const y = window.scrollY;
      if(y < 40 || y < lastY - 4) toolbarEl.classList.add('show');
      else if(y > lastY + 4) toolbarEl.classList.remove('show');
      lastY = y;
    };
    window.__vvToolbarScrollHandler = onToolbarScroll;
    setTimeout(() => {
      lastY = window.scrollY;
      window.addEventListener('scroll', onToolbarScroll, { passive: true });
    }, 300);
  }
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
    positionVThumb(currentKey, idx);
    jumpTo(currentKey, idx, 'auto');
  });
  const endDrag = () => { scrubDragging = false; scrubLabel.classList.remove('show'); };
  scrubRange.addEventListener('change', endDrag);
  scrubRange.addEventListener('blur', endDrag);
  scrubRange.addEventListener('touchend', endDrag);

  prevChBtn.onclick = () => { const idx = chapters.findIndex(c=>c.key===currentKey); if(idx>0) jumpToChapterStart(chapters[idx-1].key); };
  nextChBtn.onclick = () => { const idx = chapters.findIndex(c=>c.key===currentKey); if(idx>=0 && idx<chapters.length-1) jumpToChapterStart(chapters[idx+1].key); };
  chListBtn.onclick = () => openChapterListSheet(app, book, skandhNum, chapters, currentKey, (key) => jumpToChapterStart(key));

  /* ---- Right-edge vertical scroll thumb — fast drag-to-scrub for vertical mode,
     same idea as a desktop scrollbar handle, since phones hide the native one. ---- */
  if(vscrollTrack && vscrollThumb){
    let vDragging = false;
    function targetFromClientY(clientY){
      const rect = vscrollTrack.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      const gIdx = Math.round(frac * (totalVerses - 1));
      return chapterForGlobalIndex(gIdx);
    }
    function onMove(e){
      if(!vDragging) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const { chKey, idxInCh } = targetFromClientY(clientY);
      if(chKey !== currentKey){ setCurrentChapter(chKey); refreshScrubForChapter(chKey); }
      setScrub(idxInCh, chapters.find(c=>c.key===chKey).data.verses.length);
      jumpTo(chKey, idxInCh, 'auto');
    }
    function endDrag(){
      if(!vDragging) return;
      vDragging = false; scrubDragging = false;
      vscrollThumb.classList.remove('dragging'); vscrollLabel.classList.remove('show');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', endDrag);
    }
    function startDrag(e){
      if(e.touches){
        // Only grab the touch if it actually starts near the visible thumb —
        // the track spans almost the full screen height, so without this a
        // normal vertical swipe anywhere near the right edge (very common
        // with one-handed phone use) gets hijacked into a chapter-local
        // scrub instead of scrolling the page into the next chapter.
        const thumbRect = vscrollThumb.getBoundingClientRect();
        const grabPad = 24;
        const clientY = e.touches[0].clientY;
        if(clientY < thumbRect.top - grabPad || clientY > thumbRect.bottom + grabPad) return;
      }
      vDragging = true; scrubDragging = true;
      vscrollThumb.classList.add('dragging'); vscrollLabel.classList.add('show');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', endDrag);
      onMove(e);
      e.preventDefault();
    }
    vscrollTrack.addEventListener('touchstart', startDrag, { passive: false });
    vscrollTrack.addEventListener('touchmove', onMove, { passive: false });
    vscrollTrack.addEventListener('touchend', endDrag);
    vscrollTrack.addEventListener('mousedown', startDrag);
  }

  window.__vvRenderReader = () => renderReader(app, book, skandhNum, currentKey);
}

function openChapterListSheet(app, book, skandhNum, chapters, currentKey, onPick){
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <button class="close-x">${ICON_CLOSE}</button>
      <h2>${ICON_MENU} पढ़ने का तरीका / Chapters</h2>
      <div class="setting-row">
        <label>कंटेंट मोड / Content mode</label>
        <div class="mode-tabs">
          ${CONTENT_MODES.map(m => `<button class="mode-tab ${settings.contentMode===m.key?'active':''}" data-m="${m.key}">${CONTENT_MODE_ICONS[m.key]} ${m.label}<span class="m-sub">${m.sub}</span></button>`).join('')}
        </div>
      </div>
      <div class="setting-row">
        <label>टीकाएँ / Commentaries — टिक करते ही टीका मोड चालू हो जाएगा</label>
        <div class="tika-list">
          ${TIKA_DEFS.map(t => `
            <label class="tika-row ${t.available?'':'disabled'}">
              <input type="checkbox" data-sheet-tika="${t.key}" ${settings.tikas[t.key]?'checked':''} ${t.available?'':'disabled'}>
              <span class="t-label">${t.label}</span>
              <span class="t-sub">${t.sub}</span>
            </label>`).join('')}
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
  overlay.querySelectorAll('[data-sheet-tika]').forEach(cb => cb.onchange = () => {
    settings.tikas[cb.dataset.sheetTika] = cb.checked;
    if(cb.checked) settings.contentMode = 'tika';
    saveSettings(settings);
    overlay.remove();
    renderReader(app, book, skandhNum, currentKey);
  });
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
