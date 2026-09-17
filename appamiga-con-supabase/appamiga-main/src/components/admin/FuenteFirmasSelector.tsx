'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, RefreshCw, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'fuente_firmas_override';

type FuenteFirmas = 'cloudinary' | 'local';

interface FuenteFirmasSelectorProps {
  onCambio?: () => void; // Para recargar firmas tras el cambio
}

export default function FuenteFirmasSelector({ onCambio }: FuenteFirmasSelectorProps) {
  const [fuente, setFuente] = useState<FuenteFirmas>('cloudinary');
  const [guardado, setGuardado] = useState(false);

  // Al montar, leer preferencia guardada. Si no existe, usar el default del .env.local
  useEffect(() => {
    const guardada = localStorage.getItem(STORAGE_KEY) as FuenteFirmas | null;
    if (guardada === 'local' || guardada === 'cloudinary') {
      setFuente(guardada);
    } else {
      // Primera vez: tomar el default del env y guardarlo en localStorage
      const envFuente = process.env.NEXT_PUBLIC_FUENTE_FIRMAS as FuenteFirmas | undefined;
      const defaultFuente: FuenteFirmas = (envFuente === 'local' || envFuente === 'cloudinary') ? envFuente : 'local';
      localStorage.setItem(STORAGE_KEY, defaultFuente);
      setFuente(defaultFuente);
    }
  }, []);

  const cambiarFuente = (nuevaFuente: FuenteFirmas) => {
    setFuente(nuevaFuente);
    localStorage.setItem(STORAGE_KEY, nuevaFuente);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
    if (onCambio) onCambio();
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Fuente de Firmas
          </p>
          <p className="text-sm font-semibold text-slate-600 mt-0.5">
            {fuente === 'cloudinary' ? '☁️ Usando Cloudinary (nube)' : '💾 Usando archivos locales'}
          </p>
        </div>
        {guardado && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-fade-in">
            <CheckCircle2 size={14} />
            Guardado
          </div>
        )}
      </div>

      {/* Toggle visual */}
      <div className="grid grid-cols-2 gap-3">
        {/* Botón Cloudinary */}
        <button
          onClick={() => cambiarFuente('cloudinary')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 text-left ${
            fuente === 'cloudinary'
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
              : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
          }`}
        >
          <Cloud size={22} strokeWidth={fuente === 'cloudinary' ? 2.5 : 1.5} />
          <div>
            <p className="text-xs font-black uppercase tracking-wide leading-none">Cloudinary</p>
            <p className="text-[10px] font-medium mt-1 opacity-70">Nube (usa créditos)</p>
          </div>
          {fuente === 'cloudinary' && (
            <div className="w-full h-1 bg-blue-500 rounded-full mt-1" />
          )}
        </button>

        {/* Botón Local */}
        <button
          onClick={() => cambiarFuente('local')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 text-left ${
            fuente === 'local'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100'
              : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
          }`}
        >
          <HardDrive size={22} strokeWidth={fuente === 'local' ? 2.5 : 1.5} />
          <div>
            <p className="text-xs font-black uppercase tracking-wide leading-none">Local</p>
            <p className="text-[10px] font-medium mt-1 opacity-70">Sin costo, sin límite</p>
          </div>
          {fuente === 'local' && (
            <div className="w-full h-1 bg-emerald-500 rounded-full mt-1" />
          )}
        </button>
      </div>

      {/* Aviso contextual */}
      <div className={`text-xs font-medium p-3 rounded-xl ${
        fuente === 'local'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-blue-50 text-blue-700 border border-blue-100'
      }`}>
        {fuente === 'local' ? (
          <span>✅ Las firmas se cargan desde <code className="font-mono bg-emerald-100 px-1 rounded">public/firmas/</code>. Sin créditos de Cloudinary.</span>
        ) : (
          <span>☁️ Las firmas se cargan desde Cloudinary. Asegúrate de tener créditos disponibles.</span>
        )}
      </div>

      {/* Leyenda de recarga */}
      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
        <RefreshCw size={10} />
        El cambio aplica de inmediato en esta sesión. Se guarda automáticamente para próximas visitas.
      </p>
    </div>
  );
}
