import ExcelJS from 'exceljs';
import { formatChileanDate } from './dateUtils';
import { formatCLP } from './formatUtils';

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
};

function setPageSetup(worksheet) {
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
  };
  worksheet.views = [{ state: 'frozen', ySplit: 4 }];
}

function styleTitleRow(worksheet, rowNumber, title, subtitle, lastColumn) {
  const titleRow = worksheet.getRow(rowNumber);
  titleRow.height = 24;
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { name: 'Aptos', size: 16, bold: true, color: { argb: theme.navy } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.soft } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  for (let col = 2; col <= lastColumn; col += 1) {
    titleRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.soft } };
  }
  worksheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);

  const subtitleRow = worksheet.getRow(rowNumber + 1);
  subtitleRow.height = 20;
  subtitleRow.getCell(1).value = subtitle;
  subtitleRow.getCell(1).font = { name: 'Aptos', size: 10, italic: true, color: { argb: theme.muted } };
  subtitleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  for (let col = 2; col <= lastColumn; col += 1) {
    subtitleRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.white } };
  }
  worksheet.mergeCells(rowNumber + 1, 1, rowNumber + 1, lastColumn);
}

function styleHeaderRow(worksheet, rowNumber, accent = theme.blue) {
  const row = worksheet.getRow(rowNumber);
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 11, bold: true, color: { argb: theme.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: theme.border } },
      left: { style: 'thin', color: { argb: theme.border } },
      bottom: { style: 'thin', color: { argb: theme.border } },
      right: { style: 'thin', color: { argb: theme.border } },
    };
  });
}

function styleDataRows(worksheet, startRow, endRow, options = {}) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Aptos', size: 10, color: { argb: theme.text } };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 3 || colNumber === 6 || colNumber === 7 || colNumber === 8 || colNumber === 9 || colNumber === 10 || colNumber === 11 || colNumber === 12 || colNumber === 13 || colNumber === 14 || colNumber === 15 ? 'center' : 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: theme.border } },
        left: { style: 'thin', color: { argb: theme.border } },
        bottom: { style: 'thin', color: { argb: theme.border } },
        right: { style: 'thin', color: { argb: theme.border } },
      };
      if (rowIndex % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFEFF' } };
      }
      if (options.conditional && options.conditional(cell, rowIndex, colNumber)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.conditional(cell, rowIndex, colNumber) } };
      }
    });
  }
}

function addSummarySheet(workbook, title, subtitle, summaryRows, accent) {
  const worksheet = workbook.addWorksheet('Resumen');
  setPageSetup(worksheet);
  worksheet.columns = [
    { width: 32 },
    { width: 16 },
  ];

  styleTitleRow(worksheet, 1, title, subtitle, 2);
  worksheet.addRow(['Indicador', 'Valor']);
  summaryRows.forEach((row) => worksheet.addRow([row[0], row[1]]));
  styleHeaderRow(worksheet, 3, accent);
  styleDataRows(worksheet, 4, worksheet.rowCount);

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber <= 2) return;
      if (rowNumber >= 4 && cell.col === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });
}

function addOverviewSheet(workbook, { products, alerts }) {
  const worksheet = workbook.addWorksheet('Resumen general');
  setPageSetup(worksheet);
  worksheet.columns = [{ width: 34 }, { width: 18 }, { width: 18 }];

  styleTitleRow(
    worksheet,
    1,
    'Reporte general operativo',
    'Inventario, alertas y distribución consolidada para revisión ejecutiva.',
    3
  );

  worksheet.addRow(['Indicador', 'Productos', 'Alertas']);
  worksheet.addRow(['Total', products.length, alerts.length]);
  worksheet.addRow(['Críticos', products.filter((p) => p.currentStock === 0).length, alerts.filter((a) => a.severity === 'critical').length]);
  worksheet.addRow(['Bajo stock', products.filter((p) => p.currentStock > 0 && p.currentStock < 20).length, alerts.filter((a) => a.type === 'low_stock').length]);
  worksheet.addRow(['Por vencer', products.filter((p) => p.status === 'por_vencer').length, alerts.filter((a) => a.type === 'expiring_soon').length]);
  worksheet.addRow(['Vencidos', products.filter((p) => p.status === 'vencido').length, alerts.filter((a) => a.type === 'expired').length]);

  styleHeaderRow(worksheet, 3, theme.navy);
  styleDataRows(worksheet, 4, worksheet.rowCount);

  worksheet.getColumn(1).eachCell((cell, rowNumber) => {
    if (rowNumber >= 4) {
      cell.font = { name: 'Aptos', size: 10, bold: rowNumber === 4, color: { argb: theme.text } };
    }
  });
}

