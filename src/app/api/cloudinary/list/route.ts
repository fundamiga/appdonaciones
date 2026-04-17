import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary/config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo');
    
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo requerido' }, { status: 400 });
    }

    // 🔧 FIX: Solo buscar en la carpeta que corresponde al tipo
    const carpeta = tipo === 'responsable' ? 'responsable_conteos' : `${tipo}s`;
    const prefix = `firmas/${carpeta}`;

    console.log('🔍 Buscando firmas en:', prefix);
    
    let result = null;
    try {
      result = await cloudinary.api.resources({
        type: 'upload',
        prefix: prefix,
        max_results: 500
      });
      
      if (result.resources && result.resources.length > 0) {
        console.log(`✅ Encontradas ${result.resources.length} firmas en:`, prefix);
      }
    } catch (e: any) {
      console.log('❌ Error o no encontrado en:', prefix, e?.message);
      result = { resources: [] };
    }

    if (!result) {
      result = { resources: [] };
    }

    const firmas = (result.resources || []).map((resource: any) => {
      const nombreArchivo = resource.public_id.split('/').pop() || resource.public_id;
      
      return {
        publicId: resource.public_id,
        nombre: formatearNombre(nombreArchivo),
        url: resource.secure_url // ✅ Usar la URL segura oficial de Cloudinary
      };
    });
    
    return NextResponse.json({ firmas });
  } catch (error: any) {
    console.error('Error en /api/cloudinary/list:', error);
    return NextResponse.json(
      { error: error.message || 'Error al listar firmas' },
      { status: 500 }
    );
  }
}

function formatearNombre(nombre: string): string {
  // Remover extensión si existe
  let nombreLimpio = nombre.replace(/\.[^/.]+$/, '');
  
  // Si está vacío, devolver el nombre original
  if (!nombreLimpio || nombreLimpio.trim() === '') {
    return nombre;
  }
  
  // Convertir a formato legible
  return nombreLimpio
    .split(/[_-]/)
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(word => word.length > 0)
    .join(' ');
}
