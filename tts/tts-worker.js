'use strict';
/* VallabhaVani offline TTS worker — multi-voice Piper via onnxruntime-web.
   Classic worker. Loads ORT + piper phonemizer once, voices on demand.
   Voices (file stems under /tts/): en_US-lessac-medium, en_GB-alan-medium,
   en_IN-navgurukul-medium, hi_IN-rohan-medium. Adapted from Claude's
   single-voice design: sessions kept per voice in a Map, synth carries a
   voice key, phonemizer data loaded once and shared. */
const BASE = new URL('./', self.location.href).href;
const CACHE = 'vv-tts-v1';                       // keep in sync with tts-engine.js
let runtimeReady = false;
let phDataUrl = null;                            // blob URL of espeak-ng data, loaded once
const voices = new Map();                        // name -> { cfg, session }
let epoch = 0, queue = Promise.resolve();

const post = (m, t) => self.postMessage(m, t || []);
const errMsg = e => String((e && e.message) || e);

/* Download-or-load from Cache API, with progress. */
async function getBuf(name, label, hint){
  const url = BASE + name;
  const cache = await caches.open(CACHE);
  let res = await cache.match(url);
  if(res){
    const b = await res.arrayBuffer();
    post({ type: 'progress', name: label, loaded: b.byteLength, total: b.byteLength });
    return b;
  }
  const net = await fetch(url);
  if(!net.ok) throw new Error('HTTP ' + net.status + ' for ' + name);
  const total = +net.headers.get('content-length') || hint || 0;
  const reader = net.body.getReader();
  const parts = []; let loaded = 0, lastPost = 0;
  for(;;){
    const { done, value } = await reader.read();
    if(done) break;
    parts.push(value); loaded += value.length;
    const now = performance.now();
    if(now - lastPost > 120){ lastPost = now; post({ type: 'progress', name: label, loaded, total: Math.max(total, loaded) }); }
  }
  post({ type: 'progress', name: label, loaded, total: loaded });
  const blob = new Blob(parts); parts.length = 0;
  await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'application/octet-stream' } }));
  return blob.arrayBuffer();
}

async function ensureRuntime(){
  if(runtimeReady) return;
  importScripts(BASE + 'ort.wasm.min.js', BASE + 'piper_phonemize.js');
  if(typeof ort === 'undefined') throw new Error('onnxruntime-web global missing');
  if(typeof createPiperPhonemize === 'undefined') throw new Error('createPiperPhonemize global missing (check piper_phonemize.js build)');
  ort.env.wasm.wasmPaths = BASE;
  ort.env.wasm.numThreads = 1;                   // no SharedArrayBuffer, no COOP/COEP
  ort.env.wasm.proxy = false;
  if(!phDataUrl){
    const dataBuf = await getBuf('piper_phonemize.data', 'phonemizer', 18e6);
    phDataUrl = URL.createObjectURL(new Blob([dataBuf]));
  }
  runtimeReady = true;
}

async function ensureVoice(name){
  if(voices.has(name)) return voices.get(name);
  await ensureRuntime();
  const cfg = JSON.parse(new TextDecoder().decode(await getBuf(name + '.onnx.json', name + ' config', 0)));
  const model = await getBuf(name + '.onnx', name + ' model', 63e6);
  post({ type: 'stage', stage: 'compile', voice: name });   // main thread sets a crash flag around this
  const session = await ort.InferenceSession.create(new Uint8Array(model), {
    executionProviders: ['wasm'], graphOptimizationLevel: 'all'
  });
  const v = { cfg, session };
  voices.set(name, v);
  return v;
}

/* Devanagari text -> phoneme ids. A fresh phonemizer instance per call
   (callMain is one-shot). */
function phonemize(v, text){
  return new Promise((resolve, reject) => {
    let ids = null; const errs = [];
    createPiperPhonemize({
      print: line => { try { const j = JSON.parse(line); if(j && j.phoneme_ids) ids = j.phoneme_ids; } catch(e){} },
      printErr: m => errs.push(m),
      locateFile: u => u.endsWith('.wasm') ? BASE + 'piper_phonemize.wasm'
                     : u.endsWith('.data') ? phDataUrl : u
    }).then(mod => {
      try {
        mod.callMain(['-l', v.cfg.espeak.voice,
                      '--input', JSON.stringify([{ text }]),
                      '--espeak_data', '/espeak-ng-data']);
      } catch(e){ /* Emscripten may throw ExitStatus after main returns */ }
      ids ? resolve(ids) : reject(new Error('phonemizer returned no ids: ' + errs.join(' | ')));
    }, reject);
  });
}

function prep(text){
  return text
    .replace(/[\u0951-\u0954\u1CD0-\u1CFF\u200B-\u200D\uA8E0-\uA8FF]/g, '')  // Vedic accents, ZW chars
    .replace(/ऽ/g, '')                                                      // avagraha
    .replace(/[॥।]/g, '.')                                                  // dandas -> final intonation
    .replace(/\s+/g, ' ').trim();
}

async function synth(text, rate, name){
  const v = voices.get(name);
  if(!v) throw new Error('voice not loaded: ' + name);
  const clean = prep(text);
  if(!clean) return { samples: new Float32Array(0), sampleRate: v.cfg.audio.sample_rate, voice: name };
  const ids = await phonemize(v, clean);
  const inf = v.cfg.inference || {};
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, x => BigInt(x)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([
      inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) / rate, inf.noise_w ?? 0.8]), [3])
  };
  if((v.cfg.num_speakers || 1) > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const out = await v.session.run(feeds);
  const samples = out[v.session.outputNames[0]].data.slice();   // own buffer, transferable
  return { samples, sampleRate: v.cfg.audio.sample_rate, voice: name };
}

async function loadVoices(names){
  await ensureRuntime();
  for(const n of names){
    await ensureVoice(n);
    post({ type: 'voiceReady', voice: n });
  }
}

self.onmessage = e => {
  const m = e.data;
  if(m.type === 'init' || m.type === 'addVoices'){
    loadVoices(m.voices || [])
      .then(() => post({ type: 'ready', voices: m.voices || [] }))
      .catch(err => post({ type: 'error', message: errMsg(err) }));
  } else if(m.type === 'flush'){
    epoch++;                                      // queued, not-yet-started jobs get cancelled
  } else if(m.type === 'dropVoice'){
    voices.delete(m.voice);                      // free session memory; Cache API file stays
  } else if(m.type === 'synth'){
    const myEpoch = epoch;
    queue = queue.then(async () => {
      if(myEpoch !== epoch) return post({ type: 'result', id: m.id, cancelled: true });
      try {
        const t0 = performance.now();
        const r = await synth(m.text, m.rate, m.voice);
        post({ type: 'result', id: m.id, samples: r.samples, sampleRate: r.sampleRate,
               ms: performance.now() - t0 }, [r.samples.buffer]);
      } catch(err){ post({ type: 'error', id: m.id, message: errMsg(err) }); }
    });
  }
};
