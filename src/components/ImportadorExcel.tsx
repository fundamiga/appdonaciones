import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Upload, Check, AlertCircle, X, Info, Edit2, Save, RotateCcw, Search, ChevronDown, User, Image as ImageIcon, Trash2, Plus, ArrowUp, ArrowDown, Loader2, CheckCircle2, Calendar, Dices, Sparkles, BookOpen, UserCheck } from 'lucide-react';
import { procesarArchivoExcel } from '@/utils/importador';
import { procesarArchivoPdf } from '@/utils/importadorPdf';
import { RegistroDiario, Firma } from '@/types';
import { useFirmas } from '@/hooks/useFirmas';
import { EntradaHistorial } from '@/hooks/useHistorial';
import { FirmaService } from '@/services/firmaService';


export interface ArchivoEstado {
  archivo: File;
  estado: 'pendiente' | 'procesando' | 'listo' | 'error';
  registros: RegistroDiario[];
  error?: string;
  descartado: boolean;
}

interface ImportadorExcelProps {
  onImport: (registros: RegistroDiario[]) => void;
  onImportarMultiples?: (grupos: RegistroDiario[][]) => void;
  historial?: EntradaHistorial[];
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
    .replace(/z/g, "s")             // Normalizar z -> s
    .replace(/v/g, "b")             // Normalizar v -> b
    .replace(/[^a-z0-9]/g, " ")     // Solo letras/números
    .trim()
    .replace(/\s+/g, " ");          // Espacios simples
};

const nombresCoinciden = (nombre1: string, nombre2: string) => {
  if (!nombre1 || !nombre2) return false;
  const n1 = normalizarNombre(nombre1);
  const n2 = normalizarNombre(nombre2);
  
  if (n1 === n2) return true;

  const palabras1 = n1.split(' ').filter(p => p.length >= 2);
  const palabras2 = n2.split(' ').filter(p => p.length >= 2);

  if (palabras1.length === 0 || palabras2.length === 0) return false;

  // Si uno está contenido en el otro exactamente
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Contar palabras que coinciden (o se contienen para nombres parciales como Isa / Isabella)
  let coincidencias = 0;
  for (const p1 of palabras1) {
    if (palabras2.some(p2 => p1 === p2 || (p1.length >= 4 && p2.length >= 4 && (p1.includes(p2) || p2.includes(p1))))) {
      coincidencias++;
    }
  }

  // Si coinciden 2 o más palabras clave (ej: "BERMUDES ISABELLA" y "ISABELA BERMUDEZ", o "CARO MARIN" y "YULI CARO")
  if (coincidencias >= 2) return true;

  // Si uno de los nombres tiene solo 1 palabra y coincide con una palabra significativa del otro
  if ((palabras1.length === 1 || palabras2.length === 1) && coincidencias >= 1) {
    return true;
  }

  return false;
};


const UBICACIONES_VALIDAS = [
  '5ta con 6ta', '6ta con 6ta', '2da con 10', 'Bolivar', 
  'Carton Colombia', 'Guacanda', 'Galeria', 'Guabinas', 
  'Mayorista', 'Rozo'
];

interface ZonaSupervisorConfig {
  id: 'noe' | 'donella' | 'marilin';
  nombreDefecto: string;
  titulo: string;
  ubicaciones: string[];
  descripcion: string;
}

const ZONAS_SUPERVISOR: ZonaSupervisorConfig[] = [
  {
    id: 'noe',
    nombreDefecto: 'NOE CONTRERAS',
    titulo: 'Zona 1 (Noé Contreras)',
    ubicaciones: ['5ta con 6ta', '6ta con 6ta', 'Bolivar', 'Guabinas'],
    descripcion: '5ta con 6ta, 6ta con 6ta, Bolívar, Guabinas'
  },
  {
    id: 'donella',
    nombreDefecto: 'DONELLA GARZON',
    titulo: 'Zona 2 (Donella Garzón)',
    ubicaciones: ['2da con 10', '2 con 10', 'Galeria', 'Guacanda', 'Mayorista', 'Rozo'],
    descripcion: '2da con 10, Galería, Guacanda, Mayorista, Rozo'
  },
  {
    id: 'marilin',
    nombreDefecto: 'MARILIN VALDES',
    titulo: 'Zona 3 (Marilin Valdés)',
    ubicaciones: ['Carton Colombia'],
    descripcion: 'Cartón Colombia'
  }
];

