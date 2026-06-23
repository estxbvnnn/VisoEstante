// Impuesto chileno (IVA).
// En Chile el IVA es del 19% y, en este proyecto, el precio guardado de cada
// producto (`price`) corresponde al valor NETO (sin IVA). El precio final que
// paga el cliente se obtiene sumando el IVA al neto.
export const IVA_RATE = 0.19;

// Etiqueta legible para mostrar en la interfaz (ej. "IVA (19%)").
export const IVA_PERCENT = 19;
export const IVA_LABEL = `IVA (${IVA_PERCENT}%)`;
