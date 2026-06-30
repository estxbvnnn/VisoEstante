// scripts/seedData.js
// Carga masiva de datos de ejemplo en Firestore.
//
// Uso:   node scripts/seedData.js [cantidad]      (por defecto 100 productos)
//        npm run seed
//
// Cada ejecución genera códigos de barra únicos, por lo que puedes correrlo
// varias veces para ir sumando productos sin colisiones.
//
// Requiere un archivo .env en la raíz con las variables VITE_FIREBASE_*.
// Como las reglas de Firestore exigen rol de personal para escribir, agrega
// (opcionalmente) credenciales de un usuario admin para autenticar el seed:
//        SEED_ADMIN_EMAIL=tucorreo@dominio.cl
//        SEED_ADMIN_PASSWORD=tuclave

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Parseo simple de .env (robusto ante '=' en los valores) ---
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const idx = trimmed.indexOf('=');
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COUNT = Number(process.argv[2]) || 100;
const IVA_RATE = 0.19;

// --- Helpers ---
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function roundTo(n, step) {
  return Math.round(n / step) * step;
}
function dateFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
function ts(date) {
  return Timestamp.fromDate(date);
}
function shuffle(arr) {
  for (let k = arr.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [arr[k], arr[j]] = [arr[j], arr[k]];
  }
  return arr;
}

// Estado del producto (réplica local de statusUtils para no depender de los
// módulos del front, que usan imports sin extensión incompatibles con Node ESM).
function daysToExpiry(date) {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}
function calcStatus(date, currentStock) {
  if (currentStock === 0) return 'sin_stock';
  const days = daysToExpiry(date);
  if (days !== null && days < 0) return 'vencido';
  if (days !== null && days <= 30) return 'por_vencer';
  return 'vigente';
}

