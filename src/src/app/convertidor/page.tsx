'use client';
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, ArrowLeft, Download, CheckCircle, RefreshCcw } from 'lucide-react';
import { procesarArchivoExcel } from '@/utils/importador';
import { exportarPlantillaLimpia } from '@/utils/exportarPlantillaLimpia';
import Link from 'next/link';

export default function ConvertidorPage() {
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState<{ nombre: string; records: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargando(true);
    setError(null);
    setExito(null);

    try {
      // Usar la robusta heurística del importador actual
      const registros = await procesarArchivoExcel(file);
      
      if (registros.length === 0) {
        throw new Error('No se encontraron registros válidos en el archivo.');
      }

      // Convertir y exportar inmediatamente
      await exportarPlantillaLimpia(registros, 'Plantilla_Convertida');
      
      setExito({ nombre: file.name, records: registros.length });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al procesar y convertir el archivo. Asegúrate de que sea un Excel de recaudos.');
    } finally {
      setCargando(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col justify-center">
      {/* Luces Ambientales */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-100/30 blur-[120px] rounded-full -z-10 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-100/20 blur-[100px] rounded-full -z-10 translate-x-1/4 translate-y-1/4"></div>

      <div className="max-w-3xl mx-auto w-full px-6 py-12 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-12 transition-colors">
          <ArrowLeft size={16} /> Volver al Inicio
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-500 text-white shadow-xl shadow-blue-500/20 mb-6">
            <RefreshCcw size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">
            Convertidor de <span className="text-blue-600">Herramienta</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Sube los reportes originales de Meli o estándares aquí para transformarlos y descargar tu Plantilla Limpia original.
          </p>
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-100">
          {exito ? (
            <div className="text-center bg-emerald-50 rounded-[2rem] p-10 border border-emerald-100 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-emerald-950 mb-2">¡Conversión Exitosa!</h3>
              <p className="text-emerald-700 font-medium mb-6">
                Se detectaron y convirtieron {exito.records} registros del archivo <span className="font-bold">{exito.nombre}</span>.<br/>El nuevo archivo Excel se ha descargado a tu equipo.
              </p>
              <button 
                onClick={() => setExito(null)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase px-8 py-4 rounded-2xl tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
              >
                Convertir otro archivo
              </button>
            </div>
          ) : (
            <label className="group cursor-pointer block">
              <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-500 bg-slate-50/50 relative overflow-hidden">
                {cargando && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <RefreshCcw size={40} className="text-blue-500 animate-spin mb-4" />
                    <p className="text-blue-900 font-black text-lg">Procesando archivo...</p>
                  </div>
                )}
                
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 -rotate-3 group-hover:rotate-0 transition-all duration-500">
                  <FileSpreadsheet size={40} className="text-blue-500" />
                </div>
                <p className="text-slate-900 font-black text-2xl mb-3">Sube el Excel original</p>
                <p className="text-slate-400 text-sm font-medium mb-8 max-w-sm mx-auto">Selecciona el archivo para convertirlo inmediatamente y descargar la copia saneada.</p>
                
                {error && (
                  <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                    {error}
                  </div>
                )}

                <div className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest inline-flex items-center gap-3 shadow-xl shadow-blue-600/20 group-hover:bg-blue-700 transition-all">
                  <Upload size={18} />
                  Explorar Archivos
                </div>
              </div>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} disabled={cargando} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
