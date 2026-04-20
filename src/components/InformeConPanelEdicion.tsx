import React, { useState } from 'react';
import { FileText, Download, Edit, Save, X, ChevronRight, Trash2, Plus , Info,ChevronDown,User,CheckCircle2 , ShieldCheck, Printer} from 'lucide-react';
import { RegistroDiario, ItemTabla, ItemFactura, Firma } from '@/types';
import { useFirmas } from '@/hooks/useFirmas';
import { SearchableSelect } from '@/components/SearchableSelect';
import { generarItemsTabla, calcularTotalDonaciones, calcularTotalGeneral } from '@/utils/calculosInforme';
import DonacionesErrorBoundary from '@/components/DonacionesErrorBoundary';
import Image from 'next/image';
interface InformeConPanelEdicionProps {
  registros: RegistroDiario[];
  itemsFacturas: ItemFactura[];
  onNuevoInforme: () => void;
  onActualizarRegistros?: (registrosActualizados: RegistroDiario[], itemsActualizados: ItemTabla[], itemsFacturasActualizados: ItemFactura[]) => void;
  firmasExternas?: { trabajador?: Firma[], supervisor?: Firma[], responsable?: Firma[] };
}

type TabId = 'general' | 'donaciones' | 'facturas' | 'firmas';
type FirmaRol = 'trabajador' | 'supervisor' | 'responsable';

