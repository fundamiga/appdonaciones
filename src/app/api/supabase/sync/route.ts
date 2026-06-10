import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary/config';
import { supabase, SUPABASE_BUCKET } from '@/lib/supabase/config';
import https from 'https';

type TipoFirma = 'trabajador' | 'supervisor' | 'responsable';

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
};

function getCarpeta(tipo: TipoFirma): string {
  return tipo === 'responsable' ? 'responsable_conteos' : `${tipo}s`;
}

function formatearNombreDesdePublicId(publicId: string): string {
  const nombreArchivo = publicId.split('/').pop() || publicId;
  const nombreSinExtension = nombreArchivo.replace(/\.[^/.]+$/, '');
  return nombreSinExtension
    .split(/[_-]/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}

export async function POST() {
  const errores: string[] = [];
  let total = 0;
  let exitosos = 0;

  const tipos: TipoFirma[] = ['trabajador', 'supervisor', 'responsable'];

  for (const tipo of tipos) {
    const carpeta = getCarpeta(tipo);
    const prefix = `firmas/${carpeta}`;

    let resources: CloudinaryResource[] = [];

    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix,
        max_results: 500,
      });

      resources = (result.resources || []).map((r: CloudinaryResource) => ({
        public_id: r.public_id,
        secure_url: r.secure_url,
      }));
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido listando recursos';
      errores.push(`No se pudo listar ${tipo}s en Cloudinary: ${mensaje}`);
      continue;
    }

    for (const resource of resources) {
      total++;

      try {
        let buffer: Buffer;
        let contentType = 'image/png';

        const descargarBuffer = (url: string): Promise<{ buffer: Buffer; contentType?: string }> =>
          new Promise((resolve, reject) => {
            const req = https.get(
              url,
              {
                headers: { Accept: 'image/*,*/*;q=0.8' },
              },
              (res) => {
                const status = res.statusCode ?? 0;
                if (status < 200 || status >= 300) {
                  res.resume();
                  reject(new Error(`Descarga fallida (${status})`));
                  return;
                }

                const chunks: Buffer[] = [];
                res.on('data', (chunk) =>
                  chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
                );
                res.on('end', () => {
                  resolve({
                    buffer: Buffer.concat(chunks),
                    contentType: Array.isArray(res.headers['content-type'])
                      ? res.headers['content-type'][0]
                      : res.headers['content-type'],
                  });
                });
              }
            );

            req.on('error', (err) => reject(err));
            req.setTimeout(20000, () => {
              req.destroy(new Error('Timeout descargando imagen'));
            });
          });

        // 1) Intento por URL segura con https nativo (evita inestabilidad de fetch en entorno local)
        try {
          const downloaded = await descargarBuffer(resource.secure_url);
          buffer = downloaded.buffer;
          contentType = downloaded.contentType || contentType;
        } catch {
          // 2) Fallback: pedir URL al SDK y volver a descargar con https nativo
          const cloudRes = await cloudinary.api.resource(resource.public_id, {
            resource_type: 'image',
          });
          const downloaded = await descargarBuffer(cloudRes.secure_url as string);
          buffer = downloaded.buffer;
          contentType = downloaded.contentType || contentType;
        }

        const nombreFormateado = formatearNombreDesdePublicId(resource.public_id);
        const nombreArchivo = `${nombreFormateado.toLowerCase().replace(/\s+/g, '_')}.png`;
        const path = `${carpeta}/${nombreArchivo}`;

        const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
          contentType,
          upsert: true,
        });

        if (uploadError) throw new Error(uploadError.message);

        exitosos++;
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido';
        const nombreVisible = formatearNombreDesdePublicId(resource.public_id);
        errores.push(`Error sincronizando ${nombreVisible}: ${mensaje}`);
      }
    }
  }

  return NextResponse.json({ total, exitosos, errores });
}
