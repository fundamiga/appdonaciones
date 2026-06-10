import { NextRequest, NextResponse } from 'next/server';
import { supabase, SUPABASE_BUCKET } from '@/lib/supabase/config';

function getCarpeta(tipo: string): string {
  return tipo === 'responsable' ? 'responsable_conteos' : `${tipo}s`;
}

function formatearNombre(nombre: string): string {
  let nombreLimpio = nombre.replace(/\.[^/.]+$/, '');
  if (!nombreLimpio || nombreLimpio.trim() === '') return nombre;
  return nombreLimpio
    .split(/[_-]/)
    .map(word => (!word ? '' : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .filter(word => word.length > 0)
    .join(' ');
}

export async function GET(request: NextRequest) {
  try {
    const tipo = request.nextUrl.searchParams.get('tipo');
    if (!tipo) return NextResponse.json({ error: 'Tipo requerido' }, { status: 400 });

    const carpeta = getCarpeta(tipo);
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list(carpeta, { limit: 500 });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const firmas = (data || [])
      .filter(item => item.name && !item.name.endsWith('/'))
      .map(item => {
        const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(`${carpeta}/${item.name}`);
        return { publicId: `${carpeta}/${item.name}`, nombre: formatearNombre(item.name), url: urlData.publicUrl };
      });

    return NextResponse.json({ firmas, fuente: 'supabase' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al listar firmas' }, { status: 500 });
  }
}
