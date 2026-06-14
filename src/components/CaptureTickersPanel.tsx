import React, { useState, useEffect } from 'react';
import { ArrowLeft, Box, Database, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import TickerImage from './TickerImage';

interface CaptureTickersPanelProps {
  tickers: string[];
  onBack?: () => void;
  getAccessToken: () => Promise<string | null>;
  isEmbedded?: boolean;
  activeTickerOverride?: string;
}

export default function CaptureTickersPanel({ tickers, onBack, getAccessToken, isEmbedded, activeTickerOverride }: CaptureTickersPanelProps) {
  const [activeTickerLocal, setActiveTickerLocal] = useState<string>(tickers[0] || '');
  const activeTicker = activeTickerOverride || activeTickerLocal;
  const [currentZoom, setCurrentZoom] = useState(100);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [imageTimestamp, setImageTimestamp] = useState(() => Date.now());

  const handleSyncActiveTicker = async (silent = false) => {
    if (!activeTicker || activeTicker === "Auditoría") return;
    if (!silent) {
      setIsSyncing(true);
      setSyncStatus(`Sincronizando ${activeTicker} desde Drive...`);
    }
    
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No Google Access Token found.");
      
      const res = await fetch('/api/automation/sync-ticker-screenshots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticker: activeTicker })
      });
      
      const data = res.ok ? await res.json() : null;
      if (data && data.success) {
        setImageTimestamp(Date.now());
        if (!silent) {
          setSyncStatus(`¡Sincronizado ${activeTicker} con éxito!`);
        }
      } else if (!silent) {
        setSyncStatus(`Error: ${data?.error || "Fallo al sincronizar"}`);
      }
    } catch (err: any) {
      console.error("[AUTO-SYNC-ERROR]", err);
      if (!silent) {
        setSyncStatus(`Error: ${err.message}`);
      }
    } finally {
      if (!silent) {
        setIsSyncing(false);
        setTimeout(() => setSyncStatus(null), 5000);
      }
    }
  };

  const handleSyncScreenshots = async () => {
    if (!tickers || tickers.length === 0) return;
    setIsSyncing(true);
    setSyncStatus("Sincronizando de Drive (Todos los tickers)...");
    
    try {
      const token = await getAccessToken();
      let successCount = 0;
      let failCount = 0;

      // Sync all tickers sequentially to avoid overwhelming the API
      for (const t of tickers) {
        setSyncStatus(`Sincronizando ${t}... (${successCount + failCount + 1}/${tickers.length})`);
        const res = await fetch('/api/automation/sync-ticker-screenshots', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ticker: t })
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      if (failCount === 0) {
        setSyncStatus(`¡Éxito! ${successCount} tickers personalizados sincronizados.`);
      } else {
        setSyncStatus(`Completado: ${successCount} éxito, ${failCount} errores.`);
      }
      setImageTimestamp(Date.now());
    } catch (err: any) {
      setSyncStatus(`Error general: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // Sincronización automática silenciosa al seleccionar un ticker en el análisis detallado
  useEffect(() => {
    if (isEmbedded && activeTickerOverride && activeTickerOverride !== "Auditoría") {
      // Forzar recarga con timestamp actual para limpiar caché local
      setImageTimestamp(Date.now());
      
      // Lanzar sincronización rápida en segundo plano del ticker seleccionado
      handleSyncActiveTicker(true);
    }
  }, [activeTickerOverride]);

  const innerContent = activeTicker ? (
    <>
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <ImageIcon className={`w-3.5 h-3.5 ${isEmbedded ? 'text-[#f97316]' : 'text-[#3b82f6]'}`} />
          <h3 className="text-xs font-bold text-slate-200">
            Capturas del Ticker: <span className={`${isEmbedded ? 'text-[#f97316]' : 'text-[#3b82f6]'} font-mono`}>{activeTicker}</span>
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          {isEmbedded ? (
            <button
              type="button"
              onClick={() => handleSyncActiveTicker(false)}
              disabled={isSyncing}
              className="p-1 px-2.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-[#f97316] rounded text-[9px] font-bold flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer mr-1"
              title={`Sincronizar capturas de ${activeTicker} ahora`}
            >
              {isSyncing ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin text-[#f97316]" />
              ) : (
                <RefreshCw className="w-2.5 h-2.5 text-[#f97316]" />
              )}
              Sincronizar {activeTicker} desde Drive
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSyncActiveTicker(false)}
                disabled={isSyncing}
                className="p-1 px-2.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-[#3b82f6] rounded text-[9px] font-bold flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer mr-1"
                title={`Sincronizar capturas de ${activeTicker}`}
              >
                {isSyncing ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-[#3b82f6]" />
                ) : (
                  <RefreshCw className="w-2.5 h-2.5 text-[#3b82f6]" />
                )}
                Sincronizar {activeTicker}
              </button>
              <button
                type="button"
                onClick={handleSyncScreenshots}
                disabled={isSyncing}
                className="p-1 px-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white rounded text-[9px] font-bold flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer mr-1"
                title="Sincronizar todos los tickers secuencialmente"
              >
                Sincronizar Todos
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setCurrentZoom(prev => Math.max(50, prev - 25))}
            className="p-1 px-2 bg-slate-800/60 hover:bg-slate-700/60 rounded text-xs text-slate-350 font-bold border border-slate-700/80"
          >
            -
          </button>
          <span className="text-[10px] font-mono text-slate-400 px-1">{currentZoom}%</span>
          <button
            type="button"
            onClick={() => setCurrentZoom(prev => Math.min(300, prev + 25))}
            className="p-1 px-2 bg-slate-800/60 hover:bg-slate-700/60 rounded text-xs text-slate-350 font-bold border border-slate-700/80"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setCurrentZoom(100)}
            className="p-1 px-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] text-zinc-400 font-mono"
          >
            Reset
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className={`bg-slate-900/85 border border-slate-800 text-[10px] font-mono px-3 py-1.5 rounded-lg mb-3 flex items-center gap-2 ${isEmbedded ? 'text-amber-400' : 'text-blue-400'} animate-pulse transition-all`}>
          <span className={`w-1.5 h-1.5 ${isEmbedded ? 'bg-amber-400' : 'bg-blue-400'} rounded-full animate-ping`} />
          <span>{syncStatus}</span>
        </div>
      )}

      <div className="flex-grow overflow-auto border border-slate-800/80 rounded-lg bg-black/90 p-4 relative custom-scroll select-none flex flex-col">
        <div 
          className="transition-all duration-200 ease-out origin-top-left"
          style={{ transform: `scale(${currentZoom / 100})`, width: '100%', minWidth: '350px' }}
        >
          <div className="space-y-6">
            <div>
              <div className="text-left font-mono text-[9px] text-zinc-500 pb-1.5 mb-2 border-b border-zinc-900/60 flex justify-between">
                <span>ORIGEN VISUAL : {activeTicker}</span>
                <span>INDICADORES CLAVE - GRAFICO 1</span>
              </div>
              <TickerImage
                src={`/api/images/tv_${activeTicker}_indicators1.png?v=${imageTimestamp}&nofallback=true`}
                alt={`Indicators chart 1 for ${activeTicker}`}
                className="w-full rounded border border-slate-850 shadow-md object-contain max-h-[400px]"
              />
            </div>

            <div>
              <div className="text-left font-mono text-[9px] text-zinc-550 pb-1.5 mb-2 border-b border-zinc-900/60 flex justify-between">
                <span>ORIGEN VISUAL : {activeTicker}</span>
                <span>INDICADORES CLAVE - GRAFICO 2</span>
              </div>
              <TickerImage
                src={`/api/images/tv_${activeTicker}_indicators2.png?v=${imageTimestamp}&nofallback=true`}
                alt={`Indicators chart 2 for ${activeTicker}`}
                className="w-full rounded border border-slate-850 shadow-md object-contain max-h-[400px]"
              />
            </div>

            <div>
              <div className="text-left font-mono text-[9px] text-zinc-550 pb-1.5 mb-2 border-b border-zinc-900/60 flex justify-between">
                <span>ORIGEN VISUAL : {activeTicker}</span>
                <span>YAHOO KEY PARA NOTICIAS</span>
              </div>
              <TickerImage
                src={`/api/images/yahoo_${activeTicker}_news_headlines.png?v=${imageTimestamp}&nofallback=true`}
                alt={`News headlines for ${activeTicker}`}
                className="w-full rounded border border-slate-855 shadow-md object-contain max-h-[400px]"
              />
            </div>

            <div>
              <div className="text-left font-mono text-[9px] text-zinc-550 pb-1.5 mb-2 border-b border-zinc-900/60 flex justify-between">
                <span>ORIGEN VISUAL : {activeTicker}</span>
                <span>YAHOO TRADING / DIFERENCIAL HOY</span>
              </div>
              <TickerImage
                src={`/api/images/yahoo_${activeTicker}_moving_today.png?v=${imageTimestamp}&nofallback=true`}
                alt={`Why moving today for ${activeTicker}`}
                className="w-full rounded border border-slate-855 shadow-md object-contain max-h-[400px]"
              />
            </div>
          </div>
        </div>
      </div>
      {isEmbedded && (
        <div className="mt-2 text-center text-[10px] text-slate-500">
          Aumenta el zoom (+ / -) y haz clic en la imagen para expandirla.
        </div>
      )}
    </>
  ) : (
    <div className="flex-grow flex items-center justify-center text-slate-500 italic">
      Selecciona un ticker de la lista para ver sus capturas.
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="h-full flex flex-col min-h-[300px]">
        {innerContent}
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#07090c] p-6 text-[#e2e8f0] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.01]" 
        style={{ backgroundImage: 'linear-gradient(#f8fafc 1px, transparent 1px), linear-gradient(90deg, #f8fafc 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      <header className="flex justify-between items-center mb-6 relative z-10 pb-4 border-b border-slate-800/50">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3b82f6] mb-1 font-mono">Panel Exclusivo de Capturas</p>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Panel de Imágenes
          </h1>
        </div>
        
        {onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-all bg-white/5 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Inicio
          </button>
        )}
      </header>

      <div className="flex-grow grid lg:grid-cols-12 gap-6 relative z-10 overflow-hidden min-h-0">
        <div className="lg:col-span-3 bg-[#111418] border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden shadow-xl min-h-0">
          <h3 className="text-xs font-bold text-slate-200 mb-4 flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-blue-400" /> Tickers Disponibles</h3>
          {tickers.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No hay tickers configurados.</p>
          ) : (
            <div className="space-y-2 overflow-y-auto custom-scroll pr-2">
              {tickers.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTickerLocal(t)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                    activeTicker === t 
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 font-bold' 
                      : 'bg-black/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-9 bg-[#111418] border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden shadow-xl min-h-0">
          {innerContent}
        </div>
      </div>
    </div>
  );
}
