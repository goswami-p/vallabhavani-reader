// Extraction test for listen.js pure functions — run with: node test-listen-core.js
const src = require('fs').readFileSync(__dirname + '/js/listen.js', 'utf8');
function grab(name){
  const start = src.indexOf('function ' + name);
  if(start < 0) throw new Error(name + ' not found');
  let i = src.indexOf('{', start), depth = 0;
  for(let j = i; j < src.length; j++){
    if(src[j] === '{') depth++;
    else if(src[j] === '}'){ depth--; if(depth === 0) return src.slice(start, j + 1); }
  }
}
const MAX_CHUNK = 100;
eval(grab('cleanWithMap'));
eval(grab('sentencesOf'));

let fails = 0;
function check(cond, msg){ if(!cond){ fails++; console.error('FAIL:', msg); } }

// --- cleanWithMap ---
const fence = String.fromCharCode(96,96,96); // ```
const shown = '# Heading\nHello **world**, this is *test*.\n' + fence + '\ncode here\n' + fence + '\n- item one\n> quote';
const r = cleanWithMap(shown);
console.log('spoken:', JSON.stringify(r.spoken));
check(r.spoken === 'Heading Hello world, this is test. item one quote', 'fences/markers stripped');
check(r.map.length === r.spoken.length, 'map length matches spoken length');
let bad = 0;
for(let i = 0; i < r.spoken.length; i++){
  const orig = shown[r.map[i]];
  if(r.spoken[i] !== orig && !(/\s/.test(r.spoken[i]) && /\s/.test(orig))) bad++;
}
check(bad === 0, 'every spoken char maps back to same shown char (mismatches: ' + bad + ')');
// monotonic map
let mono = true;
for(let i = 1; i < r.map.length; i++) if(r.map[i] < r.map[i-1]) mono = false;
check(mono, 'map is monotonically increasing');

// plain text with newlines (pādas) — no markdown at all
const r2 = cleanWithMap('पद-एक ।\nपद-दो ॥');
check(r2.spoken === 'पद-एक । पद-दो ॥', 'devanagari pādas joined with space: ' + JSON.stringify(r2.spoken));

// --- sentencesOf ---
const long = ('x'.repeat(40) + ' ').repeat(10).trim();
const s1 = sentencesOf(long);
check(s1.every(c => c.b - c.a <= MAX_CHUNK), 'no chunk exceeds MAX_CHUNK');
check(s1[0].a === 0 && s1[s1.length-1].b === long.length, 'chunks cover the full string');
for(let i = 1; i < s1.length; i++) check(s1[i].a >= s1[i-1].a && s1[i].a <= s1[i-1].b + 1, 'no gap/overlap at chunk ' + i);

const s2 = sentencesOf('पहला वाक्य है। दूसरा वाक्य है॥ तीसरा one more. Last one!');
console.log('devanagari sentences:', JSON.stringify(s2));
check(s2.length === 4, 'danda/period split into 4, got ' + s2.length);
check(s2[0].a === 0 && s2[s2.length-1].b === 'पहला वाक्य है। दूसरा वाक्य है॥ तीसरा one more. Last one!'.length, 'sentence bounds exact');

// empty + single char edge cases
check(sentencesOf('').length === 0, 'empty string -> no chunks');
check(sentencesOf('a').length === 1, 'single char -> one chunk');

console.log(fails === 0 ? 'ALL CORE TESTS PASS' : fails + ' FAILURES');
process.exit(fails ? 1 : 0);
