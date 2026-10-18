# VallabhaVani reader — structure and display rules

Static site (no build step): `index.html` + `js/app.js` (settings/state/UI
chrome) + `js/reader.js` (all verse-card/flow rendering — read this before
touching how content displays) + `js/data.js` (all book/verse content) +
`js/admin.js` (admin edit mode) + `css/style.css`. Deploy is `firebase deploy
--only hosting` after committing/pushing to GitHub — no separate build/preview
step needed.

**Before changing how content LOOKS, read `verseCardHtml()` in `js/reader.js`
and the matching CSS in `style.css` first — don't just edit `data.js` and
assume the existing markup/CSS already renders it the way you intend.** That
mistake already happened once on this project (chapter-1 Hindi anuvad content
was correct but the card's alignment wasn't checked against the intended
layout until the user pointed it out).

## Verse data shape (`js/data.js`)

Each verse object: `num`, optional `speaker: {sa, hi, en}` (only present on
verses that open a new line of dialogue — "धृतराष्ट्र उवाच" etc.), `sa`
(Sanskrit shlok — pādas separated by a literal `\n` in the string, e.g.
`'पद-एक ।\nपद-दो ॥'`), `hi` (the concise verse-level Hindi anuvad — NOT the
full tika, see the `shlok-anuvad-from-tika` skill for how this should be
written), `en`, and `tikas: {amritaTarangini, tattvadipika, atHindiVyakhya}`
(full discursive commentary fields, shown only in "tika mode").

## Card display rules (default/tika content mode, vertical scroll)

Inside `.verse-card` (the shlok+anuvad card — NOT `.tika-card`, which shows
the full commentary separately and must stay left-aligned/readable prose):

- `.v-speaker` (the uvācha tag) — **center-aligned**.
- `.verse-block.lang-sa` (the Sanskrit shlok) — **center-aligned**, and each
  pāda on its own line (this comes from the `\n` already embedded in the `sa`
  string — `verseCardHtml()` converts it to `<br>`; if a verse's pādas ever
  render on one line, the fix is adding the missing `\n` in `data.js`, not a
  CSS change).
- `.verse-block.lang-hi` (the Hindi anuvad) — **left-aligned, unchanged** —
  do not center this.

The centering rule is scoped as `.verse-card .verse-block.lang-sa` specifically
(not a bare `.verse-block.lang-sa` rule) because `.tika-card` reuses the same
`verse-block lang-sa` class for its long Sanskrit commentary text, which must
NOT be centered. Keep that scoping if this CSS is ever touched again.

## Bulk-editing `hi` fields with a script — a trap that already bit once

`speaker: { hi: '...' }` and the verse's own top-level `hi: '...'` are BOTH
literally the substring `hi: '...'` — a naive regex like `hi:\s*'...'`
matching per verse-object and taking the first hit will grab `speaker.hi`
instead of the real field on any verse that has a speaker (in chapter 1:
verses 1, 2, 21, 24, 28, 47). This actually happened: a bulk-replace script
wrote the new anuvad into `speaker.hi` (which then rendered, wrongly, in the
italic uvāca-tag slot) and left the OLD full-tika text sitting untouched in
the real `hi` field below the shlok — i.e. two different pieces of text
visibly stacked in the card, looking like a duplicate. `curl`-checking that
the new text appears *somewhere* in the deployed file is not a real
verification — it doesn't catch it landing in the wrong field.

**Fix / rule going forward:** anchor on indentation, not just the key name —
`speaker.hi` is indented one level deeper than the verse's own `hi`. Use
`^ {14}hi: '` for the speaker field and `^ {12}hi: '` for the real one (or
whatever the two indent widths are if the file's formatting ever changes —
check with a quick `grep -nP` before trusting a script). **After any bulk
data.js edit, programmatically re-read every changed verse back out of the
file and diff both `speaker.hi` and the top-level `hi` against what was
intended, for every verse touched — not just one or two spot-checks** — before
committing/deploying. This is what caught the bug on the second pass (chapter
1 verses 2-4 were never fully re-verified this way the first time, which is
why the mistake shipped).

## Listen (read-aloud) — `js/listen.js`

Reusable engine + player panel (`window.VVListen`) with TWO backends:
**native** (Web Speech API) and **wasm** (offline Piper TTS in a worker —
`tts/tts-worker.js` + `tts/tts-engine.js`, models under `/tts/`). Engine pick:
`auto` (Android → wasm, desktop → native), `wasm`, or `native`, persisted in
`vv_listen_engine`. Silent-native detector (`suspectNative`, two strikes of
onend-without-onstart / <150 ms completes) auto-switches auto mode to wasm;
an explicit native pick is never overridden. Wired from the reader topbar
(`#btn-listen` in `renderReader`, reader.js) and detached on every route
change (`render()` in app.js, `renderReader` itself, and listen.js's own
`hashchange`/`pagehide` handlers — keep all three). Script tag goes AFTER
reader.js in index.html.

Key invariants if this code is touched:

