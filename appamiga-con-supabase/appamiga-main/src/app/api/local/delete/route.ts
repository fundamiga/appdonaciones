import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json({ error: 'publicId requerido' }, { status: 400 });
    }

    // publicId para local tiene el formato: "local/carpeta/archivo.ext"
    // Quitamos el prefijo "local/" para obtener la ruta relativa dentro de public/firmas/
    const relativePath = publicId.startsWith('local/')
      ? publicId.slice('local/'.length)
      : publicId;

    const filePath = path.join(process.cwd(), 'public', 'firmas', relativePath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    console.log(`[Local] ✅ Firma eliminada: public/firmas/${relativePath}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en /api/local/delete:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar firma local' },
      { status: 500 }
    );
  }
}
