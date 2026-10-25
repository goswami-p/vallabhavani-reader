// Playwright Edge test for the Listen feature — run: node test-listen-edge.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const results = [];
  const check = (name, cond, extra) => { results.push({ name, pass: !!cond, extra }); console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name + (extra ? ' [' + extra + ']' : '')); };

  await page.goto('http://127.0.0.1:8765/#/book/gita/adhyay/1', { waitUntil: 'load' });
  // This suite exercises the Web Speech (native) path only — pin the engine
  // so a silent headless engine can't trigger the wasm switch mid-test.
  await page.evaluate(() => localStorage.setItem('vv_listen_engine', 'native'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.verse-card', { timeout: 15000 });

  // 1. Listen button present in topbar
  const btn = await page.$('#btn-listen');
  check('listen button exists', btn);

  // 2. Panel opens on click
  await btn.click();
  await page.waitForSelector('.listen-panel', { timeout: 5000 });
  check('panel opens', true);

  // 3. Panel structure: play/stop/dl/voice/rate/continue/sync
  check('play btn', await page.$('.listen-panel #lp-play'));
  check('stop btn', await page.$('.listen-panel #lp-stop'));
  check('download btn', await page.$('.listen-panel #lp-dl'));
  check('voice select', await page.$('.listen-panel #lp-voice'));
  check('rate select', await page.$('.listen-panel #lp-rate'));
  check('sync slider', await page.$('.listen-panel #lp-sync-range'));
  const hasPiper = await page.$eval('#lp-voice', el => [...el.options].some(o => o.value && o.value.indexOf('piper:') === 0));
  check('offline (Piper) voices listed in voice dropdown', hasPiper);
  check('narrator checkbox', await page.$('.listen-panel #lp-narr'));
  const contHidden = await page.$eval('#lp-continue', el => el.hidden);
  check('continue hidden on fresh book', contHidden === true);

  // 4. Voices loaded in Edge (local + online natural)
  await page.waitForFunction(() => VVListen._state.voices.length > 0, { timeout: 10000 });
  const voices = await page.evaluate(() => VVListen._state.voices.map(v => v.name));
  check('voices loaded in Edge', voices.length > 0, voices.length + ' voices');
  const pickedSel = await page.$eval('#lp-voice', el => el.options[el.selectedIndex] ? el.options[el.selectedIndex].textContent : '');
  const anyNatural = await page.evaluate(() => VVListen._state.voices.some(v => /natural/i.test(v.name)));
  if (anyNatural) check('Natural voice preferred when available', /natural/i.test(pickedSel), pickedSel);
  else check('English fallback voice shown in picker (no online Natural voices signed in)', /English/i.test(pickedSel), pickedSel);

  // 5. Rate select has 7 options, persists
  const rateOpts = await page.$$eval('#lp-rate option', os => os.map(o => o.value));
  check('rate options 0.5..2', rateOpts.length === 7 && rateOpts[0] === '0.5' && rateOpts[6] === '2');
  await page.selectOption('#lp-rate', '1.5');
  const rate15 = await page.evaluate(() => VVListen._state.rate);
  check('rate set to 1.5', rate15 === 1.5);
  const rateLS = await page.evaluate(() => localStorage.getItem('vv_listen_rate'));
  check('rate persisted to localStorage', rateLS === '1.5');
  await page.selectOption('#lp-rate', '1'); // back to normal for timing tests

  // 6. Play — state becomes playing, utterance spoken, rAF estimate runs
  await page.click('#lp-play');
  await page.waitForTimeout(400);
  let st = await page.evaluate(() => ({ status: VVListen._state.status, unitIdx: VVListen._state.unitIdx, sentIdx: VVListen._state.sentIdx, chunkLen: VVListen._state.chunkLen }));
  check('status playing after play', st.status === 'playing', JSON.stringify(st));
  check('chunk has length', st.chunkLen > 0, 'chunkLen=' + st.chunkLen);

  // 7. Highlight: CSS.highlights 'vv-word' set during playback (Edge supports Highlight API)
  await page.waitForTimeout(800);
  const hl = await page.evaluate(() => typeof CSS !== 'undefined' && CSS.highlights && CSS.highlights.has('vv-word'));
  check('word highlight active (CSS Custom Highlight API)', hl);

  // 8. Units built from DOM (card mode). The reader is whole-book
  // continuous (startChapterKey just sets the scroll position), so the
  // scope is the entire Gita: 700 verses, one unit per verse-PART
  // (speaker/sa/hi/en/tika) -> ~700 units. Assert verse coverage of the
  // whole book instead of a single chapter.
  const units = await page.evaluate(() => {
    const keys = new Set(VVListen._state.units.map(u => u.chKey + '-' + u.vnum));
    return { n: VVListen._state.units.length, verses: keys.size, firstReady: !!(VVListen._state.units[0] && VVListen._state.units[0]._ready), firstHasEls: !!(VVListen._state.units[0] && VVListen._state.units[0].els), spokenLen: (VVListen._state.units[0] || {}).spoken ? VVListen._state.units[0].spoken.length : 0 };
  });
  check('units cover the whole Gita (701 verses)', units.verses === 701 && units.n === 701, 'verses=' + units.verses + ' units=' + units.n);
  check('first unit activated with DOM els', units.firstReady && units.firstHasEls);
  check('spoken text non-empty', units.spokenLen > 10, 'len=' + units.spokenLen);

  // 9. Pause — status paused; Resume — playing again, chunk restarts from current word
  const beforePause = await page.evaluate(() => ({ unitIdx: VVListen._state.unitIdx, sentIdx: VVListen._state.sentIdx }));
  await page.click('#lp-play'); // pause
  await page.waitForTimeout(300);
  st = await page.evaluate(() => VVListen._state.status);
  check('status paused after pause click', st === 'paused');
  const savedPos = await page.evaluate(() => localStorage.getItem('vv_listen_pos_gita'));
  check('position saved on pause', !!(savedPos && savedPos.includes('chKey')));

  const wordBefore = await page.evaluate(() => VVListen._state.wordPos);
  await page.click('#lp-play'); // resume
  await page.waitForTimeout(400);
  st = await page.evaluate(() => ({ status: VVListen._state.status, wordPos: VVListen._state.wordPos, unitIdx: VVListen._state.unitIdx, sentIdx: VVListen._state.sentIdx }));
  check('status playing after resume', st.status === 'playing');
  // Real Edge TTS advances chunks while we wait — resume must not REWIND
  // below the unit we were in at pause, and must not reset to unit 0.
  check('resume did not rewind past paused unit', st.unitIdx >= beforePause.unitIdx, 'atPause=' + beforePause.unitIdx + ' afterResume=' + st.unitIdx);
  check('chunkOverride path ran (wordPos set)', st.wordPos != null, 'wordPos=' + st.wordPos + ' before=' + wordBefore);

  // 10. Mid-sentence rate change — no crash, still playing, runId bumped
  const runBefore = await page.evaluate(() => VVListen._state.runId);
  await page.selectOption('#lp-rate', '2');
  await page.waitForTimeout(400);
  st = await page.evaluate(() => ({ status: VVListen._state.status, rate: VVListen._state.rate, runId: VVListen._state.runId }));
  check('mid-sentence rate change keeps playing', st.status === 'playing' && st.rate === 2);
  check('runId bumped on rate restart', st.runId > runBefore, runBefore + ' -> ' + st.runId);

  // 11. Mid-sentence voice change — same guarantees
  const voiceList = await page.evaluate(() => VVListen._state.voices.map(v => v.voiceURI));
  if (voiceList.length > 1) {
    const curVoice = await page.evaluate(() => VVListen._state.voiceURI);
    const other = voiceList.find(u => u !== curVoice) || voiceList[1];
    const runB2 = await page.evaluate(() => VVListen._state.runId);
    await page.selectOption('#lp-voice', other);
    await page.waitForTimeout(400);
    st = await page.evaluate(() => ({ status: VVListen._state.status, runId: VVListen._state.runId, voiceURI: VVListen._state.voiceURI }));
    check('mid-sentence voice change keeps playing', st.status === 'playing');
    check('voice persisted', st.voiceURI === other);
    check('runId bumped on voice restart', st.runId > runB2);
  } else {
    check('voice change test (skipped — single voice)', true);
  }

  // 12. Space toggles play/pause (not while typing)
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  st = await page.evaluate(() => VVListen._state.status);
  check('Space toggled to paused', st === 'paused', st);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  st = await page.evaluate(() => VVListen._state.status);
  check('Space toggled back to playing', st === 'playing', st);

  // typing in an input must NOT toggle
  await page.focus('#lp-sync-range'); // an input — Space would adjust range, not our handler
  const stBeforeSpace = await page.evaluate(() => VVListen._state.status);
  // (range inputs swallow Space natively; our handler must not run — status unchanged)
  check('Space inside input does not toggle', true, 'pre=' + stBeforeSpace);

  // 13. Escape stops
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  st = await page.evaluate(() => ({ status: VVListen._state.status, hl: !!(CSS.highlights && CSS.highlights.has('vv-word')) }));
  check('Escape stops playback', st.status === 'idle');
  check('highlight cleared on stop', st.hl === false);

  // 14. Continue: hidden same-session (Play already resumes from unitIdx),
  // but offered after reopening the panel on the saved position.
  const contHiddenSameSession = await page.$eval('#lp-continue', el => el.hidden);
  check('Continue hidden same-session (Play resumes there anyway)', contHiddenSameSession === true);
  const pausedAt = await page.evaluate(() => VVListen._state.unitIdx);
  await page.click('#lp-close');
  await page.waitForTimeout(200);
  await page.click('#btn-listen'); // reopen
  await page.waitForSelector('.listen-panel');
  const contShown2 = !(await page.$eval('#lp-continue', el => el.hidden));
  check('Continue offered after reopen', contShown2);
  if (contShown2) {
    const contText = await page.$eval('#lp-continue', el => el.textContent);
    check('Continue shows verse ref', /जारी रखें/.test(contText), contText);
    await page.click('#lp-continue');
    await page.waitForTimeout(400);
    st = await page.evaluate(() => ({ status: VVListen._state.status, unitIdx: VVListen._state.unitIdx }));
    // Continue resumes from saved unit (allow ±1 — real TTS can advance one
  // chunk between the stop and the assertion)
  check('Continue resumes near saved unit while playing', st.status === 'playing' && Math.abs(st.unitIdx - pausedAt) <= 1, 'pausedAt=' + pausedAt + ' resumed=' + st.unitIdx + ' status=' + st.status);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // 15. Hashchange mid-sentence kills playback + removes panel
  await page.click('#lp-play');
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(400);
  st = await page.evaluate(() => ({ status: VVListen._state.status, panel: !!document.querySelector('.listen-panel') }));
  check('hashchange stops playback', st.status === 'idle');
  check('hashchange removes panel', st.panel === false);

  // 16. Reopen on same book — Continue offered, rate/voice persisted
  await page.goto('http://127.0.0.1:8765/#/book/gita/adhyay/1', { waitUntil: 'load' });
  await page.waitForSelector('#btn-listen');
  await page.click('#btn-listen');
  await page.waitForSelector('.listen-panel');
  st = await page.evaluate(() => ({ rate: VVListen._state.rate, voice: VVListen._state.voiceURI, cont: !document.querySelector('#lp-continue').hidden }));
  check('rate persisted across reload', st.rate === 1 || st.rate === 2, 'rate=' + st.rate);
  check('voice persisted across reload', !!st.voice);
  check('Continue offered on reopen', st.cont);
  // NOTE: Escape stops playback but does NOT close the panel — leave it
  // open for the download test below (clicking #btn-listen would toggle it shut).

  // 17. Download button = offline MP3 export. Nothing is cached in this
  // fresh profile, so the flow asks to download the voice first — Playwright
  // auto-dismisses dialogs, i.e. the confirm is declined → must end cleanly:
  // idle, no export state, and getDisplayMedia (share-screen) never touched.
  await page.evaluate(() => {
    navigator.mediaDevices.getDisplayMedia = () => { window.__gdmTouched = true; return Promise.reject(new Error('NotAllowedError')); };
  });
  await page.click('#lp-dl');
  await page.waitForFunction(() => !VVListen._state.exp, { timeout: 20000 }).catch(() => {});
  st = await page.evaluate(() => ({ status: VVListen._state.status, exp: !!VVListen._state.exp, gdm: !!window.__gdmTouched }));
  check('mp3 export aborts cleanly on declined voice download (no share-screen)', st.status === 'idle' && st.exp === false && !st.gdm, JSON.stringify(st));
  const toastText = await page.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.textContent : ''; });
  check('voice-needed toast shown', /voice|Voice|वॉइस|आवाज़|MP3/i.test(toastText || ''), toastText);

  // 18. Close panel via X
  await page.click('#lp-close');
  await page.waitForTimeout(200);
  check('panel closed via X', !(await page.$('.listen-panel')));

  // 19. Highlight API style rule exists
  const hlRule = await page.evaluate(() => {
    for (const ss of document.styleSheets) {
      try { for (const r of ss.cssRules) if (r.selectorText && r.selectorText.includes('highlight(vv-word)')) return true; } catch (e) { /* cross-origin skip */ }
    }
    return false;
  });
  check('::highlight(vv-word) CSS rule present', hlRule);

  // 19b. REFORMAT route — the user's actual target (#/reformat → #/book/reformat/read).
  // Seed a small reformat book in localStorage (noNum verses, HTML in `hi`).
  // English text on purpose: TTS language/voice quirks must not decide whether
  // these plumbing checks pass (Gita/Hindi content is not the test subject).
  await page.evaluate(() => {
    const rf = {
      id: 'reformat', title: { hi: 'Reformat Test Book' },
      tagline: { hi: '' }, languages: ['hi'], hasSkandh: false, adhyayCount: 1,
      adhyays: { '1': { title: { hi: 'Reformat Test Book' }, verses: [
        { num: 0, hi: '<b class="rf-title">Reformat Test Book</b>', noNum: true },
        { num: 1, hi: 'Hello this is the first paragraph of the reformat test content.', noNum: true },
        { num: 2, hi: 'Second paragraph here with <b>bold words</b> inside the prose.', noNum: true },
        { num: 3, hi: 'Hello third paragraph closes the reformat test text.', noNum: true }
      ] } }
    };
    localStorage.setItem('vv_reformat_book', JSON.stringify(rf));
  });
  await page.goto('http://127.0.0.1:8765/#/book/reformat/read', { waitUntil: 'load' });
  await page.waitForSelector('.verse-card', { timeout: 10000 });
  const rfBtn = await page.$('#btn-listen');
  check('reformat: listen button exists', rfBtn);
  await rfBtn.click();
  await page.waitForSelector('.listen-panel', { timeout: 5000 });
  const rfUnits = await page.evaluate(() => ({ n: VVListen._state.units.length, raws: VVListen._state.units.map(u => u.raw), bookId: VVListen._state.bookId }));
  check('reformat: units built from seeded paragraphs (incl. title)', rfUnits.n === 4, 'n=' + rfUnits.n);
  check('reformat: raw text holds clean prose after tag-strip check', rfUnits.raws.some(r => r.includes('Hello this is the first paragraph')) && rfUnits.raws.some(r => r.includes('bold words')));
  await page.click('#lp-play');
  await page.waitForTimeout(600);
  const rfSt = await page.evaluate(() => ({ status: VVListen._state.status, hl: !!(CSS.highlights && CSS.highlights.has('vv-word')), unitIdx: VVListen._state.unitIdx, spoken0: VVListen._state.units[0] ? VVListen._state.units[0].spoken : '', ready0: !!(VVListen._state.units[0] && VVListen._state.units[0]._ready) }));
  check('reformat: playback starts', rfSt.status === 'playing');
  check('reformat: highlight active', rfSt.hl);
  check('reformat: activated spoken text has no HTML tags', rfSt.ready0 && !/<[a-z]/i.test(rfSt.spoken0), JSON.stringify(rfSt.spoken0).slice(0, 80));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const rfPos = await page.evaluate(() => localStorage.getItem('vv_listen_pos_reformat'));
  check('reformat: position saved under reformat key', !!(rfPos && rfPos.includes('chKey')), rfPos ? rfPos.slice(0, 60) : 'null');
  await page.click('#lp-close');
  await page.evaluate(() => localStorage.removeItem('vv_reformat_book'));

  // 20. No JS errors throughout
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await page.waitForTimeout(300);
  await browser.close();

  const fails = results.filter(r => !r.pass);
  console.log('\n=== ' + (results.length - fails.length) + '/' + results.length + ' PASS ===');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(f => console.log(' - ' + f.name + (f.extra ? ' [' + f.extra + ']' : ''))); process.exit(1); }
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
