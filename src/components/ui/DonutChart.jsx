/**
 * Gráfico de dona (donut) en SVG, sin dependencias externas.
 * Recibe `items`: [{ label, value, color }] donde color es un hex (#10b981).
 * Muestra el total al centro y una leyenda con conteo y porcentaje.
 */
export default function DonutChart({ items, centerLabel = 'Total' }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = 56;
  const c = 2 * Math.PI * r;

  // Precalcula longitud y desfase de cada segmento (sin mutar en el JSX).
  const segments = items.reduce((acc, it) => {
    const len = (it.value / total) * c;
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
    acc.push({ ...it, len, start });
    return acc;
  }, []);

  const realTotal = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0">
        <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
          <circle cx="75" cy="75" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx="75"
              cy="75"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${seg.len} ${c - seg.len}`}
              strokeDashoffset={-seg.start}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{realTotal}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
            <span className="text-slate-600">{it.label}</span>
            <span className="ml-auto font-semibold text-slate-900">{it.value}</span>
            <span className="w-9 text-right text-xs text-slate-400">{Math.round((it.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
