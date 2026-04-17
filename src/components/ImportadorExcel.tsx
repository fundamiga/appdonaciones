import React, { useState } from 'react';
import { FileSpreadsheet, Upload, Check, AlertCircle, X, Info, Edit2, Save, RotateCcw } from 'lucide-react';
import { procesarArchivoExcel } from '@/utils/importador';
import { RegistroDiario, Firma } from '@/types';
import { useFirmas } from '@/hooks/useFirmas';

interface ImportadorExcelProps {
  onImport: (registros: RegistroDiario[]) => void;
  onCancel: () => void;
}

const normalizarNombre = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9]/g, " ")     // Solo letras/números
    .trim()
    .replace(/\s+/g, " ");          // Espacios simples
};

const nombresCoinciden = (nombre1: string, nombre2: string) => {
  if (!nombre1 || !nombre2) return false;
  const n1 = normalizarNombre(nombre1);
  const n2 = normalizarNombre(nombre2);
  
  if (n1 === n2) return true;

  const palabras1 = n1.split(' ');
  const palabras2 = n2.split(' ');

  // Si uno de los nombres es una sola palabra y coincide exactamente con alguna palabra del otro
  if (palabras1.length === 1 && palabras2.includes(palabras1[0])) return true;
  if (palabras2.length === 1 && palabras1.includes(palabras2[0])) return true;

  // Si coinciden las dos primeras palabras
  if (palabras1.length >= 2 && palabras2.length >= 2) {
    if (palabras1[0] === palabras2[0] && palabras1[1] === palabras2[1]) return true;
  }

  // Si coinciden al menos el primer nombre y una parte del segundo
  let matches = 0;
  palabras1.forEach(p => {
    if (palabras2.includes(p)) matches++;
  });

  return matches >= 1 && (palabras1[0] === palabras2[0]);
};

const UBICACIONES_VALIDAS = [
  '5ta con 6ta', '6ta con 6ta', '2da con 10', 'Bolivar', 
  'Carton Colombia', 'Guacanda', 'Galeria', 'Guabinas', 
  'Mayorista', 'Rozo'
];

