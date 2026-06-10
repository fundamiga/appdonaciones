import * as pdfjsLib from 'pdfjs-dist';
import { RegistroDiario } from '../types';
import { corregirUbicacion } from './importador';

pdfjsLib.GlobalWorkerOptions.workerSrc = typeof window !== 'undefined' && window.location.origin.includes('localhost') 
  ? '/pdf.worker.min.js' 
  : `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;



export const procesarArchivoPdf = async (file: File): Promise<RegistroDiario[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        const registrosFinales: RegistroDiario[] = [];
        let fechaActual = new Date().toISOString().split("T")[0];
        let esCarro = true;

        const NORMALIZAR_UBICACION_KEYS = [
          '5 CON 6','5TA CON 6TA','6 CON 6','6TA CON 6TA',
          '2 DA CON 10','2DA CON 10','2 CON 10','BOLIVAR',
          'CARTON COLOMBIA','CARTON','GUACANDA','GALERIA',
          'GUABINAS','MAYORISTA','ROZO'
        ];

        interface PdfItem { str: string; transform: number[] }
        let allItems: PdfItem[] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          allItems = allItems.concat(textContent.items);
        }

        // Si por alguna razón pdfjs no separó Y bien o todo es un array:
        // Haremos Y-clustering igual, pero muy ancho para asegurar la fila
        const rowsMap = new Map<number, PdfItem[]>();
        allItems.forEach((item: PdfItem) => {
          if (!item.transform) return;
          const y = Math.round(item.transform[5]);
          let foundY = y;
          for (const key of rowsMap.keys()) {
            if (Math.abs(key - y) < 8) {
              foundY = key;
              break;
            }
          }
          if (!rowsMap.has(foundY)) rowsMap.set(foundY, []);
          rowsMap.get(foundY)!.push(item);
        });

        const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);
        let currentUbicacion = "5ta con 6ta"; // Fallback por defecto

        // Detectar todas las ubicaciones en orden de renderizado vertical o juntas
        // Esto ayuda a saber si es un archivo que lista las ubicaciones bloque a bloque.
        for (const y of sortedY) {
          const itemsInRow = rowsMap.get(y)!;
          itemsInRow.sort((a, b) => a.transform[4] - b.transform[4]);
          
          const stringsInRow = itemsInRow.map(i => i.str.trim()).filter(s => s.length > 0);
          if (stringsInRow.length === 0) continue;

          const textFull = stringsInRow.join(" ");
          const upperFull = textFull.toUpperCase().replace(/\s+/g, ' ');

          // Detectar Fecha
          const dateMatch = upperFull.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateMatch) {
            fechaActual = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
          }

          // Si la línea es puramente el nombre de UNA ubicación:
          const matchesUbi = NORMALIZAR_UBICACION_KEYS.filter(u => upperFull.includes(u));
          if (matchesUbi.length > 0 && stringsInRow.length <= 3) {
            // Cambio de bloque de ubicacion! (Ej. El archivo está agrupado por ubicacion)
            currentUbicacion = corregirUbicacion(matchesUbi[0]) || matchesUbi[0];
            esCarro = true;
            continue;
          }

          // Si llegamos aquí, es una fila de datos.
          // Ej: "ISABELA BERMUDEZ $ 41,500 32" o "ISABELA BERMUDEZ 32"
          
          // Extracción robusta de números (ignoramos el "$" explícito que se rompe fácil)
          const nombresEnFila: string[] = [];
          const numerosEnFila: number[] = [];
          
          for (let i = 0; i < stringsInRow.length; i++) {
             const tok = stringsInRow[i];
             if (tok === "$") continue;
             const numValue = parseFloat(tok.replace(/[^\d.]/g, ""));
             // Si el token es básicamente un número
             if (/\d/.test(tok) && !isNaN(numValue) && numValue > 0) {
                 numerosEnFila.push(numValue);
             } else {
                 if (/[a-zA-Z]/.test(tok)) {
                     nombresEnFila.push(tok);
                 }
             }
          }

          if (nombresEnFila.length > 0 && numerosEnFila.length > 0) {
             const nombre = nombresEnFila.join(" ").trim();
             // Tomar el valor más grande que parezca recaudo, o el primero que sea > 1000, 
             // O adaptar números bajitos como 32 -> 32000
             let rawValor = numerosEnFila[0]; 
             // Si hay múltiples números (ej. valor y donantes) priorizar el que parezca valor (más grande)
             for(const n of numerosEnFila) {
               if(n > rawValor) rawValor = n;
             }

             const valorCorregido = rawValor < 1000 ? Math.round(rawValor * 1000) : rawValor;
             
             if (valorCorregido >= 1000) {
                registrosFinales.push({
                  fecha: fechaActual,
                  ubicacion: currentUbicacion,
                  tipoParqueadero: esCarro ? "carros" : "motos",
                  donaciones: { valor: valorCorregido, cantidadDonantes: 1 },
                  facturaElectronica: { valor: 0, cantidadPersonas: 0 },
                  firmas: {
                     trabajador: { nombre, tipo: 'trabajador', ruta: '' },
                     supervisor: null,
                     responsable: null
                  }
                });
                esCarro = !esCarro;
             }
          }
        }

        if (registrosFinales.length === 0) {
          console.warn("No se encontraron registros en el PDF. Textos extraídos (por línea):");
          const allText = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            allText.push(textContent.items.map((i: PdfItem) => i.str).join(" "));
          }
          console.log("TEXT FULL DEL PDF:", allText);
          const firstChars = allText.join(" | ").substring(0, 250);
          throw new Error(`No se encontró dinero asociado a ubicaciones. Texto detectado (primeros caract.): [${firstChars || 'Vacíoo, ¿es el PDF una imagen?'}]`);
        }

        resolve(registrosFinales);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
