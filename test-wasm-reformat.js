// Wasm (Piper) engine smoke test — reformat English passage, engine forced to wasm.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push(m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  page.on('dialog', d => d.accept().catch(() => {}));   // auto-accept the download confirm

  await page.goto('http://127.0.0.1:8765/#/reformat', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('vv_listen_engine', 'wasm'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#rf-text', { timeout: 10000 });

  const passage = [
    'The Last Lighthouse Keeper',
    '',
    'For thirty years, Elara tended the lamp at Cape Morwen without complaint. The sea gave her nothing but grey mornings and colder nights, and still she climbed the spiral stairs at dusk, wick trimmed, oil measured, glass polished until it caught the moon.',
    '',
    'The villagers said the light was for ships. Elara knew better. It was for the ones who had already drowned, the ones who still needed to know that someone, somewhere, was awake and watching the water.'
  ].join('\n');
  await page.fill('#rf-text', passage);
  await page.click('#rf-go');
  await page.waitForSelector('.verse-card, .flow-p', { timeout: 15000 });
  console.log('PASS — reformat reader opened');

  await page.click('#btn-listen');
  await page.waitForSelector('.listen-panel', { timeout: 5000 });
  console.log('PASS — panel opens');

  const voiceVal = await page.$eval('#lp-voice', el => el.value);
  if (voiceVal && voiceVal.indexOf('piper:') === 0) console.log('PASS — voice dropdown shows offline voice =', voiceVal);
  else console.log('WARN — voice dropdown not on offline voice [' + voiceVal + ']');

  await page.click('#lp-play');

  // wait up to 180s: 60MB voice download + compile + first synth
  let ok = false, snap = null;
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(2000);
    snap = await page.evaluate(() => ({
      engine: VVListen._state.engine,
      status: VVListen._state.status,
      ready: [...VVListen._state.ttsReady],
      hasSrc: !!VVListen._state.curSrc,
      wordTimes: VVListen._state.wordTimes ? VVListen._state.wordTimes.length : 0,
      unitIdx: VVListen._state.unitIdx,
      sentIdx: VVListen._state.sentIdx
    }));
    const wasmLog = logs.find(l => /TTS wasm \[/.test(l));
    if (snap.engine === 'wasm' && snap.status === 'playing' && (snap.hasSrc || wasmLog)) { ok = true; break; }
    if (snap.status === 'idle' && snap.unitIdx === 0 && i > 10) break;  // bailed to native/finished
    if (i % 5 === 0) console.log('... ' + (i * 2) + 's', JSON.stringify(snap));
  }
  console.log(ok ? 'PASS — wasm engine playing' : 'FAIL — wasm not playing', JSON.stringify(snap));
  const wasmLines = logs.filter(l => /TTS wasm/.test(l)).slice(0, 6);
  wasmLines.forEach(l => console.log('LOG:', l));
  const errLines = logs.filter(l => /error|Error|FAIL|phonemizer/i.test(l)).slice(0, 8);
  errLines.forEach(l => console.log('ERRLOG:', l));

  // pause/resume quick check on wasm
  if (ok) {
    await page.click('#lp-play');  // pause
    await page.waitForTimeout(400);
    const paused = await page.evaluate(() => VVListen._state.status);
    console.log(paused === 'paused' ? 'PASS — wasm pause' : 'FAIL — wasm pause [' + paused + ']');
    await page.click('#lp-play');  // resume
    await page.waitForTimeout(600);
    const resumed = await page.evaluate(() => ({ s: VVListen._state.status, src: !!VVListen._state.curSrc }));
    console.log(resumed.s === 'playing' ? 'PASS — wasm resume' : 'FAIL — wasm resume [' + JSON.stringify(resumed) + ']');
    await page.keyboard.press('Escape');
  }

  // MP3 export — offline render → lamejs → real .mp3 download, no share-screen.
  let exportPass = false;
  {
    let pass = true;
    const log = (name, cond, extra) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name + (extra ? ' [' + extra + ']' : '')); if (!cond) pass = false; };
    await page.evaluate(() => {
      navigator.mediaDevices.getDisplayMedia = () => { window.__gdmTouched = true; return Promise.reject(new Error('NotAllowedError')); };
    });
    const dlP = page.waitForEvent('download', { timeout: 120000 });
    await page.click('#lp-dl');
    try {
      const dl = await dlP;
      log('mp3 download event fires', true, dl.suggestedFilename());
      log('.mp3 filename', /\.mp3$/i.test(dl.suggestedFilename()), dl.suggestedFilename());
      const buf = require('fs').readFileSync(await dl.path());
      log('mp3 has bytes', buf.length > 8000, buf.length + ' bytes');
      log('mp3 frame sync 0xFF', buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0, 'hdr=' + buf[0].toString(16) + ' ' + buf[1].toString(16));
      const after = await page.evaluate(() => ({ exp: !!VVListen._state.exp, gdm: !!window.__gdmTouched, status: VVListen._state.status }));
      log('getDisplayMedia never touched', !after.gdm);
      log('export state cleared, still idle', !after.exp && after.status === 'idle', JSON.stringify(after));
      exportPass = pass;
    } catch (e) {
      console.log('FAIL — no download event [' + e.message + ']');
    }
  }

  await browser.close();
  process.exit(ok && exportPass ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
