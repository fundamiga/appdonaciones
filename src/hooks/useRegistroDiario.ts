import { useState, useEffect } from 'react';
import { RegistroDiario, Donacion, Firma, FacturaElectronica, ItemFactura } from '@/types';

const STORAGE_KEY_REGISTROS = 'fundamiga_registros';
const STORAGE_KEY_ITEMS_FACTURAS = 'fundamiga_items_facturas';
const STORAGE_KEY_REGISTRO_ACTUAL = 'fundamiga_registro_actual';

const fechaHoy = () => new Date().toISOString().split('T')[0];

const registroVacio = (): RegistroDiario => ({
  fecha: fechaHoy(),
  ubicacion: '',
  tipoParqueadero: 'carros',
  donaciones: { valor: 0, cantidadDonantes: 0 },
  facturaElectronica: { valor: 0, cantidadPersonas: 0 },
  firmas: { trabajador: null, supervisor: null, responsable: null }
});

function cargarDeStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const useRegistroDiario = () => {
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [itemsFacturas, setItemsFacturas] = useState<ItemFactura[]>([]);
  const [registroActual, setRegistroActual] = useState<RegistroDiario>(registroVacio());
  const [hidratado, setHidratado] = useState(false);

  // Cargar desde localStorage solo en el cliente (evita error de hidratación SSR)
  useEffect(() => {
    setRegistros(cargarDeStorage(STORAGE_KEY_REGISTROS, []));
    setItemsFacturas(cargarDeStorage(STORAGE_KEY_ITEMS_FACTURAS, []));
    setRegistroActual(cargarDeStorage(STORAGE_KEY_REGISTRO_ACTUAL, registroVacio()));
    setHidratado(true);
  }, []);

  // Persistir en localStorage solo después de hidratar
  useEffect(() => {
    if (!hidratado) return;
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(registros));
  }, [registros, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    localStorage.setItem(STORAGE_KEY_ITEMS_FACTURAS, JSON.stringify(itemsFacturas));
  }, [itemsFacturas, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    localStorage.setItem(STORAGE_KEY_REGISTRO_ACTUAL, JSON.stringify(registroActual));
  }, [registroActual, hidratado]);

  const handleInputChange = (field: keyof RegistroDiario, value: any) => {
    setRegistroActual(prev => ({ ...prev, [field]: value }));
  };

  const handleDonacionChange = (field: keyof Donacion, value: number) => {
    setRegistroActual(prev => ({
      ...prev,
      donaciones: { ...prev.donaciones, [field]: value }
    }));
  };

  const handleFacturaChange = (field: keyof FacturaElectronica, value: number) => {
    setRegistroActual(prev => ({
      ...prev,
      facturaElectronica: { ...prev.facturaElectronica!, [field]: value }
    }));
  };

  const handleItemsFacturasChange = (items: ItemFactura[]) => {
    setItemsFacturas(items);
  };

  // CORREGIDO: Ahora recibe directamente el objeto Firma
  const handleFirmaChange = (
    tipo: 'trabajador' | 'supervisor' | 'responsable', 
    firma: Firma | null
  ) => {
    setRegistroActual(prev => ({
      ...prev,
      firmas: { ...prev.firmas, [tipo]: firma }
    }));
  };

  const agregarRegistro = (): boolean => {
    if (!registroActual.ubicacion || 
        registroActual.donaciones.valor <= 0 || 
        registroActual.donaciones.cantidadDonantes <= 0) {
      return false;
    }

    // Guardar los itemsFacturas dentro del registro
    const registroConFacturas = { ...registroActual, itemsFacturas };
    setRegistros(prev => [...prev, registroConFacturas]);

    // Limpiar itemsFacturas para el siguiente registro
    setItemsFacturas([]);
    
    setRegistroActual({
      fecha: registroActual.fecha,
      ubicacion: '',
      tipoParqueadero: registroActual.tipoParqueadero,
      donaciones: { valor: 0, cantidadDonantes: 0 },
      facturaElectronica: { valor: 0, cantidadPersonas: 0 },
      firmas: registroActual.firmas,
    });

    return true;
  };

  const eliminarRegistro = (index: number) => {
    setRegistros(prev => prev.filter((_, i) => i !== index));
  };

  const importarRegistros = (nuevos: RegistroDiario[]) => {
    setRegistros(prev => [...prev, ...nuevos]);
  };

  const reiniciarFormulario = () => {
    const vacio = registroVacio();
    setRegistros([]);
    setItemsFacturas([]);
    setRegistroActual(vacio);
    localStorage.removeItem(STORAGE_KEY_REGISTROS);
    localStorage.removeItem(STORAGE_KEY_ITEMS_FACTURAS);
    localStorage.removeItem(STORAGE_KEY_REGISTRO_ACTUAL);
  };

  return {
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
  };
};