// --- Catálogo amplio por categoría (marcas, productos y rango de precio NETO) ---
const CATALOG = {
  'Lácteos': { brands: ['Colún', 'Soprole', 'Loncoleche', 'Quillayes', 'Surlat'], price: [490, 3500], items: ['Leche Entera 1L', 'Leche Descremada 1L', 'Leche Sin Lactosa 1L', 'Yogurt Natural 150g', 'Yogurt Frutilla 200g', 'Yogurt Griego 150g', 'Yogurt Bebible 1L', 'Queso Gauda 250g', 'Queso Mantecoso 250g', 'Quesillo 250g', 'Mantequilla 250g', 'Margarina 250g', 'Crema 200ml', 'Manjar 250g', 'Leche Condensada 397g', 'Postre Lácteo 120g'] },
  'Bebidas': { brands: ['Coca-Cola', "Watt's", 'Cachantun', 'CCU', 'Pepsi'], price: [490, 2200], items: ['Agua Mineral 1.5L', 'Agua con Gas 1.5L', 'Jugo Naranja 1L', 'Néctar Durazno 1L', 'Bebida Cola 2L', 'Bebida Lima 1.5L', 'Bebida Naranja 1.5L', 'Bebida Energética 500ml', 'Té Helado 1.5L', 'Jugo Manzana 1L', 'Agua Saborizada 600ml', 'Bebida Isotónica 500ml', 'Limonada 1.5L', 'Bebida Light 1.5L'] },
  'Frutas': { brands: ['Del Campo', 'Granel', 'Hortifrut', 'Del Huerto'], price: [690, 3990], items: ['Manzana Roja kg', 'Plátano kg', 'Naranja kg', 'Pera kg', 'Uva Blanca kg', 'Frutilla 250g', 'Palta Hass kg', 'Limón kg', 'Kiwi kg', 'Mandarina kg', 'Melón un', 'Arándanos 125g', 'Piña un', 'Durazno kg'] },
  'Verduras': { brands: ['Del Campo', 'Granel', 'La Huerta', 'Verdefresh'], price: [490, 2990], items: ['Tomate kg', 'Lechuga un', 'Cebolla kg', 'Papa kg', 'Zanahoria kg', 'Zapallo kg', 'Pimentón kg', 'Pepino un', 'Brócoli un', 'Choclo un', 'Espinaca atado', 'Champiñón 200g', 'Betarraga kg', 'Ajo malla'] },
  'Carnes': { brands: ['Agrosuper', 'Don Pollo', 'PF', 'La Crianza', 'Super Cerdo'], price: [2990, 8990], items: ['Filete de Pollo 1kg', 'Pechuga Pollo 1kg', 'Asado Carnicero 1kg', 'Molida de Vacuno 1kg', 'Costillar de Cerdo 1kg', 'Longaniza 500g', 'Vienesas 500g', 'Chuleta Cerdo 1kg', 'Lomo Vetado 1kg', 'Pollo Entero 1.8kg', 'Hamburguesa 4un', 'Pavo Molido 500g'] },
  'Pescados y mariscos': { brands: ['San José', 'Camanchaca', 'Pacific Star', 'Mar Profundo'], price: [1990, 9990], items: ['Filete de Salmón 500g', 'Merluza 1kg', 'Reineta 800g', 'Camarón Pelado 500g', 'Choritos 1kg', 'Jibia Anillos 500g', 'Salmón Ahumado 200g', 'Machas 500g', 'Filete Basa 1kg', 'Atún Fresco 500g'] },
  'Panadería': { brands: ['Ideal', 'Pan Grino', 'Castaño', 'Bimbo', 'Fuchs'], price: [690, 2500], items: ['Pan de Molde Blanco', 'Pan Integral', 'Marraqueta x6', 'Hallulla x6', 'Pan Pita 6un', 'Tortillas 6un', 'Baguette un', 'Pan Hamburguesa 6un', 'Pan Hot Dog 6un', 'Croissant 4un', 'Pan Centeno', 'Bizcocho un'] },
  'Cereales y carbohidratos': { brands: ['Tucapel', 'Carozzi', 'Lucchetti', 'Quaker', 'Selecta'], price: [690, 3500], items: ['Arroz Grado 1 1kg', 'Arroz Integral 1kg', 'Fideos Spaghetti 400g', 'Fideos Corbata 400g', 'Fideos Cabello 400g', 'Avena 1kg', 'Lentejas 1kg', 'Porotos 1kg', 'Garbanzos 500g', 'Harina 1kg', 'Sémola 500g', 'Quinoa 500g', 'Granola 400g', 'Mote 500g'] },
  'Abarrotes': { brands: ['Maggi', 'Gourmet', 'Iansa', 'San Jorge', 'Malloa'], price: [490, 4500], items: ['Aceite Vegetal 1L', 'Aceite Oliva 500ml', 'Azúcar 1kg', 'Sal 1kg', 'Atún en Lata 170g', 'Jurel en Lata 425g', 'Salsa Tomate 200g', 'Ketchup 500g', 'Mayonesa 500g', 'Mostaza 250g', 'Vinagre 500ml', 'Caldo Cubo 12un', 'Aceitunas 200g', 'Choclo en Lata 300g', 'Arvejas en Lata 300g', 'Durazno Conserva 820g'] },
  'Snacks': { brands: ['Pringles', 'Nabisco', 'Nestlé', 'Evercrisp', 'Costa'], price: [490, 2500], items: ['Papas Fritas 150g', 'Galletas Chocolate 250g', 'Galletas Soda 240g', 'Chocolatín 100g', 'Maní Salado 200g', 'Ramitas 120g', 'Cabritas 120g', 'Doraditas 150g', 'Mix Frutos Secos 200g', 'Barra Cereal 6un', 'Suflitos 130g', 'Galletas Obleas 6un', 'Chocolate Barra 90g'] },
  'Alcohol': { brands: ['Cristal', 'Escudo', 'Concha y Toro', 'Mistral', 'Capel', 'Santa Rita'], price: [990, 12990], items: ['Cerveza Lata 470ml', 'Cerveza Six Pack', 'Vino Tinto 750ml', 'Vino Blanco 750ml', 'Pisco 35° 750ml', 'Ron 750ml', 'Vodka 750ml', 'Whisky 750ml', 'Espumante 750ml', 'Cerveza Negra 330ml', 'Sidra 750ml', 'Aperitivo 700ml'] },
  'Congelados': { brands: ['Dr. Oetker', 'Savory', 'Bibo', 'Cero', 'La Cocina'], price: [1490, 4990], items: ['Pizza Congelada 4Q', 'Helado Vainilla 1L', 'Helado Chocolate 1L', 'Papas Prefritas 1kg', 'Verduras Mixtas 500g', 'Nuggets Pollo 500g', 'Empanadas Pino 6un', 'Berries Congelados 500g', 'Filete Pescado 400g', 'Masa Hojaldre 500g', 'Sopaipillas 6un', 'Helado Palito 6un'] },
  'Desayuno y dulces': { brands: ['Nescafé', 'Costa', 'Ambrosoli', 'McKay', 'Colún'], price: [690, 4990], items: ['Café Instantáneo 170g', 'Café Molido 250g', 'Té Negro 20un', 'Té Verde 20un', 'Mermelada Frutilla 250g', 'Miel 500g', 'Manjar Repostero 1kg', 'Chocolate Taza 200g', 'Cereal Azucarado 500g', 'Galletas Desayuno 200g', 'Cocoa 400g', 'Leche en Polvo 400g'] },
  'Limpieza': { brands: ['Omo', 'Clorox', 'Ajax', 'Quix', 'Confort'], price: [690, 6990], items: ['Detergente Líquido 3L', 'Detergente Polvo 1kg', 'Cloro 1L', 'Lavalozas 750ml', 'Limpiapisos 1L', 'Toalla Papel x3', 'Papel Higiénico 12un', 'Servilletas 100un', 'Esponja x3', 'Desinfectante 1L', 'Suavizante 1L', 'Bolsas Basura 20un', 'Limpiavidrios 500ml', 'Quitagrasa 500ml'] },
  'Cuidado personal': { brands: ['Sedal', 'Colgate', 'Dove', 'Nivea', 'Lady Soft'], price: [990, 5990], items: ['Shampoo 400ml', 'Acondicionador 400ml', 'Pasta Dental 90g', 'Cepillo Dental 2un', 'Jabón Barra 3un', 'Desodorante 150ml', 'Crema Corporal 200ml', 'Bloqueador Solar 120ml', 'Toallas Femeninas 16un', 'Espuma Afeitar 200ml', 'Enjuague Bucal 500ml', 'Gel Ducha 750ml', 'Crema Manos 100ml'] },
  'Mascotas': { brands: ['Master Dog', 'Cat Chow', 'Pedigree', 'Whiskas', 'Champion'], price: [1990, 14990], items: ['Alimento Perro 3kg', 'Alimento Perro 10kg', 'Alimento Gato 1.5kg', 'Snack Perro 200g', 'Arena Sanitaria 4kg', 'Hueso Masticable un', 'Shampoo Mascota 300ml', 'Lata Alimento Perro 340g', 'Snack Gato 60g'] },
  'Bebés': { brands: ['Babysec', 'Nestlé', 'Johnson', 'Pampers', 'Cottontex'], price: [1990, 9990], items: ['Pañales Talla M 40un', 'Pañales Talla G 36un', 'Fórmula Infantil 400g', 'Toallitas Húmedas 80un', 'Papilla Frutas 113g', 'Colado Verduras 113g', 'Shampoo Bebé 200ml', 'Crema Coceduras 100g', 'Cereal Infantil 200g'] },
  'Otros': { brands: ['Energizer', 'Philips', 'Virutex', 'Genérico'], price: [490, 5990], items: ['Pilas AA 4un', 'Pilas AAA 4un', 'Ampolleta LED 9W', 'Encendedor un', 'Vela Pack 6un', 'Fósforos 10 cajas', 'Cinta Adhesiva un', 'Bolsa Reutilizable un', 'Cuaderno 100 hojas'] },
};

