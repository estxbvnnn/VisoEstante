import { useProducts } from '../hooks/useProducts';
import { PRODUCT_STATUS } from '../constants/productStatus';
import { formatChileanDate, getDaysToExpiry } from '../utils/dateUtils';
import { formatCLP } from '../utils/formatUtils';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonCard from '../components/ui/SkeletonCard';

export default function ShelfDisplay() {
  const { products, loading } = useProducts();

  const visibleProducts = products.filter(
    (p) => p.status !== PRODUCT_STATUS.VENCIDO && p.status !== PRODUCT_STATUS.SIN_STOCK
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🛒 Góndola Digital</h1>
          <p className="text-slate-400 text-sm mt-1">Precios actualizados en tiempo real</p>
        </div>
        <div className="text-right text-slate-400 text-sm">
          <div>{new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {visibleProducts.length === 0 && (
            <p className="col-span-full text-center text-slate-500 py-16">
              No hay productos disponibles en este momento.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }) {
  const isPorVencer = product.status === PRODUCT_STATUS.POR_VENCER;

  return (
    <div
      className={`bg-slate-800 rounded-2xl overflow-hidden border transition
        ${isPorVencer ? 'border-yellow-500/50' : 'border-slate-700'}`}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-36 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-36 bg-slate-700 flex items-center justify-center text-4xl">
          🛍
        </div>
      )}

      <div className="p-3">
        <p className="text-xs text-slate-400 truncate">{product.brand}</p>
        <p className="font-semibold text-sm leading-tight mt-0.5 line-clamp-2">{product.name}</p>

        <p className="text-2xl font-bold text-green-400 mt-2">
          {formatCLP(product.price)}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <StatusBadge status={product.status} />
          {isPorVencer && (
            <span className="text-xs text-yellow-400">
              Vence {formatChileanDate(product.expirationDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
