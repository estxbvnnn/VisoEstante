import { useEffect, useRef } from 'react';
import { useScanner } from '../../hooks/useScanner';

export default function BarcodeScanner({ onDetected, onCancel }) {
  const containerRef = useRef(null);
  const { scanning, detected, error, startScanning, stopScanning, reset } = useScanner();

  useEffect(() => {
    if (containerRef.current) {
      startScanning(containerRef.current);
    }
    return () => {
      stopScanning();
    };
  }, [startScanning, stopScanning]);

  useEffect(() => {
    if (detected) {
      onDetected(detected);
    }
  }, [detected, onDetected]);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
        {/* Scanning line animation */}
        {scanning && (
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <div className="w-full h-0.5 bg-green-400 opacity-80 animate-bounce" />
          </div>
        )}
        {/* Corner overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-green-400 rounded-tl" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-green-400 rounded-tr" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-green-400 rounded-bl" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-green-400 rounded-br" />
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 text-center">
        {scanning ? 'Apunta la cámara al código de barras…' : 'Iniciando cámara…'}
      </p>

      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}

      <button
        onClick={() => { stopScanning(); onCancel(); }}
        className="mt-4 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Cancelar
      </button>
    </div>
  );
}
