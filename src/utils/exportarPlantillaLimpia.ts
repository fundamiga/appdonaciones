import { RegistroDiario } from '@/types';
import { corregirUbicacion } from './importador';

// Exportador especializado para convertir cualquier formato al formato Plantilla Limpia
export const exportarPlantillaLimpia = async (
  registros: RegistroDiario[],
  nombreArchivo: string = 'Plantilla_Convertida'
) => {
  // Importar xlsx dinámicamente
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Agrupar registros por ubicación
  const grupos: Record<string, RegistroDiario[]> = {};
  let fechaGlobal = new Date().toISOString().split('T')[0];

  for (const r of registros) {
    if (!grupos[r.ubicacion]) {
      grupos[r.ubicacion] = [];
    }
    grupos[r.ubicacion].push(r);
    // Usaremos la fecha del primer registro
    if (r.fecha) fechaGlobal = r.fecha;
  }

  // Convertimos la fecha (ej. "2025-05-18") a Excel Serial Code (Opcional, pero muy exacto a tu plantilla base)
  // Excel Serial 1 = Jan 1, 1900. Formula: (ms / 86400000) + 25569
  const dateObj = new Date(fechaGlobal + 'T00:00:00Z');
  const excelSerialDate = Math.round(dateObj.getTime() / 86400000) + 25569;

  // Construir el array de arrays para sheet_to_json({ header: 1 })
  const filas: any[][] = [];

  // Fila 0: El número serial de la fecha en la celda A1 (o simplemente la fecha)
  // Plantilla limpia original tiene el numero serial de excel. Lo intentamos así para estricta compatibilidad.
  filas.push([excelSerialDate]);

  // Recorrer los grupos de ubicaciones
  for (const [ubicacion, regs] of Object.entries(grupos)) {
    // Fila de encabezado de la ubicación
    filas.push([
      ubicacion.toUpperCase(),
      'Valor Total de Donaciones',
      'Cantidad de Donantes'
    ]);

    // Filas de trabajadores
    for (const reg of regs) {
      filas.push([
        reg.firmas.trabajador ? reg.firmas.trabajador.nombre.toUpperCase() : 'TRABAJADOR NO ASIGNADO',
        reg.donaciones.valor,
        reg.donaciones.cantidadDonantes
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(filas);
  
  // Establecer anchos de columna para que luzca bien
  ws['!cols'] = [
    { wch: 35 }, // Nombres / Ubicacion
    { wch: 30 }, // Valor total
    { wch: 25 }, // Cantidad de donantes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'PlantillaLimpia');

  XLSX.writeFile(wb, `${nombreArchivo}_${fechaGlobal}.xlsx`);
};
