const https = require('https');
const fs = require('fs');
const path = require('path');

const cloudName = 'ddbti1112';

const listaNombres = [
  'PAOLA PEREZ',
  'DEYSI MORA',
  'HEIDY CAROLINA BAUTISTA',
  'FRANCISCO ECHAVARRIA',
  'OVIER',
  'MAICOL GUEVARA',
  'JESSICA PAOLA LINARES'
];

const subCarpetas = [
  { remote: 'firmas/trabajadors', localDir: 'trabajadores' },
  { remote: 'firmas/trabajadores', localDir: 'trabajadores' },
  { remote: 'firmas/supervisors', localDir: 'supervisores' },
  { remote: 'firmas/supervisores', localDir: 'supervisores' },
  { remote: 'firmas/responsable_conteos', localDir: 'responsable_conteos' },
  { remote: 'firmas', localDir: 'trabajadores' }
];

const formatos = ['png', 'jpg', 'jpeg', 'webp'];

function probarYDescargar(url, dest) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('✅ ENCONTRADA Y DESCARGADA:', path.basename(dest), '-->', url);
          resolve(true);
        });
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function main() {
  console.log('🔍 Buscando firmas para la lista de nombres proporcionada...\n');

  const resultados = [];

  for (const nombre of listaNombres) {
    const partes = nombre.trim().split(/\s+/);

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
      variantes.add(`${partes[0]}_${partes[2]}`);
      variantes.add(`${partes[0]}_${partes[2]}`.toLowerCase());
    }

    let encontrada = false;

    for (const sub of subCarpetas) {
      if (encontrada) break;
      const targetDir = path.join(__dirname, '..', 'public', 'firmas', sub.localDir);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      for (const v of variantes) {
        if (encontrada) break;
        for (const fmt of formatos) {
          const fileName = `${v}.${fmt}`;
          const destPath = path.join(targetDir, fileName);

          const url = `https://res.cloudinary.com/${cloudName}/image/upload/${sub.remote}/${encodeURIComponent(v)}.${fmt}`;
          const ok = await probarYDescargar(url, destPath);
          if (ok) {
            encontrada = true;
            resultados.push({ nombre, estado: 'DESCARGADA', archivo: path.basename(destPath) });
            break;
          }
        }
      }
    }

    if (!encontrada) {
      // Verificar si ya existía con otro nombre en local
      const localFiles = fs.readdirSync(path.join(__dirname, '..', 'public', 'firmas', 'trabajadores'));
      const yaExiste = localFiles.some(f => f.toLowerCase().includes(partes[0].toLowerCase()) && (partes.length < 2 || f.toLowerCase().includes(partes[partes.length - 1].toLowerCase())));
      
      if (yaExiste) {
        const existente = localFiles.find(f => f.toLowerCase().includes(partes[0].toLowerCase()));
        resultados.push({ nombre, estado: 'YA EXISTE EN LOCAL', archivo: existente });
      } else {
        resultados.push({ nombre, estado: 'NO ENCONTRADA EN CLOUDINARY', archivo: '-' });
      }
    }
  }

  console.log('\n================ RESUMEN ================');
  console.table(resultados);
}

main().catch(console.error);
