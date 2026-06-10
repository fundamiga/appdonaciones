import { RegistroDiario, ItemFactura } from '@/types';
import { generarItemsTabla } from './calculosInforme';

// Exporta el informe del día a un archivo .xlsx
export const exportarAExcel = async (
  registros: RegistroDiario[],
  itemsFacturas: ItemFactura[]
) => {
  // Importar xlsx dinámicamente para no aumentar el bundle
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Donaciones ──────────────────────────────────────────────────
  const itemsTabla = generarItemsTabla(registros);
  const filasTabla = itemsTabla.map(it => ({
    Item: it.item,
    Donante: it.donante,
    Documento: it.documento,
    Medio: it.medio,
    Valor: it.valor,
    'Recibo N°': it.reciboN,
    Observaciones: it.observaciones,
  }));
  const wsDon = XLSX.utils.json_to_sheet(filasTabla);
  wsDon['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDon, 'Donaciones');

  // ── Hoja 2: Facturas Electrónicas ───────────────────────────────────────
  if (itemsFacturas.length > 0) {
    const filasFacturas = itemsFacturas.map(it => ({
      Item: it.item,
      Donante: it.donante,
      Documento: it.documento,
      Medio: it.medio,
      Valor: it.valor,
      'Recibo N°': it.reciboN,
      Observaciones: it.observaciones,
    }));
    const wsFacturas = XLSX.utils.json_to_sheet(filasFacturas);
    XLSX.utils.book_append_sheet(wb, wsFacturas, 'Facturas Electrónicas');
  }

  // ── Hoja 3: Resumen del Día ─────────────────────────────────────────────
  const totalDon = registros.reduce((s, r) => s + r.donaciones.valor, 0);
  const totalFact = registros.reduce(
    (s, r) => s + (r.facturaElectronica?.valor || 0),
    0
  );

  // 👇 TIPADO CORRECTO AQUÍ
  const filaResumen: {
    '#': number;
    Fecha: string;
    Ubicación: string;
    Vehículo: "carros" | "motos" | null;
    Donantes: number;
    'Total Donaciones': number;
    'Total Facturas': number;
    'Total Registro': number;
  }[] = registros.map((r, i) => ({
    '#': i + 1,
    Fecha: r.fecha,
    Ubicación: r.ubicacion,
    Vehículo: r.tipoParqueadero,
    Donantes: r.donaciones.cantidadDonantes,
    'Total Donaciones': r.donaciones.valor,
    'Total Facturas': r.facturaElectronica?.valor ?? 0,
    'Total Registro':
      r.donaciones.valor + (r.facturaElectronica?.valor ?? 0),
  }));

  filaResumen.push({
    '#': 0,
    Fecha: '',
    Ubicación: 'TOTAL GENERAL',
    Vehículo: null, // 👈 ya válido
    Donantes: registros.reduce(
      (s, r) => s + r.donaciones.cantidadDonantes,
      0
    ),
    'Total Donaciones': totalDon,
    'Total Facturas': totalFact,
    'Total Registro': totalDon + totalFact,
  });

  const wsResumen = XLSX.utils.json_to_sheet(filaResumen);
  wsResumen['!cols'] = [
    { wch: 4 }, { wch: 12 }, { wch: 20 }, { wch: 10 },
    { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen del Día');

  // ── Descargar ───────────────────────────────────────────────────────────
  const fecha =
    registros[0]?.fecha ?? new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Fundamiga_Informe_${fecha}.xlsx`);
};
