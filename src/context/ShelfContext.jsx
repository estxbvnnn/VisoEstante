import { createContext, useContext, useEffect, useReducer } from 'react';
import { subscribeToAllProducts, batchUpdateStatuses } from '../services/productService';
import { checkAndGenerateAlerts } from '../services/alertService';
import { calculateProductStatus } from '../utils/statusUtils';

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
    const unsub = subscribeToAllProducts(async (products) => {
      // Evaluate and batch-update statuses
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
        try {
          await batchUpdateStatuses(updates);
        } catch (err) {
          console.error('Error updating statuses:', err);
        }
      }

      try {
        await checkAndGenerateAlerts(products);
      } catch (err) {
        console.error('Error generating alerts:', err);
      }

      dispatch({ type: 'SET_PRODUCTS', payload: products });
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
