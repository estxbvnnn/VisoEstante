import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

const AUDIT_COL = 'audit_logs';

export async function addAuditLog({ action, productId, userId, details }) {
  try {
    await addDoc(collection(db, AUDIT_COL), {
      action,
      productId: productId || null,
      userId: userId || null,
      details: details || {},
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

/**
 * Suscribe al historial de auditoría de un producto (más reciente primero).
 * Incluye cambios de precio, stock, escaneos y ventas de ese producto.
 */
export function subscribeToProductHistory(productId, callback, max = 50) {
  const q = query(
    collection(db, AUDIT_COL),
    where('productId', '==', productId),
    orderBy('timestamp', 'desc'),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
