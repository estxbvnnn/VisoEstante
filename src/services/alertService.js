import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { ALERT_TYPES, ALERT_SEVERITY } from '../constants/alertTypes';
import { getDaysToExpiry } from '../utils/dateUtils';
import { addAuditLog } from './auditService';

const ALERTS_COL = 'alerts';

export async function generateStockAlert(product) {
  const lowStockThreshold = 20;
  const isLowStock = product.currentStock < lowStockThreshold || product.currentStock < product.minStock;
  if (!isLowStock) return;
  // Avoid duplicate alerts
  const q = query(
    collection(db, ALERTS_COL),
    where('productId', '==', product.id),
    where('type', '==', ALERT_TYPES.LOW_STOCK),
    where('resolved', '==', false)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(collection(db, ALERTS_COL), {
    productId: product.id,
    productName: product.name,
    productSnapshot: {
      barcode: product.barcode || null,
      brand: product.brand || null,
      category: product.category || null,
      price: product.price ?? null,
      currentStock: product.currentStock ?? null,
      minStock: product.minStock ?? null,
      shelfLocation: product.shelfLocation || null,
      expirationDate: product.expirationDate || null,
      status: product.status || null,
    },
    type: ALERT_TYPES.LOW_STOCK,
    message: `Stock bajo: ${product.currentStock} unidades para "${product.name}"${product.minStock != null ? ` (mínimo ${product.minStock})` : ''}`,
    severity: product.currentStock === 0 ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.WARNING,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function generateExpiryAlert(product) {
  const days = getDaysToExpiry(product.expirationDate);
  if (days === null || days > 30) return;

  const type = days < 0 ? ALERT_TYPES.EXPIRED : ALERT_TYPES.EXPIRING_SOON;
  const q = query(
    collection(db, ALERTS_COL),
    where('productId', '==', product.id),
    where('type', '==', type),
    where('resolved', '==', false)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;

  const message =
    days < 0
      ? `Producto vencido hace ${Math.abs(days)} días: "${product.name}"`
      : days === 0
      ? `Producto vence hoy: "${product.name}"`
      : `Producto vence en ${days} días: "${product.name}"`;

  await addDoc(collection(db, ALERTS_COL), {
    productId: product.id,
    productName: product.name,
    productSnapshot: {
      barcode: product.barcode || null,
      brand: product.brand || null,
      category: product.category || null,
      price: product.price ?? null,
      currentStock: product.currentStock ?? null,
      minStock: product.minStock ?? null,
      shelfLocation: product.shelfLocation || null,
      expirationDate: product.expirationDate || null,
      status: product.status || null,
    },
    type,
    message,
    severity: days <= 3 ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.WARNING,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function checkAndGenerateAlerts(products) {
  for (const product of products) {
    await generateStockAlert(product);
    await generateExpiryAlert(product);
  }
}

export async function resolveAlert(alertId, userId) {
  await updateDoc(doc(db, ALERTS_COL, alertId), {
    resolved: true,
    resolvedBy: userId,
    resolvedAt: serverTimestamp(),
  });
  await addAuditLog({
    action: 'alert_resolved',
    productId: null,
    userId,
    details: { alertId },
  });
}

export function subscribeToActiveAlerts(callback) {
  const q = query(
    collection(db, ALERTS_COL),
    where('resolved', '==', false),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(alerts);
  });
}

export function subscribeToResolvedAlerts(callback) {
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const q = query(
    collection(db, ALERTS_COL),
    where('resolved', '==', true),
    where('resolvedAt', '>=', since),
    orderBy('resolvedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(alerts);
  });
}
