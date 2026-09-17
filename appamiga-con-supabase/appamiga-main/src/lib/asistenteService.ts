import { RegistroDiario, Firma } from '@/types';
import { EntradaHistorial } from '@/hooks/useHistorial';

export interface ChatAction {
  label: string;
  tipo: 'GENERAR_INFORME' | 'EXPORTAR_EXCEL' | 'ABRIR_IMPORTADOR' | 'NUEVO_INFORME' | 'NAVEGAR' | 'VER_HISTORIAL' | 'AUDITORIA';
  url?: string;
  fecha?: string;
  payload?: any;
}

export interface ChatResponse {
  text: string;
  acciones?: ChatAction[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  acciones?: ChatAction[];
}

export interface ContextoDonaciones {
  registros: RegistroDiario[];
  registroActual?: RegistroDiario;
  historial: EntradaHistorial[];
  firmas: Record<string, Firma[]> | Firma[];
}

export function normalizarListaFirmas(firmas: Record<string, Firma[]> | Firma[]): Firma[] {
  if (Array.isArray(firmas)) return firmas;
  if (!firmas || typeof firmas !== 'object') return [];
  return Object.values(firmas).flat();
}

// Formateador de moneda colombiana COP
export function formatCOP(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

// ─── MOTOR DE RESPALDO INTELIGENTE LOCAL (OFFLINE & FALLBACK) ────────────────
export function procesarConsultaLocal(query: string, ctx: ContextoDonaciones): ChatResponse {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const regs = ctx.registros || [];
  const hist = ctx.historial || [];
  const listaFirmas = normalizarListaFirmas(ctx.firmas);


  // Métricas del día actual
  const totalEfectivo = regs.reduce((s, r) => s + (r.donaciones?.valor || 0), 0);
  const totalFacturas = regs.reduce((s, r) => {
    const itemsVal = (r.itemsFacturas ?? []).reduce((sf, f) => sf + (f.valor || 0), 0);
    return s + (itemsVal || r.facturaElectronica?.valor || 0);
  }, 0);
  const totalGeneral = totalEfectivo + totalFacturas;
  const totalDonantesEfectivo = regs.reduce((s, r) => s + (r.donaciones?.cantidadDonantes || 0), 0);
  const totalDonantesFacturas = regs.reduce((s, r) => {
    const cantItems = (r.itemsFacturas ?? []).length;
    return s + (cantItems || r.facturaElectronica?.cantidadPersonas || 0);
  }, 0);
  const totalPersonas = totalDonantesEfectivo + totalDonantesFacturas;

  // Intención: Generar o ver informe / PDF
  if (q.includes('generar informe') || q.includes('ver informe') || q.includes('imprimir') || q.includes('pdf') || q.includes('descargar pdf')) {
    if (regs.length === 0) {
      return {
        text: 'Actualmente no hay registros en la sesión activa para generar el informe. Puedes agregar registros manualmente o importarlos desde Excel.',
        acciones: [{ label: '📂 Abrir Importador', tipo: 'ABRIR_IMPORTADOR' }],
      };
    }
    return {
      text: `Listo para generar el informe. Tienes **${regs.length} registros** con un total consolidado de **${formatCOP(totalGeneral)}**. Puedes previsualizarlo e imprimirlo con la hoja de resumen consolidado.`,
      acciones: [
        { label: '📄 Ver e Imprimir Informe PDF', tipo: 'GENERAR_INFORME' },
        { label: '📊 Descargar Excel', tipo: 'EXPORTAR_EXCEL' },
      ],
    };
  }

  // Intención: Exportar a Excel
  if (q.includes('excel') || q.includes('exportar') || q.includes('descargar excel') || q.includes('guardar excel')) {
    if (regs.length === 0) {
      return {
        text: 'No tienes registros activos para exportar a Excel en este momento. Carga algunos registros primero.',
        acciones: [{ label: '📂 Abrir Importador', tipo: 'ABRIR_IMPORTADOR' }],
      };
    }
    return {
      text: `Puedo exportar los **${regs.length} registros** actuales con su detalle de facturas electrónicas a formato Excel (.xlsx).`,
      acciones: [{ label: '📊 Descargar Excel Ahora', tipo: 'EXPORTAR_EXCEL' }],
    };
  }

  // Intención: Importar Excel o PDF
  if (q.includes('importar') || q.includes('subir excel') || q.includes('cargar excel') || q.includes('archivo')) {
    return {
      text: 'Puedes importar registros desde una plantilla de Excel o cargar múltiples jornadas directamente con el importador inteligente.',
      acciones: [{ label: '📂 Abrir Importador de Archivos', tipo: 'ABRIR_IMPORTADOR' }],
    };
  }

  // Intención: ¿Reconoces las firmas? / Consulta de catálogo de firmas
  if (
    q.includes('reconoc') ||
    q.includes('las firmas') ||
    (q.includes('firma') && (q.includes('quienes') || q.includes('cuales') || q.includes('tienes') || q.includes('hay') || q.includes('conoces') || q.includes('sabes')))
  ) {
    const trab = listaFirmas.filter((f) => f.tipo === 'trabajador');
    const sup = listaFirmas.filter((f) => f.tipo === 'supervisor');
    const resp = listaFirmas.filter((f) => f.tipo === 'responsable');

    const firmasAsignadasTrabajador = Array.from(new Set(regs.map((r) => r.firmas?.trabajador?.nombre).filter(Boolean)));
    const firmasAsignadasSupervisor = Array.from(new Set(regs.map((r) => r.firmas?.supervisor?.nombre).filter(Boolean)));
    const firmasAsignadasResponsable = Array.from(new Set(regs.map((r) => r.firmas?.responsable?.nombre).filter(Boolean)));

    let rta = `### ✍️ ¡Sí! Reconozco y audito todas las firmas del sistema\n\n`;
    rta += `Tengo acceso directo a las **${listaFirmas.length} firmas registradas** en la base de datos de Fundamiga:\n\n`;
    rta += `- 👷 **Trabajadores (${trab.length}):** ${trab.slice(0, 10).map((f) => f.nombre).join(', ')}${trab.length > 10 ? '...' : ''}\n`;
    rta += `- 👔 **Supervisores (${sup.length}):** ${sup.map((f) => f.nombre).join(', ') || 'No registrados'}\n`;
    rta += `- 📋 **Responsables de Conteos (${resp.length}):** ${resp.map((f) => f.nombre).join(', ') || 'No registrados'}\n\n`;

    if (regs.length > 0) {
      rta += `**Estado en los turnos cargados hoy:**\n`;
      rta += `• Trabajadores: ${firmasAsignadasTrabajador.join(', ') || 'Ninguno asignado aún'}\n`;
      rta += `• Supervisores: ${firmasAsignadasSupervisor.join(', ') || 'Ninguno asignado aún'}\n`;
      rta += `• Responsables: ${firmasAsignadasResponsable.join(', ') || 'Ninguno asignado aún'}\n\n`;
      rta += `Puedo verificar si falta alguna firma en cualquiera de las ubicaciones.`;
    } else {
      rta += `Actualmente no hay turnos cargados en pantalla para cotejar. Puedes agregar registros o importar un archivo.`;
    }

    return {
      text: rta,
      acciones: [
        { label: '🔍 Auditar Firmas Faltantes', tipo: 'AUDITORIA' },
        { label: '✍️ Gestionar Firmas (Admin)', tipo: 'NAVEGAR', url: '/admin' },
      ],
    };
  }

  // Intención: Hojas de Vida / Expedientes
  if (q.includes('hoja de vida') || q.includes('hojas de vida') || q.includes('expediente')) {
    return {
      text: `El sistema ahora está conectado directamente con el programa de **Hojas de Vida / Expedientes** de Fundamiga. Al importar planillas Excel o PDFs, puedes activar el switch **"Hojas de Vida"** para reconocer y asignar de inmediato las firmas de los colaboradores guardadas en sus expedientes.`,
      acciones: [
        { label: '📂 Abrir Importador de Archivos', tipo: 'ABRIR_IMPORTADOR' },
        { label: '🔍 Auditar Firmas Actuales', tipo: 'AUDITORIA' },
      ],
    };
  }

  // Intención: Firma Random / Aleatoria
  if (q.includes('random') || q.includes('aleatori')) {
    return {
      text: `En la barra de herramientas del Importador tienes disponible el botón **"🎲 Firma Random a Faltantes"**. Con un solo clic le asignará una firma válida aleatoria de las disponibles a todas las filas que no tengan firma.`,
      acciones: [
        { label: '📂 Abrir Importador', tipo: 'ABRIR_IMPORTADOR' },
      ],
    };
  }

  // Intención: Ir a Administración / Firmas
  if (q.includes('firma') && (q.includes('donde') || q.includes('subir') || q.includes('gestionar') || q.includes('admin') || q.includes('panel'))) {
    return {
      text: `En el sistema hay **${listaFirmas.length} firmas** registradas. Puedes gestionarlas, sincronizarlas con Cloudinary o subir nuevas firmas desde el panel de administración.`,
      acciones: [{ label: '✍️ Ir a Gestión de Firmas (Admin)', tipo: 'NAVEGAR', url: '/admin' }],
    };
  }




  // Intención: Ir al convertidor
  if (q.includes('convertidor') || q.includes('convertir') || q.includes('transformar')) {
    return {
      text: 'El convertidor de archivos te ayuda a transformar y adecuar formatos de donaciones para el sistema.',
      acciones: [{ label: '🔄 Ir al Convertidor', tipo: 'NAVEGAR', url: '/convertidor' }],
    };
  }

  // Intención: Limpiar / Nuevo informe
  if (q.includes('limpiar') || q.includes('reiniciar') || q.includes('nuevo informe') || q.includes('nueva jornada')) {
    return {
      text: '¿Deseas reiniciar el formulario para comenzar una nueva jornada? (Si tienes registros, te sugiero guardarlos o exportarlos primero).',
      acciones: [
        { label: '🆕 Iniciar Nueva Jornada', tipo: 'NUEVO_INFORME' },
        { label: '📊 Descargar Excel Primero', tipo: 'EXPORTAR_EXCEL' },
      ],
    };
  }

  // Intención: Auditoría de Firmas y Caja
  if (q.includes('audita') || q.includes('revisa') || q.includes('incompleto') || q.includes('falta') || q.includes('valida') || q.includes('control')) {
    const sinTrabajador = regs.filter((r) => !r.firmas?.trabajador);
    const sinSupervisor = regs.filter((r) => !r.firmas?.supervisor);
    const sinResponsable = regs.filter((r) => !r.firmas?.responsable);

    let informeAuditoria = `### 📋 Reporte de Auditoría de Jornada\n\n`;
    informeAuditoria += `- **Total Registros Activos:** ${regs.length}\n`;
    informeAuditoria += `- **Total Recaudado:** ${formatCOP(totalGeneral)}\n`;
    informeAuditoria += `  • Efectivo: ${formatCOP(totalEfectivo)} (${totalDonantesEfectivo} donantes)\n`;
    informeAuditoria += `  • Facturación Electrónica: ${formatCOP(totalFacturas)} (${totalDonantesFacturas} personas)\n\n`;

    const problemasFirmas = sinTrabajador.length > 0 || sinSupervisor.length > 0 || sinResponsable.length > 0;
    if (problemasFirmas) {
      informeAuditoria += `⚠️ **Atención en Firmas:**\n`;
      if (sinTrabajador.length > 0) informeAuditoria += `  • Faltan ${sinTrabajador.length} firma(s) de Trabajador.\n`;
      if (sinSupervisor.length > 0) informeAuditoria += `  • Faltan ${sinSupervisor.length} firma(s) de Supervisor.\n`;
      if (sinResponsable.length > 0) informeAuditoria += `  • Faltan ${sinResponsable.length} firma(s) de Responsable de Conteos.\n`;
    } else if (regs.length > 0) {
      informeAuditoria += `✅ **Firmas completas:** Todos los registros tienen asignadas sus firmas reglamentarias.\n`;
    } else {
      informeAuditoria += `ℹ️ No hay registros en el formulario activo para auditar.\n`;
    }

    return {
      text: informeAuditoria,
      acciones: regs.length > 0 ? [
        { label: '📄 Generar Informe PDF', tipo: 'GENERAR_INFORME' },
        { label: '📊 Descargar Excel', tipo: 'EXPORTAR_EXCEL' },
      ] : [
        { label: '📂 Abrir Importador', tipo: 'ABRIR_IMPORTADOR' },
      ],
    };
  }

  // Intención: Consultar totales, recaudación o dinero
  if (q.includes('cuanto') || q.includes('total') || q.includes('recaudo') || q.includes('donacion') || q.includes('dinero') || q.includes('plata') || q.includes('balance')) {
    if (regs.length === 0) {
      return {
        text: `En la sesión activa aún no hay registros agregados. El historial tiene **${hist.length} jornadas guardadas**.\n\n¿Deseas abrir el importador o consultar el historial?`,
        acciones: [
          { label: '📂 Importar Archivo', tipo: 'ABRIR_IMPORTADOR' },
          { label: '📜 Ver Historial', tipo: 'VER_HISTORIAL' },
        ],
      };
    }

    return {
      text: `### 💰 Resumen Financiero del Día\n\n` +
        `- **Total Consolidado:** **${formatCOP(totalGeneral)}**\n` +
        `- **Donaciones en Efectivo:** ${formatCOP(totalEfectivo)} (${totalDonantesEfectivo} donantes)\n` +
        `- **Facturación Electrónica:** ${formatCOP(totalFacturas)} (${totalDonantesFacturas} personas)\n` +
        `- **Total Personas Impactadas:** ${totalPersonas}\n` +
        `- **Número de Registros:** ${regs.length} turnos/ubicaciones.\n\n` +
        `Promedio aproximado por donante: **${totalPersonas > 0 ? formatCOP(Math.round(totalGeneral / totalPersonas)) : '$0'}**.`,
      acciones: [
        { label: '📄 Generar Informe PDF', tipo: 'GENERAR_INFORME' },
        { label: '📊 Exportar a Excel', tipo: 'EXPORTAR_EXCEL' },
      ],
    };
  }

  // Intención: Consultar historial
  if (q.includes('historial') || q.includes('ayer') || q.includes('pasado') || q.includes('dias anteriores') || q.includes('fechas')) {
    if (hist.length === 0) {
      return {
        text: 'Aún no hay jornadas archivadas en el historial. Las jornadas se guardan automáticamente al generar nuevos informes o al importar lotes de varios días.',
      };
    }

    const ultimas = hist.slice(0, 5);
    const totalHistorico = hist.reduce((s, h) => s + (h.totalGeneral || 0), 0);

    let textoHist = `### 📜 Historial de Donaciones (${hist.length} jornadas registradas)\n\n`;
    textoHist += `**Gran Total Histórico:** **${formatCOP(totalHistorico)}**\n\n**Últimas jornadas:**\n`;
    ultimas.forEach((h) => {
      textoHist += `- 📅 **${h.fecha}**: ${formatCOP(h.totalGeneral)} (${h.registros?.length || 0} turnos)\n`;
    });

    return {
      text: textoHist,
      acciones: [{ label: '🔍 Consultar Jornada', tipo: 'VER_HISTORIAL' }],
    };
  }

  // Respuesta general de bienvenida / ayuda
  return {
    text: `¡Hola! Soy **Amiga IA**, tu asistente inteligente del Control de Donaciones de **Fundamiga** (NIT 901.369.891-9). 🤝✨\n\nPuedo ayudarte en:\n` +
      `- 💰 **Calcular y desglosar totales**: Efectivo, facturas electrónicas y donantes del día.\n` +
      `- 🔍 **Auditar registros y firmas**: Verificar si falta alguna firma de trabajador, supervisor o responsable.\n` +
      `- 📄 **Generar informes**: Emitir el PDF con la hoja de resumen consolidado.\n` +
      `- 📊 **Exportar a Excel**: Descargar la planilla detallada en un clic.\n` +
      `- 📂 **Importar jornadas**: Abrir el importador para cargar archivos masivos.\n` +
      `- 📜 **Consultar el historial**: Analizar los totales de días anteriores.\n\n` +
      `¿En qué te puedo colaborar en este momento?`,
    acciones: [
      { label: '🔍 Auditar Registros y Firmas', tipo: 'AUDITORIA' },
      { label: '💰 Ver Total Recaudado', tipo: 'AUDITORIA' },
      { label: '📄 Generar Informe PDF', tipo: 'GENERAR_INFORME' },
      { label: '📂 Abrir Importador', tipo: 'ABRIR_IMPORTADOR' },
    ],
  };
}

// ─── CONSULTA PRINCIPAL A LA API CON INTELIGENCIA ARTIFICIAL ─────────────────
export async function consultarAsistente(
  query: string,
  contexto: ContextoDonaciones
): Promise<ChatResponse> {
  const cleanMsg = query.trim();
  if (!cleanMsg) {
    return { text: 'Por favor escribe tu consulta para poder ayudarte.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const listaFirmas = normalizarListaFirmas(contexto.firmas);
    const resumenContexto = {
      totalRegistros: contexto.registros.length,
      registros: contexto.registros.map((r) => ({
        fecha: r.fecha,
        ubicacion: r.ubicacion,
        tipoParqueadero: r.tipoParqueadero,
        efectivo: r.donaciones?.valor || 0,
        donantesEfectivo: r.donaciones?.cantidadDonantes || 0,
        facturasValor: (r.itemsFacturas ?? []).reduce((sf, f) => sf + (f.valor || 0), 0) || r.facturaElectronica?.valor || 0,
        donantesFacturas: (r.itemsFacturas ?? []).length || r.facturaElectronica?.cantidadPersonas || 0,
        firmas: {
          trabajador: r.firmas?.trabajador?.nombre || null,
          supervisor: r.firmas?.supervisor?.nombre || null,
          responsable: r.firmas?.responsable?.nombre || null,
        },
      })),
      totalHistorial: contexto.historial.length,
      ultimasJornadasHistorial: contexto.historial.slice(0, 5).map((h) => ({
        fecha: h.fecha,
        total: h.totalGeneral,
        registrosCount: h.registros?.length || 0,
      })),
      totalFirmasDisponibles: listaFirmas.length,
      catalogoFirmas: {
        trabajadores: listaFirmas.filter((f) => f.tipo === 'trabajador').map((f) => f.nombre),
        supervisores: listaFirmas.filter((f) => f.tipo === 'supervisor').map((f) => f.nombre),
        responsables: listaFirmas.filter((f) => f.tipo === 'responsable').map((f) => f.nombre),
      },
    };



    const res = await fetch('/api/asistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: cleanMsg,
        contexto: resumenContexto,
      }),
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.texto) {
        return {
          text: data.texto,
          acciones: data.acciones || [],
        };
      }
    }
  } catch (_) {
    // Si falla la llamada por red o timeout, usar motor local
  }

  // Fallback garantizado e inmediato al motor local
  return procesarConsultaLocal(cleanMsg, contexto);
}
