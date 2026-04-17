import { useState, useEffect } from 'react';
import { Firma } from '@/types';
import { FirmaService } from '@/services/firmaService';

interface UseFirmasReturn {
  firmas: Record<string, Firma[]>;
  loading: boolean;
  error: string | null;
  recargarFirmas: () => Promise<void>;
}

export const useFirmas = (): UseFirmasReturn => {
  const [firmas, setFirmas] = useState<Record<string, Firma[]>>({
    trabajador: [],
    supervisor: [],
    responsable: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarFirmas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const firmasCargadas = await FirmaService.cargarTodasLasFirmas();
      setFirmas(firmasCargadas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las firmas';
      setError(errorMessage);
      console.error('Error en useFirmas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFirmas();
  }, []);

  return { 
    firmas, 
    loading, 
    error,
    recargarFirmas: cargarFirmas
  };
};
