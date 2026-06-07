import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { addAuditLog } from './auditService';

const PRODUCTS_COL = 'products';

export async function getProductByBarcode(barcode) {
  const q = query(collection(db, PRODUCTS_COL), where('barcode', '==', barcode));
  return new Promise((resolve, reject) => {
    const unsub = onSnapshot(q, (snap) => {
      unsub();
      if (snap.empty) {
        resolve(null);
      } else {
        const docSnap = snap.docs[0];
        resolve({ id: docSnap.id, ...docSnap.data() });
      }
    }, reject);
  });
}

export async function getProductById(id) {
  const snap = await getDoc(doc(db, PRODUCTS_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addProduct(productData) {
  const ref = await addDoc(collection(db, PRODUCTS_COL), {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id, data) {
  await updateDoc(doc(db, PRODUCTS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateStock(id, quantity, userId) {
  await updateDoc(doc(db, PRODUCTS_COL, id), {
    currentStock: quantity,
    updatedAt: serverTimestamp(),
  });
  await addAuditLog({
    action: 'stock_updated',
    productId: id,
    userId,
    details: { newStock: quantity },
  });
}

export async function updatePrice(id, newPrice, userId) {
  await updateDoc(doc(db, PRODUCTS_COL, id), {
    price: newPrice,
    updatedAt: serverTimestamp(),
  });
  await addAuditLog({
    action: 'price_updated',
    productId: id,
    userId,
    details: { newPrice },
  });
}

export function subscribeToAllProducts(callback) {
  const q = query(collection(db, PRODUCTS_COL), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(products);
  });
}

export function subscribeToExpiringProducts(callback, daysThreshold = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  const q = query(
    collection(db, PRODUCTS_COL),
    where('expirationDate', '<=', threshold),
    orderBy('expirationDate')
  );
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(products);
  });
}

export async function batchUpdateStatuses(updates) {
  const batch = writeBatch(db);
  updates.forEach(({ id, status }) => {
    batch.update(doc(db, PRODUCTS_COL, id), { status, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}
