# Documentación Técnica del Sistema — VisoEstante

**Estante Inteligente para Supermercados**

Documento que describe la **arquitectura**, el **modelo de datos**, los **servicios (endpoints)**, las **reglas de seguridad** y el **manual de uso** del sistema VisoEstante.

---

## 1. Introducción

### 1.1 Propósito

Este documento entrega una referencia técnica completa de VisoEstante para el equipo de desarrollo, mantenimiento y evaluación del proyecto. Cubre cómo está construido el sistema, cómo se organizan y protegen los datos, qué operaciones expone cada módulo de servicio y cómo se usa la aplicación según el rol del usuario.

### 1.2 Alcance

VisoEstante es una aplicación web de página única (SPA) para el control de inventario de góndola de un supermercado. Permite registrar productos, controlar stock y vencimientos, generar alertas automáticas, gestionar precios con **IVA chileno (19%)**, **registrar ventas** con descuento de stock y exportar reportes profesionales en Excel.

### 1.3 Público objetivo

Equipo de desarrollo, docentes evaluadores y personal técnico que deba instalar, operar o mantener el sistema.

---

## 2. Visión general del sistema

VisoEstante resuelve dos problemas que generan pérdidas en un supermercado: los productos que se vencen sin ser detectados y los quiebres de stock. El sistema calcula automáticamente el estado de cada producto, avisa cuando algo requiere atención, mantiene los precios actualizados en tiempo real y registra las ventas descontando el stock y desglosando el impuesto.

El sistema diferencia cuatro perfiles: **Repositor**, **Supervisor**, **Administrador** y una **vista pública de góndola** para el cliente.

---

## 3. Stack tecnológico

| Capa | Tecnología | Versión | Función |
|---|---|---|---|
| Interfaz | React | 19 | Construcción de la interfaz de usuario (SPA). |
| Empaquetado | Vite | 8 | Servidor de desarrollo y build de producción. |
| Estilos | Tailwind CSS | 4 | Diseño responsive (tablet y escritorio). |
| Backend / BD | Firebase Firestore | 12 | Base de datos NoSQL en la nube y persistencia offline. |
| Autenticación | Firebase Auth | 12 | Inicio de sesión con email y contraseña. |
| Tiempo real | Firestore onSnapshot | — | Sincronización instantánea sin recargar la página. |
| Ruteo | react-router-dom | 6 | Navegación y rutas protegidas por rol. |
| Escaneo | @ericblade/quagga2 | 1.x | Lectura de códigos de barras con la cámara. |
| OCR | tesseract.js | 7 | Captura de fechas de vencimiento desde imágenes. |
| Reportes | ExcelJS | 4 | Generación de archivos .xlsx con formato. |
| Notificaciones | react-hot-toast | 2 | Mensajes de éxito y error. |

---

## 4. Arquitectura del sistema

### 4.1 Estilo arquitectónico

VisoEstante usa una arquitectura **cliente-servidor sin servidor propio (serverless / BaaS)**: todo el código corre en el navegador (React) y se comunica directamente con **Firebase** (Backend as a Service), que provee base de datos, autenticación y reglas de seguridad. No existe una API REST intermedia propia; la capa de "servicios" del proyecto encapsula las operaciones contra Firestore.

### 4.2 Capas de la aplicación

```
┌───────────────────────────────────────────────┐
│                  NAVEGADOR                      │
│                                                 │
│   Pages (pantallas)                             │
│        │                                        │
│   Hooks (lógica reutilizable de estado)         │
│        │                                        │
│   Context (estado global: sesión, productos)    │
│        │                                        │
│   Services (operaciones de negocio/datos)       │
└────────┼────────────────────────────────────────┘
         │  SDK de Firebase (web)
         ▼
┌───────────────────────────────────────────────┐
│                   FIREBASE                      │
│   Auth  ·  Firestore (con reglas de seguridad)  │
└───────────────────────────────────────────────┘
```

- **Pages**: cada pantalla de la aplicación (Dashboard, Caja, Reportes, etc.).
- **Hooks**: lógica de estado reutilizable (`useProducts`, `useAlerts`, `useSales`, `useAuth`).
- **Context**: estado global compartido (`AuthContext`, `ShelfContext`).
- **Services**: módulos que ejecutan las operaciones sobre Firestore/Auth.
- **Constants / Utils**: valores fijos y funciones de apoyo (fechas, formato, IVA, validación, export).

