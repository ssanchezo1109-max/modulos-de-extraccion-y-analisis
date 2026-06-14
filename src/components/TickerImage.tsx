import React, { useState, useEffect } from 'react';
import { Loader2, Maximize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function TickerImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [errorCount, setErrorCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // When src changes, reset states
  useEffect(() => {
    setErrorCount(0);
    setLoaded(false);
    setRetryKey(prev => prev + 1);
  }, [src]);

  // Retry logic
  useEffect(() => {
    if (errorCount > 0 && errorCount < 10 && !loaded) {
      const timer = setTimeout(() => {
        setRetryKey(prev => prev + 1);
      }, 4000); // retry every 4 seconds
      return () => clearTimeout(timer);
    }
  }, [errorCount, loaded]);

  const finalSrc = src.includes('?') 
    ? `${src}&t=${retryKey}_${Date.now()}`
    : `${src}?t=${retryKey}_${Date.now()}`;

  if (errorCount >= 10 && !loaded) {
    return (
      <div className="w-full min-h-[180px] rounded border border-dashed border-amber-500/30 bg-slate-950/60 p-6 flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xs">⚠️</div>
        <p className="text-[10px] font-mono text-zinc-400 text-center max-w-sm leading-relaxed">
          No se encontró o no se pudo generar la captura original para este slot.<br />
          <span className="text-[#f97316]">Prueba pulsar el botón "Sincronizar de Drive" en la parte superior derecha de esta sección para importar todas las imágenes del ticker desde Google Drive.</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setErrorCount(0);
            setRetryKey(prev => prev + 1);
          }}
          className="text-[9px] font-mono uppercase bg-slate-900 hover:bg-zinc-800 px-2.5 py-1 rounded text-amber-500 hover:text-amber-400 border border-slate-800 cursor-pointer"
        >
          Reintentar Carga Manual
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full min-h-[140px] group flex items-center justify-center bg-slate-950/40 rounded overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 gap-2 z-10 p-4 border border-slate-800 rounded">
            <Loader2 className="w-4 h-4 text-[#f97316] animate-spin" />
            <span className="text-[9px] font-mono text-slate-400 uppercase animate-pulse">Esperando captura real del robot (Intento {errorCount + 1})...</span>
          </div>
        )}
        <img
          src={finalSrc}
          alt={alt}
          className={`${className} ${loaded ? 'block cursor-pointer' : 'hidden'}`}
          onLoad={() => {
            setLoaded(true);
          }}
          onClick={() => loaded && setIsExpanded(true)}
          onError={() => {
            setErrorCount(prev => prev + 1);
          }}
          referrerPolicy="no-referrer"
        />
        {loaded && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1.5 rounded cursor-pointer pointer-events-none">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {isExpanded && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        >
          <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 hover:border-red-500/50 border border-slate-700 transition-all rounded-full cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <img 
            src={finalSrc}
            alt={alt}
            className="max-w-full max-h-full object-contain cursor-default"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>,
        document.body
      )}
    </>
  );
}
