# 🛒 VisoEstante — Estante Inteligente para Supermercados

**VisoEstante** es una aplicación web que ayuda a los supermercados a controlar su inventario
de góndola de forma inteligente: sabe qué productos están **por vencer**, cuáles tienen
**stock bajo** y muestra **precios actualizados en tiempo real**, evitando pérdidas y mejorando
la experiencia del cliente.

> En pocas palabras: un panel de control que vigila los estantes por ti.

---

## 📌 ¿Qué problema resuelve?

En un supermercado, dos problemas cuestan dinero todos los días:

1. **Productos que se vencen sin que nadie se dé cuenta** → se convierten en pérdida.
2. **Estantes que se quedan sin stock** → se pierden ventas y se molesta al cliente.

VisoEstante ataca ambos problemas con un sistema que:

- Registra cada producto con su **fecha de vencimiento** y su **stock**.
- Calcula **automáticamente** el estado de cada producto (vigente, por vencer, vencido, sin stock).
- Genera **alertas automáticas** cuando algo necesita atención.
- Permite **actualizar precios en tiempo real**, reflejándolos al instante en la pantalla de góndola.
- Entrega **reportes profesionales en Excel** para que la administración tome decisiones.

---

## ✨ Características principales

| Característica | Descripción |
|---|---|
| 🔐 **Login con roles** | Cada usuario entra con su correo y ve solo lo que le corresponde según su rol. |
| 📊 **Dashboard de inventario** | Indicadores clave (KPIs): total de productos, stock crítico, vencimientos. |
| ⏰ **Estados automáticos** | El sistema calcula solo si un producto está vigente, por vencer, vencido o sin stock. |
| 🔔 **Alertas automáticas** | Avisa cuando el stock baja del mínimo o cuando un producto vence en ≤ 30 días. |
| 💲 **Precios en tiempo real** | Un cambio de precio se ve al instante en la pantalla de góndola, sin recargar. |
| 🖥️ **Pantalla de góndola pública** | Vista para el cliente con precio y estado, sin necesidad de iniciar sesión. |
| 📑 **Reportes en Excel** | Exportación profesional con portada, KPIs, valoración de inventario y detalle. |

---

## 👥 Roles de usuario

El sistema diferencia **tres tipos de usuario**, cada uno con sus permisos:

- **🧑‍🔧 Repositor** — registra productos y actualiza el stock en la sala de ventas.
- **👔 Supervisor** — revisa el dashboard, gestiona alertas, ajusta precios y genera reportes.
- **🛡️ Administrador** — tiene control total: hereda todo lo anterior y además crea, edita y
  elimina productos, y accede a todos los registros de auditoría.

> También existe una **vista pública de góndola** que cualquier persona puede ver sin iniciar sesión.

---

## 🧰 Tecnologías utilizadas

| Capa | Herramienta | ¿Para qué? |
|---|---|---|
| **Frontend** | React 19 + Vite | Construir la interfaz y servirla rápido. |
| **Estilos** | Tailwind CSS 4 | Diseño moderno y responsive (funciona en tablet y escritorio). |
| **Backend / Base de datos** | Firebase (Firestore + Auth) | Guardar datos en la nube y manejar el inicio de sesión seguro. |
| **Tiempo real** | Firestore `onSnapshot` | Que los cambios se vean al instante sin recargar la página. |
| **Reportes** | ExcelJS | Generar archivos `.xlsx` con formato profesional. |
| **Notificaciones** | react-hot-toast | Mostrar mensajes de éxito o error de forma clara. |

---

## 🗂️ Estructura del proyecto

```
VisoEstante/
├── src/
│   ├── pages/         → Pantallas principales (Dashboard, Login, Reportes, Alertas, Góndola...)
│   ├── components/     → Piezas reutilizables de la interfaz (tarjetas, modales, badges...)
│   ├── context/        → Estado global (sesión del usuario, estantería)
│   ├── hooks/          → Lógica reutilizable (useProducts, useAlerts, useAuth...)
│   ├── services/       → Conexión con Firebase (productos, alertas, auditoría, precios)
│   ├── constants/      → Valores fijos (roles, categorías, estados, tipos de alerta)
│   └── utils/          → Funciones de apoyo (fechas, formato, validación, exportar a Excel)
├── docs/               → Requisitos y historias de usuario
├── firestore.rules     → Reglas de seguridad de la base de datos
└── scripts/seedData.js → Carga de datos de ejemplo para pruebas
```


