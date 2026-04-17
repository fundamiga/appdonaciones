import React from 'react';
import { RegistroDiario, Donacion, Firma, FacturaElectronica, ItemFactura } from '@/types';
import { useFirmas } from '@/hooks/use-firmas';
import { useDonacionesValidation } from '@/hooks/usedonacionesvalidation';
import ValidationMessage from '@/components/ValidationMessage';
import { calcularValorPorDonante } from '@/utils/calculosInforme';
import { SeccionFacturasElectronicas } from '@/components/SeccionFacturasElectronicas';
import { SearchableSelect } from '@/components/SearchableSelect';

interface FormularioRegistroProps {
  registroActual: RegistroDiario;
  itemsFacturas: ItemFactura[];
  onInputChange: (field: keyof RegistroDiario, value: any) => void;
  onDonacionChange: (field: keyof Donacion, value: number) => void;
  onFacturaChange: (field: keyof FacturaElectronica, value: number) => void;
  onItemsFacturasChange: (items: ItemFactura[]) => void;
  onFirmaChange: (tipo: 'trabajador' | 'supervisor' | 'responsable', firma: Firma | null) => void;
}

export const FormularioRegistro: React.FC<FormularioRegistroProps> = ({
  registroActual,
  itemsFacturas,
  onInputChange,
  onDonacionChange,
  onFacturaChange,
  onItemsFacturasChange,
  onFirmaChange
}) => {
  const { firmas, loading, error } = useFirmas();

  // Hook de validación en tiempo real
  const validation = useDonacionesValidation(
    registroActual.donaciones.valor || 0,
    registroActual.donaciones.cantidadDonantes || 0,
    registroActual.tipoParqueadero
  );

  // Handler para cambio de firma desde el select
  const handleSelectFirma = (
    tipo: 'trabajador' | 'supervisor' | 'responsable',
    nombreFirma: string
  ) => {
    const firma = firmas[tipo]?.find(f => f.nombre === nombreFirma) || null;
    onFirmaChange(tipo, firma);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando firmas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">❌ Error: {error}</p>
        <p className="text-sm text-red-500 mt-2">
          Verifica tu configuración de Cloudinary
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fecha, Ubicación y Tipo de Parqueadero - GRID 3 COLUMNAS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative mb-6">
      {/* Detalle estético Emerald */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
      
      <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
        <span className="p-1.5 bg-emerald-50 rounded-md">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </span>
        Datos Generales del Registro
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fecha */}
        <div className="group">
          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 group-focus-within:text-emerald-600 transition-colors">
            Fecha del Reporte
          </label>
          <div className="relative">
            <input
              type="date"
              value={registroActual.fecha}
              onChange={(e) => onInputChange('fecha', e.target.value)}
              className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Nombre del Parqueadero */}
        <div className="group">
          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 group-focus-within:text-emerald-600 transition-colors">
            Nombre del Parqueadero
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <select
              value={registroActual.ubicacion}
              onChange={(e) => onInputChange('ubicacion', e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none appearance-none cursor-pointer"
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
          </div>
        </div>

        {/* Tipo de Parqueadero */}
        <div className="group">
          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 group-focus-within:text-emerald-600 transition-colors">
            Tipo de Vehículo
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {registroActual.tipoParqueadero === 'carros' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </span>
            <select
              value={registroActual.tipoParqueadero}
              onChange={(e) => onInputChange('tipoParqueadero', e.target.value as 'carros' | 'motos')}
              className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="carros"> Carros</option>
              <option value="motos"> Motos</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Donaciones - CON VALIDACIÓN */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
      {/* Barra lateral decorativa Emerald */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>

      <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
        <span className="p-1.5 bg-emerald-50 rounded-md">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        Información de Donaciones
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Valor Total */}
        <div className="group">
          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 group-focus-within:text-emerald-600 transition-colors">
            Valor Total de Donaciones
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
            <input
              type="number"
              placeholder="0"
              step="50"
              value={registroActual.donaciones.valor || ''}
              onChange={(e) => onDonacionChange('valor', Number(e.target.value))}
              className={`w-full pl-8 pr-4 py-3 bg-gray-50 border rounded-xl text-gray-700 font-medium focus:bg-white focus:ring-4 transition-all outline-none ${
                validation.error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-50'
                  : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-50'
              }`}
            />
          </div>
        </div>

        {/* Cantidad de Donantes */}
        <div className="group">
          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 group-focus-within:text-emerald-600 transition-colors">
            Cantidad de Donantes
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <input
              type="number"
              placeholder="0"
              min="1"
              value={registroActual.donaciones.cantidadDonantes || ''}
              onChange={(e) => onDonacionChange('cantidadDonantes', Number(e.target.value))}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Mensajes de validación en tiempo real */}
      {validation.error && (
        <div className="mt-4">
          <ValidationMessage
            type="error"
            message={validation.error}
            suggestion={validation.suggestion}
          />
        </div>
      )}

      {validation.warning && !validation.error && (
        <div className="mt-4">
          <ValidationMessage
            type="info"
            message={validation.warning}
          />
        </div>
      )}
    </div>

      {/* Valor Adicional - Facturas Electrónicas */}
      <SeccionFacturasElectronicas
        facturaElectronica={registroActual.facturaElectronica!}
        itemsFacturas={itemsFacturas}
        onFacturaChange={onFacturaChange}
        onItemsChange={onItemsFacturasChange}
      />

      {/* Firmas */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
      {/* Detalle estético: barra lateral Emerald */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>

      <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
        <span className="p-1.5 bg-emerald-50 rounded-md">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </span>
        Firmas de Respaldo
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trabajador */}
        <SearchableSelect
          label="Trabajador"
          value={registroActual.firmas.trabajador?.nombre || ''}
          onChange={(val) => handleSelectFirma('trabajador', val)}
          options={firmas.trabajador.map(f => f.nombre)}
          placeholder="Buscar trabajador..."
        />

        {/* Supervisor */}
        <SearchableSelect
          label="Supervisor"
          value={registroActual.firmas.supervisor?.nombre || ''}
          onChange={(val) => handleSelectFirma('supervisor', val)}
          options={firmas.supervisor.map(f => f.nombre)}
          placeholder="Buscar supervisor..."
        />

        {/* Responsable de Conteo */}
        <SearchableSelect
          label="Responsable de Conteo"
          value={registroActual.firmas.responsable?.nombre || ''}
          onChange={(val) => handleSelectFirma('responsable', val)}
          options={firmas.responsable.map(f => f.nombre)}
          placeholder="Buscar responsable..."
        />
      </div>
    </div>
    </div>
  );
};