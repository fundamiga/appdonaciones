import * as XLSX from 'xlsx';
import { RegistroDiario, Donacion } from '../types';

export interface FilaExcel {
  FECHA?: string | number;
  UBICACION?: string;
  LUGAR?: string;
  PARQUEADERO?: string;
  VALOR?: number;
  RECAUDO?: number;
  TOTAL?: number;
  CANTIDAD?: number;
  PERSONAS?: number;
  DONANTES?: number;
  TIPO?: string;
  VEHICULO?: string;
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
  'GUACANDA': 'Guacanda',
  'GALERIA': 'Galeria',
  'GUABINAS': 'Guabinas',
  'MAYORISTA': 'Mayorista',
  'ROZO': 'Rozo'
};

const corregirUbicacion = (name: string): string => {
  const upper = name.trim().toUpperCase();
  return NORMALIZAR_UBICACION[upper] || name;
};

// Convierte "$ 60.40" o parecido a 60400
const parsearValorEspecial = (valor: any): number => {
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
        
        // Convertir a matriz de filas para detectar formato
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
        
        if (rows.length < 3) {
          throw new Error('El archivo no tiene suficientes filas.');
        }

        // ¿Es la plantilla especial?
        // Row 0: [fecha]
        // Row 1: [ubicación, header, header]
        // Row 2+: [trabajador, valor, cantidad]
        // --- NUEVA LÓGICA DINÁMICA (Multi-Parqueadero) ---
        let currentFecha = rows[0][0]; // Fecha inicial (siempre en la primera celda)
        let currentUbicacion = 'SIN UBICACIÓN';
        let workersInLocation = 0;
        const registros: RegistroDiario[] = [];

        for (let i = 0; i < rows.length; i++) {
          const fila = rows[i];
          if (!fila || fila.length === 0) continue;

          const col0 = fila[0]?.toString().trim() || '';
          const col1 = fila[1]?.toString().trim().toLowerCase() || '';

          // 1. Detectar Nueva Fecha (Fila con un solo valor numérico/fecha)
          if (fila.length === 1 && col0 !== '' && !isNaN(Number(col0))) {
            currentFecha = fila[0];
            continue;
          }

          // 2. Detectar Nueva Ubicación (Fila que tiene el texto de cabecera)
          if (col1.includes('valor total de donaciones')) {
            currentUbicacion = corregirUbicacion(col0);
            workersInLocation = 0; // Reiniciar cuenta para Moto/Carro al cambiar parqueadero
            continue;
          }

          // 3. Procesar Trabajador (Si hay algo en col0 y no es cabecera/vacio)
          if (col0 !== '' && currentUbicacion !== 'SIN UBICACIÓN' && !col1.includes('valor total')) {
            const valor = parsearValorEspecial(fila[1]);
            const cantidad = Number(fila[2] || 0);

            registros.push({
              fecha: currentFecha,
              ubicacion: currentUbicacion,
              tipoParqueadero: workersInLocation % 2 === 0 ? 'motos' : 'carros',
              donaciones: { valor, cantidadDonantes: cantidad },
              facturaElectronica: { valor: 0, cantidadPersonas: 0 },
              firmas: {
                trabajador: { nombre: col0, tipo: 'trabajador', ruta: '' },
                supervisor: null,
                responsable: null
              }
            });
            workersInLocation++;
          }
        }

        if (registros.length > 0) {
          resolve(registros);
          return;
        }

        // Formato estándar (por cabeceras)
        const jsonData = XLSX.utils.sheet_to_json<FilaExcel>(worksheet, { 
          raw: false, 
          dateNF: 'yyyy-mm-dd' 
        });
        
        const registrosEstandar = jsonData.map((fila): RegistroDiario => {
          const fechaStr = String(fila.FECHA || new Date().toISOString().split('T')[0]);
          const ubicacion = fila.UBICACION || fila.LUGAR || fila.PARQUEADERO || 'SIN UBICACIÓN';
          const valor = Number(fila.VALOR || fila.RECAUDO || fila.TOTAL || 0);
          const cantidad = Number(fila.CANTIDAD || fila.PERSONAS || fila.DONANTES || 0);
          const tipoRaw = String(fila.TIPO || fila.VEHICULO || 'carros').toLowerCase();
          const tipoParqueadero = tipoRaw.includes('moto') ? 'motos' : 'carros';

          return {
            fecha: fechaStr,
            ubicacion,
            tipoParqueadero,
            donaciones: { valor, cantidadDonantes: cantidad },
            facturaElectronica: { valor: 0, cantidadPersonas: 0 },
            firmas: { trabajador: null, supervisor: null, responsable: null }
          };
        });

        resolve(registrosEstandar);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
