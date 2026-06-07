import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeScanner from '../components/scanner/BarcodeScanner';
import OCRDateScanner from '../components/scanner/OCRDateScanner';
import { getProductByBarcode, addProduct, updateStock } from '../services/productService';
import { checkAndGenerateAlerts } from '../services/alertService';
import { addAuditLog } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { calculateProductStatus } from '../utils/statusUtils';
import { formatCLP } from '../utils/formatUtils';
import { formatChileanDate } from '../utils/dateUtils';
import { PRODUCT_CATEGORIES } from '../constants/productCategories';
import {
  isFutureOrToday,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  parseValidDate,
} from '../utils/validation';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const STEPS = {
  SCAN_BARCODE: 'scan_barcode',
  PRODUCT_FOUND: 'product_found',
  NEW_PRODUCT_FORM: 'new_product_form',
  SCAN_OCR: 'scan_ocr',
  CONFIRM: 'confirm',
};

export default function ScannerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(STEPS.SCAN_BARCODE);
  const [scannedCode, setScannedCode] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [newProductData, setNewProductData] = useState({
    name: '', brand: '', category: '', price: '', minStock: '', shelfLocation: '',
  });
  const [expirationDate, setExpirationDate] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleBarcodeDetected(code) {
    setScannedCode(code);
    setLoading(true);
    try {
      const product = await getProductByBarcode(code);
      if (product) {
        setFoundProduct(product);
        setStockQty(String(product.currentStock));
        setStep(STEPS.PRODUCT_FOUND);
      } else {
        setStep(STEPS.NEW_PRODUCT_FORM);
      }
    } catch (err) {
      toast.error('Error al buscar el producto');
      setStep(STEPS.SCAN_BARCODE);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStock() {
    if (!foundProduct) return;
    const qty = parseNonNegativeInteger(stockQty);
    if (qty === null) { toast.error('Cantidad inválida'); return; }
    setSaving(true);
    try {
      await updateStock(foundProduct.id, qty, user?.uid);
      await addAuditLog({ action: 'product_scanned', productId: foundProduct.id, userId: user?.uid, details: { barcode: scannedCode, newStock: qty } });
      try {
        await checkAndGenerateAlerts([{ ...foundProduct, currentStock: qty }]);
      } catch (alertErr) {
        console.error('Alert generation failed:', alertErr);
      }
      toast.success('Stock actualizado');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Error al actualizar stock');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNewProduct() {
    if (!expirationDate) { toast.error('Debes capturar la fecha de vencimiento'); return; }
    const price = parseNonNegativeNumber(newProductData.price);
    const minStock = parseNonNegativeInteger(newProductData.minStock);
    const currentStock = parseNonNegativeInteger(stockQty);
    const expiry = parseValidDate(expirationDate);
    if (!newProductData.name || price === null || minStock === null || currentStock === null) {
      toast.error('Por favor completa correctamente los campos requeridos');
      return;
    }
    if (!expiry) {
      toast.error('La fecha capturada no es válida');
      return;
    }
    if (!isFutureOrToday(expiry)) {
      toast.error('La fecha de vencimiento no puede ser anterior a hoy');
      return;
    }
    setSaving(true);
    try {
      const expTimestamp = Timestamp.fromDate(expiry);
      const status = calculateProductStatus(expTimestamp, currentStock, minStock);
      const productId = await addProduct({
        barcode: scannedCode,
        name: newProductData.name,
        brand: newProductData.brand,
        category: newProductData.category,
        price,
        minStock,
        currentStock,
        shelfLocation: newProductData.shelfLocation,
        expirationDate: expTimestamp,
        status,
        imageUrl: '',
        lastScannedAt: Timestamp.now(),
        lastScannedBy: user?.uid || '',
      });
      await addAuditLog({ action: 'product_scanned', productId, userId: user?.uid, details: { barcode: scannedCode, newProduct: true } });
      const newProduct = { id: productId, currentStock, minStock, expirationDate: expTimestamp };
      try {
        await checkAndGenerateAlerts([newProduct]);
      } catch (alertErr) {
        console.error('Alert generation failed:', alertErr);
      }
      toast.success('Producto registrado');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#ecfeff_100%)] flex flex-col text-slate-900">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 px-4 py-3 backdrop-blur-xl shadow-sm shadow-slate-900/5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800">←</button>
        <h1 className="font-semibold tracking-tight text-slate-900">Escanear producto</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {step === STEPS.SCAN_BARCODE && (
          <div className="w-full max-w-md">
            <div className="mb-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-center shadow-lg shadow-slate-900/5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">Captura</p>
              <p className="mt-1 text-sm text-slate-600">Escanea el código de barras del producto</p>
            </div>
            <BarcodeScanner
              onDetected={handleBarcodeDetected}
              onCancel={() => navigate(-1)}
            />
            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Buscando producto…
              </div>
            )}
          </div>
        )}

        {step === STEPS.PRODUCT_FOUND && foundProduct && (
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 p-6 space-y-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-700">
              <span>✓</span> Producto encontrado
            </div>
            <div>
              <p className="font-semibold text-slate-900">{foundProduct.name}</p>
              <p className="text-sm text-slate-500">{foundProduct.brand} · {foundProduct.category}</p>
              <p className="text-sm text-slate-500">📍 {foundProduct.shelfLocation}</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{formatCLP(foundProduct.price)}</p>
              <p className="text-sm text-slate-500">Vence: {formatChileanDate(foundProduct.expirationDate)}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Actualizar stock</label>
              <input
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateStock}
                disabled={saving}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Confirmar'}
              </button>
              <button onClick={() => { setStep(STEPS.SCAN_BARCODE); setFoundProduct(null); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === STEPS.NEW_PRODUCT_FORM && (
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 p-6 space-y-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 font-semibold text-blue-700">
              <span>+</span> Nuevo producto · <span className="font-mono text-xs">{scannedCode}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Nombre *</label>
                <input type="text" value={newProductData.name} onChange={(e) => setNewProductData((d) => ({ ...d, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Marca</label>
                <input type="text" value={newProductData.brand} onChange={(e) => setNewProductData((d) => ({ ...d, brand: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Categoría</label>
                <select value={newProductData.category} onChange={(e) => setNewProductData((d) => ({ ...d, category: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                  <option value="">Seleccionar…</option>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Precio (CLP) *</label>
                <input type="number" min="0" step="1" value={newProductData.price} onChange={(e) => setNewProductData((d) => ({ ...d, price: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Stock mínimo *</label>
                <input type="number" min="0" step="1" value={newProductData.minStock} onChange={(e) => setNewProductData((d) => ({ ...d, minStock: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Stock actual *</label>
                <input type="number" min="0" step="1" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Ubicación</label>
                <input type="text" value={newProductData.shelfLocation} onChange={(e) => setNewProductData((d) => ({ ...d, shelfLocation: e.target.value }))} placeholder="Pasillo 1 - Nivel A" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              </div>
            </div>

            {/* Expiry date */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
              {expirationDate ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Fecha de vencimiento</p>
                    <p className="font-semibold text-slate-900">{formatChileanDate(expirationDate)}</p>
                  </div>
                  <button onClick={() => setStep(STEPS.SCAN_OCR)} className="text-xs font-medium text-blue-700 hover:underline">
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setStep(STEPS.SCAN_OCR)}
                  className="w-full text-sm font-medium text-blue-700"
                >
                  📷 Capturar fecha de vencimiento con OCR
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveNewProduct}
                disabled={saving}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Registrar producto'}
              </button>
              <button onClick={() => setStep(STEPS.SCAN_BARCODE)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === STEPS.SCAN_OCR && (
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <OCRDateScanner
              onDateConfirmed={(date) => {
                setExpirationDate(date);
                setStep(STEPS.NEW_PRODUCT_FORM);
              }}
              onCancel={() => setStep(STEPS.NEW_PRODUCT_FORM)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
