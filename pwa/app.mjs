import {CLAVE,crearCatalogos,nuevoEncabezado,leerBorrador,fechaVisible,coincide,errores,generarExcel,generarPdf,PART_MOPT,lineasObservaciones,errorObservaciones} from './core.mjs';
import {dibujarFrente,dibujarReverso} from './reporte.mjs';
import {iniciarCalendario} from './calendario.mjs';
import {iniciarSelecciones} from './selecciones.mjs';
import {iniciarMateriales} from './materiales.mjs';
const $=id=>document.getElementById(id);
let catalogos,plantilla,fondo,reverso,encabezado=nuevoEncabezado(),instalacion;
let guardadoSeguro=true,temporizador,pintura,limite=40,selecciones,capturaMateriales;
const idsAcciones=['guardar','ver','catalogos','nuevo','excel','pdf','imagen'];
function aviso(t){$('estado').textContent=t;}
function conexion(){ $('conexion').textContent=navigator.onLine?'Con conexión':'Sin conexión'; }
window.addEventListener('online',conexion);window.addEventListener('offline',conexion);conexion();
async function json(url){const r=await fetch(url);if(!r.ok)throw new Error('No se pudo leer '+url);return r.json();}
function imagen(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});}
function actualizaAutomaticos(){
  const c=catalogos.caminos.get(encabezado.codigoCamino),a=catalogos.actividades.get(encabezado.codigoActividad);
  $('desde').textContent=c?.desde??'Selecciona un camino';$('hasta').textContent=c?.hasta??'Selecciona un camino';
  $('descripcion').textContent=a?.descripcion??'Selecciona una actividad';$('unidad').textContent=a?.unidad??'—';$('produccion').disabled=!a;
  // No se sustituye el texto ni la posición del cursor mientras se edita la fecha.
  if(document.activeElement!==$('fecha'))$('fecha').value=encabezado.fechaTexto??fechaVisible(encabezado.fecha);
  $('espacio-observaciones').textContent=lineasObservaciones(encabezado.observaciones).length+' de 3 líneas disponibles.';
  const error=errorObservaciones(encabezado.observaciones);
  $('error-observaciones').textContent=error;$('observaciones').setAttribute('aria-invalid',String(Boolean(error)));
  if(!$('vista').hidden){cancelAnimationFrame(pintura);pintura=requestAnimationFrame(pintar);}
}
function guardar(manual=false){
  if(!guardadoSeguro && !manual)return;
  try{localStorage.setItem(CLAVE,JSON.stringify({...encabezado,idCatalogo:catalogos.datos.metadata.idCatalogo}));guardadoSeguro=true;aviso('Borrador guardado en este dispositivo.');}
  catch{aviso('No se pudo guardar el borrador. Puedes descargar el reporte.');}
}
function cambiado(){actualizaAutomaticos();aviso('Cambios sin guardar.');clearTimeout(temporizador);temporizador=setTimeout(()=>guardar(),600);}
function buscador(id,tipo){
  const input=$(id),lista=$('lista-'+id),campo=tipo==='caminos'?'codigoCamino':'codigoActividad';
  function seleccionar(fila){
    if(tipo==='actividades' && fila.codigo!==encabezado.codigoActividad){encabezado.produccionTexto='';$('produccion').value='';}
    encabezado[campo]=fila.codigo;input.value=fila.codigo;lista.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-invalid');$('error-'+id).textContent='';cambiado();
  }
  function buscar(){
    const consulta=input.value.trim(),anterior=encabezado[campo],exacta=catalogos[tipo].get(consulta);
    if(exacta){seleccionar(exacta);return;}
    encabezado[campo]=null;
    if(tipo==='actividades' && anterior){encabezado.produccionTexto='';$('produccion').value='';}
    cambiado();lista.replaceChildren();
    if(!consulta){lista.hidden=true;input.setAttribute('aria-expanded','false');return;}
    const filas=[...catalogos[tipo].values()].filter(f=>coincide(`${f.codigo} ${f.seccion??''} ${f.ruta??''} ${f.descripcion}`,consulta)).slice(0,30);
    for(const fila of filas){const b=document.createElement('button');b.type='button';b.setAttribute('role','option');const t=document.createElement('strong');t.textContent=fila.codigo;b.append(t,document.createTextNode(fila.descripcion));b.addEventListener('click',()=>seleccionar(fila));lista.append(b);}
    if(!filas.length){const p=document.createElement('p');p.textContent='No hay coincidencias.';lista.append(p);}
    lista.hidden=false;input.setAttribute('aria-expanded','true');
  }
  input.addEventListener('input',buscar);
  input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){lista.querySelector('button')?.focus();e.preventDefault();}if(e.key==='Escape'){lista.hidden=true;input.setAttribute('aria-expanded','false');}});
  lista.addEventListener('keydown',e=>{const opciones=[...lista.querySelectorAll('button')],i=opciones.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){opciones[(i+(e.key==='ArrowDown'?1:-1)+opciones.length)%opciones.length]?.focus();e.preventDefault();}if(e.key==='Escape'){lista.hidden=true;input.focus();}});
}
// Frente y reverso forman siempre el reporte, para cualquier actividad.
function pintar(){dibujarFrente($('lienzo').getContext('2d'),fondo,encabezado,catalogos);dibujarReverso($('reverso').getContext('2d'),reverso);}
function validar(){const e={...errores(encabezado,catalogos),...selecciones.erroresPendientes(),...capturaMateriales.erroresPendientes()};for(const id of ['camino','actividad','fecha','produccion','avance','problema','personal','equipos','materiales','observaciones']){$('error-'+id).textContent=e[id]??'';$(id).setAttribute('aria-invalid',String(Boolean(e[id])));}if(Object.keys(e).length){const primero=Object.keys(e)[0];if(primero==='materiales')capturaMateriales.enfocarError();else if(primero==='personal')selecciones.enfocarError();else $(primero).focus();aviso('Revisa los campos indicados.');return false;}return true;}
function descargar(bytes,nombre,mime){const blob=new Blob([bytes],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nombre;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function bytesImagen(canvas){return Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.97).split(',')[1]),c=>c.charCodeAt(0));}
async function exportar(tipo){
  if(!validar())return;clearTimeout(temporizador);guardar(true);idsAcciones.forEach(id=>$(id).disabled=true);
  try{
    const nombre='Reporte_MOPT_'+encabezado.fecha+'_'+Date.now();
    if(tipo==='excel')descargar(generarExcel(plantilla,encabezado,catalogos),nombre+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    else{
      pintar();const lienzos=[$('lienzo'),$('reverso')];
      if(tipo==='pdf')descargar(generarPdf(lienzos.map(c=>({bytes:bytesImagen(c),ancho:c.width,alto:c.height}))),nombre+'.pdf','application/pdf');
      else{let c=lienzos[0];if(lienzos.length>1){c=document.createElement('canvas');c.width=lienzos[0].width;c.height=lienzos.reduce((n,l)=>n+l.height,0);let y=0;for(const l of lienzos){c.getContext('2d').drawImage(l,0,y);y+=l.height;}}
        const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw new Error('No se pudo crear la imagen.');descargar(blob,nombre+'.png','image/png');}
    }
    aviso('Reporte generado. Revisa las descargas del navegador.');
  }catch(e){aviso('No se pudo exportar: '+e.message);}finally{idsAcciones.forEach(id=>$(id).disabled=false);}
}
function tituloFila(tipo,f){return ({actividades:()=>f.codigo+' · '+f.descripcion,personal:()=>f.nombre+' · '+f.cedula,materiales:()=>f.codigo+' · '+f.descripcion,equipos:()=>f.codigo+' · '+f.descripcion,redVial:()=>f.seccion+' · Ruta '+f.ruta+' · '+f.descripcion,puentes:()=>f.nombre+' · Ruta '+f.ruta})[tipo]();}
function regionFila(f){return f.regional??f.provincia??'';}
const nombres={codigo:'Código',regional:'Regional',nombre:'Nombre',cedula:'Cédula',part:'PART (C)',unidad:'Unidad',unidadOriginal:'Unidad original',descripcion:'Descripción',codigoEquipo:'COD. (F)',numeroEquipo:'N.º EQ',codigoPorComponentes:'Código por componentes',clasificacion:'Clasificación',seccion:'Sección',ruta:'Ruta',provincia:'Provincia',longitudKm:'Longitud total (km)',tipo:'Tipo',estacion:'Estación',canton:'Cantón',numero:'Número',control:'Control',funcion:'Función',rio:'Río',longitudTexto:'Longitud original'};
function verCatalogo(cambioTipo=false){
  const tipo=$('tipo-catalogo').value,todos=catalogos.datos[tipo];
  if(cambioTipo){limite=40;$('region-catalogo').replaceChildren(new Option('Todas',''));for(const r of [...new Set(todos.map(regionFila).filter(Boolean))].sort())$('region-catalogo').add(new Option(r,r));if(['personal','equipos'].includes(tipo))$('region-catalogo').value='V Heredia';}
  const region=$('region-catalogo').value,q=$('buscar-catalogo').value,filas=todos.filter(f=>(!region||regionFila(f)===region)&&coincide(Object.values(f).filter(v=>typeof v!=='object').join(' '),q));
  $('cantidad-catalogo').textContent=`${filas.length} resultados de ${todos.length} registros.`;$('resultados-catalogo').replaceChildren();
  for(const f of filas.slice(0,limite)){
    const d=document.createElement('details'),s=document.createElement('summary'),dl=document.createElement('dl');s.textContent=tituloFila(tipo,f);d.append(s);
    for(const [k,n] of Object.entries(nombres))if(f[k]!=null){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=n;dd.textContent=k==='part'&&tipo==='personal'?PART_MOPT:String(f[k]);dl.append(dt,dd);}d.append(dl);
    for(const t of f.advertencias??[]){const p=document.createElement('p');p.className='advertencia';p.textContent=t;d.append(p);}$('resultados-catalogo').append(d);
  }
  $('mas-catalogo').hidden=limite>=filas.length;
}
async function iniciar(){
  try{
    const recursos=await Promise.all([json('assets/catalogos.json'),json('assets/plantilla-excel.json'),imagen('assets/frente.png'),imagen('assets/reverso.png'),document.fonts.load('7px Reporte'),document.fonts.load('bold 7px Reporte')]);
    catalogos=crearCatalogos(recursos[0]);plantilla=recursos[1];fondo=recursos[2];reverso=recursos[3];
    let recuperado=false;try{const texto=localStorage.getItem(CLAVE);if(texto){encabezado=leerBorrador(texto);recuperado=true;}}catch{guardadoSeguro=false;aviso('El borrador guardado no pudo recuperarse. Se conserva hasta que pulses Guardar borrador.');}
    $('camino').value=encabezado.codigoCamino??'';$('actividad').value=encabezado.codigoActividad??'';$('produccion').value=encabezado.produccionTexto;$('senas').value=encabezado.senasInicio;$('avance').value=encabezado.longitudTexto;$('problema').value=encabezado.problema;$('observaciones').value=encabezado.observaciones;actualizaAutomaticos();
    buscador('camino','caminos');buscador('actividad','actividades');
    for(const [id,campo]of [['produccion','produccionTexto'],['senas','senasInicio'],['avance','longitudTexto'],['problema','problema'],['observaciones','observaciones']])$(id).addEventListener('input',()=>{encabezado[campo]=$(id).value;cambiado();});
    // Los dos módulos comparten el borrador; ningún selector modifica la otra lista.
    const modelo={leer:()=>encabezado,actualizar:b=>{encabezado=b;cambiado();}};
    iniciarCalendario(modelo);selecciones=iniciarSelecciones(catalogos,modelo);capturaMateriales=iniciarMateriales(catalogos,modelo);
    $('guardar').addEventListener('click',()=>{clearTimeout(temporizador);guardar(true);});$('ver').addEventListener('click',()=>{$('vista').hidden=false;pintar();$('vista').scrollIntoView({behavior:'smooth',block:'start'});});
    for(const tipo of ['excel','pdf','imagen'])$(tipo).addEventListener('click',()=>exportar(tipo));
    $('nuevo').addEventListener('click',()=>{if(!confirm('¿Crear un reporte nuevo? El borrador del reporte será reemplazado.'))return;encabezado=nuevoEncabezado();for(const id of ['camino','actividad','produccion','senas','avance','problema','observaciones'])$(id).value='';for(const id of ['camino','actividad','fecha','produccion','avance','problema','personal','equipos','materiales','observaciones']){$('error-'+id).textContent='';$(id).removeAttribute('aria-invalid');}for(const id of ['camino','actividad'])$('lista-'+id).hidden=true;selecciones.refrescar();capturaMateriales.refrescar();actualizaAutomaticos();guardar(true);});
    $('catalogos').addEventListener('click',()=>{$('visor').hidden=!$('visor').hidden;if(!$('visor').hidden){verCatalogo(true);$('visor').scrollIntoView({behavior:'smooth',block:'start'});}});
    $('tipo-catalogo').addEventListener('change',()=>verCatalogo(true));for(const id of ['buscar-catalogo','region-catalogo'])$(id).addEventListener('input',()=>{limite=40;verCatalogo();});$('mas-catalogo').addEventListener('click',()=>{limite+=40;verCatalogo();});
    $('formulario').addEventListener('submit',e=>e.preventDefault());idsAcciones.forEach(id=>$(id).disabled=false);
    if(guardadoSeguro)aviso(recuperado?'Borrador recuperado.':'Reporte listo para completar.');
    if('serviceWorker' in navigator && window.isSecureContext){try{
      await navigator.serviceWorker.register('sw.js',{scope:'./'});
      const r=await navigator.serviceWorker.ready;
      if(r.active)$('conexion').textContent='Disponible sin conexión';
      navigator.serviceWorker.addEventListener('message',e=>{if(e.data==='LISTA_OFFLINE')$('conexion').textContent='Disponible sin conexión';});
    }catch{$('conexion').textContent='Uso sin conexión pendiente. Recarga con Internet.';}}
  }catch(e){$('fallo').hidden=false;$('fallo').textContent='No se pudo iniciar. Recarga el sitio cuando tengas conexión. '+e.message;aviso('Faltan archivos de la aplicación.');}
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();instalacion=e;$('instalar').hidden=false;});
$('instalar').addEventListener('click',async()=>{if(!instalacion)return;await instalacion.prompt();instalacion=null;$('instalar').hidden=true;});
window.addEventListener('appinstalled',()=>{$('instalar').hidden=true;});
window.addEventListener('pagehide',()=>{if(catalogos&&guardadoSeguro){clearTimeout(temporizador);guardar();}});
iniciar();
