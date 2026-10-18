/* VallabhaVani — Listen: read-aloud via the browser's Web Speech API.
   One reusable engine (VVListen) + a compact player panel. No server, no
   API key — in Microsoft Edge the "… Online (Natural)" voices are free.

   Sentence-by-sentence chaining (one long utterance freezes after ~15 s),
   yellow word-by-word highlight through the CSS Custom Highlight API, and a
   timed estimate (~65 ms per character ÷ rate) as the word-position
   fallback because Edge's natural voices usually send no onboundary events
   (a sync slider trims the estimate). Every playback run gets a runId so
   stale onend/onerror/rAF callbacks from a cancelled run are ignored.
   Audio download captures the tab's audio (getDisplayMedia + MediaRecorder)
   while the whole text is spoken — the browser's own share picker must have
   "Share tab audio" ticked. */

const ICON_HEADPHONES = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12.5v-2.2a6.5 6.5 0 0 1 13 0v2.2"/><rect x="2.3" y="11.6" width="3.4" height="5.2" rx="1.5"/><rect x="14.3" y="11.6" width="3.4" height="5.2" rx="1.5"/></svg>`;
const ICON_PLAY = `<svg class="icon" viewBox="0 0 20 20" width="17" height="17" fill="currentColor" stroke="none"><path d="M6 4.2v11.6L16 10z"/></svg>`;
const ICON_PAUSE = `<svg class="icon" viewBox="0 0 20 20" width="17" height="17" fill="currentColor" stroke="none"><rect x="5" y="4" width="3.4" height="12" rx="1"/><rect x="11.6" y="4" width="3.4" height="12" rx="1"/></svg>`;
const ICON_STOP_SQ = `<svg class="icon" viewBox="0 0 20 20" width="15" height="15" fill="currentColor" stroke="none"><rect x="4.5" y="4.5" width="11" height="11" rx="1.5"/></svg>`;
const ICON_DOWNLOAD = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5v8.5"/><path d="M6.3 8.7L10 12.4l3.7-3.7"/><path d="M4 15.5h12"/></svg>`;
const ICON_PREV = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="none"><path d="M6 4v12l8-6z"/><path d="M4 4v12" stroke="currentColor" stroke-width="1" opacity="0.3"/></svg>`;
const ICON_NEXT = `<svg class="icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="none"><path d="M14 4v12L6 10z"/><path d="M16 4v12" stroke="currentColor" stroke-width="1" opacity="0.3"/></svg>`;

