import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];

function crearSystemPrompt(fechaHoyStr: string) {
  return `Eres "Amiga IA", la asistente inteligente, analista y auditora del Sistema de Control Diario de Donaciones de Fundamiga (Fundación Una Mano Amiga a Tiempo, NIT 901.369.891-9, Yumbo - Valle del Cauca).
FECHA DE HOY: ${fechaHoyStr}.

TU MISIÓN Y CONOCIMIENTO:
1. CONTROL Y AUDITORÍA DE DONACIONES:
   - Supervisas los registros de turnos de recaudo en parqueaderos y puntos de donación (motos, carros, etc.).
   - Analizas donaciones en efectivo y donaciones por facturación electrónica.
   - Verificas que cada registro cuente con las 3 firmas obligatorias:
     • Firma del Trabajador
     • Firma del Supervisor
     • Firma del Responsable de Conteos
   - Calculas totales, promedios por donante y detectas faltantes de información.

2. RECONOCIMIENTO Y AUDITORÍA DE FIRMAS:
   - SÍ, RECONOCES Y AUDITAS TODAS LAS FIRMAS DEL SISTEMA.
   - Tienes acceso al catálogo completo de firmas registradas en la base de datos de Fundamiga (Cloudinary / Supabase / Local) clasificadas por roles:
     • Trabajadores (operarios de punto)
     • Supervisores de zona (ej: Noé, Donella, Marilin, etc.)
     • Responsables de conteos
   - Sabes con nombre exacto quién firmó cada turno y qué firmas hacen falta.
   - Si el usuario te pregunta si reconoces las firmas, responde con seguridad que SÍ, enumera cuántas firmas conoces y lista los supervisores y trabajadores actuales.

3. ACCIONES RÁPIDAS QUE PUEDES DISPARAR:
   Si el usuario pide o autoriza realizar una acción (como generar informe, exportar a Excel, abrir importador, limpiar formulario o ir a gestión de firmas), puedes responder con un bloque JSON al final o texto explicativo amigable:
   - Para generar informe PDF:
     {"accion": "generar_informe", "mensaje": "He preparado el informe completo para previsualizar e imprimir con la hoja consolidada."}
   - Para exportar a Excel:
     {"accion": "exportar_excel", "mensaje": "Generando la planilla detallada en formato Excel (.xlsx)..."}
   - Para abrir el importador:
     {"accion": "abrir_importador", "mensaje": "Abriendo la ventana de importación de archivos..."}
   - Para ir al panel de firmas:
     {"accion": "navegar", "url": "/admin", "mensaje": "Te dirijo al módulo de administración y sincronización de firmas."}
   - Para ir al convertidor:
     {"accion": "navegar", "url": "/convertidor", "mensaje": "Abriendo el convertidor de formatos..."}

4. ESTILO DE COMUNICACIÓN:
   - Amable, cálido, profesional, estructurado y enfocado en la transparencia de los recursos de la fundación.
   - Si das cifras de dinero en pesos colombianos, formátalas siempre con signo pesos y separadores de miles (ej: $150.000 COP).
   - Usa viñetas y formato Markdown para facilitar la lectura.`;
}