export const ImportadorExcel: React.FC<ImportadorExcelProps> = ({ onImport, onCancel }) => {
  const { firmas: firmasCargadas, loading: cargandoFirmas } = useFirmas();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<RegistroDiario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RegistroDiario | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setCargando(true);
    setError(null);

    try {
      const registrosBase = await procesarArchivoExcel(file);
      
      const registrosProcesados = registrosBase.map(reg => {
        const melisa = firmasCargadas.responsable.find(f => 
          normalizarNombre(f.nombre).includes('melis')
        ) || null;
        
        const nombreImportado = reg.firmas.trabajador?.nombre || '';
        const trabajadorMatch = firmasCargadas.trabajador.find(f => 
          nombresCoinciden(f.nombre, nombreImportado)
        ) || null;
        
        const SUPERVISOR_MAP: Record<string, string> = {
          '5ta con 6ta': 'NOE CONTRERAS',
          '6ta con 6ta': 'NOE CONTRERAS',
          'Bolivar': 'NOE CONTRERAS',
          'Guabinas': 'NOE CONTRERAS',
          'Rozo': 'DONELLA GARZON',
          'Galeria': 'DONELLA GARZON',
          'Mayorista': 'DONELLA GARZON',
          '2da con 10': 'DONELLA GARZON',
          '2 con 10': 'DONELLA GARZON',
          'Guacanda': 'DONELLA GARZON',
          'Carton Colombia': 'MARILIN VALDES'
        };

        const ubicacionRegNormal = normalizarNombre(reg.ubicacion);
        const mapKeyEncontrada = Object.keys(SUPERVISOR_MAP).find(k => 
          normalizarNombre(k) === ubicacionRegNormal
        );

        const nombreSupEsperado = mapKeyEncontrada ? SUPERVISOR_MAP[mapKeyEncontrada] : '';
        const supervisorMatch = firmasCargadas.supervisor.find(f => 
          nombresCoinciden(f.nombre, nombreSupEsperado)
        ) || null;

        return {
          ...reg,
          firmas: {
            // Si encuentra la firma con imagen, la usa. Si no, mantiene el nombre que venía en el Excel.
            trabajador: trabajadorMatch || reg.firmas.trabajador,
            supervisor: supervisorMatch || (nombreSupEsperado ? { nombre: nombreSupEsperado, tipo: 'supervisor', ruta: '' } : null),
            responsable: melisa
          }
        };
      });

      setPreview(registrosProcesados);
    } catch (err) {
      setError('No se pudo procesar el archivo. Asegúrate de que sea un Excel válido.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const startEditing = (idx: number) => {
    setEditingIndex(idx);
    setEditForm({ ...preview[idx] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (editingIndex !== null && editForm) {
      const newPreview = [...preview];
      newPreview[editingIndex] = editForm;
      setPreview(newPreview);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleConfirmar = () => {
    if (preview.length === 0) return;
    onImport(preview);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="bg-slate-900 p-8 text-white relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Importador de Plantilla</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Sube tu Excel para generación automática</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-8">
        {!archivo ? (
          <label className="group cursor-pointer block">
            <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-500 bg-slate-50/50">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <Upload size={32} className="text-emerald-500" />
              </div>
              <p className="text-slate-900 font-black text-xl mb-2">Selecciona tu archivo Excel</p>
              <p className="text-slate-400 text-sm font-medium mb-8">Formatos admitidos: .xlsx, .xls, .csv</p>
              <div className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
                Explorar Archivos
              </div>
            </div>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
              <Info className="text-blue-600 shrink-0" size={20} />
              <div>
                <p className="text-blue-900 text-sm font-bold tracking-tight">Archivo: <span className="text-blue-600 font-black">{archivo.name}</span></p>
                <p className="text-blue-700/70 text-xs font-medium mt-0.5">Se han detectado {preview.length} registros. Puedes editarlos antes de confirmar.</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600">
                <AlertCircle size={20} />
                <p className="text-sm font-bold tracking-tight">{error}</p>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto rounded-3xl border border-slate-100 shadow-sm custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ubicación</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Donantes</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Tipo</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Asignación de Firmas</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {preview.map((reg, idx) => {
                    const isEditing = editingIndex === idx;
                    const r = isEditing ? editForm! : reg;

                    return (
                      <tr key={idx} className={`transition-colors ${isEditing ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-4">
                          {isEditing ? (
                            <select 
                              value={r.ubicacion} 
                              onChange={e => setEditForm({...r, ubicacion: e.target.value})}
                              className="w-full p-2 text-xs font-black border-2 border-emerald-100 rounded-xl focus:border-emerald-500 outline-none bg-white"
                            >
                              {UBICACIONES_VALIDAS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs font-black text-slate-800">{r.ubicacion}</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={r.donaciones.valor} 
                              onChange={e => setEditForm({...r, donaciones: {...r.donaciones, valor: Number(e.target.value)}})}
                              className="w-24 p-2 text-xs font-bold border-2 border-emerald-100 rounded-xl text-right outline-none focus:border-emerald-500"
                            />
                          ) : (
                            <span className="text-xs font-black text-emerald-600">${r.donaciones.valor.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={r.donaciones.cantidadDonantes} 
                              onChange={e => setEditForm({...r, donaciones: {...r.donaciones, cantidadDonantes: Number(e.target.value)}})}
                              className="w-16 p-2 text-xs font-bold border-2 border-emerald-100 rounded-xl text-center outline-none focus:border-emerald-500"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-600">{r.donaciones.cantidadDonantes}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isEditing ? (
                            <select 
                              value={r.tipoParqueadero} 
                              onChange={e => setEditForm({...r, tipoParqueadero: e.target.value as any})}
                              className="p-2 text-[10px] font-black uppercase border-2 border-emerald-100 rounded-xl outline-none"
                            >
                              <option value="motos">Motos</option>
                              <option value="carros">Carros</option>
                            </select>
                          ) : (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.tipoParqueadero === 'motos' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                              {r.tipoParqueadero}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            {/* Trabajador Selector */}
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${r.firmas.trabajador ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                              {isEditing ? (
                                <select 
                                  value={r.firmas.trabajador?.publicId || ''} 
                                  onChange={e => {
                                    const firma = firmasCargadas.trabajador.find(f => f.publicId === e.target.value) || null;
                                    setEditForm({...r, firmas: {...r.firmas, trabajador: firma}});
                                  }}
                                  className="text-[10px] font-bold border-b border-emerald-200 outline-none bg-transparent max-w-[150px] truncate"
                                >
                                  <option value="">-- Seleccionar Trabajador --</option>
                                  {firmasCargadas.trabajador.map(f => <option key={f.publicId} value={f.publicId}>{f.nombre}</option>)}
                                </select>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">T: {r.firmas.trabajador?.nombre || 'No asignada'}</span>
                              )}
                            </div>
                            {/* Supervisor Selector */}
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${r.firmas.supervisor ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                              {isEditing ? (
                                <select 
                                  value={r.firmas.supervisor?.publicId || ''} 
                                  onChange={e => {
                                    const firma = firmasCargadas.supervisor.find(f => f.publicId === e.target.value) || null;
                                    setEditForm({...r, firmas: {...r.firmas, supervisor: firma}});
                                  }}
                                  className="text-[10px] font-bold border-b border-emerald-200 outline-none bg-transparent max-w-[150px] truncate"
                                >
                                  <option value="">-- Seleccionar Supervisor --</option>
                                  {firmasCargadas.supervisor.map(f => <option key={f.publicId} value={f.publicId}>{f.nombre}</option>)}
                                </select>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">S: {r.firmas.supervisor?.nombre || 'No asignada'}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={cancelEditing} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Cancelar">
                                <RotateCcw size={16} />
                              </button>
                              <button onClick={saveEditing} className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all" title="Guardar">
                                <Save size={16} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => startEditing(idx)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Editar fila">
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => setArchivo(null)}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cambiar Archivo
              </button>
              <button
                onClick={handleConfirmar}
                disabled={editingIndex !== null}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 shadow-none"
              >
                <Check size={20} />
                Confirmar Importación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
