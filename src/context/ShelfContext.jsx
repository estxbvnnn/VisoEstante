import { createContext, useContext, useEffect, useReducer } from 'react';
import { subscribeToAllProducts, batchUpdateStatuses } from '../services/productService';
import { checkAndGenerateAlerts } from '../services/alertService';
import { calculateProductStatus } from '../utils/statusUtils';
import { firebaseInitError } from '../services/firebase';

const ShelfContext = createContext(null);

const initialState = {
  products: [],
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export function ShelfProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Si Firebase no se inicializó (p. ej. faltan variables de entorno en el
    // build de producción), no intentar suscribirse: evita un crash sin
    // mensaje y deja que AuthContext muestre la pantalla de error.
    if (firebaseInitError) {
      dispatch({ type: 'SET_ERROR', payload: firebaseInitError });
      return undefined;
    }

    const unsub = subscribeToAllProducts((products) => {
      // Mostrar los productos de inmediato; el mantenimiento no debe bloquear la UI.
      dispatch({ type: 'SET_PRODUCTS', payload: products });

      // Mantenimiento en segundo plano: recalcular estados y generar alertas.
      (async () => {
        try {
          const updates = products
            .map((p) => ({
              id: p.id,
              status: calculateProductStatus(p.expirationDate, p.currentStock, p.minStock),
            }))
            .filter((u) => {
              const product = products.find((p) => p.id === u.id);
              return product && product.status !== u.status;
            });

          if (updates.length > 0) {
            await batchUpdateStatuses(updates);
          }
          await checkAndGenerateAlerts(products);
        } catch (err) {
          console.error('Error en mantenimiento de inventario:', err);
        }
      })();
    });

    return unsub;
  }, []);

  return (
    <ShelfContext.Provider value={{ ...state }}>
      {children}
    </ShelfContext.Provider>
  );
}

export function useShelf() {
  const ctx = useContext(ShelfContext);
  if (!ctx) throw new Error('useShelf must be used within ShelfProvider');
  return ctx;
}
