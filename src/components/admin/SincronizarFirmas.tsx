'use client';

import { useState } from 'react';
import { FirmaService } from '@/services/firmaService';

export default function SincronizarFirmas() {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'ok' | 'error'>('idle');
  const [resultado, setResultado] = useState<{ total: number; exitosos: number; errores: string[] } | null>(null);

  const handleSincronizar = async () => {
    if (!confirm('¿Copiar todas las firmas de Cloudinary a Supabase? Esto puede tardar un momento.')) return;
    setEstado('cargando');
    setResultado(null);
    try {
      const res = await FirmaService.sincronizarCloudinaryASupabase();
      setResultado(res);
      setEstado(res.errores.length === 0 ? 'ok' : 'error');
    } catch {
      setEstado('error');
      setResultado({ total: 0, exitosos: 0, errores: ['Error inesperado durante la sincronización'] });
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div>
        <h3 className="font-semibold text-gray-800">🔄 Sincronizar respaldo de firmas</h3>
        <p className="text-sm text-gray-500 mt-1">
          Copia todas las firmas desde Cloudinary a Supabase (respaldo).
          Úsalo la primera vez o cuando quieras actualizar el respaldo.
        </p>
      </div>
      <button
        onClick={handleSincronizar}
        disabled={estado === 'cargando'}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {estado === 'cargando' ? '⏳ Sincronizando...' : 'Copiar a Supabase'}
      </button>
      {resultado && (
        <div className={`rounded-lg p-3 text-sm ${estado === 'ok' ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
          <p className="font-medium">{estado === 'ok' ? '✅ Sincronización completa' : '⚠️ Sincronización con errores'}</p>
          <p>{resultado.exitosos} de {resultado.total} firmas copiadas correctamente.</p>
          {resultado.errores.length > 0 && (
            <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
              {resultado.errores.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
