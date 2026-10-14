// Cada versión guarda juntos el formulario, los catálogos y la plantilla.
// Una instalación incompleta no sustituye a la versión que ya funcionaba.
const CACHE = 'mopt-rda-0.7.2';
const ARCHIVOS = ['./','index.html','estilos.css','app.mjs','core.mjs','reporte.mjs',
  'calendario.mjs','selecciones.mjs','materiales.mjs','horas.mjs','horas-equipo.mjs',
  'acarreos.mjs','acarreos-reglas.mjs','excel-acarreos.mjs','assets/logo.png',
  'terminos.html','privacidad.html','legal.css',
  'pdf.mjs','vendor/pdf-lib.min.mjs','assets/reverso-original.pdf',
  'manifest.webmanifest','assets/catalogos.json','assets/plantilla-excel.json',
  'assets/frente.png','assets/reverso.png','assets/reporte-normal.otf',
  'assets/reporte-negrita.otf','icons/icono-192.png','icons/icono-512.png',
  'icons/icono-180.png','icons/icono-maskable.png'];
self.addEventListener('install',evento=>evento.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ARCHIVOS))));
self.addEventListener('activate',evento=>evento.waitUntil((async()=>{
  const nombres=await caches.keys();
  await Promise.all(nombres.filter(n=>n.startsWith('mopt-rda-')&&n!==CACHE).map(n=>caches.delete(n)));
  await self.clients.claim();
  for(const cliente of await self.clients.matchAll())cliente.postMessage('LISTA_OFFLINE');
})()));
self.addEventListener('fetch',evento=>{
  const r=evento.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;
  evento.respondWith((async()=>{
    const cache=await caches.open(CACHE),guardado=await cache.match(r,{ignoreSearch:true});
    if(guardado)return guardado;
    if(r.mode==='navigate')return await cache.match('index.html')||fetch(r);
    return fetch(r);
  })());
});
