// scripts/seedData.js
// Run with: node scripts/seedData.js
// Requires a .env file in the project root with VITE_FIREBASE_* variables

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal dotenv parsing
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
);

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

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Timestamp.fromDate(d);
}

const products = [
  // Lácteos
  { barcode: '7802800066024', name: 'Leche Entera 1L', brand: 'Colún', category: 'Lácteos', price: 890, minStock: 10, currentStock: 5, shelfLocation: 'Refrigerado 1 - Nivel A', expirationDate: daysFromNow(8), imageUrl: '' },
  { barcode: '7802800066031', name: 'Yogurt Frutilla 200g', brand: 'Soprole', category: 'Lácteos', price: 490, minStock: 8, currentStock: 3, shelfLocation: 'Refrigerado 1 - Nivel B', expirationDate: daysFromNow(-3), imageUrl: '' },
  { barcode: '7802800066048', name: 'Queso Mantecoso 250g', brand: 'Colún', category: 'Lácteos', price: 1890, minStock: 5, currentStock: 7, shelfLocation: 'Refrigerado 1 - Nivel C', expirationDate: daysFromNow(25), imageUrl: '' },
  { barcode: '7802800066055', name: 'Mantequilla Sin Sal 200g', brand: 'Dos Alamos', category: 'Lácteos', price: 1290, minStock: 4, currentStock: 12, shelfLocation: 'Refrigerado 1 - Nivel C', expirationDate: daysFromNow(60), imageUrl: '' },

  // Bebidas
  { barcode: '7803095000012', name: 'Agua Mineral 1.5L', brand: 'Cachantun', category: 'Bebidas', price: 590, minStock: 15, currentStock: 20, shelfLocation: 'Pasillo 2 - Nivel A', expirationDate: daysFromNow(180), imageUrl: '' },
  { barcode: '7803095000029', name: 'Jugo Naranja 1L', brand: 'Watt\'s', category: 'Bebidas', price: 990, minStock: 10, currentStock: 2, shelfLocation: 'Pasillo 2 - Nivel B', expirationDate: daysFromNow(14), imageUrl: '' },
  { barcode: '7803095000036', name: 'Coca-Cola 2L', brand: 'Coca-Cola', category: 'Bebidas', price: 1490, minStock: 12, currentStock: 18, shelfLocation: 'Pasillo 2 - Nivel A', expirationDate: daysFromNow(90), imageUrl: '' },
  { barcode: '7803095000043', name: 'Bebida Sprite 1.5L', brand: 'Coca-Cola', category: 'Bebidas', price: 1290, minStock: 10, currentStock: 0, shelfLocation: 'Pasillo 2 - Nivel A', expirationDate: daysFromNow(90), imageUrl: '' },

  // Panadería
  { barcode: '7804320010011', name: 'Pan de Molde Blanco', brand: 'Ideal', category: 'Panadería', price: 1190, minStock: 5, currentStock: 4, shelfLocation: 'Pasillo 3 - Nivel A', expirationDate: daysFromNow(5), imageUrl: '' },
  { barcode: '7804320010028', name: 'Marraqueta x6', brand: 'Pan Grino', category: 'Panadería', price: 890, minStock: 8, currentStock: 6, shelfLocation: 'Pasillo 3 - Nivel B', expirationDate: daysFromNow(2), imageUrl: '' },

  // Snacks
  { barcode: '7801270001015', name: 'Papas Fritas 150g', brand: 'Pringles', category: 'Snacks', price: 1490, minStock: 6, currentStock: 10, shelfLocation: 'Pasillo 4 - Nivel A', expirationDate: daysFromNow(120), imageUrl: '' },
  { barcode: '7801270001022', name: 'Galletas Chips Ahoy 250g', brand: 'Nabisco', category: 'Snacks', price: 1890, minStock: 5, currentStock: 8, shelfLocation: 'Pasillo 4 - Nivel B', expirationDate: daysFromNow(45), imageUrl: '' },
  { barcode: '7801270001039', name: 'Chocolatín Sahne-Nuss 100g', brand: 'Nestlé', category: 'Snacks', price: 990, minStock: 10, currentStock: 1, shelfLocation: 'Pasillo 4 - Nivel C', expirationDate: daysFromNow(30), imageUrl: '' },

  // Limpieza
  { barcode: '7803030020014', name: 'Detergente Líquido 3L', brand: 'Omo', category: 'Limpieza', price: 4990, minStock: 4, currentStock: 5, shelfLocation: 'Pasillo 5 - Nivel A', expirationDate: daysFromNow(365), imageUrl: '' },
  { barcode: '7803030020021', name: 'Cloro 1L', brand: 'Clorox', category: 'Limpieza', price: 990, minStock: 6, currentStock: 9, shelfLocation: 'Pasillo 5 - Nivel B', expirationDate: daysFromNow(300), imageUrl: '' },
  { barcode: '7803030020038', name: 'Jabón Loza Esponja', brand: 'Ajax', category: 'Limpieza', price: 790, minStock: 8, currentStock: 3, shelfLocation: 'Pasillo 5 - Nivel B', expirationDate: daysFromNow(400), imageUrl: '' },

  // Carnes
  { barcode: '7802600050011', name: 'Filete de Pollo 1kg', brand: 'Agrosuper', category: 'Carnes', price: 3990, minStock: 5, currentStock: 4, shelfLocation: 'Refrigerado 2 - Nivel A', expirationDate: daysFromNow(3), imageUrl: '' },
  { barcode: '7802600050028', name: 'Asado Carnicero 1kg', brand: 'Don Pollo', category: 'Carnes', price: 5490, minStock: 3, currentStock: 0, shelfLocation: 'Refrigerado 2 - Nivel B', expirationDate: daysFromNow(-1), imageUrl: '' },

  // Congelados
  { barcode: '7801940030015', name: 'Pizza Congelada 4Q', brand: 'Dr. Oetker', category: 'Congelados', price: 3290, minStock: 4, currentStock: 6, shelfLocation: 'Congelado 1 - Nivel A', expirationDate: daysFromNow(180), imageUrl: '' },
  { barcode: '7801940030022', name: 'Helado Vainilla 1L', brand: 'Savory', category: 'Congelados', price: 2490, minStock: 5, currentStock: 7, shelfLocation: 'Congelado 1 - Nivel B', expirationDate: daysFromNow(120), imageUrl: '' },
];

async function seed() {
  console.log('🌱 Seeding Firestore with', products.length, 'products...');
  let count = 0;
  for (const product of products) {
    const { calculateProductStatus } = await import('../src/utils/statusUtils.js');
    const status = calculateProductStatus(product.expirationDate, product.currentStock, product.minStock);
    await addDoc(collection(db, 'products'), {
      ...product,
      status,
      lastScannedAt: Timestamp.now(),
      lastScannedBy: 'seed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    count++;
    process.stdout.write(`\r  ✓ ${count}/${products.length} productos`);
  }
  console.log('\n✅ Seed completado.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
