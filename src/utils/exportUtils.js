import ExcelJS from 'exceljs';
import { formatChileanDate, toDate, getDaysToExpiry } from './dateUtils';
import { STATUS_LABELS } from '../constants/productStatus';
import { ALERT_LABELS, ALERT_SEVERITY } from '../constants/alertTypes';
import { ROLE_LABELS } from '../constants/roles';

const theme = {
  navy: 'FF0F172A',
  slate: 'FF334155',
  blue: 'FF2563EB',
  emerald: 'FF059669',
  amber: 'FFF59E0B',
  rose: 'FFE11D48',
  border: 'FFE2E8F0',
  soft: 'FFF8FAFC',
  white: 'FFFFFFFF',
  text: 'FF1E293B',
  muted: 'FF64748B',
  // Soft tints for conditional status fills (readable with dark text).
  roseSoft: 'FFFFE4E6',
  amberSoft: 'FFFEF3C7',
  slateSoft: 'FFE2E8F0',
  emeraldSoft: 'FFD1FAE5',
};

const NUMFMT = {
  integer: '#,##0',
  currency: '"$"#,##0;[Red]-"$"#,##0',
  date: 'dd/mm/yyyy',
};

const LOW_STOCK_THRESHOLD = 20;

// ---------------------------------------------------------------------------
// Value helpers — translate raw codes into human-readable, report-ready text.
// ---------------------------------------------------------------------------

function statusLabel(raw) {
  return STATUS_LABELS[raw] || raw || '—';
}

function alertTypeLabel(raw) {
  return ALERT_LABELS[raw] || raw || '—';
}

function severityLabel(raw) {
  if (raw === ALERT_SEVERITY.CRITICAL) return 'Crítica';
  if (raw === ALERT_SEVERITY.WARNING) return 'Advertencia';
  return raw || '—';
}

function num(value) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function inventoryValue(stock, price) {
  const s = num(stock) ?? 0;
  const p = num(price) ?? 0;
  return s * p;
}

function statusFill(label) {
  switch (label) {
    case 'Vencido':
    case 'Vencida':
    case 'Crítica':
      return { fill: theme.roseSoft, font: theme.rose };
    case 'Por vencer':
    case 'Advertencia':
      return { fill: theme.amberSoft, font: 'FFB45309' };
    case 'Sin stock':
      return { fill: theme.slateSoft, font: theme.slate };
    case 'Vigente':
      return { fill: theme.emeraldSoft, font: theme.emerald };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Sheet styling primitives
// ---------------------------------------------------------------------------

function setPageSetup(worksheet, headerLeft) {
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };
  worksheet.headerFooter = {
    oddHeader: `&L&"Aptos,Bold"&12VisoEstante&R&"Aptos,Regular"&9${headerLeft || ''}`,
    oddFooter: '&LGenerado por VisoEstante&CPágina &P de &N&R&D &T',
  };
}

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: theme.border } },
    left: { style: 'thin', color: { argb: theme.border } },
    bottom: { style: 'thin', color: { argb: theme.border } },
    right: { style: 'thin', color: { argb: theme.border } },
  };
}

function styleTitleRow(worksheet, rowNumber, title, subtitle, lastColumn) {
  const titleRow = worksheet.getRow(rowNumber);
  titleRow.height = 28;
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { name: 'Aptos', size: 16, bold: true, color: { argb: theme.navy } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  for (let col = 1; col <= lastColumn; col += 1) {
    titleRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.soft } };
  }
  worksheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);

  const subtitleRow = worksheet.getRow(rowNumber + 1);
  subtitleRow.height = 20;
  subtitleRow.getCell(1).value = subtitle;
  subtitleRow.getCell(1).font = { name: 'Aptos', size: 10, italic: true, color: { argb: theme.muted } };
  subtitleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  for (let col = 1; col <= lastColumn; col += 1) {
    subtitleRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.white } };
  }
  worksheet.mergeCells(rowNumber + 1, 1, rowNumber + 1, lastColumn);
}

