/* VallabhaVani offline TTS glue — multi-voice Piper. Main-thread API:
   VVTTS.ensureVoices(names, {onProgress}) / synth(text, rate, voice) /
   flush / isInstalled(voice) / remove(voice) / persist / crashedBefore.
   Voices download per-name on first use and live in the Cache API; the
   runtime (ORT wasm + espeak data) is shared. Loaded lazily by listen.js. */
(function(){
  'use strict';
  const BASE = '/tts/';
  const CACHE = 'vv-tts-v1';                     // keep in sync with tts-worker.js
  const VOICES = {
    'en_US-lessac-medium':              { label: 'US English',      mb: 60 },
    'en_GB-northern_english_male-medium': { label: 'British English', mb: 60 },
    'en_IN-navgurukul-medium':          { label: 'Indian English',  mb: 61 },
    'hi_IN-rohan-medium':               { label: 'Hindi',           mb: 60 }
  };
  let worker = null, workerStarted = false, nid = 0;
  const pending = new Map();
  const loadedVoices = new Set();
  const jobs = [];                               // ensureVoices batches, processed serially
  let pumping = false, batchWait = null;         // {resolve, reject} for the in-flight batch
  let activeOpts = null;                         // onProgress/onError of the batch now loading

  const supported = typeof Worker === 'function' && typeof WebAssembly === 'object' && 'caches' in self;

  /* A tab crash during model compile (low RAM) leaves this flag behind. */
  const crashedBefore = () => { try { return !!localStorage.getItem('vvTtsCompile'); } catch(e){ return false; } };
  const setFlag = on => { try { on ? localStorage.setItem('vvTtsCompile', String(Date.now())) : localStorage.removeItem('vvTtsCompile'); } catch(e){} };

  async function isInstalled(voice){
    if(!('caches' in self)) return false;
    if(!VOICES[voice]) return false;
    try {
      const c = await caches.open(CACHE);
      const r = await Promise.all([c.match(BASE + voice + '.onnx'),
                                   c.match(BASE + voice + '.onnx.json'),
                                   c.match(BASE + 'piper_phonemize.data')]);
      return r.every(Boolean);
    } catch(e){ return false; }
  }
  function remove(voice){
    loadedVoices.delete(voice);
    if(worker && workerStarted) worker.postMessage({ type: 'dropVoice', voice });
    return caches.open(CACHE).then(c => Promise.all(
      [voice + '.onnx', voice + '.onnx.json'].map(f => c.delete(BASE + f))
    )).catch(() => {});
  }

  function reset(err){
    for(const p of pending.values()) p.reject(err);
    pending.clear();
    if(batchWait){ const b = batchWait; batchWait = null; b.reject(err); }
    jobs.length = 0;
    if(worker){ worker.terminate(); worker = null; }
    workerStarted = false; loadedVoices.clear(); setFlag(false);
  }

  function ensureWorker(){
    if(worker) return;
    try { worker = new Worker(BASE + 'tts-worker.js'); } catch(e){ throw e; }
    worker.onmessage = e => {
      const m = e.data;
      const opts = activeOpts;
      if(m.type === 'progress'){
        if(opts && opts.onProgress) opts.onProgress({ file: m.name, loaded: m.loaded, total: m.total,
          pct: m.total ? Math.min(99, Math.round(100 * m.loaded / m.total)) : 0 });
      } else if(m.type === 'stage'){
        setFlag(true);
        if(opts && opts.onProgress) opts.onProgress({ pct: 99, file: (m.voice || '') + ' starting' });
      } else if(m.type === 'voiceReady'){
        loadedVoices.add(m.voice);
      } else if(m.type === 'ready'){
        setFlag(false);
        if(batchWait){ const b = batchWait; batchWait = null; b.resolve(); }
      } else if(m.type === 'result'){
        const p = pending.get(m.id); if(!p) return; pending.delete(m.id);
        if(m.cancelled){ const err = new Error('cancelled'); err.cancelled = true; p.reject(err); }
        else p.resolve({ samples: m.samples, sampleRate: m.sampleRate, ms: m.ms });
      } else if(m.type === 'error'){
        const err = new Error(m.message);
        if(m.id != null){ const p = pending.get(m.id); if(p){ pending.delete(m.id); p.reject(err); } }
        else { reset(err); if(opts && opts.onError) opts.onError(err); else if(batchWait){ const b = batchWait; batchWait = null; b.reject(err); } }
      }
    };
    worker.onerror = ev => { const err = new Error(ev.message || 'worker crashed'); reset(err); if(activeOpts && activeOpts.onError) activeOpts.onError(err); };
  }

  function pump(){
    if(pumping) return;
    pumping = true;
    (async () => {
      while(jobs.length){
        const job = jobs[0];
        const need = job.need.filter(n => !loadedVoices.has(n));
        if(!need.length){ jobs.shift(); job.resolve(); continue; }
        try {
          activeOpts = job.opts;
          ensureWorker();
          batchWait = { resolve: () => { jobs.shift(); job.resolve(); },
                        reject: err => { jobs.shift(); job.reject(err); } };
          worker.postMessage({ type: workerStarted ? 'addVoices' : 'init', voices: need });
          workerStarted = true;
          await new Promise((resolve, reject) => {
            const prev = batchWait;
            batchWait = { resolve: () => { prev.resolve(); resolve(); },
                          reject: e => { prev.reject(e); reject(e); } };
          });
        } catch(err){
          if(jobs[0] === job) jobs.shift();
          try { job.reject(err); } catch(e){}
        }
      }
      activeOpts = null;
      pumping = false;
    })().catch(() => { pumping = false; });
  }

  function ensureVoices(names, opts){
    opts = opts || {};
    return new Promise((resolve, reject) => {
      if(!supported) return reject(new Error('browser lacks Worker/WASM/Cache API'));
      if(crashedBefore() && opts.respectCrash !== false) return reject(new Error('engine crashed while compiling last time — cleared on next successful load'));
      const need = (names || []).filter(n => VOICES[n] && !loadedVoices.has(n));
      if(!need.length) return resolve();
      jobs.push({ need, opts, resolve, reject });
      pump();
    });
  }

  function synth(text, rate, voice){
    return new Promise((resolve, reject) => {
      if(!worker) return reject(new Error('TTS not initialised'));
      const id = ++nid; pending.set(id, { resolve, reject });
      worker.postMessage({ type: 'synth', id, text, rate: rate || 1, voice });
    });
  }
  const flush = () => { if(worker) worker.postMessage({ type: 'flush' }); };

  /* Call inside the download-button tap; Chrome decides silently, harmless if denied. */
  const persist = () => { try { return navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){} };

  window.VVTTS = { supported, VOICES, ensureVoices, synth, flush, isInstalled, remove, persist, crashedBefore };
})();