export const ImportadorExcel: React.FC<ImportadorExcelProps> = ({ onImport, onCancel, onImportarMultiples, historial = [] }) => {
  const { firmas: firmasCargadas, loading: cargandoFirmas } = useFirmas();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<RegistroDiario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RegistroDiario | null>(null);

  // Estados para modo selección múltiple
  const [modoMultiple, setModoMultiple] = useState(false);
  const [archivosEstado, setArchivosEstado] = useState<ArchivoEstado[]>([]);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(0);
  const [alertasDuplicados, setAlertasDuplicados] = useState<string[]>([]);
  const [procesandoMultiple, setProcesandoMultiple] = useState(false);

  // Estados para los 3 supervisores de zona
  const [supervisorZona1, setSupervisorZona1] = useState<Firma | null>(null);
  const [supervisorZona2, setSupervisorZona2] = useState<Firma | null>(null);
  const [supervisorZona3, setSupervisorZona3] = useState<Firma | null>(null);

  // Estado para zonas extra personalizadas
  interface ZonaExtra {
    id: string;
    supervisor: Firma | null;
    ubicaciones: string[]; // ubicaciones seleccionadas para esta zona
  }
  const [zonasExtra, setZonasExtra] = useState<ZonaExtra[]>([]);

  // Estados para opciones avanzadas de firmas (Hojas de Vida, Asignación Manual, Random)
  const [buscarEnHojasVida, setBuscarEnHojasVida] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('importador_buscar_hv');
      return v === null ? true : v === 'true';
    }
    return true;
  });
  const [firmasHojasVida, setFirmasHojasVida] = useState<Firma[]>([]);
  const [cargandoHojasVida, setCargandoHojasVida] = useState(false);

  const [asignacionManual, setAsignacionManual] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('importador_asig_manual');
      return v === null ? true : v === 'true';
    }
    return true;
  });
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  const mostrarAviso = (msg: string) => {
    setToastFeedback(msg);
    setTimeout(() => setToastFeedback(null), 3500);
  };

  // Cargar firmas desde Hojas de Vida (Expedientes Supabase)
  useEffect(() => {
    if (buscarEnHojasVida && firmasHojasVida.length === 0) {
      setCargandoHojasVida(true);
      FirmaService.obtenerFirmasHojasDeVida()
        .then(f => {
          setFirmasHojasVida(f);
        })
        .catch(() => {})
        .finally(() => setCargandoHojasVida(false));
    }
  }, [buscarEnHojasVida]);

  const toggleBuscarHojasVida = () => {
    const nuevo = !buscarEnHojasVida;
    setBuscarEnHojasVida(nuevo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('importador_buscar_hv', String(nuevo));
    }
    if (nuevo && firmasHojasVida.length === 0) {
      setCargandoHojasVida(true);
      FirmaService.obtenerFirmasHojasDeVida()
        .then(f => {
          setFirmasHojasVida(f);
          mostrarAviso(`📄 ${f.length} firmas cargadas desde Hojas de Vida`);
        })
        .catch(() => {})
        .finally(() => setCargandoHojasVida(false));
    } else if (nuevo) {
      mostrarAviso(`📄 Búsqueda en Hojas de Vida activa (${firmasHojasVida.length} firmas)`);
    } else {
      mostrarAviso('Búsqueda en Hojas de Vida desactivada');
    }
  };

  const toggleAsignacionManual = () => {
    const nuevo = !asignacionManual;
    setAsignacionManual(nuevo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('importador_asig_manual', String(nuevo));
    }
    mostrarAviso(nuevo ? '✍️ Asignación manual activa: se resaltarán las firmas faltantes' : 'Asignación manual desactivada');
  };

  // Catálogo unificado de trabajadores (Donaciones + Hojas de Vida si está activo)
  const catalogoTrabajadores = useMemo(() => {
    const base = [...firmasCargadas.trabajador];
    if (buscarEnHojasVida && firmasHojasVida.length > 0) {
      firmasHojasVida.forEach(hv => {
        if (!base.some(b => nombresCoinciden(b.nombre, hv.nombre))) {
          base.push(hv);
        }
      });
    }
    return base;
  }, [firmasCargadas.trabajador, buscarEnHojasVida, firmasHojasVida]);

  // Si cargan firmas de Hojas de Vida y ya hay registros en preview, intentar asignarlas a los que no tienen firma
  useEffect(() => {
    if (buscarEnHojasVida && firmasHojasVida.length > 0 && preview.length > 0) {
      let enriquecidos = 0;
      setPreview(prev =>
        prev.map(reg => {
          if (!reg.firmas.trabajador?.ruta && reg.firmas.trabajador?.nombre) {
            const match = firmasHojasVida.find(f =>
              nombresCoinciden(f.nombre, reg.firmas.trabajador!.nombre)
            );
            if (match) {
              enriquecidos++;
              return {
                ...reg,
                firmas: {
                  ...reg.firmas,
                  trabajador: match,
                },
              };
            }
          }
          return reg;
        })
      );
      if (enriquecidos > 0) {
        mostrarAviso(`✨ Se reconocieron ${enriquecidos} firmas desde Hojas de Vida`);
      }
    }
  }, [firmasHojasVida, buscarEnHojasVida]);

  // Asignar firma aleatoria ("Random") a todos los registros que no tengan firma
  const aplicarFirmasAleatorias = () => {
    if (catalogoTrabajadores.length === 0) {
      alert('No hay firmas de trabajadores disponibles para asignar.');
      return;
    }

    let asignadas = 0;
    const asignarARegistros = (regs: RegistroDiario[]) => {
      return regs.map(reg => {
        if (!reg.firmas.trabajador || !reg.firmas.trabajador.ruta) {
          const randomIndex = Math.floor(Math.random() * catalogoTrabajadores.length);
          const firmaRandom = catalogoTrabajadores[randomIndex];
          asignadas++;
          return {
            ...reg,
            firmas: {
              ...reg.firmas,
              trabajador: firmaRandom,
            },
          };
        }
        return reg;
      });
    };

    setPreview(prev => asignarARegistros(prev));

    if (modoMultiple) {
      setArchivosEstado(prevArchivos =>
        prevArchivos.map(arch => ({
          ...arch,
          registros: asignarARegistros(arch.registros),
        }))
      );
    }

    mostrarAviso(`🎲 Se asignaron firmas aleatorias a ${asignadas} turnos faltantes`);
  };

  // Sincronizar firmas de supervisores por defecto cuando cargan las firmas
  useEffect(() => {
    if (firmasCargadas.supervisor.length > 0) {
      if (!supervisorZona1) {
        const supNoe = firmasCargadas.supervisor.find(f => nombresCoinciden(f.nombre, 'NOE CONTRERAS')) || { nombre: 'NOE CONTRERAS', tipo: 'supervisor', ruta: '' };
        setSupervisorZona1(supNoe);
      }
      if (!supervisorZona2) {
        const supDonella = firmasCargadas.supervisor.find(f => nombresCoinciden(f.nombre, 'DONELLA GARZON')) || { nombre: 'DONELLA GARZON', tipo: 'supervisor', ruta: '' };
        setSupervisorZona2(supDonella);
      }
      if (!supervisorZona3) {
        const supMarilin = firmasCargadas.supervisor.find(f => nombresCoinciden(f.nombre, 'MARILIN VALDES')) || { nombre: 'MARILIN VALDES', tipo: 'supervisor', ruta: '' };
        setSupervisorZona3(supMarilin);
      }
    }
  }, [firmasCargadas.supervisor]);


  const agregarZonaExtra = () => {
    setZonasExtra(prev => [...prev, {
      id: `extra-${Date.now()}`,
      supervisor: null,
      ubicaciones: []
    }]);
  };

  const eliminarZonaExtra = (id: string) => {
    setZonasExtra(prev => prev.filter(z => z.id !== id));
  };

  const aplicarCambioZonaExtra = (zonaId: string, nuevaFirma: Firma | null, ubicaciones: string[]) => {
    setZonasExtra(prev => prev.map(z =>
      z.id === zonaId ? { ...z, supervisor: nuevaFirma, ubicaciones } : z
    ));

    const matchUbicacion = (ubicacion: string) => {
      const ubiNorm = normalizarNombre(ubicacion);
      return ubicaciones.some(u => normalizarNombre(u) === ubiNorm);
    };

    setPreview(prev => prev.map(reg => {
      if (matchUbicacion(reg.ubicacion)) {
        return { ...reg, firmas: { ...reg.firmas, supervisor: nuevaFirma } };
      }
      return reg;
    }));

    if (editForm && matchUbicacion(editForm.ubicacion)) {
      setEditForm({ ...editForm, firmas: { ...editForm.firmas, supervisor: nuevaFirma } });
    }

    setArchivosEstado(prevArchivos => prevArchivos.map(arch => ({
      ...arch,
      registros: arch.registros.map(reg => {
        if (matchUbicacion(reg.ubicacion)) {
          return { ...reg, firmas: { ...reg.firmas, supervisor: nuevaFirma } };
        }
        return reg;
      })
    })));
  };

  const obtenerSupervisorParaUbicacion = (ubicacion: string): Firma | null => {
    const ubiNormal = normalizarNombre(ubicacion);

    const supNoeDefault = firmasCargadas.supervisor.find(f => nombresCoinciden(f.nombre, 'NOE CONTRERAS')) || { nombre: 'NOE CONTRERAS', tipo: 'supervisor' as const, ruta: '' };
    const supDonellaDefault = firmasCargadas.supervisor.find(f => nombresCoinciden(f.nombre, 'DONELLA GARZON')) || { nombre: 'DONELLA GARZON', tipo: 'supervisor' as const, ruta: '' };
    const supMarilinDefault = firmasCargadas.supervisor.find(f => nombresCoinciden(f.nombre, 'MARILIN VALDES')) || { nombre: 'MARILIN VALDES', tipo: 'supervisor' as const, ruta: '' };

    if (ZONAS_SUPERVISOR[0].ubicaciones.some(u => normalizarNombre(u) === ubiNormal)) {
      return supervisorZona1 || supNoeDefault;
    }
    if (ZONAS_SUPERVISOR[1].ubicaciones.some(u => normalizarNombre(u) === ubiNormal)) {
      return supervisorZona2 || supDonellaDefault;
    }
    if (ZONAS_SUPERVISOR[2].ubicaciones.some(u => normalizarNombre(u) === ubiNormal)) {
      return supervisorZona3 || supMarilinDefault;
    }
    return null;
  };

  const handleCambiarSupervisorZona = (zonaId: 'noe' | 'donella' | 'marilin', nuevaFirma: Firma | null) => {
    const zona = ZONAS_SUPERVISOR.find(z => z.id === zonaId);
    if (!zona) return;

    if (zonaId === 'noe') setSupervisorZona1(nuevaFirma);
    if (zonaId === 'donella') setSupervisorZona2(nuevaFirma);
    if (zonaId === 'marilin') setSupervisorZona3(nuevaFirma);

    const matchUbicacion = (ubicacion: string) => {
      const ubiNorm = normalizarNombre(ubicacion);
      return zona.ubicaciones.some(u => normalizarNombre(u) === ubiNorm);
    };

    // Actualizar filas en preview
    setPreview(prev => prev.map(reg => {
      if (matchUbicacion(reg.ubicacion)) {
        return {
          ...reg,
          firmas: {
            ...reg.firmas,
            supervisor: nuevaFirma
          }
        };
      }
      return reg;
    }));

    // Actualizar formulario en edición activa si aplica
    if (editForm && matchUbicacion(editForm.ubicacion)) {
      setEditForm({
        ...editForm,
        firmas: {
          ...editForm.firmas,
          supervisor: nuevaFirma
        }
      });
    }

    // Actualizar todos los registros en archivos de modo múltiple
    setArchivosEstado(prevArchivos => prevArchivos.map(arch => ({
      ...arch,
      registros: arch.registros.map(reg => {
        if (matchUbicacion(reg.ubicacion)) {
          return {
            ...reg,
            firmas: {
              ...reg.firmas,
              supervisor: nuevaFirma
            }
          };
        }
        return reg;
      })
    })));
  };

  const enriquecerRegistros = (registrosBase: RegistroDiario[]): RegistroDiario[] => {
    return registrosBase.map(reg => {
      const melisa = firmasCargadas.responsable.find(f => 
        normalizarNombre(f.nombre).includes('melis')
      ) || null;
      
      const nombreImportado = reg.firmas.trabajador?.nombre || '';
      const trabajadorMatch = catalogoTrabajadores.find(f => 
        nombresCoinciden(f.nombre, nombreImportado)
      ) || null;

      
      const supervisorAsignado = obtenerSupervisorParaUbicacion(reg.ubicacion);

      return {
        ...reg,
        firmas: {
          trabajador: trabajadorMatch || reg.firmas.trabajador,
          supervisor: supervisorAsignado || reg.firmas.supervisor,
          responsable: melisa
        }
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Si seleccionó más de 1 archivo
    if (files.length > 1) {
      setModoMultiple(true);
      setAlertasDuplicados([]);
      setProcesandoMultiple(true);

      const estadosIniciales: ArchivoEstado[] = Array.from(files).map(f => ({
        archivo: f,
        estado: 'pendiente',
        registros: [],
        descartado: false,
      }));
      setArchivosEstado(estadosIniciales);

      const resultados = await Promise.allSettled(
        Array.from(files).map(async (file, idx) => {
          setArchivosEstado(prev => prev.map((a, i) => i === idx ? { ...a, estado: 'procesando' } : a));
          const isPdf = file.name.toLowerCase().endsWith('.pdf');
          const registrosBase = isPdf 
            ? await procesarArchivoPdf(file) 
            : await procesarArchivoExcel(file);
          return { idx, registros: enriquecerRegistros(registrosBase) };
        })
      );

      const estadosFinales = [...estadosIniciales];
      resultados.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          estadosFinales[idx] = { ...estadosFinales[idx], estado: 'listo', registros: res.value.registros };
        } else {
          estadosFinales[idx] = { ...estadosFinales[idx], estado: 'error', error: res.reason?.message || 'Error desconocido' };
        }
      });

      setArchivosEstado(estadosFinales);
      setProcesandoMultiple(false);

      // Detectar días duplicados
      const fechasEnArchivos = estadosFinales
        .filter(a => a.estado === 'listo' && a.registros.length > 0)
        .map(a => ({ nombre: a.archivo.name, fecha: a.registros[0].fecha }));

      const alertas: string[] = [];
      const fechasHistorial = (historial || []).map(h => h.fecha);

      fechasEnArchivos.forEach(({ nombre, fecha }) => {
        if (fechasHistorial.includes(fecha)) {
          alertas.push(`⚠️ "${nombre}" tiene la fecha ${fecha} que ya existe en el historial.`);
        }
      });

      const fechasVistas = new Map<string, string>();
      fechasEnArchivos.forEach(({ nombre, fecha }) => {
        if (fechasVistas.has(fecha)) {
          alertas.push(`⚠️ "${nombre}" y "${fechasVistas.get(fecha)}" tienen la misma fecha: ${fecha}.`);
        } else {
          fechasVistas.set(fecha, nombre);
        }
      });

      setAlertasDuplicados(alertas);
      e.target.value = '';

      // Auto-seleccionar primer archivo listo
      const primerListo = estadosFinales.findIndex(a => a.estado === 'listo');
      if (primerListo >= 0) {
        setArchivoSeleccionado(primerListo);
        setArchivo(files[primerListo]);
        setPreview(estadosFinales[primerListo].registros);
      }
      return;
    }

    // Modo 1 solo archivo (original)
    const file = files[0];
    setModoMultiple(false);
    setArchivo(file);
    setCargando(true);
    setError(null);

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    try {
      const registrosBase = isPdf 
        ? await procesarArchivoPdf(file) 
        : await procesarArchivoExcel(file);
      
      setPreview(enriquecerRegistros(registrosBase));
    } catch (err: any) {
      const msg = err?.message ? err.message : 'Asegúrate de que sea un archivo válido.';
      setError(`No se pudo procesar el archivo ${isPdf ? 'PDF' : 'Excel'}. ${msg}`);
      console.error('Error procesando el archivo:', err);
    } finally {
      setCargando(false);
    }
  };

  const cambiarArchivo = (nuevoIdx: number) => {
    if (nuevoIdx === archivoSeleccionado) return;
    // Guardar cambios del preview actual en el archivo que se deja
    setArchivosEstado(prev => prev.map((a, i) => 
      i === archivoSeleccionado ? { ...a, registros: preview } : a
    ));
    // Cargar el nuevo archivo
    setArchivoSeleccionado(nuevoIdx);
    setArchivo(archivosEstado[nuevoIdx].archivo);
    setPreview(archivosEstado[nuevoIdx].registros);
    setEditingIndex(null);
    setEditForm(null);
  };

  const descartarArchivo = (idx: number) => {
    setArchivosEstado(prev => prev.map((a, i) => 
      i === idx ? { ...a, descartado: !a.descartado } : a
    ));
  };

  const resetearModo = () => {
    setModoMultiple(false);
    setArchivosEstado([]);
    setAlertasDuplicados([]);
    setArchivoSeleccionado(0);
    setArchivo(null);
    setPreview([]);
    setError(null);
  };

  const handleGuardarTodosAlHistorial = () => {
    if (!onImportarMultiples) return;
    const estadosActualizados = archivosEstado.map((a, i) => 
      i === archivoSeleccionado ? { ...a, registros: preview } : a
    );
    const grupos = estadosActualizados
      .filter(a => a.estado === 'listo' && !a.descartado && a.registros.length > 0)
      .map(a => a.registros);
    if (grupos.length === 0) return;
    onImportarMultiples(grupos);
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
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh] w-full">
      <div className="bg-slate-900 px-6 py-5 text-white relative shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Importador de Plantilla</h2>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-0.5">Sube tu Excel o PDF para generación automática</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 min-h-0 flex flex-col">
        {!archivo && !modoMultiple ? (
          <label className="group cursor-pointer block">
            <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-500 bg-slate-50/50">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <Upload size={32} className="text-emerald-500" />
              </div>
              <p className="text-slate-900 font-black text-xl mb-2">Selecciona uno o varios archivos</p>
              <p className="text-slate-400 text-sm font-medium mb-2">Formatos admitidos: .xlsx, .xls, .csv, .pdf</p>
              <p className="text-slate-400 text-xs font-bold mb-8">💡 Puedes seleccionar varios PDFs a la vez para cargar varios días juntos</p>
              <div className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
                Explorar Archivos
              </div>
            </div>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFileChange} multiple />
          </label>
        ) : (
          <div className="space-y-5 flex-1 flex flex-col min-h-0">
            {/* ── PESTAÑAS (solo en modo selección múltiple) ── */}
            {modoMultiple && (
              <div className="space-y-3 shrink-0">
                {/* Alertas de duplicados */}
                {alertasDuplicados.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-widest">
                      <AlertCircle size={16} />
                      Días duplicados detectados
                    </div>
                    {alertasDuplicados.map((alerta, i) => (
                      <p key={i} className="text-amber-800 text-xs font-medium">{alerta}</p>
                    ))}
                  </div>
                )}

                {/* Barra de pestañas */}
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {archivosEstado.map((ae, idx) => (
                    <button
                      key={idx}
                      onClick={() => ae.estado === 'listo' && !ae.descartado && cambiarArchivo(idx)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shrink-0 border ${
                        ae.descartado
                          ? 'opacity-30 border-slate-100 bg-slate-50 text-slate-400 line-through cursor-default'
                          : idx === archivoSeleccionado
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : ae.estado === 'error'
                              ? 'border-red-200 bg-red-50 text-red-500 cursor-default'
                              : ae.estado === 'listo'
                                ? 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer'
                                : 'border-slate-100 bg-slate-50 text-slate-400 cursor-default'
                      }`}
                    >
                      {ae.estado === 'procesando' || ae.estado === 'pendiente' ? (
                        <Loader2 size={13} className="animate-spin text-slate-400" />
                      ) : ae.estado === 'listo' ? (
                        <CheckCircle2 size={13} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={13} className="text-red-400" />
                      )}
                      <span className="truncate max-w-[130px]">{ae.archivo.name}</span>
                      {ae.estado === 'listo' && (
                        <span className="text-[9px] opacity-60">({ae.registros.length})</span>
                      )}
                      {ae.estado === 'listo' && !ae.descartado && (
                        <span
                          onClick={(e) => { e.stopPropagation(); descartarArchivo(idx); }}
                          className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer"
                          title="Descartar archivo"
                        >
                          <X size={12} />
                        </span>
                      )}
                      {ae.descartado && (
                        <span
                          onClick={(e) => { e.stopPropagation(); descartarArchivo(idx); }}
                          className="p-0.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-all cursor-pointer"
                          title="Restaurar archivo"
                        >
                          <RotateCcw size={12} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cabecera del archivo actual */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-blue-900 text-sm font-bold tracking-tight">Archivo: <span className="text-blue-600 font-black">{archivo?.name}</span></p>
                  <p className="text-blue-700/70 text-xs font-medium mt-0.5">Se han detectado {preview.length} registros. Puedes editarlos antes de confirmar.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {registrosIncompletos > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 shadow-sm">
                    <AlertCircle size={18} className="text-red-500 animate-pulse" />
                    <span className="text-sm font-black text-red-600">{registrosIncompletos} Faltantes</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 sm:items-end">
                  <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Ajustar Fecha a todos</label>
                  <input 
                    type="date" 
                    className="p-2 w-full sm:w-auto text-xs font-bold text-slate-700 border border-blue-200 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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

            {/* Aviso Toast Flotante */}
            {toastFeedback && (
              <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[150] bg-slate-900/95 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-150 border border-slate-700">
                <Sparkles size={15} className="text-yellow-400 shrink-0" />
                <span>{toastFeedback}</span>
              </div>
            )}

            {/* Panel de Control Inteligente de Firmas de Trabajadores */}
            <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/70 to-slate-50 border border-emerald-200/80 rounded-2xl p-4 shadow-sm shrink-0">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Reconocimiento y Asignación de Firmas
                      </h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                        {catalogoTrabajadores.length} disponibles
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Reconoce firmas desde Donaciones y expedientes de Hojas de Vida, con soporte manual y aleatorio.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Toggle: Buscar en Hojas de Vida */}
                  <button
                    type="button"
                    onClick={toggleBuscarHojasVida}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      buscarEnHojasVida
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Buscar firmas en el programa de Hojas de Vida (Expedientes Supabase)"
                  >
                    <BookOpen size={13} />
                    <span>Hojas de Vida</span>
                    {cargandoHojasVida ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${buscarEnHojasVida ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {buscarEnHojasVida ? (firmasHojasVida.length > 0 ? `${firmasHojasVida.length} firmas` : 'Buscando...') : 'OFF'}
                      </span>
                    )}
                  </button>

                  {/* Toggle: Asignación Manual */}
                  <button
                    type="button"
                    onClick={toggleAsignacionManual}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      asignacionManual
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Resaltar avisos para poner firma manual a las filas que no tengan"
                  >
                    <UserCheck size={13} />
                    <span>Asignación Manual</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${asignacionManual ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {asignacionManual ? 'ACTIVA' : 'OFF'}
                    </span>
                  </button>

                  {/* Botón: Asignar Aleatorio (Random) */}
                  <button
                    type="button"
                    onClick={aplicarFirmasAleatorias}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
                    title="Colocar una firma aleatoria de las disponibles a todas las filas sin firma"
                  >
                    <Dices size={14} className="text-yellow-400" />
                    <span>Firma Random a Faltantes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Panel de Asignación Rápida de Supervisores por Zona */}

            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-sm shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-xs">
                    <User size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Supervisores Asignados por Zona (Cambio Automático)
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Modifica el supervisor aquí si hubo un reemplazo; el cambio se propagará de inmediato a todas las filas de esa zona en todos los días/registros.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Zona 1: Noé Contreras */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="mb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                        Zona 1 • Noé Contreras
                      </p>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-100">
                        4 sedes
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5" title="5ta con 6ta, 6ta con 6ta, Bolívar, Guabinas">
                      5ta con 6ta, 6ta con 6ta, Bolívar, Guabinas
                    </p>
                  </div>
                  <FirmaSelector
                    label="Supervisor Asignado"
                    options={firmasCargadas.supervisor}
                    value={supervisorZona1}
                    onChange={(f) => handleCambiarSupervisorZona('noe', f)}
                  />
                </div>

                {/* Zona 2: Donella Garzón */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="mb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                        Zona 2 • Donella Garzón
                      </p>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-100">
                        5 sedes
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5" title="2da con 10, Galería, Guacanda, Mayorista, Rozo">
                      2da con 10, Galería, Guacanda, Mayorista, Rozo
                    </p>
                  </div>
                  <FirmaSelector
                    label="Supervisor Asignado"
                    options={firmasCargadas.supervisor}
                    value={supervisorZona2}
                    onChange={(f) => handleCambiarSupervisorZona('donella', f)}
                  />
                </div>

                {/* Zona 3: Marilin Valdés */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="mb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                        Zona 3 • Marilin Valdés
                      </p>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-100">
                        1 sede
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5" title="Cartón Colombia">
                      Cartón Colombia
                    </p>
                  </div>
                  <FirmaSelector
                    label="Supervisor Asignado"
                    options={firmasCargadas.supervisor}
                    value={supervisorZona3}
                    onChange={(f) => handleCambiarSupervisorZona('marilin', f)}
                  />
                </div>
              </div>

              {/* Zonas extra personalizadas */}
              {zonasExtra.length > 0 && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-px flex-1 bg-slate-200/80" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Zonas personalizadas</span>
                    <div className="h-px flex-1 bg-slate-200/80" />
                  </div>
                  {zonasExtra.map((zona, idx) => (
                    <div key={zona.id} className="bg-white border-2 border-dashed border-emerald-200 rounded-xl p-3 relative">
                      {/* Cabecera zona extra */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">
                            {idx + 4}
                          </span>
                          <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                            Zona Extra {idx + 1}
                            {zona.supervisor ? ` • ${zona.supervisor.nombre}` : ' • Sin asignar'}
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarZonaExtra(zona.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Eliminar zona extra"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Selector de supervisor */}
                        <div>
                          <FirmaSelector
                            label="Firma del supervisor"
                            options={firmasCargadas.supervisor}
                            value={zona.supervisor}
                            onChange={(f) => aplicarCambioZonaExtra(zona.id, f, zona.ubicaciones)}
                          />
                        </div>

                        {/* Selector de sedes */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                            Sedes que cubre esta zona
                          </label>
                          <div className="border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {UBICACIONES_VALIDAS.map(ubi => {
                              const checked = zona.ubicaciones.includes(ubi);
                              return (
                                <label
                                  key={ubi}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-100 text-slate-600'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    className="accent-emerald-500 cursor-pointer"
                                    onChange={() => {
                                      const nuevasUbicaciones = checked
                                        ? zona.ubicaciones.filter(u => u !== ubi)
                                        : [...zona.ubicaciones, ubi];
                                      aplicarCambioZonaExtra(zona.id, zona.supervisor, nuevasUbicaciones);
                                    }}
                                  />
                                  <span className="text-[11px] font-bold">{ubi}</span>
                                </label>
                              );
                            })}
                          </div>
                          {zona.ubicaciones.length === 0 && (
                            <p className="text-[9px] text-amber-600 font-bold mt-1">
                              ⚠ Selecciona al menos una sede
                            </p>
                          )}
                          {zona.ubicaciones.length > 0 && (
                            <p className="text-[9px] text-emerald-600 font-bold mt-1">
                              ✓ {zona.ubicaciones.length} sede(s) seleccionada(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón agregar zona extra */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={agregarZonaExtra}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-emerald-300 text-emerald-600 text-xs font-black uppercase tracking-wider hover:bg-emerald-50 transition-all"
                >
                  <Plus size={14} />
                  Agregar otro supervisor
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600">
                <AlertCircle size={20} />
                <p className="text-sm font-bold tracking-tight">{error}</p>
              </div>
            )}

            <div className="overflow-y-auto rounded-3xl border border-slate-100 shadow-sm custom-scrollbar" style={{maxHeight: '55vh'}}>
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="px-5 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Fecha</th>
                    <th className="px-5 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Ubicación</th>
                    <th className="px-5 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                    <th className="px-5 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-center">Donantes</th>
                    <th className="px-5 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-center">Tipo</th>
                    <th className="px-5 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Asignación de Firmas</th>
                    <th className="px-5 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {preview.map((reg, idx) => {
                    const isEditing = editingIndex === idx;
                    const r = isEditing ? editForm! : reg;

                    return (
                      <tr key={idx} className={`transition-all ${isEditing ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input 
                              type="date"
                              value={r.fecha}
                              onChange={e => setEditForm({...r, fecha: e.target.value})}
                              className="w-full p-2 text-sm font-black border-2 border-emerald-100 rounded-xl focus:border-emerald-500 outline-none bg-white cursor-pointer"
                            />
                          ) : (
                            <span className="text-sm font-black text-slate-800 whitespace-nowrap">{r.fecha}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select 
                              value={r.ubicacion} 
                              onChange={e => setEditForm({...r, ubicacion: e.target.value})}
                              className="w-full p-2 text-sm font-black border-2 border-emerald-100 rounded-xl focus:border-emerald-500 outline-none bg-white"
                            >
                              {UBICACIONES_VALIDAS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          ) : (
                            <span className="text-sm font-black text-slate-800">{r.ubicacion}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={r.donaciones.valor} 
                              onChange={e => setEditForm({...r, donaciones: {...r.donaciones, valor: Number(e.target.value)}})}
                              className="w-28 p-2 text-sm font-bold border-2 border-emerald-100 rounded-xl text-right outline-none focus:border-emerald-500"
                            />
                          ) : (
                            <span className="text-sm font-black text-emerald-600">${r.donaciones.valor.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={r.donaciones.cantidadDonantes} 
                              onChange={e => setEditForm({...r, donaciones: {...r.donaciones, cantidadDonantes: Number(e.target.value)}})}
                              className="w-16 p-2 text-sm font-bold border-2 border-emerald-100 rounded-xl text-center outline-none focus:border-emerald-500"
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-700">{r.donaciones.cantidadDonantes}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isEditing ? (
                            <select 
                              value={r.tipoParqueadero} 
                              onChange={e => setEditForm({...r, tipoParqueadero: e.target.value as any})}
                              className="p-2 text-xs font-black uppercase border-2 border-emerald-100 rounded-xl outline-none"
                            >
                              <option value="motos">Motos</option>
                              <option value="carros">Carros</option>
                            </select>
                          ) : (
                            <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${r.tipoParqueadero === 'motos' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                              {r.tipoParqueadero}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
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
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border-2 ${r.firmas.trabajador?.ruta ? 'border-emerald-200 bg-white' : (asignacionManual ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100 bg-slate-50')}`}>
                                    {r.firmas.trabajador?.ruta ? (
                                      <img src={r.firmas.trabajador.ruta} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User size={20} className={asignacionManual ? 'text-amber-500' : 'text-slate-300'} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Trabajador</p>
                                      {r.firmas.trabajador?.origen === 'hojas_de_vida' && (
                                        <span className="text-[9px] bg-blue-100 text-blue-700 font-black px-1.5 py-0.2 rounded" title="Firma obtenida de Hojas de Vida">HV</span>
                                      )}
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[130px]">
                                      {r.firmas.trabajador?.nombre || 'No asignado'}
                                    </p>
                                    {!r.firmas.trabajador?.ruta && asignacionManual && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingIndex(idx);
                                          setEditForm({ ...r });
                                        }}
                                        className="mt-1 flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                                      >
                                        <AlertCircle size={10} className="text-amber-600" />
                                        <span>Asignar manual</span>
                                      </button>
                                    )}
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
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border-2 ${r.firmas.supervisor?.ruta ? 'border-emerald-200 bg-white' : (asignacionManual ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100 bg-slate-50')}`}>
                                    {r.firmas.supervisor?.ruta ? (
                                      <img src={r.firmas.supervisor.ruta} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User size={20} className={asignacionManual ? 'text-amber-500' : 'text-slate-300'} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Supervisor</p>
                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[130px]">
                                      {r.firmas.supervisor?.nombre || 'No asignado'}
                                    </p>
                                    {!r.firmas.supervisor?.ruta && asignacionManual && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingIndex(idx);
                                          setEditForm({ ...r });
                                        }}
                                        className="mt-1 flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                                      >
                                        <AlertCircle size={10} className="text-amber-600" />
                                        <span>Asignar manual</span>
                                      </button>
                                    )}
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

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={agregarFilaNueva}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-emerald-600 border border-emerald-100 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 border-dashed"
              >
                <Plus size={16} />
                Añadir Fila
              </button>
              <button
                onClick={modoMultiple ? resetearModo : () => setArchivo(null)}
                className="flex-[0.5] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 border border-slate-100 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              {modoMultiple ? (
                <button
                  onClick={handleGuardarTodosAlHistorial}
                  disabled={editingIndex !== null || archivosEstado.every(a => a.estado !== 'listo' || a.descartado)}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <Check size={20} />
                  Guardar {archivosEstado.filter(a => a.estado === 'listo' && !a.descartado).length} día(s) al Historial
                </button>
              ) : (
                <button
                  onClick={handleConfirmar}
                  disabled={editingIndex !== null}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <Check size={20} />
                  Confirmar Importación
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
