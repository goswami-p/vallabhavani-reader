/* VallabhaVani — reader engine: chapter view (vertical-only) and scope view (skandh/book, vertical+horizontal) */

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
    <div class="verse-card" data-vkey="${meta.chapterKey}-${v.num}">
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

/* ---- Single chapter (adhyay) — vertical only ---- */
function renderChapterView(app, book, skandhNum, adhyayNum){
  const adhyay = getAdhyay(book.id, skandhNum, adhyayNum);
  const chapterLabel = book.hasSkandh ? `${book.skandhTitles.hi[skandhNum-1]} · अध्याय ${adhyayNum}` : (adhyay ? (adhyay.title.hi||adhyay.title.en) : `अध्याय ${adhyayNum}`);
  const backHref = book.hasSkandh ? `#/book/${book.id}/skandh/${skandhNum}` : `#/book/${book.id}`;
  const bmKey = book.hasSkandh ? `${book.id}-s${skandhNum}-a${adhyayNum}` : `${book.id}-a${adhyayNum}`;

  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="btn-back">←</button>
      <h1>${chapterLabel}</h1>
      <button class="icon-btn" id="btn-copy-all" title="Copy chapter">📋</button>
      <button class="icon-btn" id="btn-share-all" title="Share chapter">📤</button>
      <button class="icon-btn" id="btn-bookmark" title="Bookmark">🔖</button>
      <button class="icon-btn" id="btn-settings">⚙️</button>
    </div>
    <div id="reader-root"></div>
  `;
  app.querySelector('#btn-back').onclick = () => navigate(backHref);
  app.querySelector('#btn-settings').onclick = () => openSettingsSheet(true);
  app.querySelector('#btn-bookmark').onclick = () => saveBookmark({ key: bmKey, label: chapterLabel, href: location.hash });

  if(!adhyay || !adhyay.verses || !adhyay.verses.length){
    document.getElementById('reader-root').innerHTML = `<div class="empty-note">इस अध्याय की सामग्री जल्द जोड़ी जाएगी।<br>Content for this chapter is coming soon.</div>`;
    app.querySelector('#btn-copy-all').style.display = 'none';
    app.querySelector('#btn-share-all').style.display = 'none';
    return;
  }

  const verseIndex = {};
  adhyay.verses.forEach(v => verseIndex[`c-${v.num}`] = v);

  const root = document.getElementById('reader-root');
  root.innerHTML = `<div class="verse-feed ${settings.pageDividers?'':'no-dividers'}">
      ${adhyay.verses.map(v => verseCardHtml(v, { chapterKey: 'c', chapterLabel: '' })).join('')}
    </div>`;
  wireVerseCardActions(app, verseIndex);

  app.querySelector('#btn-copy-all').onclick = () => copyText(chapterAsText(adhyay.title, adhyay.verses, settings.langs));
  app.querySelector('#btn-share-all').onclick = () => shareText(chapterAsText(adhyay.title, adhyay.verses, settings.langs), chapterLabel);

  window.__vvRenderReader = () => renderChapterView(app, book, skandhNum, adhyayNum);
}

/* ---- Skandh / whole-book scope — vertical continuous or horizontal paged ---- */
function renderReaderScope(app, book, skandhNum){
  const chapters = buildScope(book.id, skandhNum).filter(c => c.data && c.data.verses && c.data.verses.length);
  const scopeLabel = skandhNum ? book.skandhTitles.hi[skandhNum-1] : book.title.hi;
  const backHref = skandhNum ? `#/book/${book.id}/skandh/${skandhNum}` : `#/book/${book.id}`;

  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" id="btn-back">←</button>
      <h1>${scopeLabel}</h1>
      <button class="icon-btn" id="btn-settings">⚙️</button>
    </div>
    <div class="reader-toolbar">
      <div class="mode-toggle" id="mode-toggle">
        <button data-mode="vertical" class="${settings.readingMode==='vertical'?'active':''}">⬇️ वर्टिकल</button>
        <button data-mode="horizontal" class="${settings.readingMode==='horizontal'?'active':''}">➡️ हॉरिज़ॉन्टल</button>
      </div>
    </div>
    <div id="reader-root"></div>
  `;
  app.querySelector('#btn-back').onclick = () => navigate(backHref);
  app.querySelector('#btn-settings').onclick = () => openSettingsSheet(false);
  app.querySelector('#mode-toggle').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
    settings.readingMode = b.dataset.mode; saveSettings(settings); renderReaderScope(app, book, skandhNum);
  });

  const root = document.getElementById('reader-root');

  if(!chapters.length){
    root.innerHTML = `<div class="empty-note">अभी तक कोई सामग्री उपलब्ध नहीं है।<br>No content available yet in this section.</div>`;
    return;
  }

  const verseIndex = {};
  chapters.forEach(ch => ch.data.verses.forEach(v => verseIndex[`${ch.key}-${v.num}`] = v));

  if(settings.readingMode === 'horizontal'){
    const pages = [];
    chapters.forEach(ch => ch.data.verses.forEach(v => pages.push({ ch, v })));
    root.innerHTML = `
      <div class="verse-pager" id="pager">
        ${pages.map(p => `<div class="page">${verseCardHtml(p.v, { chapterKey: p.ch.key, chapterLabel: p.ch.label })}</div>`).join('')}
      </div>
      <div class="page-dots" id="dots">${pages.map((_,i)=>`<span data-i="${i}"></span>`).join('')}</div>
    `;
    wireVerseCardActions(app, verseIndex);
    const pager = document.getElementById('pager');
    const dots = document.getElementById('dots').children;
    function updateActive(){
      const idx = Math.round(pager.scrollLeft / pager.clientWidth);
      Array.from(dots).forEach((d,i) => d.classList.toggle('active', i===idx));
      saveScopeBookmark(book, skandhNum, pages[idx] ? pages[idx].ch : null, scopeLabel);
    }
    pager.addEventListener('scroll', debounce(updateActive, 150));
    updateActive();
  } else {
    root.innerHTML = `<div class="verse-feed ${settings.pageDividers?'':'no-dividers'}" id="feed"></div>`;
    const feed = document.getElementById('feed');
    let html = '';
    chapters.forEach(ch => {
      html += `<div class="chapter-break">${ch.label}</div>`;
      ch.data.verses.forEach(v => { html += verseCardHtml(v, { chapterKey: ch.key, chapterLabel: '' }); });
    });
    feed.innerHTML = html;
    wireVerseCardActions(app, verseIndex);

    const cards = feed.querySelectorAll('.verse-card');
    if(window.IntersectionObserver){
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if(e.isIntersecting){
            const key = e.target.dataset.vkey.split('-')[0];
            const ch = chapters.find(c => c.key === key);
            if(ch) saveScopeBookmark(book, skandhNum, ch, scopeLabel);
          }
        });
      }, { threshold: 0.6 });
      cards.forEach(c => io.observe(c));
    }
  }

  window.__vvRenderReader = () => renderReaderScope(app, book, skandhNum);
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
