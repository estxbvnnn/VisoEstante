import { useEffect, useState } from 'react';
import { subscribeToSales } from '../services/saleService';

/**
 * Suscribe en tiempo real al historial de ventas.
 * @param {number} max Número máximo de ventas a cargar.
 */
export function useSales(max = 50) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToSales((data) => {
      setSales(data);
      setLoading(false);
    }, max);
    return unsub;
  }, [max]);

  return { sales, loading };
}
