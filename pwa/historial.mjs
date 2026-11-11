import {leerConjunto} from './continuacion.mjs';
import {crearCatalogos} from './core.mjs';

export const NOMBRE_HISTORIAL='mopt.reportes.diarios';
const idValido=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);
export const nuevoIdHistorial=()=>globalThis.crypto.randomUUID?.()??'reporte-'+Date.now()+'-'+Array.from(globalThis.crypto.getRandomValues(new Uint32Array(2)),n=>n.toString(16)).join('');
export function tieneContenido(c) {
  return c.reportes.some(b=>b.codigoCamino||b.codigoActividad||
    ['produccionTexto','observaciones','inspectorTexto','encargadoTexto','problema','estacionamientoInicioTexto','estacionamientoFinalTexto','senasInicio','longitudTexto'].some(k=>String(b[k]??'').trim())||
    ['personal','equipos','materiales','personalManual','equiposManuales'].some(k=>b[k]?.length));
}
const conjuntoLeido=c=>leerConjunto(JSON.stringify(c));
const contenido=c=>{const copia={...c};delete copia.historialId;delete copia.activo;return JSON.stringify(copia);};
const fechaValida=f=>typeof f==='string'&&Number.isFinite(Date.parse(f));
const validarCatalogo=datos=>{
  if(!datos?.metadata||!['caminos','actividades','personal','equipos','materiales','redVial','puentes'].every(k=>Array.isArray(datos[k])))throw new Error('El respaldo contiene un catálogo inválido.');
  crearCatalogos(datos);return datos;
};

