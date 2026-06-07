import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function registerUser(email, password, displayName, role = 'repositor') {
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
  await firebaseSignOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data().role;
}

export async function getUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}