- **Selectors mirror the renderer.** `buildUnits` reads the real DOM
  (`.verse-card[data-vkey] …` in card mode, `.flow-p[data-chkey][data-vnum]`
  in flow/paginated mode). If `verseCardHtml`/`verseFlowHtml` markup changes,
  update `buildUnits` in the same commit.
- **Reformat's `hi` fields hold HTML** — the raw-data fallback path (elements
  not in the DOM) strips tags before speaking; the normal path uses
  `textContent` so it's already clean. Don't "simplify" the strip away.
- **`runId` staleness guard:** every play/stop/restart bumps it; utterance
  handlers bail if stale. **Fresh `play()` speaks SYNCHRONOUSLY inside the tap**
  (no `cancel()` first, no timer — mobile TTS engines ignore speak() kicked off
  from a timer after the gesture, and cancel() on an idle queue wedges Android
  Chrome: highlight kept moving via the rAF timer while nothing was audible).
  `cancel()` + 60ms delay applies only where a real cancel happened:
  `restartCurrentChunk()` (rate/voice change, resume) and play() only if the
  queue is genuinely `speaking/pending`. Pause = cancel, resume = re-speak the
  current chunk from `currentChunkStartWord()` via `chunkOverride` — don't try
  `synth.pause()/resume()` on long utterances.
- **Native: voice pick must match the text's script:** `pickVoice(text)` is
  script-aware (Devanagari → `hi-*` first, Latin → Natural/online/English)
  — Android's English engine given Devanagari text completes silently
  (onstart/onend fire instantly, zero audio, while the rAF highlighter keeps
  moving). Desktop Edge has no Hindi voice, falls back to its English voice
  (which does vocalize Devanagari). Never force `utt.lang = 'hi-IN'` when a
  voice is available; assign `utt.voice` + `utt.lang` from `pickVoice()`.
- **Wasm chunking differs from native:** `chunkCap()` = 110 chars for wasm
  (its phonemize/inference is the bottleneck, not gesture latency), 50 for
  native. Units keep `raw`/`spoken`; `unitText(u)` is the one accessor.
- **Wasm audio is an AudioBuffer, not SpeechSynthesis:** `speakWasmChunk`
  synthesizes in the worker, caches AudioBuffers keyed by
  `voice|rate|pitch|text` in `state.synthCache` (capped 8, cleared on
  panel open), schedules via OfflineAudioContext, and words get times from
  `audibleRange()`/`wordSchedule()`. A chunk failure counts `wasmErrs`; after
  3 strikes the engine falls back to native (status must still be `playing`).
- **Narrator chain:** `narratorChain(text, lang)` applies a grit/presence
  WebAudio chain (PITCH 0.92 etc.) to English/Latin chunks only when the
  narrator checkbox (`vv_listen_narrator`) is on — Devanagari stays clean.
  Chain is rebuilt per chunk via `chainFor()`.
- **Wasm init must not stomp pause:** every wasm catch/fallback path bails
  unless `state.status === 'playing'` in addition to the runId check (a
  dismissed download confirm mid-test used to restart playback over pause).
- **`synth()` in the worker must NOT lazy-load a voice** — the glue
  guarantees preloading; a throw there surfaces as a chunk error, not a
  silent hang. `crashedBefore()` (`vvTtsCompile` flag from the ORT glue)
  expires after 7 days so a one-time Android compile crash doesn't brick
  wasm forever.
- **No TEST/debug button in the panel** — diagnostics go to `console.log`
  (`TTS Debug:` / `TTS wasm [voice]:` prefixes), including `onstart fired`
  which proves the native engine actually began speaking.
- **No fallback voice is persisted** at load — Edge's online "Natural"
  voices arrive after local ones; `pickVoice()` re-scans live so they win.
  Only an explicit user pick writes `vv_listen_voice`.
- **localStorage keys:** `vv_listen_voice`, `vv_listen_rate`,
  `vv_listen_sync`, `vv_listen_pos_<bookId>` (position is verse-level,
  cleared with `''` on natural finish), `vv_listen_engine` (auto|wasm|native),
  `vv_listen_native_broken`, `vv_listen_envoice` (wasm voice id),
  `vv_listen_narrator` (1/empty), `vv-tts-v1` (voice-download cache version).
  `lsSet(k, null)` stores the string "null" — use `lsDel` for clearing.
- Word highlight = CSS Custom Highlight API (`::highlight(vv-word)` in
  style.css); `updateWord` maps spoken index → shown offset via `u.map`.
- **Panel engine row:** `#lp-engine` (auto/wasm/native), `#lp-ovoice`
  (wasm voice picker, wasm-only), `#lp-narr` (narrator). `#lp-voice` hides
  under wasm. `refreshEngineUi` keeps them in sync.

Tested by `test-listen-edge.js` (Playwright, `channel: 'msedge'`, against a
local static server, engine pinned to native via `vv_listen_engine`) and
`test-wasm-reformat.js` (same harness, engine forced to wasm, random English
passage through the reformat route, download confirm auto-accepted; first run
downloads the ~90 MB voice+engine locally). Phone smoke page: `/tts/test.html`.
Re-run the matching suite after touching listen.js/tts/*/reader.js wiring.
