import React, { useState } from 'react';
import { Trash2, Loader2, User, ShieldCheck, Briefcase, Image as ImageIcon, Edit2, Check, X } from 'lucide-react';
import { Firma } from '@/types';
import { FirmaService } from '@/services/firmaService';

interface ListaFirmasAdminProps {
  firmas: Record<string, Firma[]>;
  onFirmaEliminada: () => void;
}

export const ListaFirmasAdmin: React.FC<ListaFirmasAdminProps> = ({ 
  firmas, 
  onFirmaEliminada 
}) => {
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNombre, setTempNombre] = useState<string>('');
  const [guardando, setGuardando] = useState(false);

  const handleEliminar = async (publicId: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la firma de ${nombre}?`)) return;

    setEliminando(publicId);
    try {
      const exito = await FirmaService.eliminarFirma(publicId);
      if (exito) onFirmaEliminada();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setEliminando(null);
    }
  };

  const handleStartEdit = (firma: Firma) => {
    setEditingId(firma.publicId!);
    setTempNombre(firma.nombre);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTempNombre('');
  };

  const handleGuardarNombre = async (firma: Firma, tipo: string) => {
    if (!tempNombre.trim() || tempNombre === firma.nombre) {
      handleCancelEdit();
      return;
    }

    setGuardando(true);
    try {
      const exito = await FirmaService.renombrarFirma(firma.publicId!, tempNombre, tipo);
      if (exito) {
        onFirmaEliminada(); // Recargar la lista
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Error al renombrar:', error);
    } finally {
      setGuardando(false);
    }
  };

  const renderSeccion = (titulo: string, listaFirmas: Firma[], icon: React.ReactNode, color: string) => (
    <div className="mb-10 last:mb-0">
      <div className="flex items-center gap-3 mb-5 px-2">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-current`}>
          {icon}
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
          {titulo} <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{listaFirmas.length}</span>
        </h3>
      </div>

      {listaFirmas.length === 0 ? (
        <div className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-3xl p-8 text-center">
          <ImageIcon className="mx-auto text-slate-200 mb-2" size={32} />
          <p className="text-slate-400 text-sm font-medium italic">No hay firmas registradas en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listaFirmas.map((firma) => (
            <div 
              key={firma.publicId} 
              className="group bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden"
            >
              {/* Badge de Categoría Sutil */}
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                {icon}
              </div>

              {/* Contenedor de la Imagen */}
              <div className="bg-slate-50 rounded-[1.5rem] p-4 mb-4 flex items-center justify-center min-h-[120px] group-hover:bg-white group-hover:ring-2 group-hover:ring-emerald-50 transition-all duration-500">
                <img 
                  src={firma.ruta} 
                  alt={firma.nombre} 
                  className="max-h-20 object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              <div className="px-1">
                {editingId === firma.publicId ? (
                   <div className="flex items-center gap-2 mb-4">
                     <input
                       autoFocus
                       type="text"
                       value={tempNombre}
                       onChange={(e) => setTempNombre(e.target.value)}
                       className="w-full p-2 bg-slate-50 border border-emerald-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') handleGuardarNombre(firma, titulo.toLowerCase().includes('trabajador') ? 'trabajador' : titulo.toLowerCase().includes('supervisor') ? 'supervisor' : 'responsable');
                         if (e.key === 'Escape') handleCancelEdit();
                       }}
                     />
                     <button 
                       onClick={() => handleGuardarNombre(firma, titulo.toLowerCase().includes('trabajador') ? 'trabajador' : titulo.toLowerCase().includes('supervisor') ? 'supervisor' : 'responsable')}
                       disabled={guardando}
                       className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                     >
                       {guardando ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} strokeWidth={3} />}
                     </button>
                     <button 
                       onClick={handleCancelEdit}
                       disabled={guardando}
                       className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                     >
                       <X size={14} strokeWidth={3} />
                     </button>
                   </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 mb-4 group/name">
                    <p className="font-black text-slate-800 text-center truncate tracking-tight">
                      {firma.nombre}
                    </p>
                    <button 
                      onClick={() => handleStartEdit(firma)}
                      className="opacity-0 group-hover/name:opacity-100 p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                      <Edit2 size={12} strokeWidth={3} />
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => handleEliminar(firma.publicId!, firma.nombre)}
                  disabled={eliminando === firma.publicId || editingId === firma.publicId}
                  className="w-full group/btn relative overflow-hidden bg-white border border-red-100 text-red-500 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 active:scale-95 disabled:opacity-50"
                >
                  {eliminando === firma.publicId ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <Trash2 size={14} className="group-hover/btn:scale-110 transition-transform" />
                      <span>ELIMINAR ACCESO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-[2.5rem]">      
      <div className="space-y-12">
        {renderSeccion('Trabajadores', firmas.trabajador || [], <User size={18} />, 'text-blue-500')}
        {renderSeccion('Supervisores', firmas.supervisor || [], <ShieldCheck size={18} />, 'text-emerald-500')}
        {renderSeccion('Responsables de Conteo', firmas.responsable || [], <Briefcase size={18} />, 'text-yellow-500')}
      </div>
    </div>
  );
};