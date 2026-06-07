import { useState, useRef } from 'react';
import { useOCR } from '../../hooks/useOCR';
import { formatChileanDate } from '../../utils/dateUtils';
import { isFutureOrToday, parseValidDate } from '../../utils/validation';

export default function OCRDateScanner({ onDateConfirmed, onCancel }) {
  const { processing, result, confidence, error, processImage, reset } = useOCR();
  const [preview, setPreview] = useState(null);
  const [manualDate, setManualDate] = useState('');
  const fileInputRef = useRef(null);

  function handleFile(file) {
    const url = URL.createObjectURL(file);
    setPreview(url);
    reset();
    processImage(url);
  }

  function handleCapture(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    const date = parseValidDate(manualDate || result);
    if (!date) return;
    if (!isFutureOrToday(date)) return;
    onDateConfirmed(date);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-base font-semibold text-slate-800">Capturar fecha de vencimiento</h3>

      {!preview && (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-2xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            📷 Tomar foto del packaging
          </button>
          <label className="w-full">
            <input type="file" accept="image/*" onChange={handleCapture} className="hidden" />
            <span className="block w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 py-3 text-center text-sm text-slate-500 transition hover:border-blue-400 hover:text-blue-600">
              O subir imagen desde galería
            </span>
          </label>
        </div>
      )}

      {preview && (
        <div className="w-full max-w-sm flex flex-col gap-3">
          <img src={preview} alt="Preview packaging" className="w-full max-h-48 object-contain rounded-2xl border border-slate-200" />

          {processing && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              Procesando OCR…
            </div>
          )}

          {!processing && result && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-800">
                Fecha detectada: {formatChileanDate(result)}
              </p>
              <p className="text-xs text-emerald-600">Confianza: {Math.round(confidence || 0)}%</p>
            </div>
          )}

          {!processing && error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              Confirmar o ingresar fecha manualmente:
            </label>
            <input
              type="date"
              value={
                manualDate ||
                (result ? result.toISOString().split('T')[0] : '')
              }
              onChange={(e) => setManualDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!result && !manualDate}
              className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              Confirmar fecha
            </button>
            <button
              onClick={() => { setPreview(null); reset(); setManualDate(''); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">
        Cancelar
      </button>
    </div>
  );
}
