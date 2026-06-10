import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary/config';

export async function PATCH(request: NextRequest) {
  try {
    const { publicId, nuevoNombre, tipo } = await request.json();

    if (!publicId || !nuevoNombre || !tipo) {
      return NextResponse.json(
        { error: 'publicId, nuevoNombre y tipo son requeridos' },
        { status: 400 }
      );
    }

    // Determinar la carpeta basada en el tipo (igual que en upload y list)
    const carpeta = tipo === 'responsable' ? 'responsable_conteos' : `${tipo}s`;
    
    // Normalizar el nuevo nombre para el publicId (slugify)
    const slugNuevoNombre = nuevoNombre
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const nuevoPublicId = `firmas/${carpeta}/${slugNuevoNombre}`;

    console.log(`Renombrando ${publicId} a ${nuevoPublicId}`);

    const result = await cloudinary.uploader.rename(publicId, nuevoPublicId, {
      overwrite: true
    });

    return NextResponse.json({ 
      success: true, 
      result 
    });
  } catch (error: any) {
    console.error('Error al renombrar firma:', error);
    return NextResponse.json(
      { error: error.message || 'Error al renombrar firma' },
      { status: 500 }
    );
  }
}
