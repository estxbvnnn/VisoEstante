# Requisitos del Sistema — Estante Inteligente para Supermercado

## 1. Requisitos Funcionales por Rol

### 1.1 Repositor

| ID | Requisito |
|----|-----------|
| RF-R01 | El repositor puede iniciar sesión con email y contraseña. |
| RF-R02 | El repositor puede escanear el código de barras de un producto mediante la cámara del dispositivo. |
| RF-R03 | El sistema identifica automáticamente si el producto ya existe en Firestore al escanear su código. |
| RF-R04 | Si el producto no existe, el repositor puede registrarlo completando el formulario de alta. |
| RF-R05 | El repositor puede capturar la fecha de vencimiento de un producto mediante OCR desde la cámara. |
| RF-R06 | El repositor puede corregir manualmente la fecha detectada por OCR antes de guardar. |
| RF-R07 | El repositor puede actualizar el stock de un producto ya existente al escanearlo. |
| RF-R08 | Cada acción de escaneo queda registrada en el log de auditoría. |
| RF-R09 | El repositor es redirigido automáticamente a `/scanner` al iniciar sesión. |

### 1.2 Supervisor

| ID | Requisito |
|----|-----------|
| RF-S01 | El supervisor puede acceder al dashboard con KPIs de inventario. |
| RF-S02 | El supervisor recibe alertas automáticas cuando hay productos con stock bajo. |
| RF-S03 | El supervisor recibe alertas automáticas cuando hay productos próximos a vencer (≤ 30 días). |
| RF-S04 | El supervisor puede actualizar el precio de un producto desde la tabla del dashboard. |
| RF-S05 | El supervisor puede resolver alertas activas, dejando registro de quién las resolvió. |
| RF-S06 | El supervisor puede filtrar productos por estado y categoría. |
| RF-S07 | El supervisor puede visualizar el centro de alertas con filtros por tipo. |
| RF-S08 | El supervisor puede ver el historial de alertas resueltas en las últimas 24 horas. |
| RF-S09 | El supervisor puede acceder a reportes de productos vencidos, por vencer y con stock bajo. |

### 1.3 Administrador

| ID | Requisito |
|----|-----------|
| RF-A01 | El administrador hereda todas las capacidades del supervisor y repositor. |
| RF-A02 | El administrador puede crear, editar y eliminar productos desde `ProductManager`. |
| RF-A03 | El administrador puede ver y gestionar usuarios (a implementar en sprint futuro). |
| RF-A04 | El administrador puede generar reportes de vencimientos y stock. |
| RF-A05 | El administrador tiene acceso completo a todos los logs de auditoría. |

### 1.4 Cliente (vista pública)

| ID | Requisito |
|----|-----------|
| RF-C01 | La pantalla de góndola (`ShelfDisplay`) es accesible sin autenticación. |
| RF-C02 | Se muestran productos vigentes y por vencer, nunca vencidos ni sin stock. |
| RF-C03 | Cada tarjeta muestra imagen, nombre, precio actualizado y badge de estado. |
| RF-C04 | Los datos se actualizan en tiempo real sin necesidad de recargar la página. |

---

## 2. Requisitos No Funcionales

### 2.1 Rendimiento

| ID | Requisito |
|----|-----------|
| RNF-P01 | El tiempo de detección del código de barras no debe superar **2 segundos** desde que el código está en el visor. |
| RNF-P02 | El OCR debe completar el procesamiento de imagen en menos de **10 segundos**. |
| RNF-P03 | La sincronización de Firestore vía `onSnapshot` debe reflejar cambios en menos de **3 segundos**. |
| RNF-P04 | La carga inicial del dashboard (con skeleton loaders) debe ser visible en menos de **1 segundo**. |

### 2.2 Disponibilidad y Offline

| ID | Requisito |
|----|-----------|
| RNF-D01 | Firestore está configurado para persistencia offline, permitiendo lectura sin conexión. |
| RNF-D02 | Las escrituras realizadas sin conexión se sincronizan automáticamente al recuperar la red. |
| RNF-D03 | El escáner de código de barras funciona sin conexión a internet (procesa localmente con quagga2). |

### 2.3 Seguridad

| ID | Requisito |
|----|-----------|
| RNF-S01 | Todas las credenciales de Firebase se almacenan en variables de entorno (`.env`), nunca en código. |
| RNF-S02 | Las reglas de Firestore (`firestore.rules`) aplican control de acceso por rol en el servidor. |
| RNF-S03 | Las rutas de gestión están protegidas por `ProtectedRoute` en el cliente. |
| RNF-S04 | La actualización de precios queda registrada en `audit_logs` con uid del autor. |
| RNF-S05 | Los logs de auditoría son de solo-escritura: no pueden ser modificados ni eliminados. |

### 2.4 Usabilidad

| ID | Requisito |
|----|-----------|
| RNF-U01 | La vista de gestión es responsive y opera correctamente en tablets (768px+). |
| RNF-U02 | Todos los errores del sistema se muestran al usuario mediante `react-hot-toast`. |
| RNF-U03 | Toda operación asíncrona muestra un indicador de carga (spinner o skeleton). |

---

## 3. Ciclo de Vida de un Producto en Góndola

```
[ESCANEO BARRAS]
     │
     ├─ Existe en BD ──► [ACTUALIZAR STOCK] ──► [EVALUAR ESTADO]
     │                                                │
     └─ Nuevo ──► [FORMULARIO ALTA] ──► [OCR FECHA] ──► [GUARDAR]
                                                              │
                                                    [EVALUAR ESTADO]
                                                              │
                              ┌───────────────────────────────┤
                              │                               │
                         [VIGENTE]                    [POR_VENCER / VENCIDO / SIN_STOCK]
                              │                               │
                    [DISPLAY GÓNDOLA]               [GENERAR ALERTA]
                                                              │
                                                   [SUPERVISOR RESUELVE]
                                                              │
                                                     [RETIRO / REPONER]
```

### Estados posibles

| Estado | Condición |
|--------|-----------|
| `vigente` | Stock > 0 y vencimiento > 30 días |
| `por_vencer` | Stock > 0 y vencimiento entre hoy y 30 días |
| `vencido` | Fecha de vencimiento ya superada |
| `sin_stock` | `currentStock === 0` (prioridad máxima) |
