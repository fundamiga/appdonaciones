'use client';
import React from 'react';
import { TrendingUp } from 'lucide-react';
import { RegistroDiario } from '@/types';

interface HojaResumenConsolidadoProps {
  registros: RegistroDiario[];
  tituloFecha?: string;
}

export const HojaResumenConsolidado: React.FC<HojaResumenConsolidadoProps> = ({
  registros,
  tituloFecha,
}) => {
  if (registros.length === 0) return null;

  const granTotal = registros.reduce(
    (s, r) => s + r.donaciones.valor + (r.facturaElectronica?.valor || 0),
    0
  );
  const granTotalDonaciones = registros.reduce((s, r) => s + r.donaciones.valor, 0);
  const granTotalFacturas = registros.reduce(
    (s, r) => s + (r.facturaElectronica?.valor || 0),
    0
  );
  const granTotalDonantes = registros.reduce(
    (s, r) => s + r.donaciones.cantidadDonantes,
    0
  );

  // Agrupar registros por fecha
  const mapa: Record<string, RegistroDiario[]> = {};
  for (const reg of registros) {
    if (!mapa[reg.fecha]) mapa[reg.fecha] = [];
    mapa[reg.fecha].push(reg);
  }

  // Ordenar fechas descendentes
  const fechasOrdenadas = Object.entries(mapa).sort(([a], [b]) =>
    b.localeCompare(a)
  );

  const fechaEncabezado =
    tituloFecha ||
    (fechasOrdenadas.length === 1
      ? (() => {
          const [y, m, d] = fechasOrdenadas[0][0].split('-');
          return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
            'es-CO',
            { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
          );
        })()
      : new Date().toLocaleDateString('es-CO', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }));

  return (
    <div
      style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}
      className="p-8 md:p-12 max-w-4xl mx-auto bg-white"
    >
      {/* Header del Resumen */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-emerald-500">
        <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
          <TrendingUp size={24} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            Total Recaudado por Fecha
          </h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            {registros.length} REGISTROS · {fechaEncabezado.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Totales Globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Gran Total
          </p>
          <p className="text-2xl font-black text-emerald-600">
            ${granTotal.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Donaciones
          </p>
          <p className="text-2xl font-black text-slate-800">
            ${granTotalDonaciones.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Facturas
          </p>
          <p className="text-2xl font-black text-slate-800">
            ${granTotalFacturas.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Donantes
          </p>
          <p className="text-2xl font-black text-slate-800">
            {granTotalDonantes}{' '}
            <span className="text-sm font-bold text-slate-400">pers.</span>
          </p>
        </div>
      </div>

      {/* Desglose por Cada Fecha */}
      <div className="space-y-6">
        {fechasOrdenadas.map(([fecha, regs]) => {
          const [y, m, d] = fecha.split('-');
          const fechaStr = new Date(
            Number(y),
            Number(m) - 1,
            Number(d)
          ).toLocaleDateString('es-CO', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });

          const totalDia = regs.reduce(
            (s, r) => s + r.donaciones.valor + (r.facturaElectronica?.valor || 0),
            0
          );
          const totalDon = regs.reduce((s, r) => s + r.donaciones.valor, 0);
          const totalFact = regs.reduce(
            (s, r) => s + (r.facturaElectronica?.valor || 0),
            0
          );
          const totalDonantesDia = regs.reduce(
            (s, r) => s + r.donaciones.cantidadDonantes,
            0
          );

          return (
            <div
              key={fecha}
              className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm"
            >
              {/* Encabezado del Día */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
                <span className="text-base font-black text-slate-800 capitalize">
                  {fechaStr}
                </span>
                <span className="text-xl font-black text-emerald-600">
                  ${totalDia.toLocaleString('es-CO')}
                </span>
              </div>

              {/* Subtotales del Día */}
              <div className="grid grid-cols-3 gap-3 px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Donaciones
                  </p>
                  <p className="font-black text-slate-800 text-sm">
                    ${totalDon.toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Facturas
                  </p>
                  <p className="font-black text-slate-800 text-sm">
                    ${totalFact.toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Donantes
                  </p>
                  <p className="font-black text-slate-800 text-sm">
                    {totalDonantesDia} pers.
                  </p>
                </div>
              </div>

              {/* Filas por Ubicación */}
              <div className="divide-y divide-slate-100">
                {regs.map((reg, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-800">
                        {reg.ubicacion}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {reg.tipoParqueadero}
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-[11px] font-medium text-slate-400">
                        {reg.donaciones.cantidadDonantes} don.
                      </span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        $
                        {(
                          reg.donaciones.valor +
                          (reg.facturaElectronica?.valor || 0)
                        ).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
