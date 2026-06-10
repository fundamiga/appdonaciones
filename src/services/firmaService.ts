import { Firma } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN: controla qué base de datos usar
//   'auto'       → Cloudinary primero, si falla usa Supabase automáticamente ✅
//   'cloudinary' → solo Cloudinary
//   'supabase'   → solo Supabase
// Cambia NEXT_PUBLIC_FUENTE_FIRMAS en .env.local para elegir
// ─────────────────────────────────────────────────────────────────────────────
const FUENTE_FIRMAS: 'cloudinary' | 'supabase' | 'auto' =
  (process.env.NEXT_PUBLIC_FUENTE_FIRMAS as 'cloudinary' | 'supabase' | 'auto') || 'auto';

async function fetchFirmasDe(
  fuente: 'cloudinary' | 'supabase',
  tipo: 'trabajador' | 'supervisor' | 'responsable'
): Promise<Firma[]> {
  const base = fuente === 'cloudinary' ? '/api/cloudinary' : '/api/supabase';
  const response = await fetch(`${base}/list?tipo=${tipo}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Error al obtener firmas desde ${fuente}`);
  return data.firmas.map((firma: { nombre: string; url: string; publicId: string }) => ({
    nombre: firma.nombre,
    tipo,
    ruta: firma.url,
    publicId: firma.publicId,
  }));
}

async function subirFirmaA(
  fuente: 'cloudinary' | 'supabase',
  file: File,
  tipo: 'trabajador' | 'supervisor' | 'responsable',
  nombre: string
): Promise<boolean> {
  const base = fuente === 'cloudinary' ? '/api/cloudinary' : '/api/supabase';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tipo', tipo);
  formData.append('nombre', nombre);
  const response = await fetch(`${base}/upload`, { method: 'POST', body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Error al subir firma a ${fuente}`);
  return true;
}

async function eliminarFirmaEn(
  fuente: 'cloudinary' | 'supabase',
  publicId: string
): Promise<boolean> {
  const base = fuente === 'cloudinary' ? '/api/cloudinary' : '/api/supabase';
  const response = await fetch(`${base}/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Error al eliminar firma en ${fuente}`);
  return true;
}

export class FirmaService {
  static async obtenerFirmasPorTipo(
    tipo: 'trabajador' | 'supervisor' | 'responsable'
  ): Promise<Firma[]> {
    if (FUENTE_FIRMAS === 'cloudinary') {
      return fetchFirmasDe('cloudinary', tipo).catch(err => {
        console.error(`[FirmaService] Cloudinary falló para ${tipo}:`, err.message);
        return [];
      });
    }
    if (FUENTE_FIRMAS === 'supabase') {
      return fetchFirmasDe('supabase', tipo).catch(err => {
        console.error(`[FirmaService] Supabase falló para ${tipo}:`, err.message);
        return [];
      });
    }
    // Modo AUTO: Cloudinary primero, Supabase como respaldo
    try {
      const firmas = await fetchFirmasDe('cloudinary', tipo);
      console.log(`[FirmaService] ✅ Cloudinary OK para ${tipo}`);
      return firmas;
    } catch (errCloudinary) {
      console.warn(`[FirmaService] ⚠️ Cloudinary falló para ${tipo}, usando Supabase:`, (errCloudinary as Error).message);
      try {
        const firmas = await fetchFirmasDe('supabase', tipo);
        console.log(`[FirmaService] ✅ Supabase OK para ${tipo}`);
        return firmas;
      } catch (errSupabase) {
        console.error(`[FirmaService] ❌ Supabase también falló para ${tipo}:`, (errSupabase as Error).message);
        return [];
      }
    }
  }

  static async cargarTodasLasFirmas(): Promise<Record<string, Firma[]>> {
    try {
      const [trabajadores, supervisores, responsables] = await Promise.all([
        this.obtenerFirmasPorTipo('trabajador'),
        this.obtenerFirmasPorTipo('supervisor'),
        this.obtenerFirmasPorTipo('responsable'),
      ]);
      return { trabajador: trabajadores, supervisor: supervisores, responsable: responsables };
    } catch (error) {
      console.error('[FirmaService] Error al cargar todas las firmas:', error);
      return { trabajador: [], supervisor: [], responsable: [] };
    }
  }

  // Al subir en modo AUTO guarda en AMBOS servicios para mantener sincronización
  static async subirFirma(
    file: File,
    tipo: 'trabajador' | 'supervisor' | 'responsable',
    nombre: string
  ): Promise<boolean> {
    if (FUENTE_FIRMAS === 'cloudinary') {
      return subirFirmaA('cloudinary', file, tipo, nombre).catch(() => false);
    }
    if (FUENTE_FIRMAS === 'supabase') {
      return subirFirmaA('supabase', file, tipo, nombre).catch(() => false);
    }
    // AUTO: sube a los dos
    const resultados = await Promise.allSettled([
      subirFirmaA('cloudinary', file, tipo, nombre),
      subirFirmaA('supabase', file, tipo, nombre),
    ]);
    const cloudOk = resultados[0].status === 'fulfilled';
    const supOk = resultados[1].status === 'fulfilled';
    if (!cloudOk) console.warn('[FirmaService] ⚠️ No se pudo subir a Cloudinary');
    if (!supOk) console.warn('[FirmaService] ⚠️ No se pudo subir a Supabase');
    return cloudOk || supOk;
  }

  static async eliminarFirma(publicId: string): Promise<boolean> {
    const esCloudinary = publicId.startsWith('firmas/');
    if (FUENTE_FIRMAS === 'cloudinary' || (FUENTE_FIRMAS === 'auto' && esCloudinary)) {
      return eliminarFirmaEn('cloudinary', publicId).catch(() => false);
    }
    return eliminarFirmaEn('supabase', publicId).catch(() => false);
  }

  static async renombrarFirma(publicId: string, nuevoNombre: string, tipo: string): Promise<boolean> {
    try {
      const response = await fetch('/api/cloudinary/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, nuevoNombre, tipo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al renombrar firma');
      return true;
    } catch (error) {
      console.error('[FirmaService] Error al renombrar firma:', error);
      return false;
    }
  }

  // Copia todas las firmas de Cloudinary a Supabase (sincronización inicial)
  // Usa endpoint backend para evitar fallos de fetch/CORS desde el navegador al descargar imágenes externas.
  static async sincronizarCloudinaryASupabase(): Promise<{ total: number; exitosos: number; errores: string[] }> {
    const response = await fetch('/api/supabase/sync', { method: 'POST' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al sincronizar firmas');
    }

    return {
      total: Number(data.total || 0),
      exitosos: Number(data.exitosos || 0),
      errores: Array.isArray(data.errores) ? data.errores : [],
    };
  }
}
