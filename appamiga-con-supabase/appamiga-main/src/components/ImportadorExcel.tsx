import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Upload, Check, AlertCircle, X, Info, Edit2, Save, RotateCcw, Search, ChevronDown, User, Image as ImageIcon, Trash2, Plus, ArrowUp, ArrowDown, Dices, Sparkles, BookOpen } from 'lucide-react';
import { procesarArchivoExcel } from '@/utils/importador';
import { procesarArchivoPdf } from '@/utils/importadorPdf';
import { RegistroDiario, Firma } from '@/types';
import { useFirmas } from '@/hooks/useFirmas';

interface ImportadorExcelProps {
  onImport: (registros: RegistroDiario[]) => void;
  onCancel: () => void;
}

// Sub-componente para selección de firma con búsqueda
interface FirmaSelectorProps {
  label: string;
  options: Firma[];
  value: Firma | null;
  onChange: (firma: Firma | null) => void;
}

const FirmaSelector: React.FC<FirmaSelectorProps> = ({ label, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPos, setDropdownPos] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const distanceToBottom = window.innerHeight - rect.bottom;
      // We check if distance to the screen bottom is less than 280px (enough for dropdown)
      if (distanceToBottom < 280) {
        setDropdownPos('up');
      } else {
        setDropdownPos('down');
      }
      // Limpiar búsqueda al abrir
      setSearchTerm('');
    }
    setIsOpen(!isOpen);
  };

  const filtered = options.filter(f => 
    f.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .includes(searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">{label}</label>
      <div 
        onClick={handleToggle}
        className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-500 transition-all"
      >
        <div className="w-6 h-6 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
          {value?.ruta ? (
            <img src={value.ruta} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={12} className="text-slate-300" />
          )}
        </div>
        <span className="text-[11px] font-bold text-slate-700 truncate flex-1">
          {value?.nombre || 'No asignado'}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen && dropdownPos === 'down' ? 'rotate-180' : ''} ${isOpen && dropdownPos === 'up' ? '' : ''}`} />
      </div>

      {isOpen && (
        <div className={`absolute z-[100] w-full ${dropdownPos === 'up' ? 'bottom-full mb-1' : 'top-[calc(100%+4px)]'} bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in duration-200`}>
          <div className="p-2 border-b border-slate-50 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                autoFocus
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-6 text-xs font-bold text-slate-400 text-center">Sin resultados</div>
            ) : (
              <div className="p-1">
                {filtered.map(f => (
                  <div 
                    key={f.publicId || f.nombre}
                    onClick={() => {
                      onChange(f);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="p-2 flex items-center gap-3 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                      {f.ruta ? <img src={f.ruta} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-slate-300" />}
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 truncate flex-1">{f.nombre}</span>
                    {value?.nombre === f.nombre && (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check size={12} className="text-emerald-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const normalizarNombre = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9]/g, " ")     // Solo letras/números
    .trim()
    .replace(/\s+/g, " ");          // Espacios simples
};

// Limpieza para variantes fonéticas y ortográficas frecuentes (s/z, b/v, i/y, dobles letras)
const simplificarTexto = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/z/g, "s")
    .replace(/v/g, "b")
    .replace(/y/g, "i")
    .replace(/([^a-z0-9])\1+/g, "$1")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
};

const nombresCoinciden = (nombre1: string, nombre2: string) => {
  if (!nombre1 || !nombre2) return false;
  const n1 = normalizarNombre(nombre1);
  const n2 = normalizarNombre(nombre2);
  
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  const palabras1 = n1.split(' ').filter(p => p.length > 0);
  const palabras2 = n2.split(' ').filter(p => p.length > 0);

  if (palabras1.length === 0 || palabras2.length === 0) return false;

  if (palabras1.length === 1 && palabras2.includes(palabras1[0])) return true;
  if (palabras2.length === 1 && palabras1.includes(palabras2[0])) return true;

  if (palabras1.length >= 2 && palabras2.length >= 2) {
    if (palabras1[0] === palabras2[0] && palabras1[1] === palabras2[1]) return true;
  }

  let matches = 0;
  palabras1.forEach(p => {
    if (palabras2.includes(p)) matches++;
  });

  if (matches >= 2) return true;
  if (matches >= 1 && (palabras1[0] === palabras2[0])) return true;

  // Comparación fonética / ortográfica
  const s1 = simplificarTexto(nombre1);
  const s2 = simplificarTexto(nombre2);
  if (s1 === s2 || s1.includes(s2) || s2.includes(s1)) return true;

  const sp1 = s1.split(' ').filter(p => p.length > 0);
  const sp2 = s2.split(' ').filter(p => p.length > 0);
  let sMatches = 0;
  for (const w1 of sp1) {
    if (sp2.some(w2 => w1 === w2 || (w1.length >= 4 && w2.length >= 4 && (w1.includes(w2) || w2.includes(w1))))) {
      sMatches++;
    }
  }
  if (sMatches >= 2) return true;
  if ((sp1.length === 1 || sp2.length === 1) && sMatches >= 1) return true;

  return false;
};

// Encuentra la mejor firma candidata para un nombre importado
const encontrarMejorFirma = (candidatos: Firma[], nombreBuscado: string): Firma | null => {
  if (!nombreBuscado || !candidatos || candidatos.length === 0) return null;

  // 1. Coincidencia exacta
  const exact = candidatos.find(c => normalizarNombre(c.nombre) === normalizarNombre(nombreBuscado));
  if (exact) return exact;

  // 2. Coincidencia por puntaje (evita falsos positivos de un solo nombre común)
  const nbNorm = normalizarNombre(nombreBuscado);
  const pBuscado = nbNorm.split(' ').filter(p => p.length > 0);

  const conPuntaje = candidatos.map(c => {
    const cNorm = normalizarNombre(c.nombre);
    const pCand = cNorm.split(' ').filter(p => p.length > 0);
    let matchCount = 0;
    pBuscado.forEach(p => {
      if (pCand.includes(p)) matchCount++;
    });

    const primerMatch = pBuscado[0] === pCand[0];
    let score = matchCount * 10 + (primerMatch ? 5 : 0);

    if (nombresCoinciden(c.nombre, nombreBuscado)) {
      score += 20;
    }

    return { firma: c, score };
  });

  conPuntaje.sort((a, b) => b.score - a.score);
  if (conPuntaje.length > 0 && conPuntaje[0].score >= 20) {
    return conPuntaje[0].firma;
  }

  return null;
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

  // Opciones de firmas solicitadas
  const [asignacionManual, setAsignacionManual] = useState(false);
  const [buscarEnHojasVida, setBuscarEnHojasVida] = useState(true);
  const [firmasHojasVida, setFirmasHojasVida] = useState<Firma[]>([]);
  const [cargandoHV, setCargandoHV] = useState(false);

  // Cargar firmas de Hojas de Vida si está activo
  useEffect(() => {
    if (buscarEnHojasVida && firmasHojasVida.length === 0) {
      setCargandoHV(true);
      fetch('/api/hojas-de-vida/firmas')
        .then(res => res.json())
        .then(data => {
          if (data.firmas && Array.isArray(data.firmas)) {
            setFirmasHojasVida(data.firmas);
          }
        })
        .catch(err => console.warn('Hojas de vida firmas:', err))
        .finally(() => setCargandoHV(false));
    }
  }, [buscarEnHojasVida, firmasHojasVida.length]);

  // Catálogo combinado de trabajadores (locales/Cloudinary + Hojas de Vida)
  const catalogoTrabajadores = useMemo(() => {
    const base = [...firmasCargadas.trabajador];
    if (buscarEnHojasVida && firmasHojasVida.length > 0) {
      firmasHojasVida.forEach(hv => {
        if (!base.some(b => normalizarNombre(b.nombre) === normalizarNombre(hv.nombre))) {
          base.push(hv);
        }
      });
    }
    return base;
  }, [firmasCargadas.trabajador, buscarEnHojasVida, firmasHojasVida]);

  // Si llegan firmas de Hojas de Vida y hay registros sin firma, enriquecerlos automáticamente
  useEffect(() => {
    if (preview.length > 0 && catalogoTrabajadores.length > 0) {
      setPreview(prev => {
        let cambio = false;
        const res = prev.map(r => {
          if (!r.firmas.trabajador?.ruta && r.firmas.trabajador?.nombre) {
            const m = encontrarMejorFirma(catalogoTrabajadores, r.firmas.trabajador.nombre);
            if (m) {
              cambio = true;
              return { ...r, firmas: { ...r.firmas, trabajador: m } };
            }
          }
          return r;
        });
        return cambio ? res : prev;
      });
    }
  }, [catalogoTrabajadores]);

  // Asignar una firma aleatoria a todas las filas que no tengan firma de trabajador
  const handleAsignarRandomFaltantes = () => {
    const firmasValidas = catalogoTrabajadores.filter(f => f.ruta && f.ruta.trim() !== '');
    if (firmasValidas.length === 0) {
      alert('No hay firmas disponibles con imagen para asignar.');
      return;
    }

    setPreview(prev => prev.map(reg => {
      if (!reg.firmas.trabajador?.ruta) {
        const randomFirma = firmasValidas[Math.floor(Math.random() * firmasValidas.length)];
        return {
          ...reg,
          firmas: {
            ...reg.firmas,
            trabajador: randomFirma
          }
        };
      }
      return reg;
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setCargando(true);
    setError(null);

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    try {
      const registrosBase = isPdf 
        ? await procesarArchivoPdf(file) 
        : await procesarArchivoExcel(file);
      
      const registrosProcesados = registrosBase.map(reg => {
        const melisa = firmasCargadas.responsable.find(f => 
          normalizarNombre(f.nombre).includes('melis')
        ) || null;
        
        const nombreImportado = reg.firmas.trabajador?.nombre || '';
        const trabajadorMatch = encontrarMejorFirma(catalogoTrabajadores, nombreImportado) || (nombreImportado ? { nombre: nombreImportado, tipo: 'trabajador' as const, ruta: '' } : null);
        
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
            trabajador: trabajadorMatch || reg.firmas.trabajador,
            supervisor: supervisorMatch || (nombreSupEsperado ? { nombre: nombreSupEsperado, tipo: 'supervisor' as const, ruta: '' } : null),
            responsable: melisa
          }
        };
      });

      setPreview(registrosProcesados);
    } catch (err: any) {
      const msg = err?.message ? err.message : 'Asegúrate de que sea un archivo válido.';
      setError(`No se pudo procesar el archivo ${isPdf ? 'PDF' : 'Excel'}. ${msg}`);
      console.error('Error procesando el archivo:', err);
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
    
    // Validar si faltan firmas
    const faltanFirmas = preview.some(r => !r.firmas.trabajador || !r.firmas.supervisor);
    if (faltanFirmas) {
      if (!confirm('⚠️ Aún hay registros sin firma de Trabajador o Supervisor asignada.\n\n¿Deseas confirmar la importación de todos modos?')) {
        return;
      }
    }

    onImport(preview);
  };

  const eliminarFila = (idx: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta fila?')) {
      if (editingIndex === idx) cancelEditing();
      setPreview(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const agregarFilaNueva = () => {
    const nuevaFila: RegistroDiario = {
      fecha: preview.length > 0 ? preview[0].fecha : new Date().toISOString().split('T')[0],
      ubicacion: UBICACIONES_VALIDAS[0],
      tipoParqueadero: 'carros',
      donaciones: { valor: 0, cantidadDonantes: 1 },
      facturaElectronica: { valor: 0, cantidadPersonas: 0 },
      firmas: { trabajador: null, supervisor: null, responsable: null }
    };
    const newIdx = preview.length;
    setPreview(prev => [...prev, nuevaFila]);
    setEditingIndex(newIdx);
    setEditForm(nuevaFila);
  };

  const moverFila = (idx: number, direccion: 'arriba' | 'abajo') => {
    if (editingIndex !== null) return;
    
    if (direccion === 'arriba' && idx > 0) {
      setPreview(prev => {
        const arr = [...prev];
        const temp = arr[idx];
        arr[idx] = arr[idx - 1];
        arr[idx - 1] = temp;
        return arr;
      });
    } else if (direccion === 'abajo' && idx < preview.length - 1) {
      setPreview(prev => {
        const arr = [...prev];
        const temp = arr[idx];
        arr[idx] = arr[idx + 1];
        arr[idx + 1] = temp;
        return arr;
      });
    }
  };

  const registrosIncompletos = preview.filter(r => !r.firmas.trabajador || !r.firmas.supervisor).length;

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
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Sube tu Excel o PDF para generación automática</p>
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
              <p className="text-slate-900 font-black text-xl mb-2">Selecciona tu archivo (Excel o PDF)</p>
              <p className="text-slate-400 text-sm font-medium mb-8">Formatos admitidos: .xlsx, .xls, .csv, .pdf</p>
              <div className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
                Explorar Archivos
              </div>
            </div>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-blue-900 text-sm font-bold tracking-tight">Archivo: <span className="text-blue-600 font-black">{archivo.name}</span></p>
                    <p className="text-blue-700/70 text-xs font-medium mt-0.5">Se han detectado {preview.length} registros. Puedes editarlos antes de confirmar.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {registrosIncompletos > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm">
                      <AlertCircle size={16} className="text-red-500 animate-pulse" />
                      <span className="text-xs font-black text-red-600">{registrosIncompletos} Faltantes</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 sm:items-end">
                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Ajustar Fecha a todos</label>
                    <input 
                      type="date" 
                      className="p-1.5 w-full sm:w-auto text-xs font-bold text-slate-700 border border-blue-200 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      onChange={(e) => {
                        const newDate = e.target.value;
                        if (newDate) {
                          setPreview(prev => prev.map(p => ({...p, fecha: newDate})));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Barra de opciones de firmas: Hojas de Vida, Asignación Manual, Firma Aleatoria */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200/60">
                {/* Toggle Hojas de Vida */}
                <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-blue-50 transition-colors shadow-xs">
                  <input
                    type="checkbox"
                    checked={buscarEnHojasVida}
                    onChange={e => setBuscarEnHojasVida(e.target.checked)}
                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                  />
                  <BookOpen size={14} className="text-blue-600" />
                  <span>Buscar en Hojas de Vida</span>
                  {cargandoHV ? (
                    <span className="text-[10px] text-blue-500 font-normal animate-pulse">(cargando...)</span>
                  ) : firmasHojasVida.length > 0 ? (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-black">+{firmasHojasVida.length}</span>
                  ) : null}
                </label>

                {/* Toggle Asignación Manual */}
                <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-amber-50 transition-colors shadow-xs">
                  <input
                    type="checkbox"
                    checked={asignacionManual}
                    onChange={e => setAsignacionManual(e.target.checked)}
                    className="accent-amber-600 w-4 h-4 cursor-pointer"
                  />
                  <Edit2 size={14} className="text-amber-600" />
                  <span>Asignación manual para faltantes</span>
                </label>

                {/* Botón Firma Random */}
                <button
                  type="button"
                  onClick={handleAsignarRandomFaltantes}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs ml-auto"
                  title="Asigna una firma al azar a todos los registros que aún no tengan firma"
                >
                  <Dices size={15} className="text-purple-600" />
                  <span>Firma random a faltantes</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600">
                <AlertCircle size={20} />
                <p className="text-sm font-bold tracking-tight">{error}</p>
              </div>
            )}

            <div className="max-h-[500px] overflow-y-auto rounded-3xl border border-slate-100 shadow-sm custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ubicación</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Donantes</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Tipo</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Asignación de Firmas (Foto/Nombre)</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {preview.map((reg, idx) => {
                    const isEditing = editingIndex === idx;
                    const r = isEditing ? editForm! : reg;

                    return (
                      <tr key={idx} className={`transition-all ${isEditing ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-4">
                          {isEditing ? (
                            <input 
                              type="date"
                              value={r.fecha}
                              onChange={e => setEditForm({...r, fecha: e.target.value})}
                              className="w-full p-2 text-xs font-black border-2 border-emerald-100 rounded-xl focus:border-emerald-500 outline-none bg-white cursor-pointer"
                            />
                          ) : (
                            <span className="text-xs font-black text-slate-800 whitespace-nowrap">{r.fecha}</span>
                          )}
                        </td>
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
                          <div className="flex items-center gap-6">
                            {/* Trabajador */}
                            <div className="flex-1">
                              {isEditing ? (
                                <FirmaSelector 
                                  label="Trabajador"
                                  options={catalogoTrabajadores}
                                  value={r.firmas.trabajador}
                                  onChange={f => setEditForm({...r, firmas: {...r.firmas, trabajador: f}})}
                                />
                              ) : (!r.firmas.trabajador?.ruta && asignacionManual) ? (
                                <FirmaSelector 
                                  label="Asignar Trabajador"
                                  options={catalogoTrabajadores}
                                  value={r.firmas.trabajador}
                                  onChange={f => {
                                    setPreview(prev => prev.map((item, i) => i === idx ? { ...item, firmas: { ...item.firmas, trabajador: f } } : item));
                                  }}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                    {r.firmas.trabajador?.ruta ? (
                                      <img src={r.firmas.trabajador.ruta} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User size={14} className="text-slate-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                      <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Trabajador</p>
                                      {r.firmas.trabajador?.origen === 'hojas_de_vida' && (
                                        <span className="text-[8px] bg-blue-100 text-blue-700 font-bold px-1 rounded">HV</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-600 truncate">{r.firmas.trabajador?.nombre || 'No asignado'}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Supervisor */}
                            <div className="flex-1">
                              {isEditing ? (
                                <FirmaSelector 
                                  label="Supervisor"
                                  options={firmasCargadas.supervisor}
                                  value={r.firmas.supervisor}
                                  onChange={f => setEditForm({...r, firmas: {...r.firmas, supervisor: f}})}
                                />
                              ) : (!r.firmas.supervisor?.ruta && asignacionManual) ? (
                                <FirmaSelector 
                                  label="Asignar Supervisor"
                                  options={firmasCargadas.supervisor}
                                  value={r.firmas.supervisor}
                                  onChange={f => {
                                    setPreview(prev => prev.map((item, i) => i === idx ? { ...item, firmas: { ...item.firmas, supervisor: f } } : item));
                                  }}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                    {r.firmas.supervisor?.ruta ? (
                                      <img src={r.firmas.supervisor.ruta} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User size={14} className="text-slate-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Supervisor</p>
                                    <p className="text-[10px] font-bold text-slate-600 truncate">{r.firmas.supervisor?.nombre || 'No asignado'}</p>
                                  </div>
                                </div>
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
                            <div className="flex justify-end gap-1">
                              {idx > 0 && (
                                <button onClick={() => moverFila(idx, 'arriba')} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Mover arriba">
                                  <ArrowUp size={14} />
                                </button>
                              )}
                              {idx < preview.length - 1 && (
                                <button onClick={() => moverFila(idx, 'abajo')} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Mover abajo">
                                  <ArrowDown size={14} />
                                </button>
                              )}
                              <button onClick={() => startEditing(idx)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Editar fila">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => eliminarFila(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Eliminar fila">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
              <button
                onClick={agregarFilaNueva}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-emerald-600 border border-emerald-100 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 border-dashed"
              >
                <Plus size={16} />
                Añadir Fila
              </button>
              <button
                onClick={() => setArchivo(null)}
                className="flex-[0.5] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 border border-slate-100 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={editingIndex !== null}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
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
