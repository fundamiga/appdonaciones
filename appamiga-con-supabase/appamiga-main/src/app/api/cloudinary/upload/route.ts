import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary/config';

export async function POST(request: NextRequest) {
    console.log('Upload ejecuntando');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tipo = formData.get('tipo') as string;
    const nombre = formData.get('nombre') as string;

    if (!file || !tipo || !nombre) {
      return NextResponse.json(
        { error: 'Archivo, tipo y nombre son requeridos' },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determinar carpeta
    const carpeta = tipo === 'responsable' ? 'responsable_conteos' : `${tipo}s`;
    
    // Subir a Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `firmas/${carpeta}`,
          public_id: nombre.toLowerCase().replace(/\s+/g, '_'),
          resource_type: 'image',
          format: 'png'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    console.log('Upload exitoso:', result);

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error: any) {
    console.error('Error al subir firma:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir firma' },
      { status: 500 }
    );
  }
}
