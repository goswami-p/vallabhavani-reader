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
