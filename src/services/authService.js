import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseInitError } from './firebase';

function ensureFirebase() {
  if (firebaseInitError) {
    throw firebaseInitError;
  }
  if (!auth || !db) {
    throw new Error('Firebase no está inicializado. Revisa la configuración de Firebase.');
  }
}

export async function signIn(email, password) {
  ensureFirebase();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function registerUser(email, password, displayName, role = 'repositor') {
  ensureFirebase();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;
  await setDoc(doc(db, 'users', uid), {
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
  });
  return credential.user;
}

export async function signOut() {
  ensureFirebase();
  await firebaseSignOut(auth);
}

export function getCurrentUser() {
  if (firebaseInitError) {
    throw firebaseInitError;
  }
  return auth?.currentUser || null;
}

export async function getUserRole(uid) {
  ensureFirebase();
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data().role;
}

export async function getUserData(uid) {
  ensureFirebase();
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}