function addDetailSheet(workbook, config) {
  const { sheetName, title, subtitle, headers, rows, columnWidths, accent, statusColumnIndex } = config;
  const worksheet = workbook.addWorksheet(sheetName);
  setPageSetup(worksheet);
  worksheet.columns = columnWidths.map((width) => ({ width }));

  styleTitleRow(worksheet, 1, title, subtitle, headers.length);
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));
  styleHeaderRow(worksheet, 3, accent);
  styleDataRows(worksheet, 4, worksheet.rowCount, {
    conditional: (cell, rowIndex, colNumber) => {
      if (statusColumnIndex && colNumber === statusColumnIndex) {
        const value = String(cell.value || '').toLowerCase();
        if (value === 'vencido' || value === 'expired') return theme.rose;
        if (value === 'por_vencer' || value === 'expiring_soon') return theme.amber;
        if (value === 'sin_stock' || value === 'critical') return theme.slate;
      }
      return null;
    },
  });

  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: headers.length },
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

export async function exportProductsToExcel(products, fileName = 'reporte-productos.xlsx') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VisoEstante';
  workbook.created = new Date();
  workbook.properties.date1904 = false;
  workbook.views = [{ x: 0, y: 0, width: 12000, height: 8000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  const stockCritical = products.filter((p) => p.currentStock === 0).length;
  const stockLow = products.filter((p) => p.currentStock > 0 && p.currentStock < 20).length;
  const stockHealthy = products.filter((p) => p.currentStock >= 20).length;

  const summaryRows = [
    ['Total productos', products.length],
    ['Stock crítico', stockCritical],
    ['Stock bajo (< 20)', stockLow],
    ['Stock sano', stockHealthy],
    ['Vigentes', products.filter((p) => p.status === 'vigente').length],
    ['Por vencer', products.filter((p) => p.status === 'por_vencer').length],
    ['Vencidos', products.filter((p) => p.status === 'vencido').length],
  ];

  const detailRows = products.map((product) => [
    product.name || '',
    product.brand || '',
    product.category || '',
    product.barcode || '',
    product.shelfLocation || '',
    product.currentStock ?? '',
    product.minStock ?? '',
    typeof product.price === 'number' ? product.price : '',
    typeof product.price === 'number' ? formatCLP(product.price) : '—',
    product.status || '',
    formatChileanDate(product.expirationDate),
  ]);

  addSummarySheet(
    workbook,
    'Reporte ejecutivo de productos',
    'Vista consolidada para control operativo y administrativo.',
    summaryRows,
    theme.emerald
  );

  addDetailSheet(workbook, {
    sheetName: 'Productos',
    title: 'Detalle de productos',
    subtitle: 'Listado completo con estado, stock y vencimiento.',
    headers: ['Producto', 'Marca', 'Categoria', 'Codigo', 'Ubicacion', 'Stock', 'Stock minimo', 'Precio', 'Precio CLP', 'Estado', 'Vencimiento'],
    rows: detailRows,
    columnWidths: [24, 18, 18, 16, 18, 10, 12, 12, 14, 14, 14],
    accent: theme.blue,
    statusColumnIndex: 10,
  });

  await downloadWorkbook(workbook, fileName);
}

export async function exportGeneralDashboardToExcel(products, alerts, fileName = 'reporte-general.xlsx') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VisoEstante';
  workbook.created = new Date();
  workbook.properties.date1904 = false;

  addOverviewSheet(workbook, { products, alerts });
  addSummarySheet(
    workbook,
    'Resumen de inventario',
    'Distribución general de stock, estado y cobertura operativa.',
    [
      ['Total productos', products.length],
      ['Stock crítico', products.filter((p) => p.currentStock === 0).length],
      ['Stock bajo (< 20)', products.filter((p) => p.currentStock > 0 && p.currentStock < 20).length],
      ['Vigentes', products.filter((p) => p.status === 'vigente').length],
      ['Por vencer', products.filter((p) => p.status === 'por_vencer').length],
      ['Vencidos', products.filter((p) => p.status === 'vencido').length],
    ],
    theme.emerald
  );

  addDetailSheet(workbook, {
    sheetName: 'Productos',
    title: 'Detalle de productos',
    subtitle: 'Base completa del inventario con estado y vencimiento.',
    headers: ['Producto', 'Marca', 'Categoria', 'Codigo', 'Ubicacion', 'Stock', 'Stock minimo', 'Precio', 'Precio CLP', 'Estado', 'Vencimiento'],
    rows: products.map((product) => [
      product.name || '',
      product.brand || '',
      product.category || '',
      product.barcode || '',
      product.shelfLocation || '',
      product.currentStock ?? '',
      product.minStock ?? '',
      typeof product.price === 'number' ? product.price : '',
      typeof product.price === 'number' ? formatCLP(product.price) : '—',
      product.status || '',
      formatChileanDate(product.expirationDate),
    ]),
    columnWidths: [24, 18, 18, 16, 18, 10, 12, 12, 14, 14, 14],
    accent: theme.blue,
    statusColumnIndex: 10,
  });

  addDetailSheet(workbook, {
    sheetName: 'Alertas',
    title: 'Detalle de alertas',
    subtitle: 'Alertas activas y su contexto de producto.',
    headers: ['Alerta', 'Severidad', 'Mensaje', 'Producto', 'Marca', 'Categoria', 'Codigo', 'Ubicacion', 'Stock', 'Stock minimo', 'Precio', 'Precio CLP', 'Vencimiento', 'Estado', 'Resuelta'],
    rows: alerts.map((alert) => {
      const snapshot = alert.productSnapshot || {};
      return [
        alert.type || '',
        alert.severity || '',
        alert.message || '',
        alert.productName || snapshot.name || '',
        snapshot.brand || '',
        snapshot.category || '',
        snapshot.barcode || '',
        snapshot.shelfLocation || '',
        snapshot.currentStock ?? '',
        snapshot.minStock ?? '',
        typeof snapshot.price === 'number' ? snapshot.price : '',
        typeof snapshot.price === 'number' ? formatCLP(snapshot.price) : '—',
        snapshot.expirationDate ? formatChileanDate(snapshot.expirationDate) : '—',
        snapshot.status || '',
        alert.resolved ? 'Sí' : 'No',
      ];
    }),
    columnWidths: [16, 14, 40, 24, 18, 18, 16, 18, 10, 12, 12, 14, 14, 12, 10],
    accent: theme.rose,
    statusColumnIndex: 2,
  });

  await downloadWorkbook(workbook, fileName);
}

