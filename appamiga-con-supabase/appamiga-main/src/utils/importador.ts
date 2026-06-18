import * as XLSX from 'xlsx';
import { RegistroDiario, Donacion } from '../types';

export interface FilaExcel {
  FECHA?: string | number;
  UBICACION?: string;
  LUGAR?: string;
  PARQUEADERO?: string;
  SITIO?: string;
  VALOR?: number;
  RECAUDO?: number;
  TOTAL?: number;
  CANTIDAD?: number;
  PERSONAS?: number;
  DONANTES?: number;
  TIPO?: string;
  VEHICULO?: string;
  TRABAJADOR?: string;
  NOMBRE?: string;
  OPERARIO?: string;
  // Para plantilla especial (mapeo por posición)
  [key: string]: any;
}

const NORMALIZAR_UBICACION: Record<string, string> = {
  '5 CON 6': '5ta con 6ta',
  '5TA CON 6TA': '5ta con 6ta',
  '6 CON 6': '6ta con 6ta',
  '6TA CON 6TA': '6ta con 6ta',
  '2 DA CON 10': '2da con 10',
  '2DA CON 10': '2da con 10',
  '2 CON 10': '2da con 10',
  'BOLIVAR': 'Bolivar',
  'CARTON COLOMBIA': 'Carton Colombia',
  'CARTON': 'Carton Colombia', // Added CARTON for the special template
  'GUACANDA': 'Guacanda',
  'GALERIA': 'Galeria',
  'GUABINAS': 'Guabinas',
  'MAYORISTA': 'Mayorista',
  'ROZO': 'Rozo'
};

export const corregirUbicacion = (name: string): string => {
  const upper = name.trim().toUpperCase();
  return NORMALIZAR_UBICACION[upper] || name;
};

// Convierte nombres de meses a números
const MESES: Record<string, string> = {
  'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04', 'MAYO': '05', 'JUNIO': '06',
  'JULIO': '07', 'AGOSTO': '08', 'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
};

const formatearFechaEspecial = (texto: string): string => {
  const clean = texto.toUpperCase().replace('FECHA:', '').trim();
  const partes = clean.split(' ').filter(Boolean); // Filtrar espacios vacíos (ej. 01 NOV  2025)
  if (partes.length >= 3) {
    const dia = partes[0].padStart(2, '0');
    const mes = MESES[partes[1]] || '01';
    const anio = partes[2];
    return `${anio}-${mes}-${dia}`;
  }
  return new Date().toISOString().split('T')[0];
};

// Convierte "$ 60.40" o parecido a 60400
const parsearValorEspecial = (valor: any): number => {
  if (valor === null || valor === undefined || valor === '') return 0;
  let num: number;
  
  if (typeof valor === 'number') {
    num = valor;
  } else {
    const limpio = String(valor).replace(/[^\d.]/g, '');
    num = parseFloat(limpio);
  }

  if (isNaN(num)) return 0;

  // Si el valor es < 1000, asumimos que viene en "kilos" (ej: 60.4 -> 60400)
  // Si el valor ya es >= 1000, asumimos que ya es el valor completo (ej: 60400 -> 60400)
  return num < 1000 ? num * 1000 : num;
};

