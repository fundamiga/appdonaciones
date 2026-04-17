import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { FirmaService } from '@/services/firmaService';

interface SubirFirmaProps {
  onFirmaSubida: () => void;
}

export const SubirFirma: React.FC<SubirFirmaProps> = ({ onFirmaSubida }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<'trabajador' | 'supervisor' | 'responsable'>('trabajador');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubir = async () => {
    if (!archivo || !nombre) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const exito = await FirmaService.subirFirma(archivo, tipo, nombre);
      
      if (exito) {
        alert('✅ Firma subida exitosamente');
        setArchivo(null);
        setNombre('');
        setPreview('');
        onFirmaSubida();
      } else {
        alert('❌ Error al subir la firma');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al subir la firma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Subir Nueva Firma</h2>

      <div className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold mb-2">Tipo de Firma</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="trabajador">Trabajador</option>
            <option value="supervisor">Supervisor</option>
            <option value="responsable">Responsable de Conteo</option>
          </select>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-semibold mb-2">Nombre de la Persona</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Archivo */}
        <div>
          <label className="block text-sm font-semibold mb-2">Imagen de la Firma (PNG)</label>
          <input
            type="file"
            accept="image/png"
            onChange={handleArchivoChange}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">Vista Previa:</p>
            <img src={preview} alt="Preview" className="max-h-32 mx-auto" />
          </div>
        )}

        {/* Botón */}
        <button
          onClick={handleSubir}
          disabled={loading || !archivo || !nombre}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Subiendo...
            </>
          ) : (
            <>
              <Upload size={20} />
              Subir Firma
            </>
          )}
        </button>
      </div>
    </div>
  );
};