export async function exportAlertsToExcel(alerts, fileName = 'reporte-alertas.xlsx') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VisoEstante';
  workbook.created = new Date();
  workbook.properties.date1904 = false;

  const summaryRows = [
    ['Total alertas', alerts.length],
    ['Críticas', alerts.filter((a) => a.severity === 'critical').length],
    ['Advertencias', alerts.filter((a) => a.severity === 'warning').length],
    ['Stock bajo', alerts.filter((a) => a.type === 'low_stock').length],
    ['Por vencer', alerts.filter((a) => a.type === 'expiring_soon').length],
    ['Vencidas', alerts.filter((a) => a.type === 'expired').length],
  ];

  const detailRows = alerts.map((alert) => {
    const snapshot = alert.productSnapshot || {};
    return [
      alert.type || '',
      alert.severity || '',
      alert.message || '',
      alert.productName || snapshot.name || '',
      snapshot.brand || '',
      snapshot.category || '',
      snapshot.barcode || '',
      snapshot.shelfLocation || '',
      snapshot.currentStock ?? '',
      snapshot.minStock ?? '',
      typeof snapshot.price === 'number' ? snapshot.price : '',
      typeof snapshot.price === 'number' ? formatCLP(snapshot.price) : '—',
      snapshot.expirationDate ? formatChileanDate(snapshot.expirationDate) : '—',
      snapshot.status || '',
      alert.resolved ? 'Sí' : 'No',
    ];
  });

  addSummarySheet(
    workbook,
    'Reporte ejecutivo de alertas',
    'Concentrado de alertas activas y su severidad operativa.',
    summaryRows,
    theme.rose
  );

  addDetailSheet(workbook, {
    sheetName: 'Alertas',
    title: 'Detalle de alertas',
    subtitle: 'Incluye contexto del producto y estado de resolución.',
    headers: ['Alerta', 'Severidad', 'Mensaje', 'Producto', 'Marca', 'Categoria', 'Codigo', 'Ubicacion', 'Stock', 'Stock minimo', 'Precio', 'Precio CLP', 'Vencimiento', 'Estado', 'Resuelta'],
    rows: detailRows,
    columnWidths: [16, 14, 40, 24, 18, 18, 16, 18, 10, 12, 12, 14, 14, 12, 10],
    accent: theme.rose,
    statusColumnIndex: 2,
  });

  await downloadWorkbook(workbook, fileName);
}
