// Script para explorar la estructura de carpetas en Cloudinary
const https = require('https');

const CLOUD_NAME = 'ddbti1112';
const API_KEY = '763334958941215';
const API_SECRET = '2umW5FqDTV-P2knCxn4pOKWT790';

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
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ raw: data }); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const auth = `${API_KEY}:${API_SECRET}`;

  // Listar todas las carpetas raíz
  console.log('📂 Explorando carpetas en Cloudinary...\n');
  const foldersUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/folders`;
  const folders = await httpGet(foldersUrl, auth);
  console.log('Carpetas raíz:', JSON.stringify(folders, null, 2));

  // Listar todos los recursos sin filtro para ver qué hay
  console.log('\n📷 Buscando cualquier recurso (primeros 20)...');
  const resourcesUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/upload?max_results=20`;
  const resources = await httpGet(resourcesUrl, auth);
  if (resources.resources) {
    resources.resources.forEach(r => console.log(' -', r.public_id, '|', r.secure_url));
  } else {
    console.log(JSON.stringify(resources, null, 2));
  }
}

main().catch(console.error);
