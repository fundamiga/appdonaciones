import { NextRequest, NextResponse } from 'next/server';
import { supabase, SUPABASE_BUCKET } from '@/lib/supabase/config';

export async function DELETE(request: NextRequest) {
  try {
    const { publicId } = await request.json();
    if (!publicId) return NextResponse.json({ error: 'Public ID requerido' }, { status: 400 });

    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([publicId]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Firma eliminada de Supabase correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar firma' }, { status: 500 });
  }
}
