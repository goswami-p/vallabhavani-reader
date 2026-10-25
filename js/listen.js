/* VallabhaVani — Listen: read-aloud via the browser's Web Speech API.
   One reusable engine (VVListen) + a compact player panel. No server, no
   API key — in Microsoft Edge the "… Online (Natural)" voices are free.

   Sentence-by-sentence chaining (one long utterance freezes after ~15 s),
   yellow word-by-word highlight through the CSS Custom Highlight API, and a
   timed estimate (~65 ms per character ÷ rate) as the word-position
   fallback because Edge's natural voices usually send no onboundary events
   (a sync slider trims the estimate). Every playback run gets a runId so
   stale onend/onerror/rAF callbacks from a cancelled run are ignored.
   Audio download = offline MP3 export: every sentence of the panel scope is
   synthesized in the worker, streamed through lamejs (js/lame.min.js) and
   handed to the browser as an .mp3 file — no share-screen/tab capture, works
   on mobile and desktop alike. */

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
    exp: null                         // active MP3 export, if any {cancelled}
  };

  /* ================= OFFLINE (WASM) ENGINE: constants + helpers ================= */
  const LS_ENGINE = 'vv_listen_engine';      // auto | wasm | native
  const LS_BROKEN = 'vv_listen_native_broken';
  const LS_EN = 'vv_listen_envoice';
  const LS_NARR = 'vv_listen_narrator';      // '1' = on, default off
  const HI_VOICE = 'hi_IN-rohan-medium';
  const EN_VOICES = [
    { id: 'en_GB-northern_english_male-medium', label: 'British English' },
    { id: 'en_US-lessac-medium', label: 'US English' },
    { id: 'en_IN-navgurukul-medium', label: 'Indian English' },
    { id: 'en_GB-fantasy-medium', label: 'Fantasy Storyteller' }
  ];
  const PITCH = 0.92;      // <1 = deeper narrator voice, English chunks only, only when narrator is on
  const WASM_CAP = 110;    // chars per chunk for the wasm engine (native keeps MAX_CHUNK = 50)
  const RE_DEV = /[ऀ-ॿ]/g, RE_LAT = /[A-Za-z]/g;   // counting only, use with match()
  const HAS_DEV = /[ऀ-ॿ]/;                          // testing
  const IS_ANDROID = /Android/i.test(navigator.userAgent);
  function lsDel(key){ try{ localStorage.removeItem(key); }catch(e){} }

  Object.assign(state, {
    engine: 'native', actx: null, chain: null, curSrc: null, curU: null,
    audioT0: 0, wordTimes: null, wordIdx: 0, chunkSeq: 0, wasmErrs: 0,
    nativeSuspect: 0, nativeBroken: false, forceNative: false,
    synthCache: new Map(), ttsReady: new Set(),
    ttsVoice: lsGet(LS_EN, EN_VOICES[0].id),
    narrator: lsGet(LS_NARR, '0') === '1'
  });

  const chunkCap = () => state.engine === 'wasm' ? WASM_CAP : MAX_CHUNK;
  const enVoice = () => EN_VOICES.some(v => v.id === state.ttsVoice) ? state.ttsVoice : EN_VOICES[0].id;
  function setStatus(t){ const el = state.panel && state.panel.querySelector('#lp-status'); if(el) el.textContent = t; }
  function unitText(u){ return u.spoken != null ? u.spoken : String(u.raw || '').replace(/<[^>]*>/g, ' '); }
  function crashFlagged(){
    try{ const t = +localStorage.getItem('vvTtsCompile'); return !!t && Date.now() - t < 7 * 864e5; }catch(e){ return false; }
  }

  /* narrator colour: warm low end, presence, parallel mid-band grit */
  function narratorChain(ctx){
    const input = ctx.createGain(), out = ctx.createGain();
    const low = ctx.createBiquadFilter();  low.type = 'lowshelf'; low.frequency.value = 180; low.gain.value = 6;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2400; pres.Q.value = 0.9; pres.gain.value = 3;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1800; band.Q.value = 0.7;
    const shaper = ctx.createWaveShaper();
    const k = 40, n = 1024, curve = new Float32Array(n);
    for(let i = 0; i < n; i++){ const x = i * 2 / (n - 1) - 1; curve[i] = Math.tanh(k * x) / Math.tanh(k); }
    shaper.curve = curve; shaper.oversample = '2x';
    const grit = ctx.createGain(); grit.gain.value = 0.12;
    input.connect(low); low.connect(pres); pres.connect(out);
    low.connect(band); band.connect(shaper); shaper.connect(grit); grit.connect(out);
    return { input, output: out };
  }

  /* Must run synchronously inside the user's tap (playWasm calls it before any await). */
  function unlockAudio(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    if(!state.actx){ state.actx = new AC(); state.chain = null; }
    if(state.actx.state === 'suspended') state.actx.resume();
    if(!state.chain){ state.chain = narratorChain(state.actx); state.chain.output.connect(state.actx.destination); }
    try {
      const b = state.actx.createBuffer(1, 1, 22050), s = state.actx.createBufferSource();
      s.buffer = b; s.connect(state.actx.destination); s.start(0);
    } catch(e){}
    return true;
  }

  function wasmCapable(){
    if(!(typeof Worker === 'function' && typeof WebAssembly === 'object' && 'caches' in self)) return false;
    if(crashFlagged()) return false;
    if(navigator.deviceMemory && navigator.deviceMemory < 2) return false;
    return true;
  }

  function chooseEngine(){
    if(state.forceNative && supported) return 'native';
    const pref = lsGet(LS_ENGINE, 'auto');
    if(pref === 'wasm') return 'wasm';
    if(!supported) return 'wasm';
    if(pref === 'native') return 'native';
    const broken = state.nativeBroken || (+lsGet(LS_BROKEN, '0') > Date.now() - 30 * 864e5);
    return ((IS_ANDROID || broken) && wasmCapable()) ? 'wasm' : 'native';
  }

  /* Two strikes before switching. Returns true if it switched engines. */
  function suspectNative(why, weight){
    if(state.forceNative || lsGet(LS_ENGINE, 'auto') === 'native') return false;   // respect manual choice
    if(state.status !== 'playing') return false;
    state.nativeSuspect += (weight || 1);
    console.log('TTS: native suspect', state.nativeSuspect, why);
    if(state.nativeSuspect < 2 || !wasmCapable()) return false;
    state.nativeBroken = true; lsSet(LS_BROKEN, String(Date.now()));
    if(synth) synth.cancel();
    toast('Device voice is silent here, switching to offline voice');
    playWasm(state.unitIdx, state.sentIdx);
    return true;
  }

  let ttsLoad = null;

  function loadHiTTS(){
    if(window.VVTTS) return Promise.resolve();
    return ttsLoad || (ttsLoad = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/tts/tts-engine.js';
      s.onload = () => window.VVTTS ? res() : (ttsLoad = null, rej(new Error('VVTTS global missing')));
      s.onerror = () => { ttsLoad = null; rej(new Error('/tts/tts-engine.js failed to load')); };
      document.head.appendChild(s);
    }));
  }

  /* Which voices does this article need? Counts letters by script across all units. */
  function neededVoices(){
    let D = 0, L = 0;
    state.units.forEach(u => {
      const t = unitText(u);
      D += (t.match(RE_DEV) || []).length;
      L += (t.match(RE_LAT) || []).length;
    });
    const tot = D + L, en = enVoice();
    const needHi = D > 0 && D >= 0.10 * tot, needEn = L > 0 && L >= 0.10 * tot;
    const out = [];
    if(needEn || (!needHi)) out.push(en);
    if(needHi) out.push(HI_VOICE);
    return out;
  }

  /* Per chunk: returns a loaded voice id, or null = skip (Devanagari chunk but Hindi voice not loaded). */
  function voiceForChunk(text){
    const d = (text.match(RE_DEV) || []).length, l = (text.match(RE_LAT) || []).length;
    const ready = state.ttsReady;
    if(d > 0 && d >= l) return ready.has(HI_VOICE) ? HI_VOICE : null;
    const en = enVoice();
    if(ready.has(en)) return en;
    for(const v of ready) return v;                 // Latin text, only some other voice is loaded
    return null;
  }
  const chainFor = voice => !!(state.narrator && state.chain && voice && !/^hi_/.test(voice));
  function rateFor(voice){
    const mr = Math.min(1.5, Math.max(0.75, state.rate / (chainFor(voice) ? PITCH : 1)));
    return { mr, resid: state.rate / mr };
  }

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
    if(!sel) return;
    sel.innerHTML = voiceOptionsHtml();
    sel.value = currentVoiceValue();
    const status = state.panel && state.panel.querySelector('#lp-status');
    if(status) status.textContent = EN_VOICES.length + ' offline · ' + state.voices.length + ' device';
  }
  function pickVoice(text){
    // 1. User's explicit choice
    if(state.voiceURI) {
      const v = state.voices.find(v => v.voiceURI === state.voiceURI);
      if(v) return v;
    }
    // 2. Script-aware defaults — on Android Chrome an English engine given
    //    Devanagari text outputs SILENCE; Edge's Natural voices are
    //    desktop-only. English text prefers English voices.
    const natural = state.voices.find(v => /natural/i.test(v.name) && /^en/i.test(v.lang));
    const online = state.voices.find(v => /^en/i.test(v.lang) && /online/i.test(v.name));
    const anyEn = state.voices.find(v => /^en/i.test(v.lang));
    const hi = state.voices.find(v => /^hi/i.test(v.lang));
    const englishText = !!text && !HAS_DEV.test(text);
    const order = englishText ? [natural, online, anyEn, hi] : [hi, natural, online, anyEn];
    return order.find(Boolean) || state.voices[0] || null;
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
    state.synthCache.clear();
    if(window.VVTTS && VVTTS.flush) VVTTS.flush();
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
     the engine's chunk size at a word boundary (long utterances freeze ~15 s in). */
  function sentencesOf(spoken, cap){
    // cap override: the MP3 export always chunks at the wasm size regardless
    // of the live engine. The typeof guard keeps test-listen-core.js's
    // function-extraction eval working (chunkCap is an arrow const, not
    // extractable by its `function name` grab).
    const CAP = cap || (typeof chunkCap === 'function' ? chunkCap() : MAX_CHUNK);
    const raw = [];
    const re = /[^.!?।॥…\n]+[.!?।॥…]+(?=\s|$)|[^.!?।॥…\n]+(?=\n|$)/g;
    let m;
    while((m = re.exec(spoken))) raw.push({ a: m.index, b: m.index + m[0].length });
    if(!raw.length && spoken.length) raw.push({ a: 0, b: spoken.length });
    const out = [];
    raw.forEach(s => {
      let a = s.a;
      while(s.b - a > CAP){
        let cut = spoken.lastIndexOf(' ', a + CAP);
        if(cut <= a) cut = a + CAP;
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
  function activateUnit(u, ahead){
    if(!ahead && state.reveal) state.reveal(u.chKey, u.vnum);
    const root = state.content;
    const els = [];
    if(root){
      u.sels.forEach(sel => {
        root.querySelectorAll(sel).forEach(el => { if(!els.includes(el)) els.push(el); });
      });
    }
    if(ahead && !els.length) return false;       // not rendered yet: leave it for the real activation
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
    u._ready = true; u._ahead = !!ahead; u._cap = chunkCap();
    return true;
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
      if(u._ahead){ u._ready = false; u._ahead = false; }     // only pre-read for prefetch: do the real activation (with reveal)
      if(!u._ready) activateUnit(u);
      else if(u._cap !== chunkCap()){                          // engine changed since this unit was chunked
        const old = u.sents && u.sents[state.sentIdx], anchor = old ? old.a : 0;
        activateUnit(u);
        let i = 0;
        while(i + 1 < u.sents.length && u.sents[i + 1].a <= anchor) i++;
        state.sentIdx = i;
      }
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

    if(state.engine === 'wasm'){ speakWasmChunk(rid, u, s, a, text); return; }

    const utt = new SpeechSynthesisUtterance(text);
    // pickVoice(text) prefers a hi-* voice only for Devanagari text (mobile
    // rule: an Android English engine given Devanagari completes SILENTLY);
    // English text prefers English voices. Desktop Edge stays as before.
    const v = pickVoice(text);
    if(v){ utt.voice = v; utt.lang = v.lang; }
    else if(HAS_DEV.test(text)) utt.lang = 'hi-IN';   // no voices at all yet: let the OS choose
    utt.rate = state.rate;
    utt.volume = 1.0;  // Explicitly set volume to max
    utt.pitch = 1.0;   // Normal pitch
    const myRun = rid, myU = state.unitIdx, myS = state.sentIdx;
    const t0 = performance.now(); let started = false;
    const startTimer = setTimeout(() => {
      if(myRun === state.runId && !started && !synth.paused) suspectNative('no onstart in 1.5s', IS_ANDROID ? 2 : 1);
    }, 1500);
    utt.onstart = () => {
      started = true; clearTimeout(startTimer);
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
    utt.onend = () => {
      clearTimeout(startTimer);
      if(myRun !== state.runId) return;
      if(text.length >= 20 && performance.now() - t0 < 150){
        if(suspectNative('onend in <150ms')) return;
      } else state.nativeSuspect = 0;
      advanceChunk();
    };
    utt.onerror = (e) => {
      clearTimeout(startTimer);
      if(myRun !== state.runId) return;
      // cancel()/pause()-triggered noise — the stop/restart path owns it.
      if(e && (e.error === 'interrupted' || e.error === 'canceled')){
        console.log('TTS Debug: Speech interrupted/cancelled');
        return;
      }
      console.log('TTS Debug: Speech error:', e && e.error, e && e.message);
      if(e && /synthesis|language|voice-unavailable|not-allowed|network/.test(e.error || '')){
        if(suspectNative('error ' + e.error, 2)) return;
      }
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
    if(state.engine === 'wasm'){
      stopWasmAudio();
      if(state.actx && state.actx.state === 'suspended' && state.status === 'playing') state.actx.resume();
      speakChain(rid);                             // nothing to cancel in the OS, no 60ms wait
      return;
    }
    synth.cancel();
    // Tiny delay after cancel() — speak() immediately after cancel() is
    // silently dropped on some Chromium builds.
    setTimeout(() => {
      if(rid !== state.runId) return;
      state.sentStartedAt = performance.now();
      state.pauseAccum = 0;
      speakChain(rid);
    }, 60);
  }
  function finishRun(){
    killSrc();
    state.status = 'idle';
    state.unitIdx = 0; state.sentIdx = 0; state.wordPos = null; state.chunkOverride = null;
    stopRaf(); clearHighlight();
    if(state.bookId) lsSet(POS_PREFIX + state.bookId, '');   // nothing left to continue
    toast('सुनना पूर्ण / Finished');
    updatePanel();
  }

  /* ---------------- Offline (wasm) engine: playback, cache, prefetch ---------------- */
  function killSrc(){
    const s = state.curSrc; state.curSrc = null;
    if(s){ s.onended = null; try { s.stop(); } catch(e){} try { s.disconnect(); } catch(e){} }
  }
  function stopWasmAudio(){
    killSrc();
    state.wordTimes = null;
    if(window.VVTTS && VVTTS.flush) VVTTS.flush();
  }

  async function ensureOffline(names){
    await loadHiTTS();
    if(!window.VVTTS || !VVTTS.supported) throw new Error('this browser lacks Worker, WASM or Cache API');
    state.ttsReady.clear();
    const miss = [];
    for(const n of names){ if(!(await VVTTS.isInstalled(n))) miss.push(n); }
    if(miss.length){
      const cached = (await Promise.all(Object.keys(VVTTS.VOICES).map(n => VVTTS.isInstalled(n)))).some(Boolean);
      const mb = miss.reduce((t, n) => t + (VVTTS.VOICES[n] ? VVTTS.VOICES[n].mb : 60), 0) + (cached ? 0 : 30);
      const labels = miss.map(n => VVTTS.VOICES[n] ? VVTTS.VOICES[n].label : n).join(' + ');
      if(!confirm('Download offline voice (' + labels + ', about ' + mb + ' MB, one time)? Wi-Fi is best.')){
        const e = new Error('declined'); e.declined = true; throw e;
      }
      if(VVTTS.persist) VVTTS.persist();
    }
    let lastKind = '';
    await VVTTS.ensureVoices(names, {
      respectCrash: lsGet(LS_ENGINE, 'auto') !== 'wasm',   // manual "Offline voice" bypasses the crash flag
      onProgress: p => {
        const f = p.file || '';
        const kind = /phonemizer/.test(f) ? 'speech engine' : /starting/.test(f) ? 'starting engine' : /model/.test(f) ? 'voice' : '';
        if(!kind) return;
        const mbTxt = p.total ? ' ' + Math.round(p.loaded / 1048576) + '/' + Math.round(p.total / 1048576) + ' MB' : '';
        setStatus(kind + ' ' + (p.pct || 0) + '%' + mbTxt);
        if(kind !== lastKind){ lastKind = kind; toast('Offline voice: ' + kind + '...'); }
      },
      onError: e => console.log('VVTTS error:', (e && e.message) || e)
    });
    names.forEach(n => state.ttsReady.add(n));
    setStatus('offline voice ready');
  }

  async function playWasm(fromUnit, fromSent){
    const gotCtx = unlockAudio();                    // synchronous, still inside the tap
    const rid = ++state.runId;
    stopWasmAudio(); stopRaf();
    state.engine = 'wasm';
    if(fromUnit != null){ state.unitIdx = fromUnit; state.sentIdx = fromSent || 0; }
    state.wordPos = null; state.chunkOverride = null; state.chunkLen = 0;
    state.status = 'playing';
    updatePanel();
    try {
      if(!gotCtx) throw new Error('Web Audio is not available in this browser');
      await ensureOffline(neededVoices());
    } catch(err){
      if(rid !== state.runId || state.status !== 'playing') return;   // user paused/stopped meanwhile
      console.log('TTS wasm init failed:', err && err.message);
      state.engine = 'native';
      if(!supported){
        state.status = 'idle'; updatePanel();
        toast('Offline voice failed: ' + (err && err.message));
        return;
      }
      state.forceNative = true;                      // reset when the user changes the engine list
      toast(err && err.declined ? 'Using device voice (can be silent on some phones)' : 'Offline voice unavailable (' + (err && err.message) + '), using device voice');
      play(fromUnit, fromSent);
      return;
    }
    if(rid !== state.runId) return;
    state.wasmErrs = 0;
    speakChain(rid);
  }

  function wasmAudio(text, voice){
    const mr = rateFor(voice).mr;
    const k = mr.toFixed(2) + '|' + voice + '|' + text;
    let p = state.synthCache.get(k);
    if(!p){
      p = VVTTS.synth(text, mr, voice);
      p.catch(() => state.synthCache.delete(k));
      state.synthCache.set(k, p);
      while(state.synthCache.size > 8) state.synthCache.delete(state.synthCache.keys().next().value);
    }
    return p;
  }

  /* next n chunks, across units, without touching the page (no reveal side effects) */
  function peekChunks(n){
    const out = []; let ui = state.unitIdx, si = state.sentIdx + 1;
    const cap = chunkCap();
    while(out.length < n && ui < state.units.length){
      const u = state.units[ui];
      if(!u._ready){ if(!activateUnit(u, true)) break; }
      else if(u._cap !== cap) break;
      if(u.sents && si < u.sents.length){
        const s = u.sents[si++], t = u.spoken.slice(s.a, s.b);
        if(t.trim()){ const v = voiceForChunk(t); if(v) out.push({ text: t, voice: v }); }
      } else { ui++; si = 0; }
    }
    return out;
  }

  function audibleRange(x, sr, th){
    th = th || 0.01; const pad = Math.round(sr * 0.03);
    let i = 0, j = x.length;
    while(i < j && Math.abs(x[i]) < th) i++;
    while(j > i && Math.abs(x[j - 1]) < th) j--;
    return [Math.max(0, i - pad), Math.min(x.length, j + pad)];
  }

  /* exact audio duration spread over words by syllable-ish weight (Latin vowel groups, Devanagari aksharas) */
  function wordSchedule(spoken, a, b, dur){
    const out = [], re = /\S+/g, slice = spoken.slice(a, b); let m, total = 0;
    while((m = re.exec(slice))){
      const w = m[0];
      const dev = (w.match(/[ऀ-ॹ](?!्)/g) || []).length;
      const lat = (w.match(/[aeiouy]+/gi) || []).length;
      let wt = Math.max(1, dev || lat || Math.ceil(w.length / 3));
      if(/[,;:]$/.test(w)) wt += 1.5;
      if(/[।॥.!?]$/.test(w)) wt += 3;
      out.push({ pos: a + m.index, wt }); total += wt;
    }
    let acc = 0;
    out.forEach(o => { o.t = (acc / total) * dur; acc += o.wt; });
    return out;
  }

  async function speakWasmChunk(rid, u, s, a, text){
    killSrc();
    const my = ++state.chunkSeq;                     // guards against overlap with advanceChunk / next-sentence
    const voice = voiceForChunk(text);
    state.wordPos = a; state.chunkStart = a; state.chunkLen = s.b - a;
    state.boundarySeen = true; state.wordTimes = null; state.wordIdx = 0; state.curU = u;
    updateWord(u, a);
    startWasmRaf(rid);
    updatePanel();
    const skip = () => setTimeout(() => { if(rid === state.runId && my === state.chunkSeq) advanceChunk(); }, 0);
    if(!voice || !/[A-Za-zऀ-ॿ0-9]/.test(text)){ console.log('TTS wasm: skipping chunk (no usable voice or no letters)'); skip(); return; }

    const cur = wasmAudio(text, voice);              // current first, then prefetch (worker queue is serial)
    peekChunks(2).forEach(c => wasmAudio(c.text, c.voice).catch(() => {}));
    let r;
    try { r = await cur; }
    catch(err){
      if(rid !== state.runId || my !== state.chunkSeq || (err && err.cancelled)) return;
      state.wasmErrs++;
      console.log('TTS wasm synth error (' + state.wasmErrs + '):', err && err.message);
      if(state.wasmErrs < 3){ skip(); return; }
      if(state.status !== 'playing') return;
      state.engine = 'native';
      if(!supported){ toast('Offline voice failed: ' + (err && err.message)); stop(); return; }
      state.forceNative = true;
      toast('Offline voice keeps failing, using device voice');
      play(state.unitIdx, state.sentIdx);
      return;
    }
    if(rid !== state.runId || my !== state.chunkSeq) return;
    state.wasmErrs = 0;
    console.log('TTS wasm [' + voice + ']: ' + r.ms.toFixed(0) + ' ms for ' + (r.samples.length / r.sampleRate).toFixed(2) + ' s audio');

    const ctx = state.actx, sr = r.sampleRate;
    const [i0, i1] = audibleRange(r.samples, sr);
    const pcm = r.samples.subarray(i0, i1);
    const buf = ctx.createBuffer(1, Math.max(1, pcm.length), sr);
    if(pcm.length) buf.copyToChannel(pcm, 0);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const resid = rateFor(voice).resid;
    src.playbackRate.value = resid;
    src.connect(chainFor(voice) ? state.chain.input : ctx.destination);   // narrator chain: English only, only when on

    const gap = /[.!?।॥…]\s*$/.test(text) ? 0.18 : 0.04;
    state.audioT0 = ctx.currentTime + gap;
    state.wordTimes = wordSchedule(u.spoken, a, s.b, buf.duration / resid);
    state.wordIdx = 0;
    src.onended = () => {
      if(rid !== state.runId || state.curSrc !== src) return;
      state.curSrc = null; advanceChunk();
    };
    state.curSrc = src;
    src.start(state.audioT0);
  }

  function startWasmRaf(rid){
    stopRaf();
    const tick = () => {
      if(rid !== state.runId || state.engine !== 'wasm' || state.status !== 'playing') return;
      wasmTick();
      state.rafId = requestAnimationFrame(tick);
    };
    state.rafId = requestAnimationFrame(tick);
  }
  function wasmTick(){
    const wt = state.wordTimes;
    if(!wt || !wt.length || !state.curSrc || !state.curU) return;
    // audio clock freezes when suspended, so pause stays in sync. Positive syncMs = highlight leads (same as native).
    const t = state.actx.currentTime - state.audioT0 + (state.syncMs || 0) / 1000;
    if(t < 0) return;
    let i = state.wordIdx;
    while(i + 1 < wt.length && wt[i + 1].t <= t) i++;
    if(i !== state.wordIdx || state.wordPos !== wt[i].pos){
      state.wordIdx = i; state.wordPos = wt[i].pos; updateWord(state.curU, state.wordPos);
    }
  }

  /* ---------------- Transport ---------------- */
  function play(fromUnit, fromSent){
    if(!state.units.length) {
      toast('No content to read');
      return;
    }
    if(state.exp){
      toast('MP3 बन रहा है — रोकने के लिए Stop दबाएँ / MP3 export running');
      return;
    }
    const eng = chooseEngine();
    if(eng === 'wasm'){ playWasm(fromUnit, fromSent); return; }
    if(IS_ANDROID && lsGet(LS_ENGINE, 'auto') === 'auto' && crashFlagged())
      toast('Offline voice crashed this phone earlier — pick an offline voice from the list to force a retry.');
    state.engine = 'native';
    stopWasmAudio();
    if(!supported) {
      toast('Web Speech API not supported in this browser');
      console.log('TTS Debug: supported=false');
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
    if(state.engine === 'wasm'){ if(state.actx) state.actx.suspend(); }   // freezes audio and the highlight clock together
    else synth.pause();
    savePos();
    updatePanel();
  }
  function resume(){
    if(state.status !== 'paused') return;
    state.status = 'playing';
    if(state.engine === 'wasm'){
      if(state.actx) state.actx.resume();
      startWasmRaf(state.runId);
      updatePanel();
      return;
    }
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
    if(state.status === 'idle' && !state.exp) return;
    state.runId++;
    stopRaf();
    clearHighlight();
    savePos();
    stopWasmAudio();
    if(state.actx && state.actx.state === 'suspended') state.actx.resume();   // never leave it frozen
    synth.cancel();
    state.status = 'idle';
    state.wordPos = null;
    if(state.exp) state.exp.cancelled = true;   // MP3 export aborts at its next checkpoint
    updatePanel();
  }

  /* ---------------- Audio download: offline MP3 export ----------------
     The wasm engine already holds the voice, so no share-screen/tab capture
     is needed: every sentence of the panel scope is synthesized in the
     worker, each chunk is rendered through a tiny per-chunk
     OfflineAudioContext (narrator chain + speed residual, exactly matching
     live playback), streamed into the vendored lamejs encoder
     (js/lame.min.js, lazy-loaded) and saved as .mp3 via a[download]
     (share-sheet fallback only where a[download] is unsupported). Works on
     mobile and desktop; Stop cancels at the next checkpoint. */
  const EXP_CANCELLED = { name: 'ExportCancelled' };
  let lameLoad = null;
  function loadLame(){
    if(window.lamejs) return Promise.resolve(window.lamejs);
    return lameLoad || (lameLoad = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/js/lame.min.js';
      s.onload = () => window.lamejs ? res(window.lamejs) : (lameLoad = null, rej(new Error('lamejs global missing')));
      s.onerror = () => { lameLoad = null; rej(new Error('/js/lame.min.js failed to load')); };
      document.head.appendChild(s);
    }));
  }
  function saveBlob(blob, name){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    if('download' in a){                                   // every current mobile + desktop browser
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else if(typeof File === 'function' && navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: blob.type })] })){
      navigator.share({ files: [new File([blob], name, { type: blob.type })] }).catch(() => {});
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else {
      window.open(url, '_blank');
    }
  }
  // Spoken text for export without any reveal side effects: real DOM
  // textContent when the unit is rendered (reformat + card mode always are),
  // else the raw data with HTML tags stripped (reformat's `hi` holds HTML).
  function exportSpoken(u){
    const root = state.content;
    const els = [];
    if(root){
      u.sels.forEach(sel => {
        root.querySelectorAll(sel).forEach(el => { if(!els.includes(el)) els.push(el); });
      });
    }
    if(els.length){
      let shown = '';
      els.forEach(el => { shown += el.textContent + ' '; });
      return cleanWithMap(shown).spoken;
    }
    return cleanWithMap(String(u.raw || '').replace(/<[^>]*>/g, ' ')).spoken;
  }
  // One chunk: [gap] + silence-trimmed PCM, played at rate residual through
  // the narrator chain when live playback would have used it.
  async function renderExportChunk(p, sr){
    const dur = p.gap + (p.pcm.length / p.sr) / p.resid + 0.05;
    const off = new OfflineAudioContext(1, Math.ceil(dur * sr), sr);
    let dest = off.destination;
    if(p.chain){ const c = narratorChain(off); c.output.connect(off.destination); dest = c.input; }
    const buf = off.createBuffer(1, p.pcm.length, p.sr);
    buf.copyToChannel(p.pcm, 0);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = p.resid;
    src.connect(dest);
    src.start(p.gap);
    return off.startRendering();
  }
  async function downloadMp3(){
    if(state.exp) return;                                  // already exporting
    if(!state.units.length){ toast('No content to read'); return; }
    if(!wasmCapable()){ toast('इस ब्राउज़र में MP3 एक्सपोर्ट उपलब्ध नहीं / MP3 export needs a modern browser'); return; }
    stop();                                                // playback (and any stale run) out of the way
    unlockAudio();                                         // sync, still in the tap: chainFor() must see the chain
    state.exp = { cancelled: false };
    updatePanel();
    const throwIfCancelled = () => {
      if(state.exp && state.exp.cancelled){ toast('MP3 रद्द / Export cancelled'); throw EXP_CANCELLED; }
    };
    let lame = null, enc = null, baseSr = 0, done = 0, secs = 0;
    const slices = [];
    try{
      await ensureOffline(neededVoices());                 // prompts the one-time offline-voice download
      lame = await loadLame();
      const queue = [];                                    // {text, voice} — voice picked only after ttsReady is set
      for(const u of state.units){
        const spoken = exportSpoken(u);
        if(!spoken) continue;
        for(const s of sentencesOf(spoken, WASM_CAP)){
          const text = spoken.slice(s.a, s.b);
          if(!text.trim() || !/[A-Za-zऀ-ॿ0-9]/.test(text)) continue;
          const voice = voiceForChunk(text);
          if(voice) queue.push({ text, voice });
        }
      }
      if(!queue.length){ toast('कोई पाठ नहीं / Nothing to export'); return; }
      const int16 = new Int16Array(1152);
      for(const q of queue){
        throwIfCancelled();
        const { mr, resid } = rateFor(q.voice);
        const r = await VVTTS.synth(q.text, mr, q.voice);
        done++;
        const [i0, i1] = audibleRange(r.samples, r.sampleRate);
        if(i1 > i0){
          if(!baseSr){ baseSr = r.sampleRate; enc = new lame.Mp3Encoder(1, baseSr, 64); }
          const rendered = await renderExportChunk({
            pcm: r.samples.slice(i0, i1), sr: r.sampleRate, resid,
            gap: /[.!?।॥…]\s*$/.test(q.text) ? 0.18 : 0.04,
            chain: chainFor(q.voice)
          }, baseSr);
          const ch = rendered.getChannelData(0);
          secs += ch.length / baseSr;
          for(let i = 0; i < ch.length; i += 1152){
            const n = Math.min(1152, ch.length - i);
            for(let j = 0; j < n; j++){
              const v = Math.max(-1, Math.min(1, ch[i + j]));
              int16[j] = v < 0 ? (v * 32768) | 0 : (v * 32767) | 0;
            }
            const out = enc.encodeBuffer(n === 1152 ? int16 : int16.subarray(0, n));
            if(out.length) slices.push(out);
          }
        }
        setStatus('MP3 ' + done + '/' + queue.length);
      }
      throwIfCancelled();
      if(!enc){ toast('कोई ऑडियो नहीं बना / No audio generated'); return; }
      const tail = enc.flush();
      if(tail.length) slices.push(tail);
      const blob = new Blob(slices, { type: 'audio/mpeg' });
      if(blob.size < 512){ toast('MP3 बनाना विफल / MP3 encode failed'); return; }
      const name = 'VallabhaVani-MP3-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.mp3';
      saveBlob(blob, name);
      toast('MP3 सेव: ' + (blob.size >= 1048576 ? (blob.size / 1048576).toFixed(1) + ' MB' : Math.round(blob.size / 1024) + ' KB') + ' · ' + Math.round(secs) + 's');
    } catch(err){
      if(err === EXP_CANCELLED){ /* toast already shown at the checkpoint */ }
      else if(state.exp && state.exp.cancelled){ toast('MP3 रद्द / Export cancelled'); }
      else if(err && err.declined) toast('वॉइस डाउनलोड रद्द — MP3 के लिए ऑफ़लाइन वॉइस ज़रूरी / Voice download declined');
      else toast('MP3 नहीं बना / MP3 failed: ' + ((err && err.message) || err));
      console.log('TTS MP3 export failed:', (err && err.message) || err);
    } finally{
      state.exp = null;
      setStatus(EN_VOICES.length + ' offline · ' + state.voices.length + ' device');
      updatePanel();
    }
  }

  /* ---------------- Panel (UI component) ---------------- */
  /* What the merged voice dropdown should show as selected: offline (Piper)
     voices live in the same list as device voices — value prefix `piper:`
     selects the wasm engine, a plain voiceURI selects the device engine. */
  function currentVoiceValue(){
    if(chooseEngine() === 'wasm') return 'piper:' + enVoice();
    const v = pickVoice();
    return v ? v.voiceURI : '';
  }
  function voiceOptionsHtml(){
    const cur = currentVoiceValue();
    const off = `<optgroup label="Offline voice (download once)">${EN_VOICES.map(v =>
      `<option value="piper:${v.id}" ${('piper:' + v.id) === cur ? 'selected' : ''}>${v.label} — offline</option>`).join('')}</optgroup>`;
    if(!state.voices.length) return off;
    const nat = `<optgroup label="Device voice">${state.voices.map(v =>
      `<option value="${v.voiceURI}" ${v.voiceURI === cur ? 'selected' : ''}>${v.name} (${v.lang})</option>`).join('')}</optgroup>`;
    return off + nat;
  }
  function openPanel(opts){
    stop();                                              // never rebuild units under a live playback chain
    state.synthCache.clear();
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
        <button class="lp-btn lp-dl" id="lp-dl" title="MP3 में डाउनलोड करें (कोई शेयर-स्क्रीन नहीं) / Download as MP3">${ICON_DOWNLOAD}</button>
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
        <span id="lp-status" style="font-size:10px;color:#888;">${EN_VOICES.length} offline · ${state.voices.length} device</span>
      </div>
      <div class="lp-row lp-sub" id="lp-engine-row" style="flex-wrap:wrap;gap:6px;font-size:12px">
        <label id="lp-narr-wrap" style="display:flex;align-items:center;gap:4px"><input type="checkbox" id="lp-narr"> narrator (fantasy voice)</label>
      </div>`;
    document.body.appendChild(panel);
    state.panel = panel;

    panel.querySelector('#lp-play').onclick = togglePlay;
    panel.querySelector('#lp-stop').onclick = stop;
    panel.querySelector('#lp-dl').onclick = downloadMp3;
    panel.querySelector('#lp-close').onclick = () => closePanel();
    panel.querySelector('#lp-voice').onchange = async (e) => {
      const val = e.target.value;
      if(val && val.indexOf('piper:') === 0){                 // offline Piper voice → wasm engine
        const id = val.slice(6);
        lsSet(LS_ENGINE, 'wasm');
        state.forceNative = false; state.nativeSuspect = 0;
        state.ttsVoice = id; lsSet(LS_EN, id);
        refreshEngineUi();
        try {
          await ensureOffline(neededVoices());
        } catch(err){
          toast(err && err.declined ? 'Voice not downloaded yet — tap Play to retry' : 'Voice failed: ' + (err && err.message));
          e.target.value = currentVoiceValue();
          return;
        }
        state.synthCache.clear();
        if(window.VVTTS && VVTTS.flush) VVTTS.flush();
      } else {                                                // device voice → native engine
        lsSet(LS_ENGINE, 'native');
        state.forceNative = false; state.nativeSuspect = 0;
        setVoice(val);
        refreshEngineUi();
      }
      if(state.status === 'playing' || state.status === 'paused'){
        const u = state.unitIdx, s = state.sentIdx;
        stop(); play(u, s);
      }
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
    wireEnginePanel(panel);
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
    refreshEngineUi();
    const playBtn = p.querySelector('#lp-play');
    if(playBtn) playBtn.innerHTML = state.status === 'playing' ? ICON_PAUSE : ICON_PLAY;
    const dlBtn = p.querySelector('#lp-dl');
    if(dlBtn) dlBtn.classList.toggle('recording', !!state.exp);
    const ref = p.querySelector('#lp-ref');
    if(ref){
      const u = state.units[state.unitIdx];
      if(state.status === 'idle' && !state.exp) ref.textContent = state.scopeLabel || '—';
      else if(u) ref.textContent = (state.exp ? '⏺ ' : '') + (state.scopeLabel ? state.scopeLabel + ' · ' : '') + verseRefLabel({ id: state.bookId }, u.chKey, u.vnum);
    }
    if(state.refreshContinue) state.refreshContinue();   // stop/finish may have made a saved position resumable
  }
  function refreshEngineUi(){
    const p = state.panel; if(!p) return;
    const wasm = chooseEngine() === 'wasm';
    const show = (sel, on) => { const el = p.querySelector(sel); if(el) el.style.display = on ? '' : 'none'; };
    show('#lp-engine-row', wasm);   // narrator only applies to offline voices
    const sel = p.querySelector('#lp-voice');
    if(sel) sel.value = currentVoiceValue();
  }
  function wireEnginePanel(p){
    const nChk = p.querySelector('#lp-narr');
    if(!nChk) return;
    nChk.checked = state.narrator;
    nChk.onchange = () => {
      state.narrator = nChk.checked;
      lsSet(LS_NARR, nChk.checked ? '1' : '0');
      if(state.status === 'playing' && state.engine === 'wasm') restartCurrentChunk();
    };
    refreshEngineUi();
  }
  function toggle(opts){
    if(state.panel && document.body.contains(state.panel)) closePanel();
    else openPanel(opts);
  }
  // Route change / reader re-render / tab close — kill everything. Idempotent.
  function detach(){
    if(state.status !== 'idle' || state.exp || state.panel){
      state.runId++;
      stopRaf(); clearHighlight();
      stopWasmAudio(); state.synthCache.clear();
      if(supported) synth.cancel();
      state.status = 'idle';
      if(state.exp) state.exp.cancelled = true;
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
  window.addEventListener('pagehide', () => { if(supported) synth.cancel(); stopWasmAudio(); stopRaf(); });

  return { supported, toggle, detach, stop, setRate, setVoice, openPanel, _state: state };
})();
window.VVListen = VVListen;
