import { Firma } from '@/types';

export class FirmaService {
  static async obtenerFirmasPorTipo(
    tipo: 'trabajador' | 'supervisor' | 'responsable'
  ): Promise<Firma[]> {
    try {
      const response = await fetch(`/api/cloudinary/list?tipo=${tipo}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener firmas');
      }

      return data.firmas.map((firma: any) => ({
        nombre: firma.nombre,
        tipo,
        ruta: firma.url,
        publicId: firma.publicId
      }));
    } catch (error) {
      console.error(`Error al obtener firmas de ${tipo}:`, error);
      return [];
    }
  }

  static async cargarTodasLasFirmas(): Promise<Record<string, Firma[]>> {
    try {
      const [trabajadores, supervisores, responsables] = await Promise.all([
        this.obtenerFirmasPorTipo('trabajador'),
        this.obtenerFirmasPorTipo('supervisor'),
        this.obtenerFirmasPorTipo('responsable')
      ]);

      return {
        trabajador: trabajadores,
        supervisor: supervisores,
        responsable: responsables
      };
    } catch (error) {
      console.error('Error al cargar todas las firmas:', error);
      return {
        trabajador: [],
        supervisor: [],
        responsable: []
      };
    }
  }

  static async subirFirma(
    file: File,
    tipo: 'trabajador' | 'supervisor' | 'responsable',
    nombre: string
  ): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);
      formData.append('nombre', nombre);

      const response = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir firma');
      }

      return true;
    } catch (error) {
      console.error('Error al subir firma:', error);
      return false;
    }
  }

  static async eliminarFirma(publicId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/cloudinary/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ publicId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar firma');
      }

      return true;
    } catch (error) {
      console.error('Error al eliminar firma:', error);
      return false;
    }
  }

  static async renombrarFirma(
    publicId: string,
    nuevoNombre: string,
    tipo: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/cloudinary/rename', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ publicId, nuevoNombre, tipo })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al renombrar firma');
      }

      return true;
    } catch (error) {
      console.error('Error al renombrar firma:', error);
      return false;
    }
  }
}