const LOCATIONS = ['Pasillo 1', 'Pasillo 2', 'Pasillo 3', 'Pasillo 4', 'Pasillo 5', 'Pasillo 6', 'Refrigerado 1', 'Refrigerado 2', 'Congelado 1'];
const LEVELS = ['Nivel A', 'Nivel B', 'Nivel C'];
const PAYMENTS = ['efectivo', 'debito', 'credito', 'transferencia'];

// --- Generación de productos variados (sin repetir nombre+marca) ---
function buildProducts(count) {
  const categories = Object.keys(CATALOG);
  const pool = [];
  for (const category of categories) {
    for (const item of CATALOG[category].items) pool.push({ category, item });
  }
  shuffle(pool);

  const runId = String(Date.now()).slice(-7); // base única por ejecución
  const products = [];
  const used = new Set();
  let cursor = 0;
  let guard = 0;
  while (products.length < count && guard < count * 30) {
    guard++;
    const base = pool[cursor % pool.length];
    cursor++;
    const c = CATALOG[base.category];
    const brand = pick(c.brands);
    const key = `${base.item}|${brand}`;
    if (used.has(key)) continue;
    used.add(key);

    const idx = products.length;
    const price = roundTo(randInt(c.price[0], c.price[1]), 10);
    const minStock = randInt(3, 12);

    const stockRoll = Math.random();
    let currentStock;
    if (stockRoll < 0.12) currentStock = 0;
    else if (stockRoll < 0.35) currentStock = randInt(1, minStock);
    else currentStock = randInt(minStock + 1, minStock * 4);

    const expRoll = Math.random();
    let expirationDate;
    if (expRoll < 0.15) expirationDate = dateFromNow(-randInt(1, 60));
    else if (expRoll < 0.37) expirationDate = dateFromNow(randInt(1, 30));
    else expirationDate = dateFromNow(randInt(31, 200));

    const createdAt = dateFromNow(-randInt(5, 180));

    products.push({
      barcode: '7' + runId + String(idx).padStart(5, '0'),
      name: base.item,
      brand,
      category: base.category,
      price,
      minStock,
      currentStock,
      shelfLocation: `${pick(LOCATIONS)} - ${pick(LEVELS)}`,
      expirationDate,
      createdAt,
      imageUrl: '',
    });
  }
  return products;
}

