import { useState, useEffect } from 'react';
import { RegistroDiario } from '@/types';

export interface EntradaHistorial {
  id: string;
  fecha: string;
  registros: RegistroDiario[];
  totalDonaciones: number;
  totalFacturas: number;
  totalGeneral: number;
  guardadoEn: string;
}

const STORAGE_KEY = 'fundamiga_historial';

function cargar(): EntradaHistorial[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: EntradaHistorial[] = JSON.parse(raw);
    const seenIds = new Set<string>();
    return parsed.map((item, idx) => {
      let id = item.id || `${Date.now()}_${idx}`;
      if (seenIds.has(id)) {
        id = `${id}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      }
      seenIds.add(id);
      return { ...item, id };
    });
  } catch {
    return [];
  }
}

export const useHistorial = () => {
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setHistorial(cargar());
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historial));
  }, [historial, hidratado]);

  const crearEntrada = (registros: RegistroDiario[]): EntradaHistorial => {
    const fecha = registros[0]?.fecha ?? new Date().toISOString().split('T')[0];
    const totalDonaciones = registros.reduce((s, r) => s + r.donaciones.valor, 0);
    const totalFacturas = registros.reduce((s, r) => {
      const itemsValor = (r.itemsFacturas ?? []).reduce((sf, f) => sf + f.valor, 0);
      return s + (itemsValor || r.facturaElectronica?.valor || 0);
    }, 0);

    return {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      fecha,
      registros,
      totalDonaciones,
      totalFacturas,
      totalGeneral: totalDonaciones + totalFacturas,
      guardadoEn: new Date().toISOString(),
    };
  };

  const guardarEnHistorial = (registros: RegistroDiario[]): EntradaHistorial => {
    const entrada = crearEntrada(registros);
    setHistorial(prev => [entrada, ...prev]);
    return entrada;
  };

  const guardarMultiplesEnHistorial = (gruposDeRegistros: RegistroDiario[][]): EntradaHistorial[] => {
    const nuevasEntradas = gruposDeRegistros.map(regs => crearEntrada(regs));
    setHistorial(prev => [...nuevasEntradas, ...prev]);
    return nuevasEntradas;
  };

  const eliminarEntrada = (id: string) => {
    setHistorial(prev => prev.filter(e => e.id !== id));
  };

  const limpiarHistorial = () => {
    setHistorial([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { historial, guardarEnHistorial, guardarMultiplesEnHistorial, eliminarEntrada, limpiarHistorial };
};