function styleHeaderRow(worksheet, rowNumber, accent = theme.blue) {
  const row = worksheet.getRow(rowNumber);
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 11, bold: true, color: { argb: theme.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
}

/**
 * Styles data rows using column definitions, so alignment / number formats /
 * conditional fills are data-driven instead of hardcoded by index.
 */
function styleDataRows(worksheet, startRow, endRow, columns) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.height = 20;
    row.eachCell((cell, colNumber) => {
      const def = columns[colNumber - 1] || {};
      const numeric = def.type === 'int' || def.type === 'currency';
      cell.font = { name: 'Aptos', size: 10, color: { argb: theme.text } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: def.align || (numeric ? 'right' : 'left'),
        wrapText: def.type !== 'currency' && def.type !== 'int' && def.type !== 'date',
      };
      cell.border = thinBorder();
      if (def.type === 'currency') cell.numFmt = NUMFMT.currency;
      if (def.type === 'int') cell.numFmt = NUMFMT.integer;
      if (def.type === 'date') cell.numFmt = NUMFMT.date;
      if (rowIndex % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFEFF' } };
      }
      if (def.statusColor) {
        const style = statusFill(String(cell.value ?? ''));
        if (style) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
          cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: style.font } };
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// High-level sheet builders
// ---------------------------------------------------------------------------

/**
 * Cover sheet with report metadata + KPI table. `kpis` is a list of
 * { label, value, type } where type drives number formatting.
 */
function addCoverSheet(workbook, { title, subtitle, scope, recordCount, meta, kpis, accent }) {
  const worksheet = workbook.addWorksheet('Portada', {
    properties: { tabColor: { argb: accent } },
  });
  setPageSetup(worksheet, title);
  worksheet.columns = [{ width: 34 }, { width: 26 }];

  styleTitleRow(worksheet, 1, title, subtitle, 2);

  const generatedBy = meta?.generatedBy || 'Sistema VisoEstante';
  const role = meta?.role ? ROLE_LABELS[meta.role] || meta.role : null;
  const now = new Date();

  const metaRows = [
    ['Generado por', role ? `${generatedBy} (${role})` : generatedBy],
    ['Fecha de emisión', formatChileanDate(now)],
    ['Hora de emisión', now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })],
    ['Alcance', scope],
    ['Registros incluidos', recordCount],
  ];
  metaRows.forEach((r) => {
    const row = worksheet.addRow(r);
    row.height = 20;
    row.getCell(1).font = { name: 'Aptos', size: 10, bold: true, color: { argb: theme.slate } };
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).font = { name: 'Aptos', size: 10, color: { argb: theme.text } };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
  });

  worksheet.addRow([]);
  const kpiHeaderRow = worksheet.addRow(['Indicador clave', 'Valor']);
  styleHeaderRow(worksheet, kpiHeaderRow.number, accent);

  const firstKpiRow = kpiHeaderRow.number + 1;
  kpis.forEach((kpi) => {
    const row = worksheet.addRow([kpi.label, kpi.value ?? '—']);
    const valueCell = row.getCell(2);
    if (kpi.type === 'currency') valueCell.numFmt = NUMFMT.currency;
    if (kpi.type === 'int') valueCell.numFmt = NUMFMT.integer;
  });
  styleDataRows(worksheet, firstKpiRow, worksheet.rowCount, [
    { type: 'text' },
    { type: 'text', align: 'right' },
  ]);
  for (let r = firstKpiRow; r <= worksheet.rowCount; r += 1) {
    worksheet.getRow(r).getCell(1).font = { name: 'Aptos', size: 10, bold: true, color: { argb: theme.text } };
  }
}

/**
 * Generic detail sheet. `columns` is a list of
 * { header, width, type, align, statusColor } and `rows` are arrays aligned
 * to columns (numbers for int/currency, Date|null for date).
 */
function addDetailSheet(workbook, config) {
  const { sheetName, title, subtitle, columns, rows, accent, totalsRow } = config;
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: accent } },
  });
  setPageSetup(worksheet, title);
  worksheet.columns = columns.map((c) => ({ width: c.width }));
  worksheet.views = [{ state: 'frozen', ySplit: 3 }];

  styleTitleRow(worksheet, 1, title, subtitle, columns.length);
  worksheet.addRow(columns.map((c) => c.header));
  rows.forEach((row) => worksheet.addRow(row));
  styleHeaderRow(worksheet, 3, accent);

  const lastDataRow = worksheet.rowCount;
  styleDataRows(worksheet, 4, lastDataRow, columns);

  if (totalsRow) {
    const row = worksheet.addRow(totalsRow);
    row.height = 22;
    row.eachCell((cell, colNumber) => {
      const def = columns[colNumber - 1] || {};
      cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: theme.navy } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.soft } };
      cell.alignment = { vertical: 'middle', horizontal: def.align || (def.type === 'int' || def.type === 'currency' ? 'right' : 'left') };
      cell.border = thinBorder();
      if (def.type === 'currency') cell.numFmt = NUMFMT.currency;
      if (def.type === 'int') cell.numFmt = NUMFMT.integer;
    });
  }

  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: columns.length },
  };
}

