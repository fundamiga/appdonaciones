'use client';
import Image from 'next/image';
import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, CheckCircle, FileSpreadsheet, ArrowRight, Download, TrendingUp, Trash2 } from 'lucide-react';
import { FormularioRegistro } from '@/components/formRegis';
import { InformeConPanelEdicion } from '@/components/InformeConPanelEdicion';
import { BotonAccesoAdmin } from '@/components/BotonAccesoAdmin';
import { ResumenDia } from '@/components/ResumenDia';
import { HistorialDias } from '@/components/HistorialDias';
import { useRegistroDiario } from '@/hooks/useRegistroDiario';
import { useHistorial, EntradaHistorial } from '@/hooks/useHistorial';
import { useFirmas } from '@/hooks/useFirmas';
import { RegistroDiario, ItemFactura } from '@/types';
import DonacionesErrorBoundary from '@/components/DonacionesErrorBoundary';
import { exportarAExcel } from '@/utils/exportarExcel';
import { ImportadorExcel } from '@/components/ImportadorExcel';

export default function SistemaControlDonaciones() {
  const [mostrarInforme, setMostrarInforme] = useState(false);
  const [mostrarMultiplesInformes, setMostrarMultiplesInformes] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<number | null>(null);
  const [informeHistorial, setInformeHistorial] = useState<{ registros: RegistroDiario[]; itemsFacturas: ItemFactura[] } | null>(null);
  const [toastExito, setToastExito] = useState<string | null>(null);
  const [mostrarImportador, setMostrarImportador] = useState(false);

  const mostrarToast = (msg: string) => {
    setToastExito(msg);
    setTimeout(() => setToastExito(null), 3000);
  };

  const {
    registros,
    registroActual,
    itemsFacturas,
    handleInputChange,
    handleDonacionChange,
    handleFacturaChange,
    handleItemsFacturasChange,
    handleFirmaChange,
    agregarRegistro,
    importarRegistros,
    eliminarRegistro,
    reiniciarFormulario
  } = useRegistroDiario();

  const { firmas } = useFirmas();
  const { historial, guardarEnHistorial, eliminarEntrada } = useHistorial();

  const handleAgregarRegistro = () => {
    const exito = agregarRegistro();
    if (!exito) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }
    mostrarToast('✅ Registro agregado correctamente');
  };

  const handleGenerarInforme = () => {
    const tieneRegistroActual = !!registroActual.ubicacion && registroActual.donaciones.valor > 0;
    if (!tieneRegistroActual && registros.length === 0) {
      alert('Debes agregar al menos un registro');
      return;
    }

    // Validar que haya al menos una firma
    const firmaActual = registroActual.firmas;
    const tieneFirma = firmaActual.trabajador || firmaActual.supervisor || firmaActual.responsable;
    if (!tieneFirma) {
      alert('Debes seleccionar al menos una firma antes de generar el informe');
      return;
    }

    if (tieneRegistroActual) {
      const exito = agregarRegistro();
      if (!exito) {
        alert('Por favor completa todos los campos obligatorios');
        return;
      }
      setRegistroSeleccionado(registros.length);
    } else {
      setRegistroSeleccionado(registros.length - 1);
    }
  };

  const handleNuevoInforme = () => {
    if (registros.length > 0) guardarEnHistorial(registros);
    reiniciarFormulario();
    setMostrarInforme(false);
  };

  const handleDescargarExcel = async () => {
    if (registros.length === 0) {
      alert('No hay registros para exportar');
      return;
    }
    const todasLasFacturas = registros.flatMap(r => r.itemsFacturas ?? []);
    await exportarAExcel(registros, todasLasFacturas);
    mostrarToast('📊 Archivo Excel descargado correctamente');
  };

  const handleVerInformeHistorial = (entrada: EntradaHistorial) => {
    const todasLasFacturas = entrada.registros.flatMap(r => {
      // Si el registro tiene itemsFacturas guardados, usarlos
      if (r.itemsFacturas && r.itemsFacturas.length > 0) return r.itemsFacturas;
      // Si no, pero tiene facturaElectronica con valor, construir items desde ahí
      if (r.facturaElectronica && r.facturaElectronica.valor > 0) {
        const cantidad = r.facturaElectronica.cantidadPersonas || 1;
        const valorPorPersona = Math.round(r.facturaElectronica.valor / cantidad);
        return Array.from({ length: cantidad }, (_, i) => ({
          item: i + 1,
          donante: 'ANÓNIMO',
          documento: '',
          medio: 'FACTURA ELECTRÓNICA',
          valor: valorPorPersona,
          reciboN: '',
          observaciones: 'SIN OBSERVACIONES',
        }));
      }
      return [];
    });
    setInformeHistorial({ registros: entrada.registros, itemsFacturas: todasLasFacturas });
    setMostrarInforme(true);
  };

  const [fechaImprimiendo, setFechaImprimiendo] = useState<string | null>(null);

  const handleDescargarFecha = (fecha: string) => {
    setFechaImprimiendo(fecha);
    setTimeout(() => { window.print(); setFechaImprimiendo(null); }, 500);
  };

  const handleImportarExcel = (nuevosRegistros: RegistroDiario[]) => {
    // Preservar las firmas que ya vienen del importador (las que detectó en Cloudinary)
    // Si un registro no tiene firma, se le asigna la del registro actual por defecto
    const registrosConFirmas = nuevosRegistros.map(reg => ({
      ...reg,
      firmas: {
        trabajador: reg.firmas.trabajador || registroActual.firmas.trabajador,
        supervisor: reg.firmas.supervisor || registroActual.firmas.supervisor,
        responsable: reg.firmas.responsable || registroActual.firmas.responsable
      }
    }));
    
    importarRegistros(registrosConFirmas);
    setMostrarImportador(false);
    mostrarToast(`✅ ${nuevosRegistros.length} registros importados correctamente`);
  };

  const handleDescargarPDFMultiple = () => {
    if (registros.length === 0) {
      alert('No hay registros para descargar');
      return;
    }
    setMostrarMultiplesInformes(true);
    setTimeout(() => { window.print(); }, 1500);
  };

  // Vista: PDF de una fecha específica
  if (fechaImprimiendo) {
    const regsDelDia = registros.filter(r => r.fecha === fechaImprimiendo);
    return (
      <div className="bg-white min-h-screen">
        {regsDelDia.map((reg, idx) => {
          const facturas = reg.itemsFacturas && reg.itemsFacturas.length > 0
            ? reg.itemsFacturas
            : reg.facturaElectronica && reg.facturaElectronica.valor > 0
              ? Array.from({ length: reg.facturaElectronica.cantidadPersonas || 1 }, (_, i) => ({
                  item: i + 1, donante: 'ANÓNIMO', documento: '',
                  medio: 'FACTURA ELECTRÓNICA',
                  valor: Math.round(reg.facturaElectronica!.valor / (reg.facturaElectronica!.cantidadPersonas || 1)),
                  reciboN: '', observaciones: 'SIN OBSERVACIONES',
                }))
              : [];
          return (
            <div key={idx} style={{ pageBreakAfter: 'always' }}>
              <InformeConPanelEdicion
                registros={[reg]}
                itemsFacturas={facturas}
                firmasExternas={firmas}
                onNuevoInforme={() => setFechaImprimiendo(null)}
                onActualizarRegistros={() => {}}
              />
            </div>
          );
        })}

        {/* Última página: resumen de esa fecha */}
        <div style={{ pageBreakAfter: 'avoid' }} className="p-10 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-emerald-500">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <TrendingUp size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Resumen del Día</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest capitalize">
                {(() => { const [y,m,d] = fechaImprimiendo.split('-'); return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('es-CO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}); })()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total del Día', valor: `$${regsDelDia.reduce((s,r)=>s+r.donaciones.valor+(r.facturaElectronica?.valor||0),0).toLocaleString('es-CO')}`, color: 'text-emerald-600' },
              { label: 'Donaciones', valor: `$${regsDelDia.reduce((s,r)=>s+r.donaciones.valor,0).toLocaleString('es-CO')}`, color: 'text-slate-800' },
              { label: 'Facturas', valor: `$${regsDelDia.reduce((s,r)=>s+(r.facturaElectronica?.valor||0),0).toLocaleString('es-CO')}`, color: 'text-slate-800' },
              { label: 'Donantes', valor: `${regsDelDia.reduce((s,r)=>s+r.donaciones.cantidadDonantes,0)} pers.`, color: 'text-slate-800' },
            ].map((item,i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-2xl font-black ${item.color}`}>{item.valor}</p>
              </div>
            ))}
          </div>
          {regsDelDia.map((reg, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3 mb-2 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-700">{reg.ubicacion}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full">{reg.tipoParqueadero}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-slate-400">{reg.donaciones.cantidadDonantes} don.</span>
                <span className="text-sm font-black text-slate-800">${(reg.donaciones.valor+(reg.facturaElectronica?.valor||0)).toLocaleString('es-CO')}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setFechaImprimiendo(null)}
          className="fixed top-4 left-4 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-xl shadow-lg print:hidden font-bold transition-all active:scale-95"
        >
          Volver al Panel
        </button>
      </div>
    );
  }

  // Vista: Todos los informes en PDF (uno por registro + resumen al final)
  if (mostrarMultiplesInformes) {
    return (
      <div className="bg-white min-h-screen">
        {registros.map((reg, idx) => {
          const facturas = reg.itemsFacturas && reg.itemsFacturas.length > 0
            ? reg.itemsFacturas
            : reg.facturaElectronica && reg.facturaElectronica.valor > 0
              ? Array.from({ length: reg.facturaElectronica.cantidadPersonas || 1 }, (_, i) => ({
                  item: i + 1, donante: 'ANÓNIMO', documento: '',
                  medio: 'FACTURA ELECTRÓNICA',
                  valor: Math.round(reg.facturaElectronica!.valor / (reg.facturaElectronica!.cantidadPersonas || 1)),
                  reciboN: '', observaciones: 'SIN OBSERVACIONES',
                }))
              : [];
          return (
            <div key={idx} style={{ pageBreakAfter: 'always' }}>
              <InformeConPanelEdicion
                registros={[reg]}
                itemsFacturas={facturas}
                firmasExternas={firmas}
                onNuevoInforme={() => setMostrarMultiplesInformes(false)}
                onActualizarRegistros={() => {}}
              />
            </div>
          );
        })}

        {/* Última página: Resumen del día */}
        <div style={{ pageBreakAfter: 'avoid' }} className="p-10 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-emerald-500">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <TrendingUp size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Total Recaudado por Fecha</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {registros.length} registros · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Totales globales */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Gran Total', valor: registros.reduce((s, r) => s + r.donaciones.valor + (r.facturaElectronica?.valor || 0), 0), color: 'text-emerald-600' },
              { label: 'Donaciones', valor: registros.reduce((s, r) => s + r.donaciones.valor, 0), color: 'text-slate-800' },
              { label: 'Facturas', valor: registros.reduce((s, r) => s + (r.facturaElectronica?.valor || 0), 0), color: 'text-slate-800' },
              { label: 'Donantes', valor: registros.reduce((s, r) => s + r.donaciones.cantidadDonantes, 0), color: 'text-slate-800', sufijo: ' pers.' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-2xl font-black ${item.color}`}>
                  {item.label === 'Donantes' ? item.valor : `$${item.valor.toLocaleString('es-CO')}`}{item.sufijo || ''}
                </p>
              </div>
            ))}
          </div>

          {/* Desglose por fecha */}
          {(() => {
            const mapa: Record<string, RegistroDiario[]> = {};
            for (const reg of registros) {
              if (!mapa[reg.fecha]) mapa[reg.fecha] = [];
              mapa[reg.fecha].push(reg);
            }
            return Object.entries(mapa).sort(([a], [b]) => b.localeCompare(a)).map(([fecha, regs]) => {
              const [y, m, d] = fecha.split('-');
              const fechaStr = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
              const totalDia = regs.reduce((s, r) => s + r.donaciones.valor + (r.facturaElectronica?.valor || 0), 0);
              const totalDon = regs.reduce((s, r) => s + r.donaciones.valor, 0);
              const totalFact = regs.reduce((s, r) => s + (r.facturaElectronica?.valor || 0), 0);
              return (
                <div key={fecha} className="mb-6 border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 bg-slate-50">
                    <span className="text-sm font-black text-slate-700 capitalize">{fechaStr}</span>
                    <span className="text-lg font-black text-emerald-600">${totalDia.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-slate-50">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Donaciones</p><p className="font-black text-slate-800">${totalDon.toLocaleString('es-CO')}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Facturas</p><p className="font-black text-slate-800">${totalFact.toLocaleString('es-CO')}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Donantes</p><p className="font-black text-slate-800">{regs.reduce((s, r) => s + r.donaciones.cantidadDonantes, 0)} pers.</p></div>
                  </div>
                  {regs.map((reg, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-3 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-700">{reg.ubicacion}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full">{reg.tipoParqueadero}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] text-slate-400">{reg.donaciones.cantidadDonantes} don.</span>
                        <span className="text-sm font-black text-slate-800">${(reg.donaciones.valor + (reg.facturaElectronica?.valor || 0)).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
        </div>

        <button
          onClick={() => setMostrarMultiplesInformes(false)}
          className="fixed top-4 left-4 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-xl shadow-lg print:hidden font-bold transition-all active:scale-95"
        >
          Volver al Panel
        </button>
      </div>
    );
  }

  // Vista: Informe individual de un registro desde el card
  if (registroSeleccionado !== null && registros[registroSeleccionado]) {
    const reg = registros[registroSeleccionado];
    const facturas = reg.itemsFacturas && reg.itemsFacturas.length > 0
      ? reg.itemsFacturas
      : reg.facturaElectronica && reg.facturaElectronica.valor > 0
        ? Array.from({ length: reg.facturaElectronica.cantidadPersonas || 1 }, (_, i) => ({
            item: i + 1, donante: 'ANÓNIMO', documento: '',
            medio: 'FACTURA ELECTRÓNICA',
            valor: Math.round(reg.facturaElectronica!.valor / (reg.facturaElectronica!.cantidadPersonas || 1)),
            reciboN: '', observaciones: 'SIN OBSERVACIONES',
          }))
        : [];
    return (
      <DonacionesErrorBoundary key="informe-individual" onResetReal={() => setRegistroSeleccionado(null)}>
        <>
          <InformeConPanelEdicion
            registros={[reg]}
            itemsFacturas={facturas}
            firmasExternas={firmas}
            onNuevoInforme={() => setRegistroSeleccionado(null)}
            onActualizarRegistros={() => {}}
          />
          <BotonAccesoAdmin />
        </>
      </DonacionesErrorBoundary>
    );
  }

  // Vista: Informe (desde Generar Informe o historial)
  if (mostrarInforme && (registros.length > 0 || informeHistorial)) {
    const regsMostrar = informeHistorial ? informeHistorial.registros : registros;
    const factMostrar = regsMostrar.flatMap(r => {
      if (r.itemsFacturas && r.itemsFacturas.length > 0) return r.itemsFacturas;
      if (r.facturaElectronica && r.facturaElectronica.valor > 0) {
        const cantidad = r.facturaElectronica.cantidadPersonas || 1;
        const valorPorPersona = Math.round(r.facturaElectronica.valor / cantidad);
        return Array.from({ length: cantidad }, (_, i) => ({
          item: i + 1,
          donante: 'ANÓNIMO',
          documento: '',
          medio: 'FACTURA ELECTRÓNICA',
          valor: valorPorPersona,
          reciboN: '',
          observaciones: 'SIN OBSERVACIONES',
        }));
      }
      return [];
    });
    return (
      <DonacionesErrorBoundary
        key="informe"
        onResetReal={() => { setMostrarInforme(false); setInformeHistorial(null); }}
      >
        <>
          <InformeConPanelEdicion
            registros={regsMostrar}
            itemsFacturas={factMostrar}
            firmasExternas={firmas}
            onNuevoInforme={() => {
              setMostrarInforme(false);
              setInformeHistorial(null);
              if (!informeHistorial) handleNuevoInforme();
            }}
            onActualizarRegistros={() => {}}
          />
          <BotonAccesoAdmin />
        </>
      </DonacionesErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Toast de éxito */}
      {toastExito && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 animate-fade-in">
          {toastExito}
        </div>
      )}
      {/* Luces Ambientales Suaves - Reemplazan el fondo radial oscuro */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-100/30 blur-[120px] rounded-full -z-10 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-100/20 blur-[100px] rounded-full -z-10 translate-x-1/4 -translate-y-1/4"></div>

      {/* Navbar Minimalista */}
      <nav className="bg-white/60 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Image src="/LOGO.png" alt="Fundamiga Logo" fill className="object-contain p-1" priority />
            </div>
            <div>
              <span className="text-xl font-black text-slate-800 tracking-tight block leading-none">Fundamiga</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Control de Donaciones</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
            <CheckCircle size={14} className="text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">Sistema Operativo</span>
          </div>
        </div>
      </nav>

      {/* Modal del Importador */}
      {mostrarImportador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMostrarImportador(false)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <ImportadorExcel 
              onImport={handleImportarExcel} 
              onCancel={() => setMostrarImportador(false)} 
            />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-12 relative">
        {/* Page Header */}
        <div className="mb-12 relative">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1.5 w-10 bg-emerald-500 rounded-full shadow-sm shadow-emerald-100"></div>
              <div className="h-1.5 w-4 bg-yellow-400 rounded-full shadow-sm shadow-yellow-100"></div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">
              Control Diario de <span className="text-emerald-600">Donaciones</span>
            </h1>
          </div>
          <p className="text-slate-500 font-medium mt-4 text-lg max-w-2xl border-l-4 border-yellow-400 pl-6 leading-relaxed">
            Gestión administrativa y registro centralizado para el seguimiento de impacto social de la fundación.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Resumen del día en tiempo real */}
          <ResumenDia registros={registros} registroActual={registroActual} onEliminar={eliminarRegistro} onDescargarFecha={handleDescargarFecha} />

          {/* Contenedor Principal Formulario */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300">
            {/* Header del Formulario Interno */}
            <div className="group relative bg-white px-8 py-8 border-b border-gray-50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/20 via-transparent to-yellow-50/20"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-50 group-hover:border-yellow-400 group-hover:text-yellow-600 transition-all duration-500 transform group-hover:rotate-6">
                      <Plus size={24} strokeWidth={3} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nuevo Registro Diario</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-500 text-white rounded-md uppercase tracking-wider">Módulo de Ingreso</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validación de Fondos</span>
                    </div>
                  </div>
                </div>

                {/* Acciones Rápidas de Ingreso */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => setMostrarImportador(true)}
                    className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-400" />
                    Importar Plantilla Excel
                  </button>
                  <Link 
                    href="/convertidor"
                    className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-white border-2 border-blue-100 text-blue-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
                    A Plantilla Limpia
                  </Link>
                </div>
              </div>
            </div>

            {/* Espacio del Formulario */}
            <div className="p-8">
              <FormularioRegistro
                registroActual={registroActual}
                itemsFacturas={itemsFacturas}
                onInputChange={handleInputChange}
                onDonacionChange={handleDonacionChange}
                onFacturaChange={handleFacturaChange}
                onItemsFacturasChange={handleItemsFacturasChange}
                onFirmaChange={handleFirmaChange}
              />

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row gap-5 mt-12">
                <button
                  onClick={handleAgregarRegistro}
                  className="flex-[1.5] group relative bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-8 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 transition-all duration-300 active:scale-[0.98] overflow-hidden"
                >
                  <Plus size={22} strokeWidth={3} />
                  <span>Añadir Registro</span>
                </button>

                <button
                  onClick={handleGenerarInforme}
                  className="flex-1 group relative bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-4 px-8 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-yellow-50 transition-all duration-300 active:scale-[0.98] border-b-4 border-yellow-600"
                >
                  <FileText size={22} strokeWidth={3} />
                  <span>Generar Informe</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards de registros del día actual — se ocultan cuando hay un informe abierto */}
          {registros.length > 0 && registroSeleccionado === null && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-100">
                    <FileText size={24} className="text-yellow-900" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Registros del Día</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{registros.length} registro{registros.length !== 1 ? 's' : ''} agregado{registros.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (confirm('¿Estás seguro de que quieres limpiar toda la jornada actual?')) {
                          reiniciarFormulario();
                          mostrarToast('🗑️ Jornada limpiada correctamente');
                        }
                      }}
                      className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white py-3 px-6 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border border-red-100 shadow-sm"
                    >
                      <Trash2 size={16} />
                      Limpiar Todo
                    </button>
                    <button
                      onClick={handleDescargarPDFMultiple}
                      className="bg-white hover:bg-emerald-50 text-emerald-700 py-3 px-6 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border border-emerald-100 shadow-sm"
                    >
                      <Download size={16} />
                      Descargar Todo (PDF)
                    </button>
                    <button
                      onClick={handleDescargarExcel}
                      title="Exportar a Excel"
                      className="bg-white hover:bg-green-50 text-green-700 py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border border-green-100 shadow-sm"
                    >
                      <FileSpreadsheet size={16} />
                      Excel
                    </button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {registros.map((reg, index) => (
                  <div key={index} className="group bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-emerald-100/30 transition-all duration-500">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                        <FileText size={20} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">#{index + 1}</span>
                          <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">{reg.tipoParqueadero}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (!confirm('¿Eliminar este registro?')) return;
                            eliminarRegistro(index);
                          }}
                          className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          title="Eliminar registro"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-700 mb-1">{reg.ubicacion}</p>
                    <p className="text-[11px] font-bold text-slate-400 mb-4">{reg.donaciones.cantidadDonantes} donantes · {reg.fecha}</p>
                    <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
                      <span className="text-xl font-black text-slate-800">${(reg.donaciones.valor + (reg.facturaElectronica?.valor || 0)).toLocaleString('es-CO')}</span>
                    </div>
                    <button
                      onClick={() => setRegistroSeleccionado(index)}
                      className="w-full mt-4 bg-slate-900 text-white py-2.5 rounded-2xl text-xs font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                      Ver Detalles <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de días anteriores */}
          <HistorialDias
            historial={historial}
            onVerInforme={handleVerInformeHistorial}
            onEliminar={(id) => {
              if (!confirm('¿Eliminar esta jornada del historial?')) return;
              eliminarEntrada(id);
            }}
          />
        </div>
      </main>

      <BotonAccesoAdmin />
    </div>
  );
}