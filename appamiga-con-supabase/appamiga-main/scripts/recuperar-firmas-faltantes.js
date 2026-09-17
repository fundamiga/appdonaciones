const https = require('https');
const fs = require('fs');
const path = require('path');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZnNvc2JjbW1lYWJpZnRqenlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQzMzYsImV4cCI6MjA5NDczMDMzNn0.npwz0_r8j2byZ8e4vUQ-0c2ITVa1Cdr8adVR_cpgVJA';

function fetchSupabase() {
  return new Promise((resolve) => {
    https.get('https://cffsosbcmmeabiftjzyg.supabase.co/rest/v1/periodos?select=*', {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
  });
}

function checkAndDownload(url, dest) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('✅ FIRMA RECUPERADA Y GUARDADA:', path.basename(dest));
          resolve(true);
        });
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function main() {
  console.log('🔍 Analizando nombres en la base de datos...');
  const rawData = await fetchSupabase();
  const nameRegex = /([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}(\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,})?(\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,})?)/g;
  const rawMatches = rawData.match(nameRegex) || [];
  
  const nombres = new Set();
  rawMatches.forEach(m => {
    const clean = m.trim();
    if (!/comprobante|autorizacion|factura|soporte|cuenta|egreso|periodo|servicio|nomina|arriendo|empresa|fundamiga|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|pareja|inicial|documento|bancaria|extracto/i.test(clean)) {
      nombres.add(clean);
    }
  });

  console.log(`📋 Se identificaron ${nombres.size} personas registradas en la base de datos.`);

  const subCarpetas = [
    { remote: 'firmas/trabajadors', localDir: 'trabajadores' },
    { remote: 'firmas/trabajadores', localDir: 'trabajadores' },
    { remote: 'firmas/supervisors', localDir: 'supervisores' },
    { remote: 'firmas/supervisores', localDir: 'supervisores' },
    { remote: 'firmas/responsable_conteos', localDir: 'responsable_conteos' },
    { remote: 'firmas', localDir: 'trabajadores' }
  ];

  const cloudName = 'ddbti1112';
  const formatos = ['png', 'jpg', 'jpeg'];

  let recuperadas = 0;

  for (const nombreCompleto of nombres) {
    const partes = nombreCompleto.split(/\s+/);
    
    // Generar combinaciones de nombres
    const variantes = new Set();
    variantes.add(partes.join('_'));
    variantes.add(partes.join('_').toLowerCase());
    variantes.add(partes.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_'));
    
    if (partes.length >= 2) {
      variantes.add(`${partes[0]}_${partes[partes.length - 1]}`);
      variantes.add(`${partes[0]}_${partes[partes.length - 1]}`.toLowerCase());
      variantes.add(`${partes[0]}_${partes[1]}`);
      variantes.add(`${partes[0]}_${partes[1]}`.toLowerCase());
    }
    if (partes.length >= 3) {
      variantes.add(`${partes[0]}_${partes[1]}_${partes[2]}`);
      variantes.add(`${partes[0]}_${partes[1]}_${partes[2]}`.toLowerCase());
    }

    for (const sub of subCarpetas) {
      const targetDir = path.join(__dirname, '..', 'public', 'firmas', sub.localDir);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      for (const v of variantes) {
        for (const fmt of formatos) {
          const fileName = `${v}.${fmt}`;
          const destPath = path.join(targetDir, fileName);
          if (fs.existsSync(destPath)) continue;

          const url = `https://res.cloudinary.com/${cloudName}/image/upload/${sub.remote}/${encodeURIComponent(v)}.${fmt}`;
          const ok = await checkAndDownload(url, destPath);
          if (ok) {
            recuperadas++;
            break;
          }
        }
      }
    }
  }

  console.log('\n🎉 PROCESO COMPLETADO. Firmas adicionales recuperadas:', recuperadas);
}

main().catch(console.error);
