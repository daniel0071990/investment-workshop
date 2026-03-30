// ============================================================
// FIREBASE CONFIGURATION — Replace the values below with yours
// Follow SETUP-GUIDE.md Step 1 to get these values
// ============================================================
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set, get, remove, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA_49WDIDT7MkRqv5TFsDTx9Q_xj-JyChk",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: https://investment-team-workshop-1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "investment-team-workshop-1",
  storageBucket: "PASTE_YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "1:1048724444277:web:f8f6b7ba0b7575d16cd43c",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export async function submitQuizScore(userName, score, total) {
  const newRef = push(ref(db, "quiz-scores"));
  await set(newRef, { name: userName, score, total, ts: Date.now() });
  return true;
}

export async function loadAllScores() {
  const snapshot = await get(ref(db, "quiz-scores"));
  if (!snapshot.exists()) return [];
  const entries = Object.values(snapshot.val());
  entries.sort((a, b) => b.score - a.score || a.ts - b.ts);
  return entries;
}

export function onScoresChanged(callback) {
  return onValue(ref(db, "quiz-scores"), (snapshot) => {
    if (!snapshot.exists()) { callback([]); return; }
    const entries = Object.values(snapshot.val());
    entries.sort((a, b) => b.score - a.score || a.ts - b.ts);
    callback(entries);
  });
}

export async function clearAllScores() {
  await remove(ref(db, "quiz-scores"));
}
