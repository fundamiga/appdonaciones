import { NextRequest, NextResponse } from 'next/server';
import { supabase, SUPABASE_BUCKET } from '@/lib/supabase/config';

function getCarpeta(tipo: string): string {
  return tipo === 'responsable' ? 'responsable_conteos' : `${tipo}s`;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 });
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tipo = formData.get('tipo') as string;
    const nombre = formData.get('nombre') as string;

    if (!file || !tipo || !nombre)
      return NextResponse.json({ error: 'Archivo, tipo y nombre son requeridos' }, { status: 400 });

    const carpeta = getCarpeta(tipo);
    const nombreArchivo = `${nombre.toLowerCase().replace(/\s+/g, '_')}.png`;
    const path = `${carpeta}/${nombreArchivo}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabase!.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    return NextResponse.json({ success: true, data: { publicId: path, url: urlData.publicUrl } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al subir firma' }, { status: 500 });
  }
}
