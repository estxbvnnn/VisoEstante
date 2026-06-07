import { useState, useCallback } from 'react';
import { extractDateFromImage, validateExtractedDate } from '../services/ocrService';

export function useOCR() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState(null);

  const processImage = useCallback(async (imageSource) => {
    setProcessing(true);
    setResult(null);
    setError(null);
    setConfidence(null);
    try {
      const { date, confidence: conf, raw } = await extractDateFromImage(imageSource);
      setResult(date);
      setConfidence(conf);
      if (!date) {
        setError('No se pudo detectar una fecha en la imagen.');
      } else if (!validateExtractedDate(date)) {
        setError('La fecha detectada parece inválida. Por favor, corrígela manualmente.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProcessing(false);
    setResult(null);
    setConfidence(null);
    setError(null);
  }, []);

  return { processing, result, confidence, error, processImage, reset };
}
