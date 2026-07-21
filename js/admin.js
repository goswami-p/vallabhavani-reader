/* VallabhaVani — admin login + verse-edit sync.
   One hardcoded admin account (see Firebase Console > Authentication > Users).
   The typed password is checked by Firebase itself (server-side) — it is never
   stored anywhere in this file, only the username->internal-email mapping is.
   Edits are stored in Firestore ("overrides" collection) and merged on top of
   the static data.js content for every visitor, so a fix shows up for everyone
   without a redeploy. */

const ADMIN_USERNAME = 'gpoorna';
const ADMIN_EMAIL = 'gpoorna@vallabhavani.app'; // internal only — never shown in the UI

const firebaseConfig = {
  projectId: 'vallabhavani',
  appId: '1:720934711252:web:233c74d33e000711133041',
  storageBucket: 'vallabhavani.firebasestorage.app',
  apiKey: 'AIzaSyBPDGHpO1HBOuICZ_jKIz5PjepUyQcEqsk',
  authDomain: 'vallabhavani.firebaseapp.com',
  messagingSenderId: '720934711252'
};
firebase.initializeApp(firebaseConfig);
const vvAuth = firebase.auth();
const vvDb = firebase.firestore();

// Fired whenever admin login state changes (login, logout, or the initial
// silent restore-from-storage on page load) — app.js/reader.js hook into this
// to refresh whatever UI depends on "am I admin right now".
window.vvOnAdminStateChange = null;
let vvAdminReady = false; // true once Firebase has told us the real signed-in state at least once

vvAuth.onAuthStateChanged(() => {
  vvAdminReady = true;
  if(window.vvOnAdminStateChange) window.vvOnAdminStateChange();
});

function vvIsAdmin(){
  return !!vvAuth.currentUser;
}
function vvAdminReadyYet(){ return vvAdminReady; }

function vvAdminLogin(username, password, cb){
  if((username || '').trim().toLowerCase() !== ADMIN_USERNAME){
    cb('गलत यूज़रनेम या पासवर्ड / Wrong username or password');
    return;
  }
  vvAuth.signInWithEmailAndPassword(ADMIN_EMAIL, password)
    .then(() => cb(null))
    .catch(() => cb('गलत यूज़रनेम या पासवर्ड / Wrong username or password'));
}
function vvAdminLogout(){ vvAuth.signOut(); }

/* doc id: {bookId}_{chapterKey}_{verseNum} — e.g. gita_a11_55 */
function vvOverrideDocId(bookId, chapterKey, verseNum){
  return `${bookId}_${chapterKey}_${verseNum}`;
}

/* Save an edit. `fields` is a partial object, e.g. { hi: '...' } or
   { tikas: { atHindiVyakhya: '...' } } — merged into the existing doc. */
function vvSaveVerseEdit(bookId, chapterKey, verseNum, fields, cb){
  if(!vvIsAdmin()){ cb('आप लॉगिन नहीं हैं / Not logged in'); return; }
  const docId = vvOverrideDocId(bookId, chapterKey, verseNum);
  const payload = Object.assign({}, fields, {
    bookId, chapterKey, verseNum,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: vvAuth.currentUser.email
  });
  vvDb.collection('overrides').doc(docId).set(payload, { merge: true })
    .then(() => cb(null))
    .catch((err) => cb(err.message || 'Save failed'));
}

/* Fetch every saved override once at startup and merge it into the live
   BOOKS object (already loaded from data.js) before/soon-after first render.
   Safe to call again later (e.g. to pick up a fresh edit) — it just re-applies. */
function vvLoadOverrides(cb){
  vvDb.collection('overrides').get().then((snap) => {
    let applied = 0;
    snap.forEach((doc) => {
      const d = doc.data();
      const adhyay = window.BOOKS && window.BOOKS[d.bookId] && getAdhyayForOverride(d.bookId, d.chapterKey);
      if(!adhyay) return;
      const verse = adhyay.verses.find(v => String(v.num) === String(d.verseNum));
      if(!verse) return;
      if(d.sa !== undefined) verse.sa = d.sa;
      if(d.hi !== undefined) verse.hi = d.hi;
      if(d.en !== undefined) verse.en = d.en;
      if(d.tikas){
        if(!verse.tikas) verse.tikas = {};
        Object.keys(d.tikas).forEach(k => { verse.tikas[k] = d.tikas[k]; });
      }
      applied++;
    });
    if(cb) cb(null, applied);
  }).catch((err) => { if(cb) cb(err.message || 'Load failed', 0); });
}

/* chapterKey is "a{n}" (flat book) or "s{sk}a{n}" (skandh book) — mirrors buildScope() in app.js */
function getAdhyayForOverride(bookId, chapterKey){
  const book = window.BOOKS[bookId];
  if(!book) return null;
  const m = /^s(\d+)a(\d+)$/.exec(chapterKey);
  if(m) return book.skandhs && book.skandhs[m[1]] && book.skandhs[m[1]].adhyays[m[2]];
  const m2 = /^a(\d+)$/.exec(chapterKey);
  if(m2) return book.adhyays && book.adhyays[m2[1]];
  return null;
}
