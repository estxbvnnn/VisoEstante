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
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ALERT_TYPES, ALERT_SEVERITY } from '../constants/alertTypes';
import { getDaysToExpiry } from '../utils/dateUtils';
import { addAuditLog } from './auditService';

const ALERTS_COL = 'alerts';
const LOW_STOCK_THRESHOLD = 20;

function productSnapshot(product) {
  return {
    barcode: product.barcode || null,
    brand: product.brand || null,
    category: product.category || null,
    price: product.price ?? null,
    currentStock: product.currentStock ?? null,
    minStock: product.minStock ?? null,
    shelfLocation: product.shelfLocation || null,
    expirationDate: product.expirationDate || null,
    status: product.status || null,
  };
}

// Construye (en memoria, sin IO) la alerta de stock que corresponde, o null.
function buildStockAlert(product) {
  const isLowStock =
    product.currentStock < LOW_STOCK_THRESHOLD || product.currentStock < product.minStock;
  if (!isLowStock) return null;
  return {
    productId: product.id,
    productName: product.name,
    productSnapshot: productSnapshot(product),
    type: ALERT_TYPES.LOW_STOCK,
    message: `Stock bajo: ${product.currentStock} unidades para "${product.name}"${product.minStock != null ? ` (mínimo ${product.minStock})` : ''}`,
    severity: product.currentStock === 0 ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.WARNING,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  };
}

// Construye (en memoria, sin IO) la alerta de vencimiento que corresponde, o null.
function buildExpiryAlert(product) {
  const days = getDaysToExpiry(product.expirationDate);
  if (days === null || days > 30) return null;
  const type = days < 0 ? ALERT_TYPES.EXPIRED : ALERT_TYPES.EXPIRING_SOON;
  const message =
    days < 0
      ? `Producto vencido hace ${Math.abs(days)} días: "${product.name}"`
      : days === 0
      ? `Producto vence hoy: "${product.name}"`
      : `Producto vence en ${days} días: "${product.name}"`;
  return {
    productId: product.id,
    productName: product.name,
    productSnapshot: productSnapshot(product),
    type,
    message,
    severity: days <= 3 ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.WARNING,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  };
}

// Uso individual (p. ej. al escanear un solo producto). Verifica duplicado y crea.
export async function generateStockAlert(product) {
  const data = buildStockAlert(product);
  if (!data) return;
  const q = query(
    collection(db, ALERTS_COL),
    where('productId', '==', product.id),
    where('type', '==', data.type),
    where('resolved', '==', false)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;
  await addDoc(collection(db, ALERTS_COL), data);
}

export async function generateExpiryAlert(product) {
  const data = buildExpiryAlert(product);
  if (!data) return;
  const q = query(
    collection(db, ALERTS_COL),
    where('productId', '==', product.id),
    where('type', '==', data.type),
    where('resolved', '==', false)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;
  await addDoc(collection(db, ALERTS_COL), data);
}

/**
 * Evalúa una lista de productos y crea las alertas faltantes de forma eficiente:
 * lee las alertas activas UNA sola vez (en vez de una consulta por producto) y
 * escribe las nuevas en lotes (batch). Evita cientos de lecturas en cada carga.
 */
export async function checkAndGenerateAlerts(products) {
  if (!products || products.length === 0) return;

  // 1) Snapshot único de las alertas activas → set "productId|type".
  const activeSnap = await getDocs(query(collection(db, ALERTS_COL), where('resolved', '==', false)));
  const existing = new Set();
  activeSnap.forEach((d) => {
    const a = d.data();
    if (a.productId && a.type) existing.add(`${a.productId}|${a.type}`);
  });

  // 2) Construir en memoria las alertas que faltan.
  const toCreate = [];
  for (const product of products) {
    const stock = buildStockAlert(product);
    if (stock) {
      const key = `${product.id}|${stock.type}`;
      if (!existing.has(key)) { existing.add(key); toCreate.push(stock); }
    }
    const expiry = buildExpiryAlert(product);
    if (expiry) {
      const key = `${product.id}|${expiry.type}`;
      if (!existing.has(key)) { existing.add(key); toCreate.push(expiry); }
    }
  }
  if (toCreate.length === 0) return;

  // 3) Escribir en lotes de 400.
  for (let i = 0; i < toCreate.length; i += 400) {
    const batch = writeBatch(db);
    toCreate.slice(i, i + 400).forEach((data) => batch.set(doc(collection(db, ALERTS_COL)), data));
    await batch.commit();
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