export const procesarArchivoExcel = async (file: File): Promise<RegistroDiario[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Verificar si es Plantilla o Estándar
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        
        let esPlantilla = false;
        let esPlantillaLimpia = false;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const col0 = String(rows[i]?.[0] || '').trim().toUpperCase();
          if (col0.startsWith('FECHA:')) {
            esPlantilla = true;
            break;
          }
          const col1 = String(rows[i]?.[1] || '').trim().toUpperCase();
          if (col1.includes('VALOR TOTAL DE DONACIONES')) {
            esPlantillaLimpia = true;
            break;
          }
        }

        let registrosFinales: RegistroDiario[] = [];

        if (esPlantillaLimpia) {
          // --- FORMATO PLANTILLA LIMPIA (muestras/plantilla.xlsx) ---
          let fechaActual = new Date().toISOString().split('T')[0];
          let ubicacionActual = '';
          let esCarro = true;

          // Intentar extraer fecha Excel desde celda A1 (row 0, col 0)
          if (rows.length > 0 && typeof rows[0]?.[0] === 'number') {
            const numeroExcel = rows[0][0];
            const dateVal = new Date(Math.round((numeroExcel - 25569) * 86400 * 1000));
            // Ajusamos por timezone offset para evitar que caiga en el día anterior por horas
            const utcDate = new Date(dateVal.getTime() + dateVal.getTimezoneOffset() * 60000);
            fechaActual = utcDate.toISOString().split('T')[0];
          } else if (rows.length > 0 && typeof rows[0]?.[0] === 'string' && rows[0][0].includes('-')) {
             fechaActual = String(rows[0][0]).trim();
          }

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const col0 = String(row[0] || '').trim();
            const col0Upper = col0.toUpperCase();
            const col1 = String(row[1] || '').trim().toUpperCase();

            // Detector de encabezados internos de ubicación (col1 dice VALOR TOTAL...)
            if (col1.includes('VALOR TOTAL DE DONACIONES')) {
              ubicacionActual = corregirUbicacion(col0Upper);
              esCarro = true; // Reiniciar alternancia en la nueva ubicación
              continue;
            }

            // Si hay ubicación activa y la fila tiene valores
            if (ubicacionActual && col0 !== '' && row[1] !== undefined && row[1] !== '') {
              const valorRaw = row[1];
              const valorFinal = parsearValorEspecial(valorRaw);
              
              let cantidad = typeof row[2] === 'number' ? row[2] : (Number(String(row[2]).replace(/[^\d]/g, '')) || 0);

              if (valorFinal > 0) {
                registrosFinales.push({
                  fecha: fechaActual,
                  ubicacion: ubicacionActual,
                  tipoParqueadero: esCarro ? 'carros' : 'motos',
                  donaciones: { valor: valorFinal, cantidadDonantes: cantidad > 0 ? cantidad : 1 },
                  facturaElectronica: { valor: 0, cantidadPersonas: 0 },
                  firmas: {
                    trabajador: col0 ? { nombre: col0, tipo: 'trabajador', ruta: '' } : null,
                    supervisor: null,
                    responsable: null
                  }
                });
                esCarro = !esCarro; // Alternar para el próximo registro
              }
            }
          }

        } else if (esPlantilla) {
          // --- FORMATO PLANTILLA ESPECIAL ---
          let fechaActual = new Date().toISOString().split('T')[0];
          let ubicacionActual = '';
          let esCarroMeli = true;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const col0 = String(row[0] || '').trim();
            const col0Upper = col0.toUpperCase();

            // Actualizar fecha si la fila es de FECHA
            if (col0Upper.startsWith('FECHA:')) {
              fechaActual = formatearFechaEspecial(col0Upper);
              continue;
            }

            // Ignorar encabezados internos de plantilla
            if (col0Upper === 'PARQUEADEROS' || col0Upper === 'TOTAL TURNO' || col0Upper === '') {
              if (col0Upper === 'TOTAL TURNO') {
                ubicacionActual = ''; // Reiniciar la ubicación al terminar el bloque
                esCarroMeli = true;
              }
              continue;
            }

            // ¿Es un cambio de ubicación?
            if (NORMALIZAR_UBICACION[col0Upper]) {
              ubicacionActual = corregirUbicacion(col0Upper);
              esCarroMeli = true; // Reiniciar alternancia
              continue;
            }

            // Si hay ubicación activa, asumimos que col0 es el nombre del trabajador
            if (ubicacionActual && col0Upper !== '') {
              let mTotal = 0;
              // Buscar el valor máximo numérico en todas las columnas (asegura encontrar el total incluso con columnas vacías al final)
              for (let c = 1; c < row.length; c++) {
                const rawVal = row[c] === null || row[c] === undefined ? '0' : String(row[c]);
                const limpio = rawVal.replace(/[^\d.]/g, '');
                const v = parseFloat(limpio);
                if (!isNaN(v) && v > mTotal) mTotal = v;
              }

              if (mTotal > 0) {
                // Si mTotal < 1000 sumamos los miles como parsearValorEspecial
                const valorFinal = mTotal < 1000 ? mTotal * 1000 : mTotal;

                registrosFinales.push({
                  fecha: fechaActual,
                  ubicacion: ubicacionActual,
                  tipoParqueadero: esCarroMeli ? 'carros' : 'motos',
                  donaciones: { valor: valorFinal, cantidadDonantes: 1 },
                  facturaElectronica: { valor: 0, cantidadPersonas: 0 },
                  firmas: {
                    trabajador: col0Upper ? { nombre: col0Upper, tipo: 'trabajador', ruta: '' } : null,
                    supervisor: null,
                    responsable: null
                  }
                });
                esCarroMeli = !esCarroMeli; // Alternar
              }
            }
          }
        } else {
          // --- FORMATO ESTÁNDAR POR CABECERAS ---
          const jsonDataRaw = XLSX.utils.sheet_to_json<any>(worksheet, { 
            raw: false, 
            defval: '',
            dateNF: 'yyyy-mm-dd' 
          });

          if (!jsonDataRaw || jsonDataRaw.length === 0) {
            throw new Error('El archivo Excel parece estar vacío.');
          }

          // Función para limpiar nombres de columnas
          const limpiarKey = (k: string) => k.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          
          registrosFinales = jsonDataRaw.map((filaOriginal: any, index: number): RegistroDiario | null => {
            try {
              // Crear una copia de la fila con llaves normalizadas
              const fila: any = {};
              Object.keys(filaOriginal).forEach(k => {
                fila[limpiarKey(k)] = filaOriginal[k];
              });

              // 1. Extraer Fecha
              let fechaStr = new Date().toISOString().split('T')[0];
              const fechaVal = fila.FECHA || fila.DIAPROCESO || '';
              if (fechaVal) {
                const f = String(fechaVal).trim();
                if (f.includes('-')) fechaStr = f;
                else if (!isNaN(Date.parse(f))) fechaStr = new Date(f).toISOString().split('T')[0];
              }

              // 2. Extraer Ubicación
              const ubicacionRaw = fila.UBICACION || fila.LUGAR || fila.PARQUEADERO || fila.SITIO || fila.PUESTO || '';
              const ubicacion = corregirUbicacion(String(ubicacionRaw));

              // 3. Extraer Valor
              const valorRaw = fila.VALOR || fila.RECAUDO || fila.TOTAL || fila.MONTO || fila.VALORTOTAL || 0;
              const valor = parsearValorEspecial(valorRaw);
              
              // 4. Extraer Cantidad
              let cantidad = 0;
              const cantRaw = fila.CANTIDAD || fila.PERSONAS || fila.DONANTES || fila.NUMEROPERSONAS || 0;
              cantidad = Number(String(cantRaw).replace(/[^\d]/g, '')) || 0;
              
              if (valor > 0 && cantidad === 0) cantidad = 1;

              // 5. Tipo
              const tipoRaw = String(fila.TIPO || fila.VEHICULO || fila.CATEGORIA || 'carros').toLowerCase();
              const tipoParqueadero = tipoRaw.includes('moto') ? 'motos' : 'carros';

              // 6. Trabajador
              const nombreTrabajador = String(fila.TRABAJADOR || fila.NOMBRE || fila.OPERARIO || fila.RESPONSABLE || '').trim();

              if (!ubicacion || ubicacion === 'SIN UBICACIÓN') return null;

              return {
                fecha: fechaStr,
                ubicacion,
                tipoParqueadero,
                donaciones: { valor, cantidadDonantes: cantidad },
                facturaElectronica: { valor: 0, cantidadPersonas: 0 },
                firmas: { 
                  trabajador: nombreTrabajador ? { nombre: nombreTrabajador, tipo: 'trabajador', ruta: '' } : null, 
                  supervisor: null, 
                  responsable: null 
                }
              };
            } catch (err) {
              console.error(`Error en fila ${index}:`, err);
              return null;
            }
          }).filter((r): r is RegistroDiario => r !== null && r.donaciones.valor > 0);
        }

        if (registrosFinales.length === 0) {
          throw new Error('No se encontraron registros válidos con valor de donación en el archivo.');
        }

        resolve(registrosFinales);
      } catch (error) {
        console.error('Error en procesarArchivoExcel:', error);
        reject(error instanceof Error ? error : new Error('Error desconocido procesando el Excel'));
      }
    };

    reader.onerror = (error) => reject(new Error('Error al leer el archivo físico'));
    reader.readAsArrayBuffer(file);
  });
};