### 4.3 Estructura de carpetas

```
VisoEstante/
├── src/
│   ├── pages/        → Pantallas (Login, Dashboard, Sales, Reports, Alerts, ...)
│   ├── components/    → UI reutilizable (ui/, alerts/, scanner/)
│   ├── context/       → Estado global (AuthContext, ShelfContext)
│   ├── hooks/         → useProducts, useAlerts, useSales, useAuth, useScanner, useOCR
│   ├── services/      → firebase, authService, productService, priceService,
│   │                    alertService, saleService, auditService, ocrService, barcodeService
│   ├── constants/     → roles, productCategories, productStatus, alertTypes, tax
│   └── utils/         → dateUtils, formatUtils, taxUtils, statusUtils, validation, exportUtils
├── docs/              → requirements.md, user-stories.md, technical-documentation.md
├── firestore.rules    → Reglas de seguridad de Firestore
├── firestore.indexes.json → Índices de consultas
└── scripts/seedData.js → Datos de ejemplo
```

### 4.4 Flujo de datos en tiempo real

La aplicación se suscribe a Firestore mediante `onSnapshot`. Cuando un dato cambia (por ejemplo, un precio o el stock tras una venta), Firestore notifica a todos los clientes suscritos y la interfaz se actualiza automáticamente, sin recargar. El `ShelfContext` mantiene la lista de productos viva para todas las pantallas, recalcula estados y dispara la generación de alertas.

---

## 5. Modelo de datos (Firestore)

La base de datos es NoSQL orientada a documentos. Se utilizan cinco colecciones.

### 5.1 Colección `users`

| Campo | Tipo | Descripción |
|---|---|---|
| email | string | Correo del usuario. |
| displayName | string | Nombre visible. |
| role | string | Rol: `admin`, `supervisor` o `repositor`. |
| createdAt | timestamp | Fecha de creación. |

> El `id` del documento es el `uid` de Firebase Auth.

### 5.2 Colección `products`

| Campo | Tipo | Descripción |
|---|---|---|
| barcode | string | Código de barras (EAN-13 / CODE-128). |
| name | string | Nombre del producto. |
| brand | string | Marca. |
| category | string | Categoría (ver `productCategories`). |
| price | number | **Precio NETO (sin IVA)** en pesos chilenos. |
| minStock | number | Stock mínimo antes de alertar. |
| currentStock | number | Unidades disponibles. |
| shelfLocation | string | Ubicación en góndola. |
| expirationDate | timestamp \| null | Fecha de vencimiento. |
| status | string | Estado calculado: `vigente`, `por_vencer`, `vencido`, `sin_stock`. |
| imageUrl | string | URL de imagen (opcional). |
| lastScannedAt | timestamp | Último escaneo. |
| lastScannedBy | string | uid de quien escaneó. |
| createdAt | timestamp | Fecha de alta. |
| updatedAt | timestamp | Última modificación. |

> **Convención clave:** `price` se almacena como **valor neto**. El IVA y el precio final se calculan en la capa de presentación con `taxUtils` (ver sección 7).

### 5.3 Colección `alerts`

| Campo | Tipo | Descripción |
|---|---|---|
| productId | string | Producto asociado. |
| productName | string | Nombre del producto al generarse la alerta. |
| productSnapshot | map | Copia de datos del producto (barcode, brand, category, price, currentStock, minStock, shelfLocation, expirationDate, status). |
| type | string | `low_stock`, `expiring_soon` o `expired`. |
| message | string | Mensaje descriptivo. |
| severity | string | `warning` o `critical`. |
| resolved | boolean | Si fue resuelta. |
| resolvedBy | string \| null | uid de quien resolvió. |
| resolvedAt | timestamp \| null | Fecha de resolución. |
| createdAt | timestamp | Fecha de creación. |

### 5.4 Colección `sales`

