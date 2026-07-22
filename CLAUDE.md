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
