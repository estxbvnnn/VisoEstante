/**
 * Tarjeta de indicador clave (KPI) reutilizable en Dashboard, Reportes y Alertas.
 * Muestra un ícono, etiqueta, valor grande y un subtítulo de contexto, con
 * animación de entrada escalonada.
 */
export default function KpiCard({ icon, label, value, sub, accent, tone, loading, delay = 0 }) {
  return (
    <div
      className="group animate-fade-in-up overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg ring-1 ring-slate-200/70 ${tone || ''}`}>{icon}</span>
        <div className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${accent}`} />
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{loading ? '—' : value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