| Campo | Tipo | Descripción |
|---|---|---|
| items | array | Líneas de la venta: `{ productId, name, barcode, quantity, unitNet, lineNet }`. |
| itemCount | number | Total de unidades vendidas. |
| lineCount | number | Cantidad de líneas (productos distintos). |
| totalNet | number | Total neto (sin IVA). |
| totalTax | number | IVA total (19% sobre el neto). |
| totalGross | number | Total a pagar (neto + IVA). |
| paymentMethod | string | `efectivo`, `debito`, `credito` o `transferencia`. |
| soldBy | string \| null | uid del vendedor. |
| soldByName | string | Nombre del vendedor. |
| createdAt | timestamp | Fecha y hora de la venta. |

### 5.5 Colección `audit_logs`

| Campo | Tipo | Descripción |
|---|---|---|
| action | string | `stock_updated`, `price_updated`, `product_scanned`, `alert_resolved`, `sale_created`. |
| productId | string \| null | Producto afectado (si aplica). |
| userId | string \| null | Autor de la acción. |
| details | map | Datos adicionales de la acción. |
| timestamp | timestamp | Momento del evento. |

> Los registros de auditoría son **inmutables**: no se pueden editar ni eliminar.

---

## 6. Servicios y operaciones (endpoints)

VisoEstante no expone una API REST propia. Las "operaciones" del sistema son funciones de los módulos de servicio que leen y escriben en Firestore mediante el SDK de Firebase. A continuación se documentan por módulo.

### 6.1 authService (`services/authService.js`)

| Función | Parámetros | Descripción |
|---|---|---|
| signIn | email, password | Inicia sesión y retorna el usuario. |
| registerUser | email, password, displayName, role='repositor' | Crea el usuario en Auth y su documento en `users`. |
| signOut | — | Cierra la sesión. |
| getCurrentUser | — | Retorna el usuario autenticado actual o null. |
| getUserRole | uid | Obtiene el rol del usuario. |
| getUserData | uid | Obtiene el documento completo del usuario. |
| onAuthChanged | callback | Suscripción a cambios de sesión. |

### 6.2 productService (`services/productService.js`)

| Función | Parámetros | Descripción |
|---|---|---|
| getProductByBarcode | barcode | Busca un producto por su código de barras. |
| getProductById | id | Obtiene un producto por id. |
| addProduct | productData | Crea un producto (agrega createdAt/updatedAt). |
| updateProduct | id, data | Actualiza campos de un producto. |
| updateStock | id, quantity, userId | Actualiza stock y registra auditoría. |
| updatePrice | id, newPrice, userId | Actualiza el precio neto y registra auditoría. |
| subscribeToAllProducts | callback | Suscripción en tiempo real a todos los productos. |
| subscribeToExpiringProducts | callback, daysThreshold=30 | Suscripción a productos próximos a vencer. |
| batchUpdateStatuses | updates | Actualiza estados en lote (batch). |

### 6.3 priceService (`services/priceService.js`)

| Función | Parámetros | Descripción |
|---|---|---|
| setProductPrice | id, newPrice, userId | Valida que el precio sea un número ≥ 0 y delega en `updatePrice`. |

### 6.4 alertService (`services/alertService.js`)

| Función | Parámetros | Descripción |
|---|---|---|
| generateStockAlert | product | Crea alerta de stock bajo si corresponde (evita duplicados). |
| generateExpiryAlert | product | Crea alerta de vencimiento/por vencer si corresponde. |
| checkAndGenerateAlerts | products | Evalúa una lista de productos y genera las alertas necesarias. |
| resolveAlert | alertId, userId | Marca una alerta como resuelta y registra auditoría. |
| subscribeToActiveAlerts | callback | Suscripción a alertas activas. |
| subscribeToResolvedAlerts | callback | Suscripción a alertas resueltas (últimas 24 h). |

### 6.5 saleService (`services/saleService.js`)

| Función | Parámetros | Descripción |
|---|---|---|
| createSale | { items, paymentMethod }, user | Registra una venta de forma **atómica** (transacción): valida stock, lo descuenta, recalcula estados y guarda la boleta con desglose de IVA. |
| subscribeToSales | callback, max=50 | Suscripción al historial de ventas (más recientes primero). |
| PAYMENT_METHODS | — | Lista de métodos de pago disponibles. |
| PAYMENT_LABELS | — | Mapa de método de pago a etiqueta legible. |

