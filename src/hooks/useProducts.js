import { useShelf } from '../context/ShelfContext';

export function useProducts() {
  return useShelf();
}