async function downloadWorkbook(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createWorkbook(meta) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta?.generatedBy || 'VisoEstante';
  workbook.company = 'VisoEstante';
  workbook.created = new Date();
  workbook.properties.date1904 = false;
  return workbook;
}

// ---------------------------------------------------------------------------
// Column schemas (shared)
// ---------------------------------------------------------------------------

const PRODUCT_COLUMNS = [
  { header: 'Producto', width: 26, type: 'text' },
  { header: 'Marca', width: 18, type: 'text' },
  { header: 'Categoría', width: 16, type: 'text' },
  { header: 'Código', width: 16, type: 'text', align: 'center' },
  { header: 'Ubicación', width: 14, type: 'text', align: 'center' },
  { header: 'Stock', width: 10, type: 'int' },
  { header: 'Stock mín.', width: 11, type: 'int' },
  { header: 'Precio unit.', width: 14, type: 'currency' },
  { header: 'Valor inventario', width: 16, type: 'currency' },
  { header: 'Estado', width: 14, type: 'text', align: 'center', statusColor: true },
  { header: 'Vencimiento', width: 14, type: 'date', align: 'center' },
  { header: 'Días p/ vencer', width: 13, type: 'int' },
];

function productRow(product) {
  return [
    product.name || '',
    product.brand || '',
    product.category || '',
    product.barcode || '',
    product.shelfLocation || '',
    num(product.currentStock),
    num(product.minStock),
    num(product.price),
    inventoryValue(product.currentStock, product.price),
    statusLabel(product.status),
    toDate(product.expirationDate),
    getDaysToExpiry(product.expirationDate),
  ];
}

const ALERT_COLUMNS = [
  { header: 'Tipo', width: 16, type: 'text', align: 'center' },
  { header: 'Severidad', width: 14, type: 'text', align: 'center', statusColor: true },
  { header: 'Mensaje', width: 40, type: 'text' },
  { header: 'Producto', width: 24, type: 'text' },
  { header: 'Marca', width: 16, type: 'text' },
  { header: 'Categoría', width: 16, type: 'text' },
  { header: 'Código', width: 16, type: 'text', align: 'center' },
  { header: 'Ubicación', width: 14, type: 'text', align: 'center' },
  { header: 'Stock', width: 10, type: 'int' },
  { header: 'Stock mín.', width: 11, type: 'int' },
  { header: 'Precio unit.', width: 14, type: 'currency' },
  { header: 'Valor inventario', width: 16, type: 'currency' },
  { header: 'Vencimiento', width: 14, type: 'date', align: 'center' },
  { header: 'Estado producto', width: 16, type: 'text', align: 'center', statusColor: true },
  { header: 'Resuelta', width: 11, type: 'text', align: 'center' },
];

function alertRow(alert) {
  const snapshot = alert.productSnapshot || {};
  return [
    alertTypeLabel(alert.type),
    severityLabel(alert.severity),
    alert.message || '',
    alert.productName || snapshot.name || '',
    snapshot.brand || '',
    snapshot.category || '',
    snapshot.barcode || '',
    snapshot.shelfLocation || '',
    num(snapshot.currentStock),
    num(snapshot.minStock),
    num(snapshot.price),
    inventoryValue(snapshot.currentStock, snapshot.price),
    snapshot.expirationDate ? toDate(snapshot.expirationDate) : null,
    statusLabel(snapshot.status),
    alert.resolved ? 'Sí' : 'No',
  ];
}

// ---------------------------------------------------------------------------
// KPI / aggregation helpers
// ---------------------------------------------------------------------------

