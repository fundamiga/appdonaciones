'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Bot,
  X,
  Send,
  Loader2,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Minimize2,
  Trash2,
  Coins,
} from 'lucide-react';
import {
  consultarAsistente,
  ChatMessage,
  ChatAction,
  ContextoDonaciones,
} from '@/lib/asistenteService';

interface AsistenteChatProps {
  contexto: ContextoDonaciones;
  onGenerarInforme?: () => void;
  onDescargarExcel?: () => void;
  onAbrirImportador?: () => void;
  onNuevoInforme?: () => void;
}

export function AsistenteChat({
  contexto,
  onGenerarInforme,
  onDescargarExcel,
  onAbrirImportador,
  onNuevoInforme,
}: AsistenteChatProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  const [mensajes, setMensajes] = useState<ChatMessage[]>([
    {
      id: 'bienvenida',
      sender: 'assistant',
      text: '¡Hola! Soy **Amiga IA**, tu asistente y auditora contable de **Fundamiga**. 🤝✨\n\nPuedo auditar tus turnos, calcular totales de recaudo, revisar firmas faltantes o generar tus informes y planillas Excel al instante.\n\n¿En qué te puedo apoyar hoy?',
      timestamp: new Date(),
      acciones: [
        { label: '🔍 Auditar Registros y Firmas', tipo: 'AUDITORIA' },
        { label: '💰 ¿Cuánto llevamos hoy?', tipo: 'AUDITORIA' },
        { label: '📄 Generar Informe PDF', tipo: 'GENERAR_INFORME' },
        { label: '📊 Exportar a Excel', tipo: 'EXPORTAR_EXCEL' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ocultar tooltip de bienvenida después de 8 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setTooltipVisible(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll al final al recibir mensajes
  useEffect(() => {
    if (abierto) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, abierto, cargando]);

  // Enfocar input al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [abierto]);

  // Ejecutar acciones que vienen de los botones o de la IA
  const ejecutarAccion = (accion: ChatAction) => {
    switch (accion.tipo) {
      case 'GENERAR_INFORME':
        if (onGenerarInforme) {
          onGenerarInforme();
        }
        break;
      case 'EXPORTAR_EXCEL':
        if (onDescargarExcel) {
          onDescargarExcel();
        }
        break;
      case 'ABRIR_IMPORTADOR':
        if (onAbrirImportador) {
          onAbrirImportador();
        }
        break;
      case 'NUEVO_INFORME':
        if (onNuevoInforme) {
          onNuevoInforme();
        }
        break;
      case 'NAVEGAR':
        if (accion.url) {
          router.push(accion.url);
        }
        break;
      case 'AUDITORIA':
        enviarMensaje('Haz una auditoría de los registros y firmas actuales');
        break;
      case 'VER_HISTORIAL':
        enviarMensaje('Muéstrame el historial de jornadas anteriores');
        break;
      default:
        break;
    }
  };

  const enviarMensaje = async (textoPersonalizado?: string) => {
    const texto = (textoPersonalizado || input).trim();
    if (!texto || cargando) return;

    const mensajeUsuario: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: texto,
      timestamp: new Date(),
    };

    setMensajes((prev) => [...prev, mensajeUsuario]);
    if (!textoPersonalizado) setInput('');
    setCargando(true);

    try {
      const respuesta = await consultarAsistente(texto, contexto);

      const mensajeAsistente: ChatMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: respuesta.text,
        timestamp: new Date(),
        acciones: respuesta.acciones,
      };

      setMensajes((prev) => [...prev, mensajeAsistente]);

      // Si la respuesta incluye una acción de ejecución automática (ej: abrir modal o informe)
      if (respuesta.acciones && respuesta.acciones.length === 1) {
        const unicaAccion = respuesta.acciones[0];
        if (unicaAccion.tipo === 'GENERAR_INFORME' && texto.toLowerCase().includes('genera')) {
          setTimeout(() => ejecutarAccion(unicaAccion), 1200);
        } else if (unicaAccion.tipo === 'EXPORTAR_EXCEL' && texto.toLowerCase().includes('descarga')) {
          setTimeout(() => ejecutarAccion(unicaAccion), 1200);
        }
      }
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: 'Ocurrió un inconveniente al procesar tu solicitud. Por favor intenta de nuevo.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const limpiarHistorial = () => {
    setMensajes([
      {
        id: 'bienvenida_nueva',
        sender: 'assistant',
        text: 'Historial reiniciado. ¿En qué más puedo orientarte con las donaciones de Fundamiga?',
        timestamp: new Date(),
        acciones: [
          { label: '🔍 Auditar Registros', tipo: 'AUDITORIA' },
          { label: '💰 Ver Total Recaudado', tipo: 'AUDITORIA' },
        ],
      },
    ]);
  };

  // Renderizar texto formateado básico (Markdown: negritas, viñetas, saltos)
  const renderizarTextoMarkdown = (texto: string) => {
    const lineas = texto.split('\n');

    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lineas.map((linea, idx) => {
          if (!linea.trim()) {
            return <div key={idx} className="h-1" />;
          }

          // Títulos Markdown ###
          if (linea.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-black text-slate-900 text-sm mt-2 mb-1 flex items-center gap-1.5">
                {linea.replace('### ', '')}
              </h4>
            );
          }

          // Viñetas
          const esItem = linea.trim().startsWith('- ') || linea.trim().startsWith('• ');
          const contenidoItem = esItem ? linea.trim().replace(/^[-•]\s*/, '') : linea;

          // Reemplazo de **negrita**
          const partes = contenidoItem.split(/(\*\*.*?\*\*)/g);

          const elementos = partes.map((p, pIdx) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-black text-slate-900">
                  {p.slice(2, -2)}
                </strong>
              );
            }
            return p;
          });

          if (esItem) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-emerald-500 font-black select-none mt-0.5">•</span>
                <div className="flex-1 text-slate-700">{elementos}</div>
              </div>
            );
          }

          return (
            <p key={idx} className="text-slate-700">
              {elementos}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* ── BOTÓN FLOTANTE Y TOOLTIP ──────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden">
        {/* Tooltip de bienvenida inicial si el chat está cerrado */}
        {!abierto && tooltipVisible && (
          <div className="mb-3 bg-slate-900/95 text-white p-3.5 px-4 rounded-2xl shadow-2xl border border-slate-800 max-w-xs flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md">
                <Sparkles size={16} />
              </div>
              <p className="text-xs font-semibold leading-snug">
                ¿Necesitas auditar la caja o generar el informe? ¡Puedo ayudarte!
              </p>
            </div>
            <button
              onClick={() => setTooltipVisible(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Botón Circular Principal */}
        <button
          onClick={() => {
            setAbierto(!abierto);
            setTooltipVisible(false);
          }}
          className={`relative group flex items-center justify-center p-4 rounded-full shadow-2xl transition-all duration-300 active:scale-95 ${
            abierto
              ? 'bg-slate-900 text-white hover:bg-slate-800 rotate-90 shadow-slate-900/40'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/40 hover:shadow-emerald-600/60 scale-105'
          }`}
          title={abierto ? 'Cerrar Asistente' : 'Abrir Asistente Amiga IA'}
        >
          {/* Anillo de pulso activo si está cerrado */}
          {!abierto && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>
          )}

          {abierto ? (
            <X size={26} />
          ) : (
            <div className="flex items-center gap-1.5">
              <Bot size={26} className="text-white" />
              <Sparkles size={14} className="text-yellow-300 absolute -top-1 -right-1" />
            </div>
          )}
        </button>
      </div>

      {/* ── VENTANA MODAL DEL CHAT ────────────────────────────────────── */}
      {abierto && (
        <div className="fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[420px] max-h-[82vh] h-[640px] bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 print:hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between text-white border-b border-slate-700/50 select-none">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <Bot size={22} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm tracking-tight text-white">Amiga IA</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    DONACIONES
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Asistente & Auditora Contable</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={limpiarHistorial}
                title="Limpiar conversación"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all active:scale-90"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setAbierto(false)}
                title="Minimizar"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-90"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {mensajes.map((m) => {
              const esUsuario = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${esUsuario ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-4 shadow-sm ${
                      esUsuario
                        ? 'bg-emerald-600 text-white rounded-br-none font-medium text-sm'
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                    }`}
                  >
                    {esUsuario ? (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      renderizarTextoMarkdown(m.text)
                    )}
                  </div>

                  {/* Acciones interactivas asociadas al mensaje del asistente */}
                  {!esUsuario && m.acciones && m.acciones.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-1">
                      {m.acciones.map((acc, accIdx) => (
                        <button
                          key={accIdx}
                          onClick={() => ejecutarAccion(acc)}
                          className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 hover:border-emerald-300 shadow-sm transition-all active:scale-95"
                        >
                          {acc.tipo === 'GENERAR_INFORME' && <FileText size={13} className="text-emerald-600" />}
                          {acc.tipo === 'EXPORTAR_EXCEL' && <FileSpreadsheet size={13} className="text-emerald-600" />}
                          {acc.tipo === 'ABRIR_IMPORTADOR' && <FolderOpen size={13} className="text-amber-500" />}
                          {acc.tipo === 'NAVEGAR' && <ExternalLink size={13} className="text-sky-500" />}
                          {acc.tipo === 'NUEVO_INFORME' && <RefreshCw size={13} className="text-slate-600" />}
                          {acc.tipo === 'AUDITORIA' && <Coins size={13} className="text-emerald-600" />}
                          {acc.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Indicador de escritura */}
            {cargando && (
              <div className="flex items-center gap-2 text-slate-500 bg-white p-3 rounded-2xl border border-slate-100 w-fit shadow-sm">
                <Loader2 size={16} className="animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Amiga IA está pensando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias Rápidas / Pills */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar select-none">
            <button
              onClick={() => enviarMensaje('¿Cuánto se ha recaudado en total hoy?')}
              className="whitespace-nowrap text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              💰 Total recaudado
            </button>
            <button
              onClick={() => enviarMensaje('Audita los registros y revisa si faltan firmas')}
              className="whitespace-nowrap text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              🔍 Auditar firmas
            </button>
            <button
              onClick={() => enviarMensaje('Generar informe consolidado')}
              className="whitespace-nowrap text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              📄 Informe PDF
            </button>
            <button
              onClick={() => enviarMensaje('Exportar registros a Excel')}
              className="whitespace-nowrap text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              📊 Excel
            </button>
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta o pide una acción..."
              rows={1}
              className="flex-1 max-h-24 resize-none bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 placeholder-slate-400 text-sm px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
            <button
              onClick={() => enviarMensaje()}
              disabled={!input.trim() || cargando}
              className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-emerald-900/20"
              title="Enviar mensaje"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