## 🗓️ Planificación del proyecto (Sprints)

El desarrollo se organizó en **sprints** (ciclos cortos de trabajo). A continuación se detalla
el plan, con sus tareas, responsables y fechas.

### 🟩 Sprint 1 — Análisis y diseño · *(20/05/2026 → 27/05/2026)*
> Sentar las bases: entender qué se necesita y cómo se va a construir.

| Tarea | Descripción | Responsable | Duración |
|---|---|---|---|
| Levantamiento de requerimientos | Identificar y documentar los requisitos funcionales y no funcionales del sistema de inventario. | Todo el equipo | 2 días |
| Historias de usuario | Redactar historias de usuario con criterios de aceptación para guiar el desarrollo. | Todo el equipo | 3 días |
| Diseño de arquitectura y BD | Definir la arquitectura del sistema y diseñar el diagrama entidad-relación de la base de datos. | Todo el equipo | 2 días |

### 🟩 Sprint 2 — Cimientos del sistema · *(27/05/2026 → 10/06/2026)*
> Construir lo esencial: que la gente pueda entrar y que los datos se conecten.

| Tarea | Descripción | Responsable | Duración |
|---|---|---|---|
| Autenticación y roles | Desarrollar un login seguro con control de acceso según el rol de cada usuario. | Todo el equipo | 3 días |
| Conexión frontend ↔ backend | Conectar las vistas del frontend con los datos reales del backend. | Todo el equipo | 11 días |
| Tablas de inventario en BD | Crear la estructura de datos del inventario en la base de datos. | Todo el equipo | 11 días |

### 🟨 Sprint 3 — Lógica de negocio y alertas · *(10/06/2026 → 24/06/2026)*
> Darle "inteligencia" al sistema: que detecte vencimientos y avise por sí solo.

| Tarea | Descripción | Responsable | Duración |
|---|---|---|---|
| Lógica de vencimientos y estados | Implementar el cálculo automático de fechas de vencimiento y estados de productos. | Todo el equipo | 5 días |
| Alertas automáticas de stock | Configurar alertas automáticas cuando el stock baje del nivel mínimo definido. | Todo el equipo | 5 días |

---

## 🔄 Estados de un producto

El sistema asigna automáticamente un estado a cada producto según su stock y vencimiento:

| Estado | Condición | Significado |
|---|---|---|
| 🟢 **Vigente** | Stock > 0 y vence en más de 30 días | Todo en orden. |
| 🟡 **Por vencer** | Stock > 0 y vence dentro de 30 días | Requiere atención pronto. |
| 🔴 **Vencido** | La fecha de vencimiento ya pasó | Debe retirarse. |
| ⚫ **Sin stock** | No quedan unidades (prioridad máxima) | Debe reponerse. |

---

## 📑 Reportes en Excel

Desde el Dashboard, Reportes y Alertas se pueden descargar reportes profesionales en formato Excel
(solo Administrador y Supervisor). Cada reporte incluye:

- **Portada** con título, autor, rol, fecha y hora de emisión.
- **Indicadores clave (KPIs)**: total de productos, unidades en stock, **valoración del inventario**
  (stock × precio) y **valor en riesgo** por productos vencidos o por vencer.
- **Hoja por categoría** con totales agrupados.
- **Detalle completo** con stock, precios, estados y vencimientos, listo para filtrar y analizar.

---

## 🔒 Seguridad

- Las credenciales de Firebase se guardan en variables de entorno, **nunca en el código**.
- Las **reglas de Firestore** controlan el acceso por rol directamente en el servidor.
- Las rutas de gestión están protegidas en el cliente.
- Cada cambio de precio o registro queda guardado en un **historial de auditoría** que no se puede
  modificar ni borrar.

---

## 📄 Documentación adicional

- [`docs/requirements.md`](docs/requirements.md) — Requisitos funcionales y no funcionales detallados.
- [`docs/user-stories.md`](docs/user-stories.md) — Historias de usuario con criterios de aceptación.

---

*Proyecto desarrollado con fines académicos — Inacap - VisoEstante 2026.*

*Esteban Ardiles - Carlos Villarroel - Diego Barraza*
