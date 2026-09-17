import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const HOJAS_VIDA_SUPABASE_URL = 'https://uvdbfnpinyxqcqocdyiv.supabase.co';
const HOJAS_VIDA_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZGJmbnBpbnl4cWNxb2NkeWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzE4NzIsImV4cCI6MjA5MDg0Nzg3Mn0.i-m8r9bMG_-5wj7wn55er9Dl2xZrheInvzESQexMpJM';

export async function GET() {
  try {
    const supabaseHV = createClient(HOJAS_VIDA_SUPABASE_URL, HOJAS_VIDA_SUPABASE_KEY);

    // Consultar firmas registradas en documentos_expediente cruzadas con expedientes
    const { data, error } = await supabaseHV
      .from('documentos_expediente')
      .select('id, expediente_id, url, nombre_archivo, expedientes(id, nombre, cedula, cargo)')
      .eq('tipo_documento', 'Firma');

    if (error) {
      console.error('[HojasDeVida API] Error en consulta Supabase:', error.message);
      return NextResponse.json({ success: false, firmas: [], error: error.message }, { status: 500 });
    }

    const firmas = (data || []).map((item: any) => {
      let nombreLimpio = '';
      if (item.expedientes && item.expedientes.nombre) {
        nombreLimpio = item.expedientes.nombre.trim();
      } else {
        nombreLimpio = (item.nombre_archivo || '')
          .replace(/\.[^/.]+$/, '')
          .replace(/^(firma|FIRMA)[_\s-]*/i, '')
          .replace(/[_-]/g, ' ')
          .trim();
      }

      return {
        id: item.id,
        nombre: nombreLimpio.toUpperCase(),
        cedula: item.expedientes?.cedula || '',
        tipo: 'trabajador' as const,
        ruta: item.url,
        publicId: `hv_${item.id}`,
        origen: 'hojas_de_vida' as const,
      };
    });

    return NextResponse.json({
      success: true,
      total: firmas.length,
      firmas,
    });
  } catch (err: any) {
    console.error('[HojasDeVida API] Error:', err);
    return NextResponse.json({ success: false, firmas: [], error: err?.message || 'Error al conectar' }, { status: 500 });
  }
}
