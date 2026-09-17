import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getCarpeta(tipo: string): string {
  if (tipo === 'responsable') return 'responsable_conteos';
  if (tipo === 'trabajador') return 'trabajadores';
  if (tipo === 'supervisor') return 'supervisores';
  return tipo;
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
    const dirPath = path.join(process.cwd(), 'public', 'firmas', carpeta);

    // Si la carpeta no existe, devolver lista vacía
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ firmas: [], fuente: 'local' });
    }

    const archivos = fs.readdirSync(dirPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
    });

    const firmas = archivos.map(archivo => ({
      publicId: `local/${carpeta}/${archivo}`,
      nombre: formatearNombre(path.basename(archivo)),
      url: `/firmas/${carpeta}/${archivo}`,
    }));

    return NextResponse.json({ firmas, fuente: 'local' });
  } catch (error: any) {
    console.error('Error en /api/local/list:', error);
    return NextResponse.json({ error: error.message || 'Error al listar firmas locales' }, { status: 500 });
  }
}
