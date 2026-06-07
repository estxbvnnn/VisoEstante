# Historias de Usuario — Estante Inteligente

## Historia 1 — Repositor escanea un producto nuevo

**Como** repositor  
**Quiero** escanear el código de barras de un producto nuevo con la cámara  
**Para** registrarlo en el sistema sin tipear el código manualmente

### Criterios de aceptación

**Given** que el repositor está autenticado y en la pantalla `/scanner`  
**When** apunta la cámara a un código de barras EAN-13 o CODE-128  
**Then** el sistema detecta el código en ≤2 segundos y busca el producto en Firestore

**Given** que el código escaneado no existe en Firestore  
**When** se completa la detección  
**Then** se muestra el formulario de alta con el código ya completado en el campo correspondiente

**Given** que el repositor completa el formulario y presiona "Registrar producto"  
**When** todos los campos requeridos están completos  
**Then** el producto se crea en Firestore, se registra en `audit_logs` y se redirige al dashboard

**Given** que el código ya existe en Firestore  
**When** se completa la detección  
**Then** se muestra la ficha del producto con opción de actualizar el stock

---

## Historia 2 — Repositor captura fecha de vencimiento con OCR

**Como** repositor  
**Quiero** tomar una foto del packaging para capturar la fecha de vencimiento  
**Para** no tener que tipearla manualmente y reducir errores

### Criterios de aceptación

**Given** que el repositor está en el formulario de alta de un nuevo producto  
**When** presiona "Capturar fecha de vencimiento con OCR"  
**Then** se activa la cámara o el selector de imágenes del dispositivo

**Given** que el repositor toma o sube una foto del packaging  
**When** la imagen es procesada por tesseract.js  
**Then** el sistema muestra la fecha detectada con porcentaje de confianza en ≤10 segundos

**Given** que la fecha fue detectada correctamente  
**When** el repositor presiona "Confirmar fecha"  
**Then** la fecha queda registrada y el sistema regresa al formulario de alta

**Given** que la fecha no fue detectada o es inválida  
**When** finaliza el procesamiento OCR  
**Then** el sistema muestra un mensaje de error y un campo para ingreso manual de la fecha

**Given** que la fecha detectada parece incorrecta  
**When** el repositor la corrige manualmente en el campo de fecha  
**Then** el sistema acepta la corrección y la usa en lugar de la detectada por OCR

---

## Historia 3 — Supervisor recibe alerta de producto próximo a vencer

**Como** supervisor  
**Quiero** recibir alertas automáticas de productos que vencen pronto  
**Para** tomar acción antes de que se venzan y se produzcan pérdidas

### Criterios de aceptación

**Given** que existe un producto con fecha de vencimiento en ≤30 días  
**When** el sistema evalúa el estado de los productos al iniciar  
**Then** se crea automáticamente una alerta de tipo `expiring_soon` en `/alerts`

**Given** que hay alertas activas  
**When** el supervisor accede al dashboard  
**Then** el `AlertBanner` se muestra en la parte superior con el conteo de alertas

**Given** que hay alertas de severidad `critical` (vence en ≤3 días)  
**When** el banner se muestra  
**Then** incluye animación de pulso para indicar urgencia

**Given** que el supervisor navega a `/alerts`  
**When** llega a la página  
**Then** ve la lista completa de alertas agrupadas, puede filtrar por tipo y presionar "Resolver"

---

## Historia 4 — Supervisor actualiza el precio de un producto en tiempo real

**Como** supervisor  
**Quiero** poder actualizar el precio de un producto desde el dashboard  
**Para** que el precio en la pantalla de góndola refleje el cambio de inmediato

### Criterios de aceptación

**Given** que el supervisor está en el dashboard con la tabla de productos  
**When** presiona el botón "Precio" en la fila de un producto  
**Then** se abre un modal con el precio actual pre-cargado en el campo

**Given** que el supervisor ingresa un nuevo precio válido y presiona "Guardar"  
**When** se procesa la actualización  
**Then** el precio se actualiza en Firestore, se registra en `audit_logs` y el modal se cierra con un toast de éxito

**Given** que el precio fue actualizado en Firestore  
**When** `onSnapshot` detecta el cambio  
**Then** la pantalla `ShelfDisplay` refleja el nuevo precio en ≤3 segundos sin recargar la página

**Given** que el supervisor ingresa un precio inválido (negativo, texto)  
**When** presiona "Guardar"  
**Then** se muestra un toast de error y no se guarda el cambio

---

## Historia 5 — Admin genera reporte de productos vencidos del mes

**Como** administrador  
**Quiero** ver un reporte con todos los productos vencidos  
**Para** analizar pérdidas y tomar decisiones de abastecimiento

### Criterios de aceptación

**Given** que el admin navega a `/reports`  
**When** carga la página  
**Then** se muestra la sección "Productos vencidos" con todos los productos de estado `vencido`

**Given** que hay productos vencidos  
**When** se renderiza la tabla  
**Then** se muestra nombre, categoría, precio, fecha de vencimiento y badge de estado para cada uno

**Given** que no hay productos vencidos  
**When** se carga la sección  
**Then** se muestra el mensaje "Sin productos en esta categoría."

---

## Historia 6 — Cliente ve precio y estado en pantalla de góndola

**Como** cliente en la góndola del supermercado  
**Quiero** ver el precio actualizado y el estado de los productos en la pantalla digital  
**Para** tomar decisiones de compra informadas

### Criterios de aceptación

**Given** que la pantalla `ShelfDisplay` está activa sin autenticación  
**When** se carga la página  
**Then** se muestra un grid de productos con imagen, nombre, precio en CLP y badge de estado

**Given** que un producto tiene estado `vencido` o `sin_stock`  
**When** se renderizan las tarjetas  
**Then** ese producto NO aparece en la pantalla de góndola

**Given** que un producto tiene estado `por_vencer`  
**When** se muestra su tarjeta  
**Then** se indica la fecha de vencimiento con una alerta visual suave (borde amarillo, no alarmante)

**Given** que un supervisor actualiza el precio de un producto  
**When** el cambio se guarda en Firestore  
**Then** la pantalla de góndola refleja el nuevo precio automáticamente vía `onSnapshot` en ≤3 segundos
