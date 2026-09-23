// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "",
  authDomain:        "offensive-word-tracker.firebaseapp.com",
  projectId:         "offensive-word-tracker",
  storageBucket:     "offensive-word-tracker.firebasestorage.app",
  messagingSenderId: "883201494635",
  appId:             "1:883201494635:web:64679bad7828a4e75a6b2e",
  measurementId:     "G-9214626KW8",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

const SESSION_KEY = "sg_session_id";

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── SIGN UP ───────────────────────────────────────────────────────────────
export async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  await setDoc(doc(db, "users", uid), {
    email,
    displayName,
    createdAt: serverTimestamp(),
  });

  await startSession(uid);
  return cred.user;
}

// ── SIGN IN ───────────────────────────────────────────────────────────────
// This is the ONLY place a new sessionId is generated
// When this runs on Device B, Device A will detect the change and log out
export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await startSession(cred.user.uid);
  return cred.user;
}

// ── SIGN OUT ──────────────────────────────────────────────────────────────
export async function logOut() {
  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      await deleteDoc(doc(db, "activeSessions", uid));
    } catch (_) {}
    localStorage.removeItem(SESSION_KEY);
  }
  try {
    await signOut(auth);
  } catch (_) {}
}

// ── START SESSION ─────────────────────────────────────────────────────────
// Writes a new sessionId to Firestore — this kicks any other active session
async function startSession(uid) {
  const sessionId = generateSessionId();
  localStorage.setItem(SESSION_KEY, sessionId);

  await setDoc(doc(db, "activeSessions", uid), {
    sessionId,
    loginAt:   serverTimestamp(),
    userAgent: navigator.userAgent,
  });

  console.log("✅ Session started:", sessionId);
  return sessionId;
}

export { onAuthStateChanged };