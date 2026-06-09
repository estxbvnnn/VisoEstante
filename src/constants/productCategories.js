// Categorías de productos de supermercado.
// Los nombres existentes se conservan para no romper productos ya guardados;
// se añaden las categorías faltantes para cubrir un supermercado completo.
export const PRODUCT_CATEGORIES = [
  'Lácteos',
  'Frutas',
  'Verduras',
  'Carnes',
  'Pescados y mariscos',
  'Panadería',
  'Cereales y carbohidratos',
  'Abarrotes',
  'Snacks',
  'Bebidas',
  'Alcohol',
  'Congelados',
  'Desayuno y dulces',
  'Limpieza',
  'Cuidado personal',
  'Mascotas',
  'Bebés',
  'Otros',
];

// Explicación de qué incluye cada categoría (se muestra como ayuda al elegir).
export const PRODUCT_CATEGORY_DESCRIPTIONS = {
  'Lácteos': 'Leche, yogur, quesos, mantequilla, crema y huevos.',
  'Frutas': 'Frutas frescas a granel o envasadas.',
  'Verduras': 'Verduras y hortalizas frescas.',
  'Carnes': 'Carnes rojas, pollo, cerdo, cecinas y embutidos.',
  'Pescados y mariscos': 'Pescados, mariscos frescos y productos del mar.',
  'Panadería': 'Pan, marraquetas, hallullas, pasteles y repostería.',
  'Cereales y carbohidratos': 'Arroz, fideos, pastas, legumbres, harinas, avena y cereales.',
  'Abarrotes': 'Conservas, aceites, salsas, azúcar, sal y productos no perecibles.',
  'Snacks': 'Papas fritas, galletas saladas, frutos secos y picoteo.',
  'Bebidas': 'Bebidas sin alcohol: jugos, gaseosas, aguas y bebidas energéticas.',
  'Alcohol': 'Bebidas alcohólicas: vinos, cervezas, licores y destilados.',
  'Congelados': 'Productos congelados: helados, verduras, comidas listas y carnes.',
  'Desayuno y dulces': 'Café, té, mermeladas, miel, manjar, chocolates y golosinas.',
  'Limpieza': 'Detergentes, desinfectantes, papel y artículos de aseo del hogar.',
  'Cuidado personal': 'Higiene y belleza: jabón, shampoo, pasta dental y cuidado corporal.',
  'Mascotas': 'Alimento, snacks y accesorios para mascotas.',
  'Bebés': 'Pañales, fórmulas, papillas y productos para bebés.',
  'Otros': 'Productos que no encajan en las categorías anteriores.',
};
