import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary/config';

export async function DELETE(request: NextRequest) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID requerido' },
        { status: 400 }
      );
    }

    // Eliminar de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return NextResponse.json({ 
        success: true,
        message: 'Firma eliminada correctamente' 
      });
    } else {
      throw new Error('No se pudo eliminar la firma');
    }
  } catch (error: any) {
    console.error('Error al eliminar firma:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar firma' },
      { status: 500 }
    );
  }
}