### 6.6 auditService (`services/auditService.js`)

| Función | Parámetros | Descripción |
|---|---|---|
| addAuditLog | { action, productId, userId, details } | Registra un evento en `audit_logs`. |

---

## 7. Impuesto (IVA) y manejo de precios

En Chile el **IVA es del 19%**. En VisoEstante, el precio de cada producto (`price`) se almacena como **valor neto** (sin IVA); el IVA y el precio final se calculan a partir de él.

La lógica está centralizada en `constants/tax.js` y `utils/taxUtils.js`:

| Función | Cálculo | Descripción |
|---|---|---|
| getNetPrice(net) | redondea | Valor neto en pesos enteros. |
| getTaxAmount(net) | net × 0,19 | IVA correspondiente al neto. |
| getGrossPrice(net) | neto + IVA | Precio final (lo que paga el cliente). |
| getPriceBreakdown(net) | { net, tax, gross } | Desglose completo de un precio. |
| getTotalsBreakdown(totalNet) | { net, tax, gross } | Desglose de una valoración total (inventario, venta). |

El IVA se redondea a pesos enteros (CLP no usa decimales) garantizando siempre `neto + IVA = total`.

**Dónde se aplica el desglose:**

- Ficha de producto: muestra neto, IVA y precio final.
- Góndola pública: muestra el **precio con IVA incluido**.
- Formularios de alta/edición: el campo se rotula "Precio neto" y muestra el precio con IVA en vivo.
- Tablas de Dashboard, Productos y Reportes: precio neto + valor con IVA.
- Valoración de inventario (Dashboard y Reportes): neto, IVA y total con IVA.
- Exportación a Excel: columnas de IVA unitario, precio con IVA y valor del inventario con IVA.
- Alertas: precio neto y precio con IVA.

---

## 8. Módulo de ventas

El módulo de ventas (pantalla **Caja / Punto de venta**, ruta `/sales`) permite registrar la venta de uno o más productos.

**Flujo:**

1. El operador busca productos (por nombre o código) y los agrega al carrito.
2. Ajusta cantidades (limitadas al stock disponible).
3. El sistema calcula en vivo: subtotal neto, IVA (19%) y total a pagar.
4. Selecciona el método de pago.
5. Al registrar, `createSale` ejecuta una **transacción** que:
   - Lee cada producto y valida que exista y tenga stock suficiente.
   - Descuenta el stock y recalcula el estado de cada producto.
   - Crea la boleta en `sales` con el desglose de IVA.
   - Registra el evento `sale_created` en auditoría.

El uso de transacción garantiza consistencia: si algún producto no tiene stock, **ninguna** parte de la venta se aplica. El historial de ventas y el detalle de cada boleta quedan disponibles en la misma pantalla y se resumen como KPIs en Reportes (N° de ventas, total neto, IVA recaudado y total vendido).

---

## 9. Reglas de seguridad (Firestore)

El acceso se controla en el servidor mediante `firestore.rules`. Funciones de apoyo:

- `isAuthenticated()` — usuario con sesión iniciada.
- `getUserRole()` — lee el rol desde `users`.
- `isAdmin()` — rol `admin`.
- `isSupervisor()` — rol `supervisor` o `admin`.
- `isStaff()` / `isRepositor()` — `repositor`, `supervisor` o `admin`.

| Colección | Lectura | Creación | Actualización | Eliminación |
|---|---|---|---|---|
| users | Propietario o admin | El propio usuario | Admin o propietario | Admin |
| products | Pública | Staff | Staff | Admin |
| alerts | Staff | Staff | Supervisor+ | Admin |
| sales | Staff | Staff | No | No |
| audit_logs | Supervisor+ | Autenticado | No | No |

> Las colecciones `sales` y `audit_logs` son inmutables tras su creación.

---

## 10. Roles y rutas de la aplicación

