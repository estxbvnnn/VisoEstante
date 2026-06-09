import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { addProduct, updateProduct } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { calculateProductStatus } from '../utils/statusUtils';
import { Timestamp } from 'firebase/firestore';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_DESCRIPTIONS } from '../constants/productCategories';
import {
  isFutureOrToday,
  parseNonNegativeNumber,
  parseNonNegativeInteger,
  parseValidDate,
} from '../utils/validation';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { formatCLP } from '../utils/formatUtils';
import { formatChileanDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const EMPTY_FORM = { barcode: '', name: '', brand: '', category: '', price: '', minStock: '', currentStock: '', shelfLocation: '', expirationDate: '' };

export default function ProductManager() {
  const { products, loading } = useProducts();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  function openAdd() { setEditProduct(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(product) {
    setEditProduct(product);
    setForm({
      barcode: product.barcode || '',
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || '',
      price: String(product.price || ''),
      minStock: String(product.minStock || ''),
      currentStock: String(product.currentStock || ''),
      shelfLocation: product.shelfLocation || '',
      expirationDate: product.expirationDate
        ? (product.expirationDate.toDate
          ? product.expirationDate.toDate().toISOString().split('T')[0]
          : new Date(product.expirationDate).toISOString().split('T')[0])
        : '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const price = parseNonNegativeNumber(form.price);
    const minStock = parseNonNegativeInteger(form.minStock);
    const currentStock = parseNonNegativeInteger(form.currentStock);
    const expirationValue = parseValidDate(form.expirationDate);

    if (!form.name || !form.barcode || price === null || minStock === null || currentStock === null) {
      toast.error('Completa correctamente los campos requeridos');
      return;
    }

    if (expirationValue && !isFutureOrToday(expirationValue)) {
      toast.error('La fecha de vencimiento no puede ser anterior a hoy');
      return;
    }

    setSaving(true);
    try {
      const expDate = expirationValue ? Timestamp.fromDate(expirationValue) : null;
      const status = calculateProductStatus(expDate, currentStock, minStock);
      const data = { barcode: form.barcode, name: form.name, brand: form.brand, category: form.category, price, minStock, currentStock, shelfLocation: form.shelfLocation, expirationDate: expDate, status };
      if (editProduct) {
        await updateProduct(editProduct.id, data);
        toast.success('Producto actualizado');
      } else {
        await addProduct({ ...data, imageUrl: '', lastScannedAt: Timestamp.now(), lastScannedBy: user?.uid || '' });
        toast.success('Producto creado');
      }
      setModalOpen(false);
    } catch {
      toast.error('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#ecfeff_100%)] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Administrador</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Gestión de productos</h1>
              <p className="mt-2 text-sm text-slate-600">Crear, editar y mantener el catálogo desde un panel único.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                ← Dashboard
              </Link>
              <button onClick={openAdd} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800">
                + Nuevo producto
              </button>
            </div>
          </div>
        </div>

        <input
          type="search"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />

        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/90 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Precio</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Vencimiento</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-3 rounded bg-slate-100 animate-pulse" /></td></tr>
                    ))
                  : filtered.map((p) => (
                      <tr key={p.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.barcode}</td>
                        <td className="px-4 py-3">{formatCLP(p.price)}</td>
                        <td className="px-4 py-3">{p.currentStock} / {p.minStock}</td>
                        <td className="px-4 py-3 text-slate-600">{formatChileanDate(p.expirationDate)}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(p)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100">Editar</button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editProduct ? 'Editar producto' : 'Nuevo producto'}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Código de barras *', key: 'barcode', type: 'text', full: true },
            { label: 'Nombre *', key: 'name', type: 'text', full: true },
            { label: 'Marca', key: 'brand', type: 'text' },
            { label: 'Precio (CLP) *', key: 'price', type: 'number' },
            { label: 'Stock mínimo *', key: 'minStock', type: 'number' },
            { label: 'Stock actual *', key: 'currentStock', type: 'number' },
            { label: 'Ubicación', key: 'shelfLocation', type: 'text', full: true },
            { label: 'Vencimiento', key: 'expirationDate', type: 'date', full: true },
          ].map(({ label, key, type, full }) => (
            <div key={key} className={full ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
              <option value="">Seleccionar…</option>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {form.category && PRODUCT_CATEGORY_DESCRIPTIONS[form.category] && (
              <p className="mt-1.5 text-xs text-slate-500">{PRODUCT_CATEGORY_DESCRIPTIONS[form.category]}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