export async function POST(req: NextRequest) {
  try {
    const { mensaje, contexto, historial } = await req.json();

    if (!mensaje || typeof mensaje !== "string") {
      return NextResponse.json({ error: "El mensaje es obligatorio." }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "No hay GEMINI_API_KEY configurada." }, { status: 500 });
    }

    const hoy = new Date();
    const fechaHoyStr = hoy.toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemPrompt = crearSystemPrompt(fechaHoyStr);

    let contextoStr = "\n\nDATOS ACTUALES DEL SISTEMA:\n";
    if (contexto) {
      contextoStr += `- Total registros cargados en pantalla: ${contexto.totalRegistros || 0}\n`;
      if (contexto.registros && contexto.registros.length > 0) {
        contextoStr += `- Detalle de turnos cargados:\n`;
        contexto.registros.forEach((r: any, idx: number) => {
          contextoStr += `  [${idx + 1}] Fecha: ${r.fecha}, Ubicación: ${r.ubicacion}, Tipo: ${r.tipoParqueadero}, Efectivo: $${r.efectivo}, Factura: $${r.facturasValor}, Firmas: Trab(${r.firmas?.trabajador || 'FALTA'}), Sup(${r.firmas?.supervisor || 'FALTA'}), Resp(${r.firmas?.responsable || 'FALTA'})\n`;
        });
      }
      contextoStr += `- Total jornadas archivadas en historial: ${contexto.totalHistorial || 0}\n`;
      if (contexto.ultimasJornadasHistorial && contexto.ultimasJornadasHistorial.length > 0) {
        contextoStr += `- Últimas jornadas del historial:\n`;
        contexto.ultimasJornadasHistorial.forEach((h: any) => {
          contextoStr += `  • ${h.fecha}: $${h.total} (${h.registrosCount} turnos)\n`;
        });
      }
      contextoStr += `- Total firmas registradas en la base de datos: ${contexto.totalFirmasDisponibles || 0}\n`;
      if (contexto.catalogoFirmas) {
        if (contexto.catalogoFirmas.supervisores?.length > 0) {
          contextoStr += `  • Supervisores registrados: ${contexto.catalogoFirmas.supervisores.join(', ')}\n`;
        }
        if (contexto.catalogoFirmas.responsables?.length > 0) {
          contextoStr += `  • Responsables de conteo registrados: ${contexto.catalogoFirmas.responsables.join(', ')}\n`;
        }
        if (contexto.catalogoFirmas.trabajadores?.length > 0) {
          contextoStr += `  • Trabajadores registrados: ${contexto.catalogoFirmas.trabajadores.slice(0, 20).join(', ')}${contexto.catalogoFirmas.trabajadores.length > 20 ? '...' : ''}\n`;
        }
      }
    }


    const contents: { role: string; parts: { text: string }[] }[] = [];

    contents.push({
      role: "user",
      parts: [{ text: `[INSTRUCCIONES DEL SISTEMA:\n${systemPrompt}${contextoStr}\n]` }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Entendido. Soy Amiga IA y asistiré de forma precisa en el Control Diario de Donaciones de Fundamiga." }],
    });

    if (historial && Array.isArray(historial)) {
      for (const msg of historial.slice(-6)) {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }

    contents.push({ role: "user", parts: [{ text: mensaje }] });

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    };

    let respuestaTexto = "";
    let ultimoError = "";

    for (const modelo of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          respuestaTexto = data.candidates[0].content.parts[0].text.trim();
          break;
        } else {
          ultimoError = data.error?.message || JSON.stringify(data);
          console.warn(`[Gemini (${modelo})] Error:`, ultimoError);
        }
      } catch (err: any) {
        ultimoError = err.message;
      }
    }

    if (!respuestaTexto) {
      return NextResponse.json({ error: "Fallo al consultar Gemini: " + ultimoError }, { status: 502 });
    }

    // Detección de acciones en JSON
    const acciones: any[] = [];
    let textoFinal = respuestaTexto;

    const jsonMatch = respuestaTexto.match(/\{[\s\S]*"accion"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.accion === "generar_informe") {
          acciones.push({ label: "📄 Ver e Imprimir Informe PDF", tipo: "GENERAR_INFORME" });
        } else if (parsed.accion === "exportar_excel") {
          acciones.push({ label: "📊 Descargar Archivo Excel", tipo: "EXPORTAR_EXCEL" });
        } else if (parsed.accion === "abrir_importador") {
          acciones.push({ label: "📂 Abrir Importador", tipo: "ABRIR_IMPORTADOR" });
        } else if (parsed.accion === "navegar" && parsed.url) {
          acciones.push({ label: `Ir a ${parsed.url}`, tipo: "NAVEGAR", url: parsed.url });
        } else if (parsed.accion === "nuevo_informe") {
          acciones.push({ label: "🆕 Iniciar Nueva Jornada", tipo: "NUEVO_INFORME" });
        }

        if (parsed.mensaje) {
          textoFinal = parsed.mensaje;
        } else {
          textoFinal = respuestaTexto.replace(jsonMatch[0], "").trim();
        }
      } catch (_) {}
    }

    // Detección complementaria de acciones por contenido semántico
    const lower = textoFinal.toLowerCase();
    if ((lower.includes("generar informe") || lower.includes("informe pdf")) && !acciones.some(a => a.tipo === "GENERAR_INFORME")) {
      acciones.push({ label: "📄 Ver Informe PDF", tipo: "GENERAR_INFORME" });
    }
    if ((lower.includes("excel") || lower.includes("descargar planilla")) && !acciones.some(a => a.tipo === "EXPORTAR_EXCEL")) {
      acciones.push({ label: "📊 Exportar Excel", tipo: "EXPORTAR_EXCEL" });
    }
    if ((lower.includes("importador") || lower.includes("subir archivo")) && !acciones.some(a => a.tipo === "ABRIR_IMPORTADOR")) {
      acciones.push({ label: "📂 Abrir Importador", tipo: "ABRIR_IMPORTADOR" });
    }

    return NextResponse.json({
      texto: textoFinal,
      acciones: acciones.length > 0 ? acciones : undefined,
    });
  } catch (error: any) {
    console.error("[Asistente API Error]:", error);
    return NextResponse.json({ error: error?.message || "Error interno del servidor" }, { status: 500 });
  }
}