async function seed() {
  console.log(`🌱 Generando ${COUNT} productos + historial para Firestore...`);

  if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
    console.log(`🔑 Autenticado como ${env.SEED_ADMIN_EMAIL}`);
  } else {
    console.log('⚠️  Sin SEED_ADMIN_* en .env: se intentará escribir sin autenticar (puede fallar por las reglas de Firestore).');
  }

  const productInputs = buildProducts(COUNT);
  const productOps = [];
  const auditOps = [];
  const created = [];

  for (const p of productInputs) {
    const ref = doc(collection(db, 'products'));
    const expTs = ts(p.expirationDate);
    const status = calcStatus(p.expirationDate, p.currentStock);
    const createdTs = ts(p.createdAt);

    productOps.push({
      ref,
      data: {
        barcode: p.barcode,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        minStock: p.minStock,
        currentStock: p.currentStock,
        shelfLocation: p.shelfLocation,
        expirationDate: expTs,
        status,
        imageUrl: '',
        lastScannedAt: createdTs,
        lastScannedBy: 'seed',
        createdAt: createdTs,
        updatedAt: Timestamp.now(),
      },
    });
    created.push({ id: ref.id, name: p.name, barcode: p.barcode, price: p.price });

    auditOps.push({
      ref: doc(collection(db, 'audit_logs')),
      data: { action: 'product_scanned', productId: ref.id, userId: 'seed', details: { barcode: p.barcode, newProduct: true }, timestamp: createdTs },
    });
    if (Math.random() < 0.55) {
      const ageDays = Math.max(2, Math.round((Date.now() - p.createdAt.getTime()) / 86400000));
      auditOps.push({
        ref: doc(collection(db, 'audit_logs')),
        data: { action: 'price_updated', productId: ref.id, userId: 'seed', details: { newPrice: p.price }, timestamp: ts(dateFromNow(-randInt(1, ageDays))) },
      });
    }
    if (Math.random() < 0.65) {
      auditOps.push({
        ref: doc(collection(db, 'audit_logs')),
        data: { action: 'stock_updated', productId: ref.id, userId: 'seed', details: { newStock: p.currentStock }, timestamp: ts(dateFromNow(-randInt(1, 90))) },
      });
    }
  }

  // --- Ventas de ejemplo (últimos 60 días) + historial por producto vendido ---
  const salesOps = [];
  const sellable = created.filter((p) => p.price > 0);
  const salesCount = Math.max(10, Math.round(COUNT / 4));
  for (let s = 0; s < salesCount && sellable.length > 0; s++) {
    const nLines = randInt(1, 3);
    const lines = [];
    let totalNet = 0;
    for (let l = 0; l < nLines; l++) {
      const prod = pick(sellable);
      const quantity = randInt(1, 4);
      const unitNet = prod.price;
      const lineNet = unitNet * quantity;
      totalNet += lineNet;
      lines.push({ productId: prod.id, name: prod.name, barcode: prod.barcode, quantity, unitNet, lineNet });
    }
    const totalTax = Math.round(totalNet * IVA_RATE);
    const totalGross = totalNet + totalTax;
    const when = ts(dateFromNow(-randInt(1, 60)));
    const saleRef = doc(collection(db, 'sales'));
    salesOps.push({
      ref: saleRef,
      data: {
        items: lines,
        itemCount: lines.reduce((a, b) => a + b.quantity, 0),
        lineCount: lines.length,
        totalNet,
        totalTax,
        totalGross,
        paymentMethod: pick(PAYMENTS),
        soldBy: 'seed',
        soldByName: 'Datos de ejemplo',
        createdAt: when,
      },
    });
    for (const line of lines) {
      auditOps.push({
        ref: doc(collection(db, 'audit_logs')),
        data: { action: 'product_sold', productId: line.productId, userId: 'seed', details: { saleId: saleRef.id, quantity: line.quantity, unitNet: line.unitNet, lineNet: line.lineNet }, timestamp: when },
      });
    }
  }

  await commitAll(productOps, 'Productos');
  await commitAll(auditOps, 'Historial');
  await commitAll(salesOps, 'Ventas');

  console.log(`\n✅ Seed completado: ${productOps.length} productos, ${auditOps.length} eventos de historial, ${salesOps.length} ventas.`);
  process.exit(0);
}

async function commitAll(ops, label) {
  let i = 0;
  while (i < ops.length) {
    const batch = writeBatch(db);
    const chunk = ops.slice(i, i + 400);
    chunk.forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
    i += chunk.length;
    process.stdout.write(`\r  ${label}: ${i}/${ops.length}`);
  }
  if (ops.length) process.stdout.write('\n');
}

seed().catch((err) => {
  console.error('\n❌ Error en seed:', err?.message || err);
  if (String(err?.code).includes('permission-denied') || String(err).includes('permission')) {
    console.error('\n👉 Las reglas de Firestore bloquearon la escritura. Soluciones:');
    console.error('   1) Agrega SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (usuario admin) en tu .env, o');
    console.error('   2) Ejecuta contra el emulador de Firestore, o');
    console.error('   3) Usa reglas de prueba temporalmente para el seed.');
  }
  process.exit(1);
});