// Se espera a la confirmación de la transacción completa: una solicitud put
// aislada todavía no significa que el navegador haya guardado el reporte.
export function crearHistorial(indexedDB=globalThis.indexedDB) {
  let apertura,cola=Promise.resolve();const hashes=new WeakMap(),catalogosGuardados=new Set();
  function abrir() {
    if(!indexedDB)return Promise.reject(new Error('Este navegador no permite el historial local.'));
    if(!apertura)apertura=new Promise((resolve,reject)=>{
      const r=indexedDB.open(NOMBRE_HISTORIAL,1);
      r.onupgradeneeded=()=>{r.result.createObjectStore('reportes',{keyPath:'id'});r.result.createObjectStore('catalogos',{keyPath:'id'});};
      r.onerror=()=>{apertura=null;reject(r.error);};
      r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();apertura=null;catalogosGuardados.clear();};resolve(db);};
    });
    return apertura;
  }
  async function transaccion(nombres,modo,accion) {
    const db=await abrir();return new Promise((resolve,reject)=>{
      let tx,resultado;
      try{tx=db.transaction(nombres,modo);tx.oncomplete=()=>resolve(resultado);tx.onabort=()=>reject(tx.error??new Error('No se completó el guardado local.'));accion(tx,v=>{resultado=v;});}
      catch(e){try{tx?.abort();}catch{}reject(e);}
    });
  }
  function enCola(accion){const p=cola.then(accion);cola=p.catch(()=>{});return p;}
  async function hash(datos) {
    if(!hashes.has(datos))hashes.set(datos,globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(datos))).then(b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('')));
    return hashes.get(datos);
  }
  async function guardar(c,datos) {
    if(!tieneContenido(c))return null;
    const conjunto=conjuntoLeido(c),id=idValido(c.historialId)?c.historialId:nuevoIdHistorial();conjunto.historialId=id;
    const catalogoId=await hash(datos);
    return enCola(async()=>{
      const ahora=new Date().toISOString();
      const entrada=await transaccion(['reportes','catalogos'],'readwrite',(tx,devolver)=>{
        if(!catalogosGuardados.has(catalogoId))tx.objectStore('catalogos').put({id:catalogoId,datos});
        const store=tx.objectStore('reportes'),r=store.get(id);
        r.onsuccess=()=>{const entrada={id,creado:r.result?.creado??ahora,modificado:ahora,catalogoId,conjunto,...(r.result?.origenRespaldo?{origenRespaldo:r.result.origenRespaldo}:{})};store.put(entrada);devolver(entrada);};
      });
      catalogosGuardados.add(catalogoId);return entrada;
    });
  }
  async function listar(){await cola;return transaccion(['reportes'],'readonly',(tx,devolver)=>{const r=tx.objectStore('reportes').getAll();r.onsuccess=()=>devolver(r.result.sort((a,b)=>b.modificado.localeCompare(a.modificado)||a.id.localeCompare(b.id)));});}
  async function obtener(id) {
    await cola;return transaccion(['reportes','catalogos'],'readonly',(tx,devolver)=>{
      const r=tx.objectStore('reportes').get(id);r.onsuccess=()=>{
        if(!r.result){devolver(null);return;}
        const cat=tx.objectStore('catalogos').get(r.result.catalogoId);cat.onsuccess=()=>devolver(cat.result?{...r.result,catalogo:cat.result.datos}:null);
      };
    });
  }
  function eliminar(id){return enCola(()=>transaccion(['reportes'],'readwrite',tx=>tx.objectStore('reportes').delete(id)));}
  async function respaldo() {
    await cola;return transaccion(['reportes','catalogos'],'readonly',(tx,devolver)=>{
      const datos={tipo:'mopt.historial',version:1,creado:new Date().toISOString(),reportes:[],catalogos:[]};
      for(const nombre of ['reportes','catalogos']){const r=tx.objectStore(nombre).getAll();r.onsuccess=()=>{datos[nombre]=r.result;devolver(datos);};}
    });
  }
  async function importar(texto) {
    let archivo;try{archivo=JSON.parse(texto);}catch{throw new Error('El archivo no es un respaldo JSON válido.');}
    if(archivo?.tipo!=='mopt.historial'||archivo.version!==1||!Array.isArray(archivo.reportes)||!Array.isArray(archivo.catalogos))throw new Error('Selecciona un respaldo del historial de Reporte diario MOPT.');
    const catalogos=new Map();
    for(const cat of archivo.catalogos){validarCatalogo(cat.datos);if(cat.id!==await hash(cat.datos)||catalogos.has(cat.id))throw new Error('El respaldo tiene catálogos modificados o repetidos.');catalogos.set(cat.id,cat);}
    const ids=new Set(),entradas=archivo.reportes.map(e=>{
      if(!e||!idValido(e.id)||ids.has(e.id)||!fechaValida(e.creado)||!fechaValida(e.modificado)||!catalogos.has(e.catalogoId))throw new Error('El respaldo contiene un reporte inválido o un catálogo faltante.');
      ids.add(e.id);const conjunto=conjuntoLeido(e.conjunto);conjunto.historialId=e.id;
      return {id:e.id,creado:e.creado,modificado:e.modificado,catalogoId:e.catalogoId,conjunto,...(idValido(e.origenRespaldo)?{origenRespaldo:e.origenRespaldo}:{})};
    });
    // La importación completa se valida antes de escribir. Ante un conflicto
    // se conserva el registro existente y se agrega una copia independiente.
    return enCola(()=>transaccion(['reportes','catalogos'],'readwrite',(tx,devolver)=>{
      const store=tx.objectStore('reportes'),r=store.getAll();r.onsuccess=()=>{
        const existentes=r.result;let agregados=0,omitidos=0,copias=0;
        for(const e of entradas) {
          const iguales=existentes.some(a=>(a.id===e.id||a.origenRespaldo===e.id)&&a.catalogoId===e.catalogoId&&contenido(a.conjunto)===contenido(e.conjunto));
          if(iguales){omitidos++;continue;}
          if(existentes.some(a=>a.id===e.id)){e.origenRespaldo=e.id;e.id=nuevoIdHistorial();e.conjunto.historialId=e.id;copias++;}
          store.put(e);existentes.push(e);agregados++;
        }
        for(const cat of catalogos.values())tx.objectStore('catalogos').put(cat);
        devolver({agregados,omitidos,copias});
      };
    }));
  }
  return {guardar,listar,obtener,eliminar,respaldo,importar};
}
