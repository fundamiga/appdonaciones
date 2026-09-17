import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getCarpeta(tipo: string): string {
  if (tipo === 'responsable') return 'responsable_conteos';
  if (tipo === 'trabajador') return 'trabajadores';
  if (tipo === 'supervisor') return 'supervisores';
  return tipo;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tipo = formData.get('tipo') as string | null;
    const nombre = formData.get('nombre') as string | null;

    if (!file || !tipo || !nombre) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const carpeta = getCarpeta(tipo);
    const dirPath = path.join(process.cwd(), 'public', 'firmas', carpeta);

    // Crear carpeta si no existe
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Nombre de archivo: nombre_persona.ext
    const ext = path.extname(file.name) || '.png';
    const nombreArchivo = `${nombre.toLowerCase().replace(/\s+/g, '_')}${ext}`;
    const filePath = path.join(dirPath, nombreArchivo);

    // Guardar el archivo
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    console.log(`[Local] ✅ Firma guardada en: public/firmas/${carpeta}/${nombreArchivo}`);

    return NextResponse.json({
      publicId: `local/${carpeta}/${nombreArchivo}`,
      url: `/firmas/${carpeta}/${nombreArchivo}`,
      nombre: nombre,
    });
  } catch (error: any) {
    console.error('Error en /api/local/upload:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar firma local' }, { status: 500 });
  }
}
