import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Función para limpiar texto (tildes, mayúsculas, etc)
  const cleanText = (t: string) => 
    t.toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "");

  // Filtrar opciones basadas en el término de búsqueda normalizado
  const filteredOptions = options.filter(opt => 
    cleanText(opt).includes(cleanText(searchTerm))
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 transition-colors">
          {label}
        </label>
      )}
      
      {/* Botón / Input de Selección */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium cursor-pointer transition-all flex items-center justify-between hover:border-emerald-300 ${isOpen ? 'ring-4 ring-emerald-50 border-emerald-500 bg-white' : ''}`}
      >
        <span className={!value ? 'text-gray-400' : 'text-gray-800'}>
          {value || (!isOpen ? placeholder : 'Escribe para buscar...')}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top">
          {/* Campo de Búsqueda Interno */}
          <div className="p-2 border-b border-gray-50 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar nombre..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Lista de Opciones */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-xs italic">
                No se encontraron resultados
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-emerald-50 ${value === opt ? 'bg-emerald-50/50 text-emerald-700 font-bold' : 'text-gray-600'}`}
                >
                  <span className="text-sm">{opt}</span>
                  {value === opt && <Check size={14} className="text-emerald-600" strokeWidth={3} />}
                </div>
              ))
            )}
          </div>

          {/* Botón para Limpiar Selección */}
          {value && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="p-2 border-t border-gray-50 bg-gray-50/30 flex justify-center"
            >
              <button className="text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                <X size={12} /> LIMPIAR SELECCIÓN
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