function productKpis(products) {
  const totalValue = products.reduce((sum, p) => sum + inventoryValue(p.currentStock, p.price), 0);
  const expiredValue = products
    .filter((p) => p.status === 'vencido')
    .reduce((sum, p) => sum + inventoryValue(p.currentStock, p.price), 0);
  const expiringValue = products
    .filter((p) => p.status === 'por_vencer')
    .reduce((sum, p) => sum + inventoryValue(p.currentStock, p.price), 0);

  return [
    { label: 'Total de productos', value: products.length, type: 'int' },
    { label: 'Unidades en stock', value: products.reduce((s, p) => s + (num(p.currentStock) ?? 0), 0), type: 'int' },
    { label: 'Valoración de inventario', value: totalValue, type: 'currency' },
    { label: 'Sin stock (crítico)', value: products.filter((p) => p.currentStock === 0).length, type: 'int' },
    { label: `Stock bajo (< ${LOW_STOCK_THRESHOLD})`, value: products.filter((p) => p.currentStock > 0 && p.currentStock < LOW_STOCK_THRESHOLD).length, type: 'int' },
    { label: 'Vigentes', value: products.filter((p) => p.status === 'vigente').length, type: 'int' },
    { label: 'Por vencer', value: products.filter((p) => p.status === 'por_vencer').length, type: 'int' },
    { label: 'Vencidos', value: products.filter((p) => p.status === 'vencido').length, type: 'int' },
    { label: 'Valor por vencer (riesgo)', value: expiringValue, type: 'currency' },
    { label: 'Valor vencido (pérdida)', value: expiredValue, type: 'currency' },
  ];
}

