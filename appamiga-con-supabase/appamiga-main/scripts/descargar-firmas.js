// Script para descargar todas las firmas de Cloudinary a public/firmas/ localmente
// Ejecutar con: node scripts/descargar-firmas.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// Credenciales de Cloudinary (leídas del .env.local)
const CLOUD_NAME = 'ddbti1112';
const API_KEY = '763334958941215';
const API_SECRET = '2umW5FqDTV-P2knCxn4pOKWT790';

const CARPETAS_MAP = [
  { remote: 'trabajadores', local: 'trabajadores' },
  { remote: 'trabajadors', local: 'trabajadores' },
  { remote: 'supervisores', local: 'supervisores' },
  { remote: 'supervisors', local: 'supervisores' },
  { remote: 'responsable_conteos', local: 'responsable_conteos' },
];

function httpGet(url, auth) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    const reqOptions = {
      hostname: options.hostname,
      path: options.pathname + options.search,
      headers: auth ? { Authorization: 'Basic ' + Buffer.from(auth).toString('base64') } : {},
    };
    https.get(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function descargarCarpeta(item) {
  const prefix = `firmas/${item.remote}`;
  const auth = `${API_KEY}:${API_SECRET}`;

  console.log(`\n📁 Buscando firmas en Cloudinary: ${prefix}`);

  let recursos;
  try {
    const listUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/upload?prefix=${prefix}&max_results=500`;
    const data = await httpGet(listUrl, auth);
    recursos = data.resources || [];
  } catch (e) {
    console.error(`  ❌ Error al obtener lista de ${item.remote}:`, e.message);
    return 0;
  }

  if (recursos.length === 0) {
    console.log(`  ⚠️  No se encontraron imágenes en ${prefix}`);
    return 0;
  }

  console.log(`  📷 Encontradas ${recursos.length} firmas en ${prefix}`);

  const dirLocal = path.join(__dirname, '..', 'public', 'firmas', item.local);
  if (!fs.existsSync(dirLocal)) {
    fs.mkdirSync(dirLocal, { recursive: true });
  }

  let descargadas = 0;
  for (const recurso of recursos) {
    const nombreArchivo = path.basename(recurso.public_id) + '.' + recurso.format;
    const destPath = path.join(dirLocal, nombreArchivo);

    if (fs.existsSync(destPath)) {
      console.log(`  ⏭️  Ya existe en local: ${nombreArchivo}`);
      descargadas++;
      continue;
    }

    try {
      await downloadFile(recurso.secure_url, destPath);
      console.log(`  ✅ Descargada: ${nombreArchivo}`);
      descargadas++;
    } catch (e) {
      console.error(`  ❌ Error al descargar ${nombreArchivo}:`, e.message);
    }
  }

  return descargadas;
}

async function main() {
  console.log('🚀 Descargando firmas de Cloudinary a public/firmas/...');
  console.log('='.repeat(55));

  let total = 0;
  for (const item of CARPETAS_MAP) {
    const count = await descargarCarpeta(item);
    total += count;
  }

  console.log('\n' + '='.repeat(55));
  console.log(`✅ Descarga completada: ${total} firma(s) guardada(s) en public/firmas/`);
}

main().catch(console.error);