export const InformeConPanelEdicion: React.FC<InformeConPanelEdicionProps> = ({ 
  registros,
  itemsFacturas: itemsFacturasIniciales,
  onNuevoInforme,
  onActualizarRegistros,
  firmasExternas
}) => {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [registrosEditables, setRegistrosEditables] = useState<RegistroDiario[]>(registros);
  const [itemsEditables, setItemsEditables] = useState<ItemTabla[]>(generarItemsTabla(registros));
  const [itemsGuardados, setItemsGuardados] = useState<ItemTabla[]>(generarItemsTabla(registros));
  const [itemsFacturasEditables, setItemsFacturasEditables] = useState<ItemFactura[]>(itemsFacturasIniciales);
  const [itemsFacturasGuardados, setItemsFacturasGuardados] = useState<ItemFactura[]>(itemsFacturasIniciales);
  
  // Usar firmas externas si están disponibles, sino cargar del hook
  const { firmas: firmasDelHook } = useFirmas();
  const firmas: Record<FirmaRol, Firma[]> = {
    trabajador: firmasExternas?.trabajador ?? firmasDelHook.trabajador ?? [],
    supervisor: firmasExternas?.supervisor ?? firmasDelHook.supervisor ?? [],
    responsable: firmasExternas?.responsable ?? firmasDelHook.responsable ?? []
  };
  const tabs: TabId[] = ['general', 'donaciones', 'facturas', 'firmas'];
  const roles: Array<{ id: FirmaRol; label: string; icon: React.ReactNode }> = [
    { id: 'trabajador', label: 'Trabajador / Operador', icon: <User size={16} /> },
    { id: 'supervisor', label: 'Supervisor de Turno', icon: <ShieldCheck size={16} /> },
    { id: 'responsable', label: 'Responsable de Conteo', icon: <CheckCircle2 size={16} /> }
  ];
  const [tabActiva, setTabActiva] = useState<TabId>('general');

  // Usar items guardados cuando el panel está cerrado, items editables cuando está abierto
  const items = panelAbierto ? itemsEditables : itemsGuardados;
  const itemsFacturas = panelAbierto ? itemsFacturasEditables : itemsFacturasGuardados;
  
  const totalDonaciones = items.reduce((sum, item) => sum + item.valor, 0);
  const totalFacturas = itemsFacturas.reduce((sum, item) => sum + item.valor, 0);
  const totalTurno = totalDonaciones + totalFacturas;
  
  const primerRegistro = (panelAbierto ? registrosEditables : registros)[0];

  const handleAbrirPanel = () => {
    setRegistrosEditables([...registros]);
    setItemsEditables([...itemsGuardados]);
    setItemsFacturasEditables([...itemsFacturasGuardados]);
    setPanelAbierto(true);
  };

  const handleGuardarCambios = () => {
    // Validar si faltan firmas
    const faltanFirmas = !primerRegistro.firmas.trabajador || !primerRegistro.firmas.supervisor || !primerRegistro.firmas.responsable;
    
    if (faltanFirmas) {
      const confirmar = confirm('ADVERTENCIA: El informe no tiene todas las firmas requeridas (Trabajador, Supervisor y Responsable).\n\n¿Deseas guardar el informe de todos modos?');
      if (!confirmar) return;
    }

    setItemsGuardados([...itemsEditables]);
    setItemsFacturasGuardados([...itemsFacturasEditables]);
    
    if (onActualizarRegistros) {
      onActualizarRegistros(registrosEditables, itemsEditables, itemsFacturasEditables);
    }
    
    setPanelAbierto(false);
  };

  const handleCancelar = () => {
    setRegistrosEditables(registros);
    setItemsEditables([...itemsGuardados]);
    setItemsFacturasEditables([...itemsFacturasGuardados]);
    setPanelAbierto(false);
  };

  const handleActualizarRegistro = (index: number, campo: string, valor: any) => {
    setRegistrosEditables(prev => {
      const nuevos = [...prev];
      if (campo === 'fecha' || campo === 'ubicacion' || campo === 'tipoParqueadero') {
        nuevos[index] = { ...nuevos[index], [campo]: valor };
      } else if (campo === 'valorDonacion' || campo === 'cantidadDonantes') {
        const donaciones = { ...nuevos[index].donaciones };
        if (campo === 'valorDonacion') {
          donaciones.valor = Number(valor);
        } else {
          donaciones.cantidadDonantes = Number(valor);
        }
        nuevos[index] = { ...nuevos[index], donaciones };
      }
      return nuevos;
    });
  };

  const handleRegenerarTabla = () => {
    const nuevosItems = generarItemsTabla(registrosEditables);
    setItemsEditables(nuevosItems);
  };

  const handleActualizarItem = (index: number, campo: keyof ItemTabla, valor: any) => {
    setItemsEditables(prev => {
      const nuevos = [...prev];
      if (campo === 'valor') {
        nuevos[index] = { ...nuevos[index], [campo]: Number(valor) };
      } else {
        nuevos[index] = { ...nuevos[index], [campo]: valor };
      }
      return nuevos;
    });
  };

  const handleEliminarItem = (index: number) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      setItemsEditables(prev => {
        const nuevos = prev.filter((_, i) => i !== index);
        // Reordenar los números de item
        return nuevos.map((item, idx) => ({ ...item, item: idx + 1 }));
      });
    }
  };

  const handleAgregarItem = () => {
    const nuevoItem: ItemTabla = {
      item: itemsEditables.length + 1,
      donante: 'ANÓNIMO',
      documento: '',
      medio: 'EFECTIVO',
      valor: 0,
      reciboN: '',
      observaciones: 'SIN OBSERVACIONES'
    };
    setItemsEditables(prev => [...prev, nuevoItem]);
  };

  // Handlers para facturas electrónicas
  const handleActualizarItemFactura = (index: number, campo: keyof ItemFactura, valor: any) => {
    setItemsFacturasEditables(prev => {
      const nuevos = [...prev];
      if (campo === 'valor') {
        nuevos[index] = { ...nuevos[index], [campo]: Number(valor) };
      } else {
        nuevos[index] = { ...nuevos[index], [campo]: valor };
      }
      return nuevos;
    });
  };
  const handleErrorReset = () => {
  setItemsEditables([...itemsGuardados]);
  setRegistrosEditables([...registros]);
};
  const handleEliminarItemFactura = (index: number) => {
    if (confirm('¿Estás seguro de eliminar este registro de factura?')) {
      setItemsFacturasEditables(prev => {
        const nuevos = prev.filter((_, i) => i !== index);
        return nuevos.map((item, idx) => ({ ...item, item: idx + 1 }));
      });
    }
  };

  const handleAgregarItemFactura = () => {
    const nuevoItem: ItemFactura = {
      item: itemsFacturasEditables.length + 1,
      donante: 'ANÓNIMO',
      documento: '',
      medio: 'FACTURA ELECTRÓNICA',
      valor: 0,
      reciboN: '',
      observaciones: 'SIN OBSERVACIONES'
    };
    setItemsFacturasEditables(prev => [...prev, nuevoItem]);
  };

  const handleCambiarFirma = (tipo: 'trabajador' | 'supervisor' | 'responsable', nombreFirma: string) => {
    const firma = firmas[tipo]?.find(f => f.nombre === nombreFirma) || null;
    setRegistrosEditables(prev => {
      const nuevos = [...prev];
      nuevos[0] = {
        ...nuevos[0],
        firmas: { ...nuevos[0].firmas, [tipo]: firma }
      };
      return nuevos;
    });
  };

  return (
    
    <div className="min-h-screen bg-gray-50 relative">
      {/* Informe Principal */}
      <div className={`transition-all duration-300 ${panelAbierto ? 'mr-[600px]' : 'mr-0'}`}>
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white shadow-lg">
            {/* HEADER DEL INFORME */}
            <div className="bg-slate-900 text-white p-6 border-x-2 border-t-2 border-slate-900 rounded-t-xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <Image src="/LOGO.png" alt="Fundamiga Logo" fill className="object-contain p-1" priority />
                </div>
                {/* Un toque visual: Línea vertical de acento */}
                <div className="h-12 w-1.5 bg-amber-400 rounded-full"></div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">
                    Formato de Control Diario
                  </h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">
                    Sistema de Registro de Operaciones
                  </p>
                </div>
              </div>

              {/* Badge de ID o Número de Control sutil */}
              <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No. Registro:</span>
                <span className="ml-2 font-mono text-amber-400 text-sm">#{new Date().getTime().toString().slice(-6)}</span>
              </div>
            </div>

            {/* INFO GENERAL - Cuadrícula Técnica */}
            <div className="border-x-2 border-b-2 border-slate-900">
              <div className="grid grid-cols-3 bg-white">
                {/* Fecha */}
                <div className="p-4 border-r-2 border-slate-900 flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha de Operación</span>
                  <span className="font-bold text-slate-800 font-mono">{primerRegistro.fecha}</span>
                </div>

                {/* Ubicación */}
                <div className="p-4 border-r-2 border-slate-900 flex flex-col gap-1 col-span-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ubicaciones Asignadas</span>
                  <span className="font-bold text-slate-800 truncate">
                    {(panelAbierto ? registrosEditables : registros).map(r => r.ubicacion).join(', ')}
                  </span>
                </div>

                {/* Tipo */}
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Segmento / Vehículo</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <span className="text-lg leading-none">
                      {primerRegistro.tipoParqueadero === 'carros'}
                    </span>
                    <span className="font-black uppercase text-sm italic">
                      {primerRegistro.tipoParqueadero}
                    </span>
                  </div>
                </div>
              </div>

              {/* SUB-HEADER DONACIONES - Estilo Invertido */}
              <div className="bg-slate-100 p-3 text-center border-t-2 border-slate-900 flex items-center justify-center gap-4">
                <div className="h-[1px] w-20 bg-slate-300"></div>
                <h2 className="text-sm font-black uppercase tracking-[0.5em] text-slate-900">
                  Sección de Donaciones
                </h2>
                <div className="h-[1px] w-20 bg-slate-300"></div>
              </div>


              {/* TABLA */}
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black">
                    <th className="border-r border-black p-2 text-sm">ITEM</th>
                    <th className="border-r border-black p-2 text-sm">DONANTE</th>
                    <th className="border-r border-black p-2 text-sm">DOCUMENTO</th>
                    <th className="border-r border-black p-2 text-sm">MEDIO</th>
                    <th className="border-r border-black p-2 text-sm">VALOR</th>
                    <th className="border-r border-black p-2 text-sm">RECIBO N.</th>
                    <th className="p-2 text-sm">OBSERVACIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="border-r border-black p-2 text-center text-sm">{item.item}</td>
                      <td className="border-r border-black p-2 text-sm">{item.donante}</td>
                      <td className="border-r border-black p-2 text-center text-sm">{item.documento}</td>
                      <td className="border-r border-black p-2 text-center text-sm">{item.medio}</td>
                      <td className="border-r border-black p-2 text-right text-sm">${item.valor.toLocaleString()}</td>
                      <td className="border-r border-black p-2 text-center text-sm">{item.reciboN}</td>
                      <td className="p-2 text-sm">{item.observaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* TOTALES */}
              <div className="border-t-2 border-black p-4 bg-gray-50">
                <div className="flex justify-end gap-8 text-lg">
                  <div>
                    <span className="font-bold">Total Donaciones:</span> ${totalDonaciones.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-bold">Total Facturas:</span> ${totalFacturas.toLocaleString()}
                  </div>
                  <div className="text-xl">
                    <span className="font-bold">TOTAL DE TURNO:</span>{' '}
                    <span className="text-green-600">${totalTurno.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: FACTURAS ELECTRÓNICAS */}
              {itemsFacturas.length > 0 && (
                <div className="mt-0">
                  {/* Header de Sección: Estilo Corporativo Azul */}
                  <div className="bg-blue-800 p-3 text-center border-x-2 border-b-2 border-slate-900">
                    <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white">
                      Facturación Electrónica Registrada
                    </h2>
                  </div>

                  <table className="w-full border-x-2 border-b-2 border-slate-900 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900">
                        <th className="border-r border-slate-900 p-2 text-[10px] font-black uppercase tracking-tighter w-12 text-slate-500">Item</th>
                        <th className="border-r border-slate-900 p-2 text-[10px] font-black uppercase tracking-tighter text-left">Donante / Razón Social</th>
                        <th className="border-r border-slate-900 p-2 text-[10px] font-black uppercase tracking-tighter w-28">NIT / C.C.</th>
                        <th className="border-r border-slate-900 p-2 text-[10px] font-black uppercase tracking-tighter w-24">Medio Pago</th>
                        <th className="border-r border-slate-900 p-2 text-[10px] font-black uppercase tracking-tighter w-28 text-right px-4">Valor Total</th>
                        <th className="border-r border-slate-900 p-2 text-[10px] font-black uppercase tracking-tighter w-24">No. Factura</th>
                        <th className="p-2 text-[10px] font-black uppercase tracking-tighter text-left">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsFacturas.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-slate-200 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'
                          }`}
                        >
                          <td className="border-r border-slate-300 p-2 text-center text-[11px] font-mono text-slate-400">
                            {String(item.item).padStart(2, '0')}
                          </td>
                          <td className="border-r border-slate-300 p-2 text-[11px] font-bold text-slate-800 uppercase leading-tight">
                            {item.donante}
                          </td>
                          <td className="border-r border-slate-300 p-2 text-center text-[11px] font-mono text-slate-600">
                            {item.documento}
                          </td>
                          <td className="border-r border-slate-300 p-2 text-center text-[10px] font-black text-blue-700 uppercase">
                            {item.medio}
                          </td>
                          <td className="border-r border-slate-300 p-2 text-right text-[11px] font-mono font-bold text-slate-900 px-4">
                            $ {item.valor.toLocaleString()}
                          </td>
                          <td className="border-r border-slate-300 p-2 text-center text-[11px] font-bold text-blue-900 bg-blue-50/50 uppercase">
                            {item.reciboN}
                          </td>
                          <td className="p-2 text-[10px] text-slate-500 italic leading-tight">
                            {item.observaciones || '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Footer de Tabla: Totalización sutil */}
                    <tfoot>
                      <tr className="bg-slate-900 text-white border-t-2 border-slate-900">
                        <td colSpan={4} className="p-2 text-right text-[10px] font-black uppercase tracking-widest px-4">
                          Total Facturado:
                        </td>
                        <td className="p-2 text-right text-xs font-mono font-bold px-4 border-l border-slate-700">
                          $ {itemsFacturas.reduce((sum, item) => sum + item.valor, 0).toLocaleString()}
                        </td>
                        <td colSpan={2} className="bg-slate-800"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* FIRMAS */}
              <div className="border-t-2 border-black p-6">
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="h-24 flex items-center justify-center mb-2 border-b-2 border-black pb-2">
                      {(() => {
                        const firma = primerRegistro.firmas.trabajador;
                        if (!firma?.ruta) return (
                          <div className="flex flex-col items-center text-red-500 animate-pulse">
                            <ShieldCheck size={32} className="mb-1 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Firma Pendiente</span>
                          </div>
                        );
                        return (
                          <img 
                            src={firma.ruta} 
                            alt={firma.nombre}
                            crossOrigin="anonymous"
                            className="max-h-24 max-w-full object-contain"
                          />
                        );
                      })()}
                    </div>
                    <div className="pt-2">
                      
                      <div className="font-bold">TRABAJADOR</div>
                      <div className="font-bold">CARGO : Auxiliar de parqueo</div>
                      <div className="text-sm">{primerRegistro.firmas.trabajador?.nombre || ''}</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="h-24 flex items-center justify-center mb-2 border-b-2 border-black pb-2">
                      {(() => {
                        const firma = primerRegistro.firmas.supervisor;
                        if (!firma?.ruta) return (
                          <div className="flex flex-col items-center text-red-500 animate-pulse">
                            <ShieldCheck size={32} className="mb-1 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Firma Pendiente</span>
                          </div>
                        );
                        return (
                          <img 
                            src={firma.ruta} 
                            alt={firma.nombre}
                            crossOrigin="anonymous"
                            className="max-h-24 max-w-full object-contain"
                          />
                        );
                      })()}
                    </div>
                    <div className="pt-2">
                      
                      <div className="font-bold">SUPERVISOR</div>
                      <div className="font-bold">CARGO : Supervisor</div>
                      <div className="text-sm">{primerRegistro.firmas.supervisor?.nombre || ''}</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="h-24 flex items-center justify-center mb-2 border-b-2 border-black pb-2">
                      {(() => {
                        const firma = primerRegistro.firmas.responsable;
                        if (!firma?.ruta) return (
                          <div className="flex flex-col items-center text-red-500 animate-pulse">
                            <ShieldCheck size={32} className="mb-1 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Firma Pendiente</span>
                          </div>
                        );
                        return (
                          <img 
                            src={firma.ruta} 
                            alt={firma.nombre}
                            crossOrigin="anonymous"
                            className="max-h-24 max-w-full object-contain"
                          />
                        );
                      })()}
                    </div>
                    <div className="pt-2">
                      
                      <div className="font-bold">RESPONSABLE DE CONTEO</div>
                      <div className="font-bold">CARGO : Tesorera</div>
                      <div className="text-sm">{primerRegistro.firmas.responsable?.nombre || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BARRA DE ACCIONES FLOTANTE */}
            <div className="p-8 flex gap-4 justify-center print:hidden">
              {!panelAbierto && (
                <div className="flex gap-3 bg-white/80 backdrop-blur-md p-3 rounded-[2.5rem] border border-slate-200 shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in duration-500">

                  {/* Botón: Editar (Acento Amber) */}
                  <button
                    onClick={handleAbrirPanel}
                    className="group relative flex items-center gap-3 bg-amber-400 hover:bg-slate-900 text-slate-900 hover:text-white px-7 py-3.5 rounded-[1.8rem] transition-all duration-300 active:scale-95 shadow-md"
                  >
                    <Edit size={20} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-[12px] font-black uppercase tracking-tighter">
                      Editar Informe
                    </span>
                  </button>

                  {/* Botón: Nuevo (Acento Secundario Slate) */}
                  <button
                    onClick={onNuevoInforme}
                    className="group flex items-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-600 px-7 py-3.5 rounded-[1.8rem] transition-all duration-300 active:scale-95"
                  >
                    <Plus size={20} strokeWidth={2.5} />
                    <span className="text-[12px] font-black uppercase tracking-tighter">
                      Nuevo
                    </span>
                  </button>

                  {/* Divisor sutil */}
                  <div className="w-[1px] bg-slate-200 my-2 mx-1"></div>

                  {/* Botón: Imprimir/Descargar (Acento Monetario Emerald) */}
                  <button
                    onClick={() => window.print()}
                    className="group flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-[1.8rem] transition-all duration-300 active:scale-95 shadow-lg shadow-emerald-900/20"
                  >
                    <Printer size={20} strokeWidth={2.5} className="group-hover:-translate-y-0.5 transition-transform" />
                    <span className="text-[12px] font-black uppercase tracking-tighter">
                      Imprimir PDF
                    </span>
                  </button>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PANEL LATERAL DE EDICIÓN */}
      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl transform transition-transform duration-300 z-50 border-l border-slate-200 ${
          panelAbierto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del Panel - Estética Moderna */}
        <div className="bg-slate-900 text-white p-6 m-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icono con trazo fino (strokeWidth: 2) */}
              <Edit size={24} strokeWidth={2} className="text-amber-400" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter leading-none">
                  Editor de Informe
                </h2>
                <p className="text-slate-400 text-[11px] font-medium mt-1 uppercase tracking-widest">
                  Modifica los campos del informe
                </p>
              </div>
            </div>

            <button
              onClick={handleCancelar}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-800"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Tabs - Estética Moderno/App */}
        <div className="flex gap-2 p-2 mx-4 mb-4 bg-slate-50 rounded-2xl border border-slate-200">
          {tabs.map((id) => {
            const label = id.charAt(0).toUpperCase() + id.slice(1);
            return (
              <button
                key={id}
                onClick={() => setTabActiva(id)}
                className={`flex-1 py-2 px-3 text-[11px] font-black uppercase tracking-tighter transition-all duration-200 rounded-xl relative ${
                  tabActiva === id
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {id === 'firmas' && (!primerRegistro.firmas.trabajador || !primerRegistro.firmas.supervisor || !primerRegistro.firmas.responsable) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-bounce shadow-sm"></span>
                )}
                <span className={tabActiva === id ? 'border-b-2 border-amber-400 pb-0.5' : ''}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contenido del Panel - Scrollable */}
        <div className="overflow-y-auto h-[calc(100vh-280px)] px-4 py-2 custom-scrollbar">

          {/* TAB: GENERAL */}
          {tabActiva === 'general' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* Grupo: Información Básica */}
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">

                {/* Campo: Fecha */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-500 ml-1">
                    Fecha de Control
                  </label>
                  <input
                    type="date"
                    value={primerRegistro.fecha}
                    onChange={(e) => handleActualizarRegistro(0, 'fecha', e.target.value)}
                    className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all outline-none"
                  />
                </div>

                {/* Campo: Tipo de Parqueadero */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-500 ml-1">
                    Tipo de Parqueadero
                  </label>
                  <select
                    value={primerRegistro.tipoParqueadero}
                    onChange={(e) => handleActualizarRegistro(0, 'tipoParqueadero', e.target.value)}
                    className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="carros"> Carros</option>
                    <option value="motos"> Motos</option>
                  </select>
                </div>
              </div>

              {/* Grupo: Ubicaciones */}
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-slate-500 ml-1">
                  Ubicaciones del Turno
                </label>
                <div className="space-y-2">
                  {registrosEditables.map((reg, idx) => (
                    <div key={idx} className="group relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                      <select
                        value={reg.ubicacion}
                        onChange={(e) => handleActualizarRegistro(idx, 'ubicacion', e.target.value)}
                        className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none appearance-none cursor-pointer group-focus-within:border-emerald-500"
                      >
                        <option value="" disabled>
                          Seleccionar...
                        </option>
                        <option value="2da con 10"> 2da con 10</option>
                        <option value="5ta con 6ta"> 5ta con 6ta</option>
                        <option value="6ta con 6ta"> 6ta con 6ta</option>
                        <option value="Bolivar"> Bolivar</option>
                        <option value="Carton Colombia"> Carton Colombia</option>
                        <option value="Guacanda"> Guacanda</option>
                        <option value="Galeria"> Galeria</option>
                        <option value="Guabinas"> Guabinas</option>
                        <option value="Mayorista"> Mayorista</option>
                        <option value="Rozo"> Rozo</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}


          {/* TAB: DONACIONES */}
          {tabActiva === 'donaciones' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* SECCIÓN A: RESUMEN POR UBICACIÓN */}
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4 px-1">
                  <div>
                    <h3 className="font-black uppercase tracking-tighter text-slate-900 text-sm">
                      Donaciones por Ubicación
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Totales acumulados</p>
                  </div>
                  <button
                    onClick={handleRegenerarTabla}
                    className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:bg-amber-400 hover:text-white transition-all"
                  >
                    Regenerar Tabla
                  </button>
                </div>

                <div className="space-y-3">
                  {registrosEditables.map((reg, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">
                        📍 {reg.ubicacion}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">Valor Total ($)</label>
                          <input
                            type="number"
                            value={reg.donaciones.valor}
                            onChange={(e) => handleActualizarRegistro(idx, 'valorDonacion', e.target.value)}
                            className="w-full p-2.5 bg-white border-none rounded-xl text-sm font-mono font-bold text-emerald-600 focus:ring-2 focus:ring-amber-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">Donantes</label>
                          <input
                            type="number"
                            value={reg.donaciones.cantidadDonantes}
                            onChange={(e) => handleActualizarRegistro(idx, 'cantidadDonantes', e.target.value)}
                            className="w-full p-2.5 bg-white border-none rounded-xl text-sm font-mono font-bold text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECCIÓN B: REGISTROS INDIVIDUALES */}
              <div className="bg-slate-900 p-5 rounded-3xl shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-black uppercase tracking-tighter text-white text-sm">
                      Registros Individuales
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Detalle de donantes</p>
                  </div>
                  <button
                    onClick={handleAgregarItem}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-all flex items-center gap-2 px-4"
                  >
                    <Plus size={18} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Agregar</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {itemsEditables.map((item, idx) => {
                    const fields = [
                      { label: 'Donante', val: item.donante, key: 'donante', type: 'text' },
                      { label: 'Documento', val: item.documento, key: 'documento', type: 'text' },
                      { label: 'Medio', val: item.medio, key: 'medio', type: 'text' },
                      { label: 'Valor ($)', val: item.valor, key: 'valor', type: 'number', color: 'text-emerald-400' },
                      { label: 'Recibo N.', val: item.reciboN, key: 'reciboN', type: 'text' },
                      { label: 'Observaciones', val: item.observaciones, key: 'observaciones', type: 'text', full: true }
                    ] satisfies Array<{
                      label: string;
                      val: string | number;
                      key: keyof ItemTabla;
                      type: 'text' | 'number';
                      color?: string;
                      full?: boolean;
                    }>;

                    return (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all relative group">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md uppercase">
                            Item #{item.item}
                          </span>
                          <button
                            onClick={() => handleEliminarItem(idx)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          {fields.map((field) => (
                            <div key={field.key} className={field.full ? 'col-span-2' : ''}>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">{field.label}</label>
                              <input
                                type={field.type}
                                value={field.val}
                                onChange={(e) => handleActualizarItem(idx, field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                className={`w-full p-2 bg-slate-900/50 border border-white/10 rounded-xl text-[12px] font-semibold text-white focus:ring-1 focus:ring-amber-400 outline-none transition-all ${field.color || ''}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: FACTURAS */}
          {tabActiva === 'facturas' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* Header de Sección */}
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="font-black uppercase tracking-tighter text-slate-900 text-sm">
                    Facturas Electrónicas
                  </h3>
                  <p className="text-[10px] text-blue-800 font-bold uppercase tracking-widest">
                    {itemsFacturasEditables.length} Documentos registrados
                  </p>
                </div>
                <button
                  onClick={handleAgregarItemFactura}
                  className="bg-blue-800 hover:bg-blue-700 text-white p-2 rounded-xl transition-all flex items-center gap-2 px-4 shadow-md"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Agregar</span>
                </button>
              </div>

              {itemsFacturasEditables.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl py-12 text-center">
                  <div className="bg-slate-200 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText size={24} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-bold text-sm uppercase tracking-tighter">No hay registros</p>
                  <p className="text-[10px] text-slate-400 font-medium px-8 mt-1">
                    Las facturas agregadas aquí aparecerán automáticamente en la sección oficial del informe.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {itemsFacturasEditables.map((item, idx) => {
                    const fields = [
                      { label: 'Donante / Razón Social', val: item.donante, key: 'donante', type: 'text' },
                      { label: 'NIT / Documento', val: item.documento, key: 'documento', type: 'text' },
                      { label: 'Medio de Pago', val: item.medio, key: 'medio', type: 'text' },
                      { label: 'Valor ($)', val: item.valor, key: 'valor', type: 'number', color: 'text-blue-800 font-black' },
                      { label: 'Número de Factura', val: item.reciboN, key: 'reciboN', type: 'text' },
                      { label: 'Observaciones Adicionales', val: item.observaciones, key: 'observaciones', type: 'text', full: true }
                    ] satisfies Array<{
                      label: string;
                      val: string | number;
                      key: keyof ItemFactura;
                      type: 'text' | 'number';
                      color?: string;
                      full?: boolean;
                    }>;

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-800 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
                              Factura #{item.item}
                            </span>
                            <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">Ref: {item.reciboN || '---'}</span>
                          </div>
                          <button
                            onClick={() => handleEliminarItemFactura(idx)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={18} strokeWidth={2} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          {fields.map((field) => (
                            <div key={field.key} className={field.full ? 'col-span-2' : ''}>
                              <label className="block text-[9px] font-black text-slate-400 mb-1 ml-1 uppercase tracking-tighter">
                                {field.label}
                              </label>
                              <input
                                type={field.type}
                                value={field.val}
                                onChange={(e) => handleActualizarItemFactura(idx, field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                className={`w-full p-3 bg-slate-50 border-none rounded-2xl text-[12px] font-semibold text-slate-700 focus:ring-2 focus:ring-blue-800/20 focus:bg-white outline-none transition-all ${field.color || ''}`}
                                placeholder="..."
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* TAB: FIRMAS */}
          {tabActiva === 'firmas' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-black uppercase tracking-tighter text-slate-900 text-sm mb-5 px-1">
                  Validación del Informe
                </h3>

                <div className="space-y-6">
                  {roles.map((rol) => (
                    <div key={rol.id} className="relative group">
                      <SearchableSelect
                        label={rol.label}
                        value={primerRegistro.firmas[rol.id]?.nombre || ''}
                        onChange={(val) => handleCambiarFirma(rol.id as any, val)}
                        options={(firmas[rol.id] || []).map(f => f.nombre)}
                        placeholder={`Buscar ${rol.label.toLowerCase()}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota informativa técnica */}
              <div className="mx-2 p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                <div className="flex gap-3 items-start text-slate-400">
                  <Info size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <p className="text-[10px] font-medium leading-relaxed uppercase tracking-tight">
                    La selección de personal en esta sección adjunta automáticamente la <span className="text-white font-bold">firma digital</span> y el sello correspondiente en el documento final generado.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
        {/* Footer con Botones - Estilo Cápsula Moderna */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent">
          <div className="flex gap-3 bg-slate-900 p-2 rounded-[2rem] shadow-2xl border border-slate-800">
            <button
              onClick={handleGuardarCambios}
              className="flex-[2.5] bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-6 rounded-[1.5rem] font-black uppercase tracking-tighter text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
            >
              <Save size={20} strokeWidth={2.5} />
              Guardar Cambios
            </button>
            
            <button
              onClick={handleCancelar}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-4 px-6 rounded-[1.5rem] font-black uppercase tracking-tighter text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <X size={18} strokeWidth={2.5} />
              Cerrar
            </button>
          </div>
        </div>
      </div> {/* Cierre del Panel Lateral */}

      {/* Overlay - Efecto Glassmorphism */}
      {panelAbierto && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-all duration-500"
          onClick={handleCancelar}
        />
      )}
    </div>
  
  );
};