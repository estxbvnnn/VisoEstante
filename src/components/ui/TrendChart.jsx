/**
 * Gráfico de línea/área en SVG, sin dependencias externas.
 * Recibe `labels`: [string] (eje X) y `series`: [{ label, color, values: [number] }].
 * Cada serie debe tener el mismo largo que `labels`.
 */
export default function TrendChart({ labels, series, height = 220, formatValue = (v) => v }) {
  const width = 640;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;

  function pointsFor(values) {
    return values.map((v, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + innerH - ((v - min) / range) * innerH;
      return { x, y, v };
    });
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Líneas guía horizontales */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * t}
            y2={padding.top + innerH * t}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}

        {series.map((s) => {
          const pts = pointsFor(s.values);
          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          const areaPath = `${linePath} L${pts[pts.length - 1].x},${padding.top + innerH} L${pts[0].x},${padding.top + innerH} Z`;
          return (
            <g key={s.label}>
              <path d={areaPath} fill={s.color} opacity="0.08" />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2">
                  <title>{`${labels[i]} · ${s.label}: ${formatValue(p.v)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* Etiquetas del eje X */}
        {labels.map((label, i) => (
          <text
            key={label}
            x={padding.left + i * stepX}
            y={height - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
          >
            {label}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
