import { updatePrice } from './productService';

export async function setProductPrice(id, newPrice, userId) {
  if (typeof newPrice !== 'number' || newPrice < 0) {
    throw new Error('Precio inválido');
  }
  await updatePrice(id, newPrice, userId);
}
