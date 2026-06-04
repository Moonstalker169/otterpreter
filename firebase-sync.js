// Otterpreter x Firebase Sync
// Syncs custom phrases (mv_custom) to Cloud Firestore (asia-south1 Mumbai)
// Usage: add this line just before </body> in index.html:
//   <script type="module" src="firebase-sync.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJO9Sxuyr0zixhjyzoFh5cBQbvoyMpS3w",
  authDomain: "otterpretter.firebaseapp.com",
  projectId: "otterpretter",
  storageBucket: "otterpretter.firebasestorage.app",
  messagingSenderId: "239749201549",
  appId: "1:239749201549:web:ac5f62441040375158acc4"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const COLL = "customPhrases";

function toast(msg, c = "#2a9d8f") {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position:"fixed", bottom:"80px", right:"20px", zIndex:9999,
    background:c, color:"#fff", padding:"10px 16px", borderRadius:"8px",
    fontSize:"13px", fontWeight:"600", boxShadow:"0 4px 12px rgba(0,0,0,.2)",
    transition:"opacity .4s"
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity="0"; setTimeout(() => el.remove(), 400); }, 2500);
}

async function loadFromFirestore() {
  try {
    const snap = await getDocs(collection(db, COLL));
    if (snap.empty) {
      const local = JSON.parse(localStorage.getItem("mv_custom") || "[]");
      if (local.length) {
        for (const p of local) await setDoc(doc(db, COLL, String(p.id)), p);
        toast(local.length + " phrases backed up to Firebase!");
      }
      return;
    }
    const remote = snap.docs.map(d => d.data());
    const local  = JSON.parse(localStorage.getItem("mv_custom") || "[]");
    const ids    = new Set(local.map(p => String(p.id)));
    const merged = [...local]; let added = 0;
    remote.forEach(p => { if (!ids.has(String(p.id))) { merged.push(p); added++; } });
    localStorage.setItem("mv_custom", JSON.stringify(merged));
    if (added > 0) toast(added + " phrase(s) synced from Firebase!");
  } catch (e) { console.warn("[Firebase Sync] Load:", e.message); }
}

const _origSet = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  _origSet(key, value);
  if (key === "mv_custom") {
    try { syncToFirestore(JSON.parse(value || "[]")); }
    catch (e) { console.warn("[Firebase Sync]", e); }
  }
};

const _origDel = localStorage.removeItem.bind(localStorage);
localStorage.removeItem = function(key) {
  _origDel(key);
  if (key === "mv_custom")
    getDocs(collection(db, COLL)).then(s => s.docs.forEach(d => deleteDoc(d.ref)));
};

let _ids = new Set();

async function syncToFirestore(phrases) {
  try {
    const cur = new Set(phrases.map(p => String(p.id)));
    for (const p of phrases)
      if (!_ids.has(String(p.id))) await setDoc(doc(db, COLL, String(p.id)), p);
    for (const id of _ids)
      if (!cur.has(id)) await deleteDoc(doc(db, COLL, id));
    _ids = cur;
    if (phrases.length > 0) toast("Saved to Firebase!", "#2a9d8f");
  } catch (e) {
    console.warn("[Firebase Sync] Write:", e.message);
    toast("Firebase sync failed", "#e63946");
  }
}

function listenForRemoteChanges() {
  onSnapshot(collection(db, COLL), snap => {
    const remote = snap.docs.map(d => d.data());
    const local  = JSON.parse(localStorage.getItem("mv_custom") || "[]");
    const ids    = new Set(local.map(p => String(p.id)));
    let added = 0;
    remote.forEach(p => { if (!ids.has(String(p.id))) { local.push(p); added++; } });
    if (added > 0) {
      _origSet("mv_custom", JSON.stringify(local));
      toast(added + " phrase(s) from another device!", "#6a0dad");
      if (typeof window.refreshPhraseList === "function") window.refreshPhraseList();
    }
  });
}

(async () => {
  const init = JSON.parse(localStorage.getItem("mv_custom") || "[]");
  _ids = new Set(init.map(p => String(p.id)));
  await loadFromFirestore();
  listenForRemoteChanges();
  console.log("[Otterpreter] Firebase sync active - asia-south1 Mumbai");
})();