const VVListen = (() => {
  const LS_VOICE = 'vv_listen_voice', LS_RATE = 'vv_listen_rate', LS_SYNC = 'vv_listen_sync';
  const POS_PREFIX = 'vv_listen_pos_';
  const CHAR_MS = 65;      // timed fallback: ms per spoken character at rate 1
  const MAX_CHUNK = 50;    // mobile-friendly: smaller chunks prevent freeze (was 100)
  const synth = (typeof speechSynthesis !== 'undefined') ? speechSynthesis : null;
  const supported = !!(synth && typeof SpeechSynthesisUtterance !== 'undefined');
  const highlightOK = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';

  function lsGet(key, dflt){ try{ const v = localStorage.getItem(key); return v == null ? dflt : v; }catch(e){ return dflt; } }
  function lsSet(key, val){ try{ localStorage.setItem(key, val); }catch(e){ /* private mode / quota — prefs just don't persist */ } }
  function isMobile(){ return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }

  const state = {
    voices: [],
    voiceURI: lsGet(LS_VOICE, null),
    rate: Math.min(2, Math.max(0.5, parseFloat(lsGet(LS_RATE, isMobile() ? '0.9' : '1')) || (isMobile() ? 0.9 : 1))),
    syncMs: Math.min(1500, Math.max(-1500, parseInt(lsGet(LS_SYNC, '0'), 10) || 0)),
    runId: 0,
    status: 'idle',                    // idle | playing | paused
    units: [], unitIdx: 0, sentIdx: 0, wordPos: null,
    bookId: null, scopeLabel: '', content: null, reveal: null,
    panel: null, keyHandler: null,
    rafId: null, sentStartedAt: 0, pauseAccum: 0, pauseAt: 0,
    boundarySeen: false, scrollAt: 0, chunkOverride: null, chunkLen: 0, chunkStart: 0,
    dl: null                          // active audio-download run, if any
  };

  /* ---------------- Voices ---------------- */
  function loadVoices(){
    if(!supported) return;
    const got = synth.getVoices() || [];
    if(got.length) {
      state.voices = got;
      // Natural voices first inside each language family — the picker's default
      // pick below scans for "Natural" + English, everything else stays usable.
      state.voices.sort((a, b) => {
        const an = /natural/i.test(a.name) ? 0 : 1, bn = /natural/i.test(b.name) ? 0 : 1;
        if(an !== bn) return an - bn;
        return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
      });
      refreshVoiceSelect();
    }
  }
  // Load voices - mobile Chrome needs multiple attempts
  loadVoices();
  if(synth && 'onvoiceschanged' in synth) {
    synth.onvoiceschanged = loadVoices;
  }
  // Fallback: retry loading voices after delay (for mobile)
  setTimeout(loadVoices, 100);
  setTimeout(loadVoices, 500);
  setTimeout(loadVoices, 1000);
  function refreshVoiceSelect(){
    const sel = state.panel && state.panel.querySelector('#lp-voice');
    const status = state.panel && state.panel.querySelector('#lp-status');
    if(!sel || !state.voices.length) {
      if(status) status.textContent = `voices: ${state.voices.length}`;
      return;
    }
    sel.innerHTML = voiceOptionsHtml();
    const cur = pickVoice();
    if(cur) sel.value = cur.voiceURI;
    if(status) status.textContent = `voices: ${state.voices.length}`;
  }
  function pickVoice(){
    // 1. User's explicit choice
    if(state.voiceURI) {
      const v = state.voices.find(v => v.voiceURI === state.voiceURI);
      if(v) return v;
    }
    // 2. Hindi voice first — the content is Devanagari; on Android Chrome an
    //    English engine given Devanagari text outputs SILENCE (Edge's Natural
    //    voices are desktop-Edge-only and never appear on phones anyway).
    const hi = state.voices.find(v => /^hi/i.test(v.lang));
    if(hi) return hi;
    // 3. Natural English voices (desktop Edge — English text fallback)
    const natural = state.voices.find(v => /natural/i.test(v.name) && /^en/i.test(v.lang));
    if(natural) return natural;
    // 4. Online English voices (Edge natural)
    const online = state.voices.find(v => /^en/i.test(v.lang) && /online/i.test(v.name));
    if(online) return online;
    // 5. Any English voice (fallback for mobile)
    const anyEn = state.voices.find(v => /^en/i.test(v.lang));
    if(anyEn) return anyEn;
    // 6. Any available voice (last resort)
    return state.voices[0] || null;
  }
  function setVoice(uri){
    state.voiceURI = uri; lsSet(LS_VOICE, uri || '');
    const sel = state.panel && state.panel.querySelector('#lp-voice');
    if(sel) sel.value = uri || '';
  }
  function setRate(r){
    r = Math.min(2, Math.max(0.5, parseFloat(r) || 1));
    state.rate = r; lsSet(LS_RATE, String(r));
    const sel = state.panel && state.panel.querySelector('#lp-rate');
    if(sel) sel.value = String(r);
    // Rate changed mid-sentence: cancel + re-speak the current chunk from the
    // current word with the new rate (same runId bookkeeping as a restart).
    if(state.status === 'playing') restartCurrentChunk();
    else if(state.status === 'paused'){ /* applies on resume — resume() re-speaks the chunk */ }
  }

  /* ---------------- Spoken-text cleaning (markdown / code stripped, map kept) ----------------
     Builds the spoken string AND a map from each spoken char's index back to
     its index in the shown (DOM) text — so the yellow highlight always lands
     on the real rendered word even though hashes/stars/fences were dropped
     from what got spoken. */
  function cleanWithMap(shown){
    const out = [], map = [];
    let inFence = false;
    let i = 0;
    while(i < shown.length){
      const nl = shown.indexOf('\n', i);
      const lineEnd = nl === -1 ? shown.length : nl;
      const line = shown.slice(i, lineEnd);
      // Fenced code blocks (``` … ```) — shown, never spoken.
      if(/^\s*```/.test(line)){ inFence = !inFence; i = lineEnd + 1; continue; }
      if(inFence){ i = lineEnd + 1; continue; }
      // Leading markdown line markers: headings, list bullets, blockquotes,
      // table pipes. Measure the skip instead of replace() — the map needs
      // ORIGINAL shown offsets, and replace() would shift every index after
      // the stripped prefix.
      const skipMatch = line.match(/^\s{0,3}(#{1,6}\s+|[-*+]\s+|\d{1,3}[.)]\s+|>\s?|\|)+/);
      const skip = skipMatch ? skipMatch[0].length : 0;
      for(let j = skip; j < line.length; j++){
        const c = line[j], k = i + j;
        if(/\s/.test(c)){
          if(out.length && out[out.length - 1] !== ' '){ out.push(' '); map.push(k); }
          continue;
        }
        if('#*_`~\\|'.indexOf(c) !== -1) continue;            // residual inline markdown symbols
        // brackets in shown text (e.g. [text](url)) — spoken text doesn’t include them,
        // but we MUST still record the position so later indices stay aligned.
        // For links, we’ll speak the label text inside the brackets; for images, we skip.
        // So: if seen '[' → skip it, but record position. If seen ']' → skip, but record.
        // This keeps the spoken→shown map aligned.
        if(c === '[' || c === ']'){ continue; }
        out.push(c); map.push(k);
      }
      // Real line break between paragraphs/pādas becomes a spoken pause.
      if(nl !== -1 && out.length && out[out.length - 1] !== ' '){ out.push(' '); map.push(lineEnd); }
      i = lineEnd + 1;
    }
    while(out.length && out[out.length - 1] === ' '){ out.pop(); map.pop(); }
    return { spoken: out.join(''), map };
  }

  /* Sentences of a spoken string as {a,b} offsets, each chunk force-capped at
     MAX_CHUNK chars at a word boundary (long utterances freeze ~15 s in). */
  function sentencesOf(spoken){
    const raw = [];
    const re = /[^.!?।॥…\n]+[.!?।॥…]+(?=\s|$)|[^.!?।॥…\n]+(?=\n|$)/g;
    let m;
    while((m = re.exec(spoken))) raw.push({ a: m.index, b: m.index + m[0].length });
    if(!raw.length && spoken.length) raw.push({ a: 0, b: spoken.length });
    const out = [];
    raw.forEach(s => {
      let a = s.a;
      while(s.b - a > MAX_CHUNK){
        let cut = spoken.lastIndexOf(' ', a + MAX_CHUNK);
        if(cut <= a) cut = a + MAX_CHUNK;
        out.push({ a, b: cut });
        a = cut;
        while(a < s.b && spoken[a] === ' ') a++;
      }
      if(a < s.b) out.push({ a, b: s.b });
    });
    return out;
  }

  /* ---------------- Units: one spoken unit per verse ---------------- */
  function speakerText(v){
    const langs = settings.langs;
    return (v.speaker && ((langs.sa && v.speaker.sa) || (langs.hi && v.speaker.hi) || v.speaker.hi || v.speaker.en)) || '';
  }
  function buildUnits(book, chapters){
    const units = [];
    const langs = settings.langs;
    const withTika = settings.contentMode === 'tika';
    // Flow/page modes render one .flow-p per verse holding ALL of its text —
    // one selector, one element. Card mode reads each block separately (plus
    // sibling tika-cards), so the highlight can flow across them.
    const flowish = settings.readingMode === 'paginated' || settings.contentMode === 'flow';
    chapters.forEach(ch => {
      (ch.data.verses || []).forEach(v => {
        const parts = [];
        const sels = [];
        const card = `.verse-card[data-vkey="${ch.key}-${v.num}"]`;
        const fp = `.flow-p[data-chkey="${ch.key}"][data-vnum="${v.num}"]`;
        if(flowish){
          let raw = '';
          if(settings.contentMode === 'flow'){
            raw = ((langs.hi && v.hi) || v.hi || (langs.en && v.en) || v.en || '');
          } else {
            const sp = speakerText(v);
            if(sp) raw += sp + ' ';
            if(langs.sa && v.sa) raw += v.sa + ' ';
            if(langs.hi && v.hi) raw += v.hi + ' ';
            if(langs.en && v.en) raw += v.en + ' ';
            if(withTika && v.tikas){
              TIKA_DEFS.filter(t => t.available && settings.tikas[t.key]).forEach(t => { if(v.tikas[t.key]) raw += v.tikas[t.key] + ' '; });
            }
          }
          raw = raw.trim();
          if(!raw) return;
          units.push({ chKey: ch.key, vnum: v.num, raw, sels: [fp], spoken: null, map: null, sents: null, els: null });
        } else {
          const sp = speakerText(v);
          if(sp){ parts.push(sp); sels.push(card + ' .v-speaker'); }
          if(langs.sa && v.sa){ parts.push(v.sa); sels.push(card + ' .verse-block.lang-sa'); }
          if(langs.hi && v.hi){ parts.push(v.hi); sels.push(card + ' .verse-block.lang-hi'); }
          if(langs.en && v.en){ parts.push(v.en); sels.push(card + ' .verse-block.lang-en'); }
          if(withTika && v.tikas){
            TIKA_DEFS.filter(t => t.available && settings.tikas[t.key]).forEach(t => {
              if(v.tikas[t.key]){ parts.push(v.tikas[t.key]); sels.push(`.tika-card[data-vkey="${ch.key}-${v.num}-${t.key}"] .verse-block`); }
            });
          }
          if(!parts.length) return;
          units.push({ chKey: ch.key, vnum: v.num, raw: parts.join(' '), sels, spoken: null, map: null, sents: null, els: null });
        }
      });
    });
    return units;
  }

  // Resolve a unit's DOM segments and (re)build spoken text + highlight map
  // from their real textContent. If the verse's elements aren't rendered
  // (horizontal page mode, other page) ask reveal() to bring them in first;
  // still missing → speak the raw data text with no highlight rather than
  // skipping the verse.
  function activateUnit(u){
    if(state.reveal) state.reveal(u.chKey, u.vnum);
    const root = state.content;
    const els = [];
    if(root){
      u.sels.forEach(sel => {
        root.querySelectorAll(sel).forEach(el => { if(!els.includes(el)) els.push(el); });
      });
    }
    u.els = els.length ? els : null;
    if(els.length){
      let shown = '';
      els.forEach(el => { shown += el.textContent + ' '; });
      const { spoken, map } = cleanWithMap(shown);
      u.shown = shown; u.spoken = spoken; u.map = map;
    } else {
      // Raw-data fallback (elements not in the DOM). Reformat's `hi` fields
      // hold HTML — strip tags so we never speak "<b class=…>" aloud.
      const rawPlain = String(u.raw).replace(/<[^>]*>/g, ' ');
      const { spoken, map } = cleanWithMap(rawPlain);
      u.spoken = spoken; u.map = null;   // map null → no highlight for this unit
    }
    u.sents = sentencesOf(u.spoken);
    u._ready = true;
  }

  /* ---------------- Word highlight ---------------- */
  function clearHighlight(){
    if(highlightOK) CSS.highlights.delete('vv-word');
  }
  function rangeForShown(el, a, b){
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let pos = 0, n, startNode = null, startOff = 0, endNode = null, endOff = 0;
    while((n = w.nextNode())){
      const len = n.nodeValue.length;
      if(startNode === null && pos + len > a){ startNode = n; startOff = a - pos; }
      if(pos + len >= b){ endNode = n; endOff = Math.max(startNode === n ? startOff : 0, b - pos); break; }
      pos += len;
    }
    if(!startNode || !endNode) return null;
    const r = new Range();
    r.setStart(startNode, startOff); r.setEnd(endNode, endOff);
    return r;
  }
  function updateWord(u, spokenPos){
    if(!highlightOK || !u.map || !u.els || !u.els.length) return;
    // spokenPos = index into u.spoken; map it back to a shown-text offset.
    let sp = Math.min(spokenPos, u.map.length - 1);
    if(sp < 0) return;
    // snap to word start: highlight covers the whole current word
    while(sp > 0 && u.spoken[sp] && /\s/.test(u.spoken[sp])) sp++;
    let we = sp;
    while(we < u.spoken.length && !/\s/.test(u.spoken[we])) we++;
    const shownA = u.map[sp], shownB = u.map[Math.max(sp, we - 1)] + 1;
    // Which resolved element holds this shown offset? (shown was assembled
    // from els' textContent joined by a space — same order as u.els)
    let pos = 0, target = null, ta = 0, tb = 0;
    for(const el of u.els){
      const len = el.textContent.length;
      if(shownA >= pos && shownA < pos + len + 1){ target = el; ta = Math.max(0, shownA - pos); tb = Math.min(shownB - pos, len); break; }
      pos += len + 1;
    }
    if(!target || tb <= ta) return;
    const range = rangeForShown(target, ta, tb);
    if(!range) return;
    CSS.highlights.set('vv-word', new Highlight(range));
    // Keep the spoken word on screen — throttled, generous margin so the
    // sticky topbar/scrub-bar don't constantly shove it around.
    const now = performance.now();
    if(now - state.scrollAt > 350){
      const rects = range.getClientRects();
      const r = rects[0];
      if(r){
        const vh = window.innerHeight;
        if(r.top < 100 || r.bottom > vh - 110){
          state.scrollAt = now;
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }
  }

  /* ---------------- Timed-estimate rAF loop ---------------- */
  function startRaf(rid){
    stopRaf();
    const loop = () => {
      if(rid !== state.runId || state.status !== 'playing') return;
      const u = state.units[state.unitIdx];
      if(u && u._ready && u.sents && !state.boundarySeen){
        const s = u.sents[state.sentIdx];
        if(s && state.chunkLen > 0){
          const len = state.chunkLen;
          const est = Math.max(300, len * CHAR_MS / state.rate);
          const el = performance.now() - state.sentStartedAt - state.pauseAccum + state.syncMs;
          const t = Math.min(1, Math.max(0, el / est));
          updateWord(u, state.chunkStart + Math.floor(t * len));
        }
      }
      state.rafId = requestAnimationFrame(loop);
    };
    state.rafId = requestAnimationFrame(loop);
  }
  function stopRaf(){ if(state.rafId){ cancelAnimationFrame(state.rafId); state.rafId = null; } }

  /* ---------------- Speak chain ---------------- */
  function savePos(){
    const u = state.units[state.unitIdx];
    if(u && state.bookId) lsSet(POS_PREFIX + state.bookId, JSON.stringify({ chKey: u.chKey, vnum: u.vnum, ts: Date.now() }));
  }
  function loadPos(){
    if(!state.bookId) return null;
    try{ return JSON.parse(lsGet(POS_PREFIX + state.bookId, 'null')); }catch(e){ return null; }
  }
  function currentChunkStartWord(u, s){
    // current spoken position inside the chunk (for restarts) → word start
    const pos = state.wordPos != null ? state.wordPos : s.a;
    let sp = Math.min(Math.max(pos, s.a), s.b - 1);
    while(sp > s.a && !/\s/.test(u.spoken[sp])) sp--;
    if(/\s/.test(u.spoken[sp])) sp++;
    return sp;
  }
  // Go to previous sentence
  function goPrevSentence(){
    const u = state.units[state.unitIdx];
    if(!u || !u.sents) return;
    if(state.sentIdx > 0){
      state.sentIdx--;
      state.wordPos = null;
      state.chunkOverride = null;
      restartCurrentChunk();
    }
  }
  // Go to next sentence
  function goNextSentence(){
    const u = state.units[state.unitIdx];
    if(!u || !u.sents) return;
    if(state.sentIdx < u.sents.length - 1){
      state.sentIdx++;
      state.wordPos = null;
      state.chunkOverride = null;
      restartCurrentChunk();
    } else {
      // Next sentence in next unit
      advanceChunk();
    }
  }
  function speakChain(rid){
    if(rid !== state.runId) return;
    // advance to next unit that has content
    while(state.unitIdx < state.units.length){
      const u = state.units[state.unitIdx];
      if(!u._ready) activateUnit(u);
      if(u.sents && u.sents.length && state.sentIdx < u.sents.length) break;
      savePos();
      state.unitIdx++; state.sentIdx = 0; state.wordPos = null;
    }
    if(state.unitIdx >= state.units.length){ finishRun(); return; }
    const u = state.units[state.unitIdx];
    const s = u.sents[state.sentIdx];
    // A mid-sentence restart (rate/voice change, resume) narrows the chunk
    // from the current word onward via chunkOverride.
    const a = (state.chunkOverride != null) ? Math.max(state.chunkOverride, s.a) : s.a;
    state.chunkOverride = null;
    const text = u.spoken.slice(a, s.b);
    if(!text.trim()){ state.sentIdx++; speakChain(rid); return; }
    const utt = new SpeechSynthesisUtterance(text);
    // pickVoice() prefers a hi-* voice (mobile rule: an Android English
    // engine given Devanagari text completes SILENTLY — no audio, while the
    // rAF highlighter keeps moving). Desktop Edge has no Hindi voice, falls
    // back to its English voice, which DOES vocalize Devanagari — the old
    // behavior that works on PC stays intact.
    const v = pickVoice();
    if(v){ utt.voice = v; utt.lang = v.lang; }
    else if(/[\u0900-\u097F]/.test(text)) utt.lang = 'hi-IN';   // no voices at all yet: let the OS choose
    utt.rate = state.rate;
    utt.volume = 1.0;  // Explicitly set volume to max
    utt.pitch = 1.0;   // Normal pitch
    const myRun = rid, myU = state.unitIdx, myS = state.sentIdx;
    utt.onstart = () => {
      if(myRun !== state.runId) return;
      console.log('TTS Debug: onstart fired — engine ACTUALLY speaking');
    };
    utt.onboundary = (e) => {
      if(myRun !== state.runId || myU !== state.unitIdx || myS !== state.sentIdx) return;
      if(typeof e.charIndex === 'number'){
        state.boundarySeen = true;
        state.wordPos = a + e.charIndex;
        updateWord(u, state.wordPos);
      }
    };
    utt.onend = () => { if(myRun !== state.runId) return; advanceChunk(); };
    utt.onerror = (e) => {
      if(myRun !== state.runId) return;
      // cancel()/pause()-triggered noise — the stop/restart path owns it.
      if(e && (e.error === 'interrupted' || e.error === 'canceled')) {
        console.log('TTS Debug: Speech interrupted/cancelled');
        return;
      }
      console.log('TTS Debug: Speech error:', e && e.error, e && e.message);
      advanceChunk();                                  // real error: skip this chunk, keep going
    };
    state.wordPos = a;
    state.boundarySeen = false;
    state.sentStartedAt = performance.now();
    state.pauseAccum = 0;
    state.pauseAt = 0;
    state.chunkStart = a;
    state.chunkLen = s.b - a;                          // timed estimate uses the spoken slice length
    updateWord(u, a);
    console.log('TTS Debug: Speaking chunk', state.sentIdx, 'of', u.sents.length, '- text:', text.substring(0, 50) + '...');
    console.log('TTS Debug: Voice:', v ? v.name + ' (' + v.lang + ')' : 'none', 'Rate:', state.rate);
    // Mobile Chrome: explicitly resume synthesis before speaking
    if(synth.paused) synth.resume();
    synth.speak(utt);
    console.log('TTS Debug: synth.speaking:', synth.speaking, 'synth.pending:', synth.pending);
    startRaf(rid);
    updatePanel();
  }
  function advanceChunk(){
    state.sentIdx++; state.wordPos = null;
    speakChain(state.runId);
  }
  // Rate/voice changed mid-chunk (or resume after pause): cancel + re-speak
  // the current chunk from the current word. A tiny delay after cancel() —
  // speak() immediately after cancel() is silently dropped on some Chromium
  // builds.
  function restartCurrentChunk(){
    const u = state.units[state.unitIdx];
    const s = u && u.sents && u.sents[state.sentIdx];
    state.chunkOverride = s ? currentChunkStartWord(u, s) : null;
    const rid = ++state.runId;
    stopRaf();
    clearHighlight();
    synth.cancel();
    setTimeout(() => {
      if(rid !== state.runId) return;
      state.sentStartedAt = performance.now();
      state.pauseAccum = 0;
      speakChain(rid);
    }, 60);
  }
  function finishRun(){
    state.status = 'idle';
    state.unitIdx = 0; state.sentIdx = 0; state.wordPos = null; state.chunkOverride = null;
    stopRaf(); clearHighlight();
    if(state.bookId) lsSet(POS_PREFIX + state.bookId, '');   // nothing left to continue
    if(state.dl) finalizeDownload(true);
    toast('सुनना पूर्ण / Finished');
    updatePanel();
  }

  /* ---------------- Transport ---------------- */
  function play(fromUnit, fromSent){
    if(!supported) {
      toast('Web Speech API not supported in this browser');
      console.log('TTS Debug: supported=false');
      return;
    }
    if(!state.units.length) {
      toast('No content to read');
      return;
    }

    // Check for available voices - mobile Chrome needs user interaction first
    if(!state.voices || state.voices.length === 0) {
      // Force reload voices on user interaction (required for mobile)
      loadVoices();
      const voices = synth.getVoices() || [];
      if(voices.length > 0) {
        state.voices = voices;
        state.voices.sort((a, b) => {
          const an = /natural/i.test(a.name) ? 0 : 1, bn = /natural/i.test(b.name) ? 0 : 1;
          if(an !== bn) return an - bn;
          return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
        });
        refreshVoiceSelect();
      } else {
        toast('No voices available yet. Wait 2 seconds and try again.');
        console.log('TTS Debug: No voices loaded yet, reloading...');
        setTimeout(loadVoices, 500);
        setTimeout(loadVoices, 1500);
        return;
      }
    }
    const picked = pickVoice();
    console.log('TTS Debug: Voices count:', state.voices.length);
    console.log('TTS Debug: Picked voice:', picked ? picked.name + ' (' + picked.lang + ')' : 'none');
    console.log('TTS Debug: synth.paused:', synth.paused, 'synth.speaking:', synth.speaking);
    if(!picked) {
      toast('No suitable voice. Available: ' + state.voices.length + ' voices');
      const voiceList = state.voices.map(v => v.name + ' (' + v.lang + ')').join(', ');
      console.log('TTS Debug: All voices:', voiceList);
      return;
    }
    const rid = ++state.runId;
    stopRaf();
    if(fromUnit != null){ state.unitIdx = fromUnit; state.sentIdx = fromSent || 0; }
    state.wordPos = null;
    state.chunkOverride = null; state.chunkLen = 0;
    state.status = 'playing';
    const start = () => { if(rid === state.runId) speakChain(rid); };
    // Fresh queue → speak SYNCHRONOUSLY inside the tap (mobile TTS engines
    // ignore speak() kicked off from a timer after the gesture, and cancel()
    // on an idle queue can wedge Android Chrome). Only when something is
    // genuinely still speaking/pending do we cancel + wait 60ms first.
    if(synth.speaking || synth.pending){
      console.log('TTS Debug: queue busy — cancel + 60ms then start');
      synth.cancel();
      setTimeout(start, 60);
    } else {
      start();
    }
    updatePanel();
  }
  function pause(){
    if(state.status !== 'playing') return;
    state.status = 'paused';
    state.pauseAt = performance.now();
    stopRaf();
    synth.pause();
    savePos();
    updatePanel();
  }
  function resume(){
    if(state.status !== 'paused') return;
    state.status = 'playing';
    state.pauseAccum += performance.now() - state.pauseAt;
    // Chromium sometimes refuses to resume a long-paused utterance — the
    // safe universal path is cancel + re-speak the current chunk.
    restartCurrentChunk();
    updatePanel();
  }
  function togglePlay(){
    if(state.status === 'playing') pause();
    else if(state.status === 'paused') resume();
    else play(state.unitIdx >= state.units.length ? 0 : state.unitIdx, 0);
  }
  function stop(){
    if(state.status === 'idle' && !state.dl) return;
    state.runId++;
    stopRaf();
    clearHighlight();
    savePos();
    synth.cancel();
    state.status = 'idle';
    state.wordPos = null;
    if(state.dl) finalizeDownload(false);
    updatePanel();
  }

  /* ---------------- Audio download (tab-audio capture) ----------------
     speechSynthesis exposes no audio stream, so the only keyless way to get
     a file is recording the tab's own audio while the text is spoken. The
     browser's share picker opens — user must select THIS tab and tick
     "Share tab audio" (a manual step no script can click). */
  async function downloadAudio(){
    if(!supported) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia){
      toast('इस ब्राउज़र में ऑडियो कैप्चर उपलब्ध नहीं / Capture not supported'); return;
    }
    stop();
    let stream;
    try{
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }catch(e){ toast('रिकॉर्डिंग रद्द / Recording cancelled'); return; }
    const audioTracks = stream.getAudioTracks();
    if(!audioTracks.length){
      stream.getTracks().forEach(t => t.stop());
      toast('टैब चुनते समय "Share tab audio" टिक करें / Tick "Share tab audio"');
      return;
    }
    const mime = (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) ? 'audio/webm;codecs=opus' : '';
    const rec = new MediaRecorder(new MediaStream(audioTracks), mime ? { mimeType: mime } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if(e.data && e.data.size) chunks.push(e.data); };
    state.dl = { rec, chunks, mime, stream };
    rec.start(250);
    toast('रिकॉर्डिंग चालू — पूरा पाठ पढ़ा जाएगा / Recording — speaking full text');
    updatePanel();
    play(0, 0);   // full scope from the start; Stop button ends it early and still saves
  }
  async function finalizeDownload(naturalEnd){
    const dl = state.dl;
    if(!dl) return;
    state.dl = null;
    try{ if(dl.rec.state !== 'inactive') dl.rec.stop(); }catch(e){ /* already stopped */ }
    try{ await Promise.race([new Promise(res => { const t = setTimeout(res, 2000); dl.rec.addEventListener('stop', () => { clearTimeout(t); res(); }, { once: true }); }), new Promise(res => setTimeout(res, 2500))]); }catch(e){ /* whatever — chunks below decide */ }
    dl.stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(dl.chunks, { type: dl.mime || 'audio/webm' });
    if(blob.size < 512){ toast('ऑडियो नहीं मिला — "Share tab audio" टिक किया था? / No audio captured'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VallabhaVani-listen-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.webm';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    toast((naturalEnd ? 'डाउनलोड तैयार / Saved: ' : 'अब तक का रिकॉर्डेड: ') + Math.round(blob.size / 1024) + ' KB');
  }

  /* ---------------- Panel (UI component) ---------------- */
  function voiceOptionsHtml(){
    if(!state.voices.length) return `<option value="">लोड हो रहा है…</option>`;
    return state.voices.map(v =>
      `<option value="${v.voiceURI}" ${v.voiceURI === (pickVoice() || {}).voiceURI ? 'selected' : ''}>${v.name} (${v.lang})</option>`
    ).join('');
  }
  function openPanel(opts){
    stop();                                              // never rebuild units under a live playback chain
    closePanel(true);                                    // silent — stop() already ran above
    state.bookId = opts.bookId;
    state.scopeLabel = opts.scopeLabel || '';
    state.content = opts.content;
    state.reveal = opts.reveal || null;
    state.units = buildUnits(opts.book, opts.chapters);
    state.unitIdx = 0; state.sentIdx = 0; state.wordPos = null;

    const panel = document.createElement('div');
    panel.className = 'listen-panel';
    panel.innerHTML = `
      <div class="lp-row">
        <button class="lp-btn lp-play" id="lp-play" title="चलाएँ / Pause (Space)">${ICON_PLAY}</button>
        <button class="lp-btn" id="lp-stop" title="रोकें / Stop (Esc)">${ICON_STOP_SQ}</button>
        <button class="lp-btn" id="lp-dl" title="ऑडियो डाउनलोड करें / Download audio">${ICON_DOWNLOAD}</button>
        <select id="lp-voice" title="आवाज़ / Voice">${voiceOptionsHtml()}</select>
        <select id="lp-rate" title="गति / Speed">
          ${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(r => `<option value="${r}" ${r === state.rate ? 'selected' : ''}>${r}×</option>`).join('')}
        </select>
        <button class="lp-btn lp-close" id="lp-close" title="बंद करें / Close">${ICON_CLOSE}</button>
      </div>
      <div class="lp-row lp-sub">
        <button class="lp-btn" id="lp-prev-sent" title="पिछला वाक्य / Previous sentence (B)">${ICON_PREV}</button>
        <button class="lp-btn" id="lp-next-sent" title="अगला वाक्य / Next sentence (N)">${ICON_NEXT}</button>
        <span class="lp-ref" id="lp-ref">—</span>
        <button class="lp-continue" id="lp-continue" hidden></button>
        <label class="lp-sync" title="हाइलाइट सिंक / Highlight sync">
          <span>सिंक</span>
          <input type="range" id="lp-sync-range" min="0" max="100" step="1" value="50">
        </label>
        <span id="lp-status" style="font-size:10px;color:#888;">voices: ${state.voices.length}</span>
      </div>`;
    document.body.appendChild(panel);
    state.panel = panel;

    panel.querySelector('#lp-play').onclick = togglePlay;
    panel.querySelector('#lp-stop').onclick = stop;
    panel.querySelector('#lp-dl').onclick = downloadAudio;
    panel.querySelector('#lp-close').onclick = () => closePanel();
    panel.querySelector('#lp-voice').onchange = (e) => {
      setVoice(e.target.value);
      if(state.status === 'playing') restartCurrentChunk();
    };
    panel.querySelector('#lp-rate').onchange = (e) => setRate(e.target.value);
    const syncEl = panel.querySelector('#lp-sync-range');
    syncEl.oninput = (e) => { 
      // Slider value 0-100 maps to sync offset -1500 to +1500ms
      const val = parseInt(e.target.value, 10);
      state.syncMs = Math.round((val - 50) / 50 * 1500);  // -1500 to +1500
      lsSet(LS_SYNC, String(state.syncMs));
    };
    // Update slider to match current syncMs on panel open
    if(state.syncMs) {
      const val = Math.round((state.syncMs / 1500) * 50 + 50);
      syncEl.value = Math.min(100, Math.max(0, val));
    }
    // Prev/Next sentence buttons
    panel.querySelector('#lp-prev-sent').onclick = () => { goPrevSentence(); };
    panel.querySelector('#lp-next-sent').onclick = () => { goNextSentence(); };

    // "Continue" — where the last visit left off on this book. Refreshed
    // again on every stop so a mid-book stop in this session offers it too.
    refreshContinue();
    function refreshContinue(){
      const contBtn = panel.querySelector('#lp-continue');
      if(!contBtn) return;
      const pos = loadPos();
      const idx = pos && pos.chKey ? state.units.findIndex(u => u.chKey === pos.chKey && u.vnum === pos.vnum) : -1;
      if(idx >= 0 && idx !== state.unitIdx){
        contBtn.hidden = false;
        contBtn.textContent = `जारी रखें · ${verseRefLabel(opts.book, pos.chKey, pos.vnum)}`;
        contBtn.onclick = () => play(idx, 0);
      } else {
        contBtn.hidden = true;
      }
    }
    state.refreshContinue = refreshContinue;

    state.keyHandler = (e) => {
      if(e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space'){
        const t = e.target;
        // Not while typing — and let a focused button/link keep its own
        // native Space activation instead of double-firing.
        if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable || t.tagName === 'BUTTON' || t.tagName === 'A')) return;
        e.preventDefault(); togglePlay();
      } else if(e.key === 'Escape'){ stop(); }
      else if(e.key.toLowerCase() === 'b' || e.key === 'ArrowLeft'){ goPrevSentence(); }
      else if(e.key.toLowerCase() === 'n' || e.key === 'ArrowRight'){ goNextSentence(); }
    };
    document.addEventListener('keydown', state.keyHandler);
    updatePanel();
  }
  function closePanel(silent){
    if(state.panel){ state.panel.remove(); state.panel = null; }
    if(state.keyHandler){ document.removeEventListener('keydown', state.keyHandler); state.keyHandler = null; }
    state.refreshContinue = null;
    if(!silent) stop();
  }
  function updatePanel(){
    const p = state.panel;
    if(!p || !document.body.contains(p)) return;
    const playBtn = p.querySelector('#lp-play');
    if(playBtn) playBtn.innerHTML = state.status === 'playing' ? ICON_PAUSE : ICON_PLAY;
    const dlBtn = p.querySelector('#lp-dl');
    if(dlBtn) dlBtn.classList.toggle('recording', !!state.dl);
    const ref = p.querySelector('#lp-ref');
    if(ref){
      const u = state.units[state.unitIdx];
      if(state.status === 'idle' && !state.dl) ref.textContent = state.scopeLabel || '—';
      else if(u) ref.textContent = (state.dl ? '⏺ ' : '') + (state.scopeLabel ? state.scopeLabel + ' · ' : '') + verseRefLabel({ id: state.bookId }, u.chKey, u.vnum);
    }
    if(state.refreshContinue) state.refreshContinue();   // stop/finish may have made a saved position resumable
  }
  function toggle(opts){
    if(state.panel && document.body.contains(state.panel)) closePanel();
    else openPanel(opts);
  }
  // Route change / reader re-render / tab close — kill everything. Idempotent.
  function detach(){
    if(state.status !== 'idle' || state.dl || state.panel){
      state.runId++;
      stopRaf(); clearHighlight();
      if(supported) synth.cancel();
      state.status = 'idle';
      if(state.dl) finalizeDownload(false);
    }
    if(state.panel){ state.panel.remove(); state.panel = null; }
    if(state.keyHandler){ document.removeEventListener('keydown', state.keyHandler); state.keyHandler = null; }
    state.content = null; state.reveal = null;
  }

  if(supported){
    loadVoices();
    // Voices load late (async, and Edge's online natural voices arrive after
    // network init) — re-read on every change.
    if(typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener('voiceschanged', loadVoices);
    setTimeout(loadVoices, 800);   // some builds never fire the event on first load
  }
  window.addEventListener('hashchange', detach);
  window.addEventListener('pagehide', () => { if(supported) synth.cancel(); stopRaf(); });

  return { supported, toggle, detach, stop, setRate, setVoice, openPanel, _state: state };
})();
window.VVListen = VVListen;
