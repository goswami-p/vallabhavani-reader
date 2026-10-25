// Mobile (Android emulation) MP3 export — run: node test-mp3-mobile.js
// Fresh profile per run: the FIRST export must download the offline voice
// itself (confirm auto-accepted), render, encode and hand over a real .mp3
// without ever touching getDisplayMedia. Then picks the Fantasy Storyteller
// voice (its own one-time download via the picker) and exports a 2nd MP3.
const { chromium, devices } = require('playwright');
const fsp = require('fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const ctx = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept().catch(() => {}));   // auto-accept voice-download confirms
  let pass = true;
  const log = (name, cond, extra) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name + (extra ? ' [' + extra + ']' : '')); if (!cond) pass = false; };

  const passage = [
    'The Last Lighthouse Keeper',
    '',
    'For thirty years, Elara tended the lamp at Cape Morwen without complaint. The sea gave her nothing but grey mornings and colder nights, and still she climbed the spiral stairs at dusk, wick trimmed, oil measured, glass polished until it caught the moon.',
    '',
    'The villagers said the light was for ships. Elara knew better. It was for the ones who had already drowned, the ones who still needed to know that someone, somewhere, was awake and watching the water.'
  ].join('\n');

  // Fill + click in ONE synchronous evaluate: background re-renders
  // (vvLoadOverrides / auth-state callbacks) can wipe the reformat form
  // between a separate page.fill and page.click, leaving the button on an
  // empty textarea (→ "please give text" no-op, hash never changes).
  async function formatPassage() {
    await page.evaluate((text) => {
      const t = document.querySelector('#rf-text');
      t.value = text;
      document.querySelector('#rf-go').click();
    }, passage);
    try {
      await page.waitForSelector('.verse-card, .flow-p', { timeout: 15000 });
      log('reformat reader opens on mobile', true);
    } catch (e) {
      const snap = await page.evaluate(() => ({
        hash: location.hash,
        val: (document.querySelector('#rf-text') || {}).value,
        status: (document.querySelector('#rf-status') || {}).textContent
      }));
      log('reformat reader opens on mobile', false, JSON.stringify(snap));
      throw e;
    }
  }

  async function exportMp3(label) {
    await page.evaluate(() => {
      navigator.mediaDevices.getDisplayMedia = () => { window.__gdmTouched = true; return Promise.reject(new Error('NotAllowedError')); };
    });
    const dlP = page.waitForEvent('download', { timeout: 180000 });
    await page.click('#lp-dl');
    const dl = await dlP;
    log(label + ': .mp3 download fires', /\.mp3$/i.test(dl.suggestedFilename()), dl.suggestedFilename());
    const buf = fsp.readFileSync(await dl.path());
    log(label + ': mp3 has bytes', buf.length > 8000, buf.length + ' bytes');
    log(label + ': mp3 frame sync 0xFF', buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0, 'hdr=' + buf[0].toString(16) + ' ' + buf[1].toString(16));
    return buf;
  }

  await page.goto('http://127.0.0.1:8765/#/reformat', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('vv_listen_engine', 'wasm'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#rf-text', { timeout: 10000 });
  await formatPassage();

  await page.click('#btn-listen');
  await page.waitForSelector('.listen-panel', { timeout: 5000 });
  log('panel opens on mobile', true);

  // 1) Cold export: voice download happens INSIDE the export flow itself.
  await exportMp3('cold-export');
  const after1 = await page.evaluate(() => ({
    exp: !!VVListen._state.exp, gdm: !!window.__gdmTouched,
    status: VVListen._state.status, ready: [...VVListen._state.ttsReady]
  }));
  log('voice downloaded as part of export', after1.ready.length > 0, JSON.stringify(after1.ready));
  log('getDisplayMedia never touched', !after1.gdm);
  log('export state cleared, idle', !after1.exp && after1.status === 'idle', JSON.stringify(after1));

  // 2) Fantasy Storyteller: one-time download via the voice picker, then a
  //    2nd MP3 rendered with the cloned voice.
  await page.selectOption('#lp-voice', 'piper:en_GB-fantasy-medium');
  await page.waitForFunction(
    () => VVListen._state.ttsVoice === 'en_GB-fantasy-medium' && VVListen._state.ttsReady.has('en_GB-fantasy-medium'),
    { timeout: 180000 }
  ).catch(() => {});
  const fantasy = await page.evaluate(() => ({
    v: VVListen._state.ttsVoice, ready: VVListen._state.ttsReady.has('en_GB-fantasy-medium')
  }));
  log('fantasy voice downloaded via picker', fantasy.ready && fantasy.v === 'en_GB-fantasy-medium', JSON.stringify(fantasy));
  await exportMp3('fantasy-export');
  const after2 = await page.evaluate(() => ({ exp: !!VVListen._state.exp, gdm: !!window.__gdmTouched }));
  log('2nd export: no share-screen, state cleared', !after2.gdm && !after2.exp, JSON.stringify(after2));

  log('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(pass ? '\n=== MOBILE MP3 PASS ===' : '\n=== MOBILE MP3 FAIL ===');
  await browser.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