function addCategorySheet(workbook, products) {
  const map = new Map();
  products.forEach((p) => {
    const key = p.category || 'Sin categoría';
    const entry = map.get(key) || { count: 0, stock: 0, value: 0, expired: 0, expiring: 0 };
    entry.count += 1;
    entry.stock += num(p.currentStock) ?? 0;
    entry.value += inventoryValue(p.currentStock, p.price);
    if (p.status === 'vencido') entry.expired += 1;
    if (p.status === 'por_vencer') entry.expiring += 1;
    map.set(key, entry);
  });

  const columns = [
    { header: 'Categoría', width: 22, type: 'text' },
    { header: 'Productos', width: 12, type: 'int' },
    { header: 'Unidades', width: 12, type: 'int' },
    { header: 'Valor inventario', width: 18, type: 'currency' },
    { header: 'Vencidos', width: 12, type: 'int' },
    { header: 'Por vencer', width: 12, type: 'int' },
  ];

  const rows = [...map.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .map(([category, e]) => [category, e.count, e.stock, e.value, e.expired, e.expiring]);

  const totals = rows.reduce(
    (acc, r) => [acc[0], acc[1] + r[1], acc[2] + r[2], acc[3] + r[3], acc[4] + r[4], acc[5] + r[5]],
    ['TOTAL', 0, 0, 0, 0, 0]
  );

  addDetailSheet(workbook, {
    sheetName: 'Por categoría',
    title: 'Distribución por categoría',
    subtitle: 'Conteo, stock, valoración y riesgos agrupados por categoría.',
    columns,
    rows,
    accent: theme.slate,
    totalsRow: totals,
  });
}

// ---------------------------------------------------------------------------
// Public exporters
// ---------------------------------------------------------------------------

export async function exportProductsToExcel(products, fileName = 'reporte-productos.xlsx', meta = {}) {
  const workbook = createWorkbook(meta);

  addCoverSheet(workbook, {
    title: 'Reporte ejecutivo de productos',
    subtitle: 'Vista consolidada para control operativo y administrativo.',
    scope: 'Inventario completo de productos',
    recordCount: products.length,
    meta,
    kpis: productKpis(products),
    accent: theme.emerald,
  });

  addCategorySheet(workbook, products);

  const detailRows = products.map(productRow);
  const totals = [
    'TOTALES', '', '', '', '',
    products.reduce((s, p) => s + (num(p.currentStock) ?? 0), 0),
    '', '',
    products.reduce((s, p) => s + inventoryValue(p.currentStock, p.price), 0),
    '', '', '',
  ];

  addDetailSheet(workbook, {
    sheetName: 'Productos',
    title: 'Detalle de productos',
    subtitle: 'Listado completo con estado, stock, valoración y vencimiento.',
    columns: PRODUCT_COLUMNS,
    rows: detailRows,
    accent: theme.blue,
    totalsRow: totals,
  });

  await downloadWorkbook(workbook, fileName);
}

export async function exportGeneralDashboardToExcel(products, alerts, fileName = 'reporte-general.xlsx', meta = {}) {
  const workbook = createWorkbook(meta);

  const alertKpis = [
    { label: 'Total de alertas', value: alerts.length, type: 'int' },
    { label: 'Alertas críticas', value: alerts.filter((a) => a.severity === 'critical').length, type: 'int' },
    { label: 'Advertencias', value: alerts.filter((a) => a.severity === 'warning').length, type: 'int' },
    { label: 'Stock bajo', value: alerts.filter((a) => a.type === 'low_stock').length, type: 'int' },
    { label: 'Por vencer', value: alerts.filter((a) => a.type === 'expiring_soon').length, type: 'int' },
    { label: 'Vencidos', value: alerts.filter((a) => a.type === 'expired').length, type: 'int' },
  ];

  addCoverSheet(workbook, {
    title: 'Reporte general operativo',
    subtitle: 'Inventario, alertas y distribución consolidada para revisión ejecutiva.',
    scope: 'Inventario y alertas activas',
    recordCount: products.length + alerts.length,
    meta,
    kpis: [...productKpis(products), ...alertKpis],
    accent: theme.navy,
  });

  addCategorySheet(workbook, products);

  const productTotals = [
    'TOTALES', '', '', '', '',
    products.reduce((s, p) => s + (num(p.currentStock) ?? 0), 0),
    '', '',
    products.reduce((s, p) => s + inventoryValue(p.currentStock, p.price), 0),
    '', '', '',
  ];
  addDetailSheet(workbook, {
    sheetName: 'Productos',
    title: 'Detalle de productos',
    subtitle: 'Base completa del inventario con estado, valoración y vencimiento.',
    columns: PRODUCT_COLUMNS,
    rows: products.map(productRow),
    accent: theme.blue,
    totalsRow: productTotals,
  });

  addDetailSheet(workbook, {
    sheetName: 'Alertas',
    title: 'Detalle de alertas',
    subtitle: 'Alertas activas y su contexto de producto.',
    columns: ALERT_COLUMNS,
    rows: alerts.map(alertRow),
    accent: theme.rose,
  });

  await downloadWorkbook(workbook, fileName);
}

export async function exportAlertsToExcel(alerts, fileName = 'reporte-alertas.xlsx', meta = {}) {
  const workbook = createWorkbook(meta);

  const atRiskValue = alerts.reduce((sum, a) => {
    const s = a.productSnapshot || {};
    return sum + inventoryValue(s.currentStock, s.price);
  }, 0);

  const kpis = [
    { label: 'Total de alertas', value: alerts.length, type: 'int' },
    { label: 'Alertas críticas', value: alerts.filter((a) => a.severity === 'critical').length, type: 'int' },
    { label: 'Advertencias', value: alerts.filter((a) => a.severity === 'warning').length, type: 'int' },
    { label: 'Stock bajo', value: alerts.filter((a) => a.type === 'low_stock').length, type: 'int' },
    { label: 'Por vencer', value: alerts.filter((a) => a.type === 'expiring_soon').length, type: 'int' },
    { label: 'Vencidas', value: alerts.filter((a) => a.type === 'expired').length, type: 'int' },
    { label: 'Resueltas', value: alerts.filter((a) => a.resolved).length, type: 'int' },
    { label: 'Valor involucrado en alertas', value: atRiskValue, type: 'currency' },
  ];

  addCoverSheet(workbook, {
    title: 'Reporte ejecutivo de alertas',
    subtitle: 'Concentrado de alertas activas y su severidad operativa.',
    scope: 'Alertas filtradas / activas',
    recordCount: alerts.length,
    meta,
    kpis,
    accent: theme.rose,
  });

  addDetailSheet(workbook, {
    sheetName: 'Alertas',
    title: 'Detalle de alertas',
    subtitle: 'Incluye contexto del producto y estado de resolución.',
    columns: ALERT_COLUMNS,
    rows: alerts.map(alertRow),
    accent: theme.rose,
  });

  await downloadWorkbook(workbook, fileName);
}
