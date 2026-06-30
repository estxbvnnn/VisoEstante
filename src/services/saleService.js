import {
  collection,
  doc,
  runTransaction,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { calculateProductStatus } from '../utils/statusUtils';
import { getTaxAmount } from '../utils/taxUtils';
import { addAuditLog } from './auditService';

const SALES_COL = 'sales';
const PRODUCTS_COL = 'products';

// Métodos de pago disponibles en la caja.
export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Tarjeta de débito' },
  { value: 'credito', label: 'Tarjeta de crédito' },
  { value: 'transferencia', label: 'Transferencia' },
];

export const PAYMENT_LABELS = PAYMENT_METHODS.reduce((acc, m) => {
  acc[m.value] = m.label;
  return acc;
}, {});

/**
 * Registra una venta de forma atómica (transacción):
 *  1. Lee cada producto y valida que exista y tenga stock suficiente.
 *  2. Descuenta el stock y recalcula el estado de cada producto.
 *  3. Guarda la boleta con el desglose de IVA chileno (neto, IVA 19%, total).
 *
 * El precio de cada producto se toma como NETO; el IVA se calcula sobre el neto
 * total de la venta para evitar acumular errores de redondeo por línea.
 *
 * @param {{ items: Array<{ productId: string, quantity: number }>, paymentMethod?: string }} payload
 * @param {{ uid?: string, displayName?: string, email?: string }} user
 * @returns {Promise<{ id: string, totalNet: number, totalTax: number, totalGross: number, itemCount: number }>}
 */
export async function createSale({ items, paymentMethod = 'efectivo' }, user) {
  const cleanItems = (items || []).filter((i) => i.productId && Number(i.quantity) > 0);
  if (cleanItems.length === 0) {
    throw new Error('La venta no tiene productos');
  }

  const saleRef = doc(collection(db, SALES_COL));

  const result = await runTransaction(db, async (tx) => {
    // 1) Lecturas: todas las lecturas deben ocurrir antes de cualquier escritura.
    const reads = [];
    for (const item of cleanItems) {
      const ref = doc(db, PRODUCTS_COL, item.productId);
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error(`Producto no encontrado: ${item.productId}`);
      }
      reads.push({ item, ref, data: snap.data() });
    }

    // 2) Validar stock y construir las líneas de la boleta.
    const lines = [];
    let totalNet = 0;
    for (const { item, data } of reads) {
      const quantity = Number(item.quantity);
      const available = Number(data.currentStock) || 0;
      if (quantity > available) {
        throw new Error(`Stock insuficiente para "${data.name}" (disponible: ${available})`);
      }
      const unitNet = Number(data.price) || 0;
      const lineNet = unitNet * quantity;
      totalNet += lineNet;
      lines.push({
        productId: item.productId,
        name: data.name || '',
        barcode: data.barcode || '',
        quantity,
        unitNet,
        lineNet,
      });
    }

    // 3) Escrituras: descontar stock y recalcular estado de cada producto.
    for (const { item, ref, data } of reads) {
      const quantity = Number(item.quantity);
      const newStock = (Number(data.currentStock) || 0) - quantity;
      const status = calculateProductStatus(data.expirationDate, newStock, data.minStock);
      tx.update(ref, { currentStock: newStock, status, updatedAt: serverTimestamp() });
    }

    // 4) Crear la venta (boleta) con el desglose de IVA.
    const totalTax = getTaxAmount(totalNet);
    const totalGross = totalNet + totalTax;
    tx.set(saleRef, {
      items: lines,
      itemCount: lines.reduce((s, l) => s + l.quantity, 0),
      lineCount: lines.length,
      totalNet,
      totalTax,
      totalGross,
      paymentMethod,
      soldBy: user?.uid || null,
      soldByName: user?.displayName || user?.email || 'Desconocido',
      createdAt: serverTimestamp(),
    });

    return { totalNet, totalTax, totalGross, itemCount: lines.length, lines };
  });

  await addAuditLog({
    action: 'sale_created',
    productId: null,
    userId: user?.uid,
    details: {
      saleId: saleRef.id,
      itemCount: result.itemCount,
      totalGross: result.totalGross,
      paymentMethod,
    },
  });

  // Registro por producto, para que la venta aparezca en el historial de cada uno.
  await Promise.all(
    result.lines.map((l) =>
      addAuditLog({
        action: 'product_sold',
        productId: l.productId,
        userId: user?.uid,
        details: { saleId: saleRef.id, quantity: l.quantity, unitNet: l.unitNet, lineNet: l.lineNet },
      })
    )
  );

  return {
    id: saleRef.id,
    totalNet: result.totalNet,
    totalTax: result.totalTax,
    totalGross: result.totalGross,
    itemCount: result.itemCount,
  };
}

/**
 * Suscribe al historial de ventas (más recientes primero).
 */
export function subscribeToSales(callback, max = 50) {
  const q = query(collection(db, SALES_COL), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) => {
    const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(sales);
  });
}