| Ruta | Pantalla | Acceso |
|---|---|---|
| /login | Login | Pública |
| /shelf | Góndola digital | Pública |
| /dashboard | Dashboard | Admin, Supervisor, Repositor |
| /sales | Caja / Punto de venta | Admin, Supervisor, Repositor |
| /products | Gestión de productos | Admin, Supervisor |
| /products/:id | Detalle de producto | Admin, Supervisor |
| /alerts | Centro de alertas | Admin, Supervisor |
| /reports | Reportes | Admin, Supervisor |

Las rutas privadas están protegidas por el componente `ProtectedRoute`, que valida el rol del usuario antes de renderizar.

---

## 11. Estados del producto y alertas

### 11.1 Estados (calculados automáticamente)

| Estado | Condición |
|---|---|
| vigente | Stock > 0 y vence en más de 30 días. |
| por_vencer | Stock > 0 y vence dentro de 30 días. |
| vencido | La fecha de vencimiento ya pasó. |
| sin_stock | currentStock = 0 (prioridad máxima). |

### 11.2 Tipos y severidad de alerta

| Tipo | Cuándo se genera | Severidad |
|---|---|---|
| low_stock | Stock bajo el umbral (20) o bajo el mínimo. | critical si stock = 0, si no warning. |
| expiring_soon | Vence en ≤ 30 días. | critical si ≤ 3 días, si no warning. |
| expired | Fecha de vencimiento superada. | critical si ≤ 3 días, si no warning. |

---

## 12. Manual de uso

### 12.1 Repositor

1. Inicia sesión con su correo y contraseña.
2. En **Escáner**, apunta la cámara al código de barras.
3. Si el producto existe, actualiza el stock; si no, completa el formulario de alta (el precio se ingresa **neto**; el sistema muestra el precio con IVA).
4. Captura la **fecha de vencimiento con OCR** o la corrige manualmente.
5. Guarda. La acción queda en el registro de auditoría.

### 12.2 Operador de caja (cualquier rol con sesión)

1. Entra a **Caja** (`/sales`).
2. Busca y agrega productos al carrito; ajusta cantidades.
3. Revisa el desglose: subtotal neto, IVA (19%) y total a pagar.
4. Elige el método de pago y presiona **Registrar venta**.
5. El stock se descuenta automáticamente y la boleta queda en el historial.

### 12.3 Supervisor

1. Accede al **Dashboard** con los KPIs y la valoración del inventario (neto, IVA y total).
2. Actualiza precios (neto) desde la tabla; el cambio se refleja al instante en la góndola.
3. Gestiona el **Centro de alertas**: filtra y resuelve alertas.
4. Genera **Reportes** y los exporta a Excel.

### 12.4 Administrador

1. Hereda todas las capacidades de supervisor y repositor.
2. En **Gestión de productos** crea, edita y elimina productos.
3. Accede a todos los registros de auditoría.

### 12.5 Cliente (góndola)

1. Abre la pantalla pública `/shelf` (sin iniciar sesión).
2. Visualiza productos vigentes y por vencer con su **precio con IVA incluido** y estado, actualizados en tiempo real.

---

## 13. Configuración, instalación y despliegue

### 13.1 Variables de entorno

Crear un archivo `.env` (basado en `.env.example`) con las credenciales de Firebase:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 13.2 Comandos

```
npm install        # Instalar dependencias
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run preview    # Previsualizar el build
npm run lint       # Análisis estático (ESLint)
npm run seed       # Cargar datos de ejemplo
```

### 13.3 Despliegue de reglas e índices de Firestore

```
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

> Tras agregar el módulo de ventas es necesario **desplegar las reglas** para habilitar la colección `sales` en producción.

---

## 14. Glosario

| Término | Significado |
|---|---|
| SPA | Single Page Application; aplicación de página única. |
| BaaS | Backend as a Service; backend gestionado (Firebase). |
| IVA | Impuesto al Valor Agregado (19% en Chile). |
| Neto | Precio sin IVA. |
| Bruto | Precio con IVA (precio final). |
| KPI | Indicador clave de desempeño. |
| OCR | Reconocimiento óptico de caracteres. |
| onSnapshot | Suscripción en tiempo real de Firestore. |

---

*Documento técnico — VisoEstante 2026 · Inacap.*
*Equipo: Esteban Ardiles · Carlos Villarroel · Diego Barraza.*
