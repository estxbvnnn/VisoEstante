import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function addAuditLog({ action, productId, userId, details }) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
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
