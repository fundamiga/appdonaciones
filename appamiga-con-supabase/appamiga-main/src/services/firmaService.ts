import { Firma } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN: controla qué base de datos usar
//   'auto'       → Cloudinary primero, si falla usa archivos locales ✅
//   'cloudinary' → solo Cloudinary (sin fallback)
//   'supabase'   → solo Supabase
//   'local'      → solo archivos locales en public/firmas/
// Prioridad: localStorage('fuente_firmas_override') > NEXT_PUBLIC_FUENTE_FIRMAS > 'cloudinary'
// ─────────────────────────────────────────────────────────────────────────────
type FuenteFirmasType = 'cloudinary' | 'supabase' | 'auto' | 'local';

function getFuenteFirmas(): FuenteFirmasType {
  const envFuente = (process.env.NEXT_PUBLIC_FUENTE_FIRMAS as FuenteFirmasType) || 'cloudinary';

  // En el cliente, el botón del admin (localStorage) siempre tiene prioridad
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('fuente_firmas_override') as FuenteFirmasType | null;
    if (override === 'local' || override === 'cloudinary' || override === 'supabase' || override === 'auto') {
      return override;
    }
  }

  // Sin preferencia guardada → usar el default del .env.local
  return envFuente;
}

async function fetchFirmasDe(
  fuente: 'cloudinary' | 'supabase' | 'local',
  tipo: 'trabajador' | 'supervisor' | 'responsable'
): Promise<Firma[]> {
  try {
    let base: string;
    if (fuente === 'cloudinary') base = '/api/cloudinary';
    else if (fuente === 'supabase') base = '/api/supabase';
    else base = '/api/local';

    const response = await fetch(`${base}/list?tipo=${tipo}`);
    if (!response.ok) {
      console.warn(`[FirmaService] HTTP ${response.status} en ${base}/list`);
      return [];
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.firmas)) {
      return [];
    }
    return data.firmas.map((firma: { nombre?: string; url?: string; publicId?: string }) => ({
      nombre: firma.nombre || '',
      tipo,
      ruta: firma.url || '',
      publicId: firma.publicId || '',
    }));
  } catch (error) {
    console.warn(`[FirmaService] Error al obtener firmas de ${fuente}:`, error);
    return [];
  }
}

async function subirFirmaA(
  fuente: 'cloudinary' | 'supabase' | 'local',
  file: File,
  tipo: 'trabajador' | 'supervisor' | 'responsable',
  nombre: string
): Promise<boolean> {
  let base: string;
  if (fuente === 'cloudinary') base = '/api/cloudinary';
  else if (fuente === 'supabase') base = '/api/supabase';
  else base = '/api/local';
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
  fuente: 'cloudinary' | 'supabase' | 'local',
  publicId: string
): Promise<boolean> {
  let base: string;
  if (fuente === 'cloudinary') base = '/api/cloudinary';
  else if (fuente === 'supabase') base = '/api/supabase';
  else base = '/api/local';

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
    const FUENTE = getFuenteFirmas();
    if (FUENTE === 'local') {
      return fetchFirmasDe('local', tipo).catch(err => {
        console.error(`[FirmaService] Local falló para ${tipo}:`, err.message);
        return [];
      });
    }
    if (FUENTE === 'cloudinary') {
      return fetchFirmasDe('cloudinary', tipo).catch(err => {
        console.error(`[FirmaService] Cloudinary falló para ${tipo}:`, err.message);
        return [];
      });
    }
    if (FUENTE === 'supabase') {
      return fetchFirmasDe('supabase', tipo).catch(err => {
        console.error(`[FirmaService] Supabase falló para ${tipo}:`, err.message);
        return [];
      });
    }
    // Modo AUTO: Cloudinary primero → Local como respaldo
    try {
      const firmas = await fetchFirmasDe('cloudinary', tipo);
      console.log(`[FirmaService] ✅ Cloudinary OK para ${tipo}`);
      return firmas;
    } catch (errCloudinary) {
      console.warn(`[FirmaService] ⚠️ Cloudinary falló para ${tipo}, usando archivos locales:`, (errCloudinary as Error).message);
      try {
        const firmas = await fetchFirmasDe('local', tipo);
        console.log(`[FirmaService] ✅ Local OK para ${tipo} (${firmas.length} firmas)`);
        return firmas;
      } catch (errLocal) {
        console.error(`[FirmaService] ❌ Local también falló para ${tipo}:`, (errLocal as Error).message);
        return [];
      }
    }
  }

  static async obtenerFirmasHojasDeVida(): Promise<Firma[]> {
    try {
      const response = await fetch('/api/hojas-de-vida/firmas');
      const data = await response.json();
      if (data && data.success && Array.isArray(data.firmas)) {
        return data.firmas.map((f: any) => ({
          nombre: f.nombre,
          tipo: 'trabajador' as const,
          ruta: f.ruta,
          publicId: f.publicId,
        }));
      }
      return [];
    } catch (err) {
      console.error('[FirmaService] Error al consultar firmas de Hojas de Vida:', err);
      return [];
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
    const FUENTE = getFuenteFirmas();
    if (FUENTE === 'local') {
      return subirFirmaA('local', file, tipo, nombre).catch(() => false);
    }
    if (FUENTE === 'cloudinary') {
      return subirFirmaA('cloudinary', file, tipo, nombre).catch(() => false);
    }
    if (FUENTE === 'supabase') {
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
    const FUENTE = getFuenteFirmas();
    if (FUENTE === 'local' || publicId.startsWith('local/')) {
      return eliminarFirmaEn('local', publicId).catch(() => false);
    }
    const esCloudinary = publicId.startsWith('firmas/');
    if (FUENTE === 'cloudinary' || (FUENTE === 'auto' && esCloudinary)) {
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
