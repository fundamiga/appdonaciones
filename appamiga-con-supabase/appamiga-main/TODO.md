# TODO - Sincronización de firmas Cloudinary -> Supabase

- [x] Importar `SincronizarFirmas` en `src/app/admin/page.tsx`
- [x] Renderizar el componente `SincronizarFirmas` debajo de `SubirFirma`
- [x] Cambiar `FirmaService.sincronizarCloudinaryASupabase` para usar endpoint backend dedicado
- [x] Crear endpoint `POST /api/supabase/sync` que descargue desde Cloudinary y suba a Supabase con service role
- [ ] Probar sincronización completa desde panel admin y validar archivos en bucket `firmas`
