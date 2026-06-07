import { useState, useRef, useCallback } from 'react';
import { initScanner, stopScanner } from '../services/barcodeService';

export function useScanner() {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const detectedRef = useRef(false);

  const startScanning = useCallback((videoElement) => {
    detectedRef.current = false;
    setDetected(null);
    setError(null);
    setScanning(true);

    initScanner(videoElement, (code) => {
      if (!detectedRef.current) {
        detectedRef.current = true;
        setDetected(code);
        setScanning(false);
        stopScanner();
      }
    });
  }, []);

  const stopScanning = useCallback(() => {
    stopScanner();
    setScanning(false);
  }, []);

  const reset = useCallback(() => {
    detectedRef.current = false;
    setDetected(null);
    setError(null);
    setScanning(false);
  }, []);

  return { scanning, detected, error, videoRef, startScanning, stopScanning, reset };
}
