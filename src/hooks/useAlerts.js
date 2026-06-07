import { useState, useEffect } from 'react';
import {
  subscribeToActiveAlerts,
  subscribeToResolvedAlerts,
  resolveAlert as resolveAlertService,
} from '../services/alertService';
import { ALERT_SEVERITY } from '../constants/alertTypes';
import { useAuth } from '../context/AuthContext';

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = subscribeToActiveAlerts((data) => {
      setAlerts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToResolvedAlerts((data) => {
      setResolvedAlerts(data);
    });
    return unsub;
  }, []);

  const criticalCount = alerts.filter(
    (a) => a.severity === ALERT_SEVERITY.CRITICAL
  ).length;

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setResolvedAlerts([]);
      setLoading(false);
    }
  }, [user]);

  async function resolveAlert(alertId) {
    if (!user) return;
    try {
      await resolveAlertService(alertId, user?.uid);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  return { alerts, resolvedAlerts, criticalCount, loading, error, resolveAlert };
}
