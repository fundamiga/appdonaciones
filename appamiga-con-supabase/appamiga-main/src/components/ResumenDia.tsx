'use client';
import React, { useState, useRef } from 'react';
import { TrendingUp, Users, MapPin, Car, Calendar, Receipt, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { RegistroDiario } from '@/types';

interface ResumenDiaProps {
  registros: RegistroDiario[];
  registroActual: RegistroDiario;
  onEliminar: (index: number) => void;
  onDescargarFecha: (fecha: string) => void;
}

interface GrupoFecha {
  fecha: string;
  registros: RegistroDiario[];
  totalDonaciones: number;
  totalFacturas: number;
  totalGeneral: number;
  totalDonantes: number;
}

function formatearFecha(fecha: string) {
  const [y, m, d] = fecha.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

function agruparPorFecha(registros: RegistroDiario[]): GrupoFecha[] {
  const mapa: Record<string, RegistroDiario[]> = {};
  for (const reg of registros) {
    if (!mapa[reg.fecha]) mapa[reg.fecha] = [];
    mapa[reg.fecha].push(reg);
  }
  return Object.entries(mapa)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([fecha, regs]) => ({
      fecha,
      registros: regs,
      totalDonaciones: regs.reduce((s, r) => s + r.donaciones.valor, 0),
      totalFacturas: regs.reduce((s, r) => s + (r.facturaElectronica?.valor || 0), 0),
      totalGeneral: regs.reduce((s, r) => s + r.donaciones.valor + (r.facturaElectronica?.valor || 0), 0),
      totalDonantes: regs.reduce((s, r) => s + r.donaciones.cantidadDonantes, 0),
    }));
}

export const ResumenDia: React.FC<ResumenDiaProps> = ({ registros, registroActual, onEliminar, onDescargarFecha }) => {
  const grupos = agruparPorFecha(registros);
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  const resumenRef = useRef<HTMLDivElement>(null);

  const handleDescargarPDF = () => {
    const contenido = resumenRef.current;
    if (!contenido) return;

    const ventana = window.open('', '_blank');
    if (!ventana) return;

    ventana.document.write(`
      <html>
        <head>
          <title>Resumen Total Recaudado</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: sans-serif; padding: 24px; color: #1e293b; }
            .print-content { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="print-content">
            ${contenido.innerHTML}
          </div>
          <script>
            // Ocultar botones de eliminar y descargar en el PDF
            document.querySelectorAll('button').forEach(b => b.style.display = 'none');
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const toggleFecha = (fecha: string) => {
    setExpandidas(prev => ({ ...prev, [fecha]: !prev[fecha] }));
  };

  const estaExpandida = (fecha: string, index: number) => {
    // Si nunca se tocó, la primera está abierta por defecto
    if (!(fecha in expandidas)) return index === 0;
    return expandidas[fecha];
  };

  const previewValor = registroActual.donaciones.valor || 0;
  const hayPreview = previewValor > 0 && registroActual.donaciones.cantidadDonantes > 0 && registroActual.ubicacion;

  if (registros.length === 0 && !hayPreview) return null;

  const granTotal = registros.reduce((s, r) => s + r.donaciones.valor + (r.facturaElectronica?.valor || 0), 0);
  const granTotalDonaciones = registros.reduce((s, r) => s + r.donaciones.valor, 0);
  const granTotalFacturas = registros.reduce((s, r) => s + (r.facturaElectronica?.valor || 0), 0);
  const granTotalDonantes = registros.reduce((s, r) => s + r.donaciones.cantidadDonantes, 0);

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 rounded-xl">
          <TrendingUp size={18} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-base">Total Recaudado por Fecha</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {registros.length} registro{registros.length !== 1 ? 's' : ''} · {grupos.length} fecha{grupos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Totales globales */}
      {grupos.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-50 bg-emerald-50/40 border-b border-emerald-100">
          <div className="px-6 py-4">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Gran Total</p>
            <p className="text-2xl font-black text-emerald-700">${granTotal.toLocaleString('es-CO')}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Donaciones</p>
            <p className="text-xl font-black text-slate-800">${granTotalDonaciones.toLocaleString('es-CO')}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Facturas</p>
            <p className="text-xl font-black text-slate-800">${granTotalFacturas.toLocaleString('es-CO')}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Donantes</p>
            <p className="text-xl font-black text-slate-800">{granTotalDonantes} <span className="text-xs font-bold text-slate-400">pers.</span></p>
          </div>
        </div>
      )}

      {/* Un bloque por cada fecha */}
      <div className="divide-y divide-gray-50">
        {grupos.map((grupo, index) => (
          <div key={grupo.fecha}>
            {/* Cabecera de fecha */}
            <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <button
                onClick={() => toggleFecha(grupo.fecha)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <div className="p-1.5 bg-yellow-50 rounded-lg">
                  <Calendar size={14} className="text-yellow-600" />
                </div>
                <span className="text-sm font-black text-slate-700 capitalize">{formatearFecha(grupo.fecha)}</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {grupo.registros.length} reg. · {grupo.totalDonantes} don.
                </span>
              </button>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-600">${grupo.totalGeneral.toLocaleString('es-CO')}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase text-right">total del día</p>
                </div>
                <button
                  onClick={() => onDescargarFecha(grupo.fecha)}
                  title={`Descargar PDF del ${formatearFecha(grupo.fecha)}`}
                  className="p-2 bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-xl transition-all"
                >
                  <Download size={15} />
                </button>
                <button onClick={() => toggleFecha(grupo.fecha)} className="p-1">
                  {estaExpandida(grupo.fecha, index)
                    ? <ChevronUp size={16} className="text-slate-400" />
                    : <ChevronDown size={16} className="text-slate-400" />
                  }
                </button>
              </div>
            </div>

            {/* Detalle expandible */}
            {estaExpandida(grupo.fecha, index) && (
              <div className="px-6 pb-5">
                {/* Subtotales */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Donaciones</p>
                    <p className="text-base font-black text-slate-800">${grupo.totalDonaciones.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Facturas</p>
                    <p className="text-base font-black text-slate-800">${grupo.totalFacturas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Donantes</p>
                    <p className="text-base font-black text-slate-800">{grupo.totalDonantes} <span className="text-xs font-bold text-slate-400">pers.</span></p>
                  </div>
                </div>

                {/* Desglose por ubicación */}
                <div className="space-y-3">
                  {grupo.registros.map((reg, i) => {
                    // Calcular índice global del registro para poder eliminarlo
                    const indexGlobal = registros.indexOf(reg);
                    return (
                    <div key={i} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <MapPin size={13} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700">{reg.ubicacion}</span>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Car size={11} />
                            <span className="text-[10px] font-bold uppercase">{reg.tipoParqueadero}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Users size={11} />
                            <span className="text-[11px] font-bold">{reg.donaciones.cantidadDonantes}</span>
                          </div>
                          <span className="text-sm font-black text-slate-800">${reg.donaciones.valor.toLocaleString('es-CO')}</span>
                          <button
                            onClick={() => {
                              if (!confirm('¿Eliminar este registro?')) return;
                              onEliminar(indexGlobal);
                            }}
                            className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                            title="Eliminar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </div>
                      {reg.itemsFacturas && reg.itemsFacturas.length > 0 && (
                        <div className="border-t border-slate-50 px-4 pb-3 pt-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Receipt size={10} /> Facturas electrónicas ({reg.itemsFacturas.length})
                          </p>
                          <div className="space-y-1.5">
                            {reg.itemsFacturas.map((fact, fi) => (
                              <div key={fi} className="grid grid-cols-4 gap-2 bg-blue-50 rounded-lg px-3 py-2 text-[11px]">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase">Donante</p>
                                  <p className="font-bold text-slate-700">{fact.donante}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase">NIT/CC</p>
                                  <p className="font-bold text-slate-700">{fact.documento || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase">No. Factura</p>
                                  <p className="font-bold text-slate-700">{fact.reciboN || '—'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-slate-400 uppercase">Valor</p>
                                  <p className="font-black text-blue-700">${fact.valor.toLocaleString('es-CO')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-right text-xs font-black text-blue-700 mt-2">
                            Total facturas: ${reg.itemsFacturas.reduce((s, f) => s + f.valor, 0).toLocaleString('es-CO')}
                          </p>
                        </div>
                      )}
                    </div>
                  ); })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview del registro en progreso */}
      {hayPreview && (
        <div className="mx-6 mb-5 flex items-center justify-between py-2.5 px-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xs font-bold text-yellow-800">En progreso: {registroActual.ubicacion} · {registroActual.fecha}</span>
          </div>
          <span className="text-sm font-black text-yellow-700">${previewValor.toLocaleString('es-CO')}</span>
        </div>
      )}
    </div>
  );
};
