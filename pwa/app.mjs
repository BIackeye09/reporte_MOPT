import {nuevoConjunto,leerConjunto,actualizarReporte,agregarTrabajador,puedeQuitarContinuacion,quitarContinuacion,destinoParaPersonal,registrarEquipo,erroresConjunto} from './continuacion.mjs';
import {generarExcelConjunto} from './excel-conjunto.mjs';
import {zipGuardado} from './core.mjs';
import {CLAVE,crearCatalogos,nuevoEncabezado,leerBorrador,fechaVisible,coincide,errores,generarExcel,PART_MOPT,lineasObservaciones,errorObservaciones,errorNumeroReporte,produccionDelReporte,unidadProduccion} from './core.mjs';
import {esAcarreo} from './acarreos-reglas.mjs';
import {erroresEstacionamientos,senasInicioDelReporte,avanceDelReporte} from './estacionamientos.mjs';
import {iniciarAcarreos} from './acarreos.mjs';
import {dibujarFrente,dibujarReverso} from './reporte.mjs';
import {iniciarCalendario} from './calendario.mjs';
import {iniciarSelecciones} from './selecciones.mjs';
import {iniciarMateriales} from './materiales.mjs';
const $=id=>document.getElementById(id);
let catalogos,plantilla,fondo,reverso,reversoOriginal,encabezado=nuevoEncabezado(),instalacion;
let guardadoSeguro=true,temporizador,pintura,limite=40,selecciones,capturaMateriales,capturaAcarreos;
let conjunto=nuevoConjunto(encabezado),notificacionPersonal=null,exportando=false;
const idsAcciones=['guardar','ver','catalogos','nuevo','excel','pdf','imagen'];
function aviso(t){$('estado').textContent=t;}
function conexion(){ $('conexion').textContent=navigator.onLine?'Con conexión':'Sin conexión'; }
window.addEventListener('online',conexion);window.addEventListener('offline',conexion);conexion();
async function json(url){const r=await fetch(url);if(!r.ok)throw new Error('No se pudo leer '+url);return r.json();}
async function archivo(url){const r=await fetch(url);if(!r.ok)throw new Error('No se pudo leer '+url);return new Uint8Array(await r.arrayBuffer());}
function imagen(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});}
function navegacion(){
  $('reporte-activo').replaceChildren(...conjunto.reportes.map((b,i)=>new Option('Reporte '+(i+1)+' / '+conjunto.reportes.length,String(i))));
  $('reporte-activo').value=String(conjunto.activo);$('reporte-activo').disabled=exportando;
  $('reporte-anterior').disabled=exportando||conjunto.activo===0;$('reporte-siguiente').disabled=exportando||conjunto.activo===conjunto.reportes.length-1;
  $('quitar-continuacion').hidden=!puedeQuitarContinuacion(conjunto);$('quitar-continuacion').disabled=exportando;
  $('resumen-reportes').textContent='Reporte '+encabezado.numeroReporteTexto+' · '+conjunto.reportes.reduce((n,b)=>n+b.personal.length,0)+' trabajadores en total. Las descargas incluyen los '+conjunto.reportes.length+' reportes.';
  $('numero').value=encabezado.numeroReporteTexto;
}
function cargarFormulario(){
  for(const [id,campo] of [['camino','codigoCamino'],['actividad','codigoActividad'],['numero','numeroReporteTexto'],['produccion','produccionTexto'],['problema','problema'],['observaciones','observaciones']])$(id).value=encabezado[campo]??'';
  for(const id of ['camino','actividad','fecha','numero','produccion','avance','estacionamiento-inicio','estacionamiento-final','problema','personal','equipos','acarreos','materiales','observaciones']){$('error-'+id).textContent='';$(id).removeAttribute('aria-invalid');}
  for(const id of ['camino','actividad']){$('lista-'+id).hidden=true;$(id).setAttribute('aria-expanded','false');}
  selecciones?.refrescar();capturaMateriales?.refrescar();actualizaAutomaticos();
}
function pendientes(){return {...selecciones.erroresPendientes(),...capturaMateriales.erroresPendientes()};}
function cambiarHoja(indice){
  if(exportando)return;
  const e=pendientes();if(Object.keys(e).length){aviso('Confirma o cancela los datos pendientes antes de cambiar de reporte.');$('reporte-activo').value=String(conjunto.activo);return;}
  if(!Number.isInteger(indice)||indice<0||indice>=conjunto.reportes.length)return;
  conjunto={...conjunto,activo:indice};encabezado=conjunto.reportes[indice];cargarFormulario();guardar(true);
}
function prepararTrabajador(entrada){
  const destino=entrada.editando?conjunto.activo:destinoParaPersonal(conjunto),siguiente=agregarTrabajador(conjunto,entrada,catalogos);
  if(destino!==conjunto.activo)notificacionPersonal={destino,creada:siguiente.reportes.length>conjunto.reportes.length};
  conjunto=siguiente;return conjunto.reportes[conjunto.activo];
}
function prepararEquipo(entrada){conjunto=registrarEquipo(conjunto,entrada,catalogos);return conjunto.reportes[conjunto.activo];}

function actualizaAutomaticos(){
  navegacion();
  const previas=conjunto.estacionesPrevias??[];$('estaciones-previas').hidden=!previas.length;$('estaciones-previas').textContent=previas.length?'Estaciones anteriores conservadas como referencia: '+previas.map(f=>'reporte '+f.reporte+': inicio «'+f.estacionamientoInicioTexto+'», final «'+f.estacionamientoFinalTexto+'»').join('; ')+'. Ahora se comparten las del reporte 1.':'';
  const c=catalogos.caminos.get(encabezado.codigoCamino),a=catalogos.actividades.get(encabezado.codigoActividad);
  $('desde').textContent=c?.desde??'Selecciona un camino';$('hasta').textContent=c?.hasta??'Selecciona un camino';
  $('descripcion').textContent=a?.descripcion??'Selecciona una actividad';$('unidad').textContent=unidadProduccion(encabezado,catalogos);$('produccion').disabled=!a;
  const acarreo=esAcarreo(encabezado),produccion=produccionDelReporte(encabezado);
  $('produccion').readOnly=acarreo;
  if(acarreo)$('produccion').value=produccion===null?'':produccion.toFixed(2).replace('.',',');
  else if(document.activeElement!==$('produccion'))$('produccion').value=encabezado.produccionTexto;
  $('ayuda-produccion').textContent=acarreo?'Se calcula automáticamente con los acarreos de la actividad '+encabezado.codigoActividad+'. Completa el panel debajo de Equipo.':'La unidad se completa con la actividad. La cantidad se escribe manualmente y puede quedar vacía.';
  // Se conservan las estaciones al cambiar de actividad, pero nunca se
  // muestran ni se exportan con 533 o 534, tampoco desde borradores viejos.
  $('datos-estacionamientos').hidden=acarreo;$('datos-estacionamientos').disabled=acarreo;
  const erroresEst=erroresEstacionamientos(encabezado),avance=avanceDelReporte(encabezado);
  for(const [id,campo] of [['estacionamiento-inicio','estacionamientoInicioTexto'],['estacionamiento-final','estacionamientoFinalTexto']]){
    if(document.activeElement!==$(id))$(id).value=encabezado[campo];
    $('error-'+id).textContent=erroresEst[id]??'';$(id).setAttribute('aria-invalid',String(Boolean(erroresEst[id])));
  }
  $('senas').value=senasInicioDelReporte(encabezado);$('avance').value=avance===null?'':String(avance).replace('.',',');
  const legado=encabezado.senasInicio||encabezado.longitudTexto;
  $('datos-anteriores').hidden=!legado;
  $('datos-anteriores').textContent=legado?'Datos anteriores conservados como referencia: señas «'+encabezado.senasInicio+'», avance «'+encabezado.longitudTexto+'». El reporte nuevo usa los estacionamientos y calcula el avance.':'';
  capturaAcarreos?.refrescar();selecciones?.refrescarParticipantes();
  const numero=errorNumeroReporte(encabezado.numeroReporteTexto);$('error-numero').textContent=numero;$('numero').setAttribute('aria-invalid',String(Boolean(numero)));
  // No se sustituye el texto ni la posición del cursor mientras se edita la fecha.
  if(document.activeElement!==$('fecha'))$('fecha').value=encabezado.fechaTexto??fechaVisible(encabezado.fecha);
  $('espacio-observaciones').textContent=lineasObservaciones(encabezado.observaciones).length+' de 3 líneas disponibles.';
  const error=errorObservaciones(encabezado.observaciones);
  $('error-observaciones').textContent=error;$('observaciones').setAttribute('aria-invalid',String(Boolean(error)));
  if(!$('vista').hidden){cancelAnimationFrame(pintura);pintura=requestAnimationFrame(pintar);}
}
function guardar(manual=false){
  if(!guardadoSeguro && !manual)return;
  try{localStorage.setItem(CLAVE,JSON.stringify(conjunto));guardadoSeguro=true;aviso('Borrador guardado en este dispositivo.');}
  catch{aviso('No se pudo guardar el borrador. Puedes descargar el reporte.');}
}
function cambiado(){conjunto=actualizarReporte(conjunto,{...encabezado,idCatalogo:catalogos.datos.metadata.idCatalogo});encabezado=conjunto.reportes[conjunto.activo];actualizaAutomaticos();aviso('Cambios sin guardar.');clearTimeout(temporizador);temporizador=setTimeout(()=>guardar(),600);}
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
function pintar(){dibujarFrente($('lienzo').getContext('2d'),fondo,encabezado,catalogos);dibujarReverso($('reverso').getContext('2d'),reverso,encabezado,catalogos);}
function validar(){const e={...erroresConjunto(conjunto,catalogos)[conjunto.activo],...selecciones.erroresPendientes(),...capturaMateriales.erroresPendientes()};for(const id of ['camino','actividad','fecha','numero','produccion','avance','estacionamiento-inicio','estacionamiento-final','problema','personal','equipos','acarreos','materiales','observaciones']){$('error-'+id).textContent=e[id]??'';$(id).setAttribute('aria-invalid',String(Boolean(e[id])));}if(Object.keys(e).length){const primero=Object.keys(e)[0];if(primero==='materiales')capturaMateriales.enfocarError();else if(primero==='personal')selecciones.enfocarError();else if(primero==='equipos')selecciones.enfocarErrorEquipo();else if(primero==='acarreos')capturaAcarreos.enfocarError();else $(primero).focus();aviso('Revisa los campos indicados.');return false;}return true;}
function descargar(bytes,nombre,mime){const blob=new Blob([bytes],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nombre;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportar(tipo){
  if(!validar())return;
  // Se validan todas las hojas, también si la actual no es la primera.
  const revisiones=erroresConjunto(conjunto,catalogos);
  for(const [i,b] of conjunto.reportes.entries())if(Object.keys(revisiones[i]).length){
    conjunto={...conjunto,activo:i};encabezado=b;cargarFormulario();validar();aviso('Revisa el reporte '+b.numeroReporteTexto+' antes de descargar el conjunto.');return;
  }
  clearTimeout(temporizador);guardar(true);
  // Una instantánea impide mezclar datos si se escribe durante una exportación.
  const reportes=structuredClone(conjunto.reportes),nombre='Reporte_MOPT_'+encabezado.fecha+'_'+Date.now();
  exportando=true;idsAcciones.forEach(id=>$(id).disabled=true);navegacion();
  try{
    if(tipo==='excel')descargar(generarExcelConjunto(plantilla,reportes,catalogos),nombre+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    else{
      const paginas=[],imagenes=[];
      for(const [i,b] of reportes.entries()) {
        const frente=document.createElement('canvas'),atras=document.createElement('canvas');
        for(const c of [frente,atras]){c.width=$('lienzo').width;c.height=$('lienzo').height;}
        dibujarFrente(frente.getContext('2d'),fondo,b,catalogos);
        if(tipo==='pdf') {
          let datosReversoPng=null;
          if(esAcarreo(b)){dibujarReverso(atras.getContext('2d'),null,b,catalogos);datosReversoPng=atras.toDataURL('image/png');}
          paginas.push({frentePng:frente.toDataURL('image/png'),datosReversoPng});
        }else{
          dibujarReverso(atras.getContext('2d'),reverso,b,catalogos);
          // Una imagen por reporte evita sobrepasar el alto máximo del lienzo
          // en teléfonos y descarga un solo ZIP para todas las continuaciones.
          const c=document.createElement('canvas');c.width=frente.width;c.height=frente.height+atras.height;
          c.getContext('2d').drawImage(frente,0,0);c.getContext('2d').drawImage(atras,0,frente.height);
          const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw new Error('No se pudo crear la imagen.');
          imagenes.push({nombre:'Reporte_'+String(i+1).padStart(2,'0')+'_de_'+reportes.length+'.png',bytes:new Uint8Array(await blob.arrayBuffer())});c.width=c.height=1;
        }
        frente.width=frente.height=atras.width=atras.height=1;
      }
      if(tipo==='pdf'){
        const {generarPdfConjunto}=await import('./pdf.mjs');
        descargar(await generarPdfConjunto(paginas,reversoOriginal),nombre+'.pdf','application/pdf');
      }else if(imagenes.length===1)descargar(imagenes[0].bytes,nombre+'.png','image/png');
      else descargar(zipGuardado(imagenes),nombre+'_imagenes.zip','application/zip');
    }
    aviso('Conjunto generado: '+reportes.length+' reportes. Revisa las descargas del navegador.');
  }catch(e){aviso('No se pudo exportar: '+e.message);}finally{exportando=false;idsAcciones.forEach(id=>$(id).disabled=false);navegacion();}
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
    const recursos=await Promise.all([json('assets/catalogos.json'),json('assets/plantilla-excel.json'),imagen('assets/frente.png'),imagen('assets/reverso.png'),document.fonts.load('7px Reporte'),document.fonts.load('bold 7px Reporte'),archivo('assets/reverso-original.pdf')]);
    catalogos=crearCatalogos(recursos[0]);plantilla=recursos[1];fondo=recursos[2];reverso=recursos[3];reversoOriginal=recursos[6];
    let recuperado=false;try{const texto=localStorage.getItem(CLAVE);if(texto){conjunto=leerConjunto(texto);encabezado=conjunto.reportes[conjunto.activo];recuperado=true;}}catch{guardadoSeguro=false;aviso('El borrador guardado no pudo recuperarse. Se conserva hasta que pulses Guardar borrador.');}
    $('camino').value=encabezado.codigoCamino??'';$('actividad').value=encabezado.codigoActividad??'';$('numero').value=encabezado.numeroReporteTexto;$('produccion').value=encabezado.produccionTexto;$('senas').value=encabezado.senasInicio;$('avance').value=encabezado.longitudTexto;$('problema').value=encabezado.problema;$('observaciones').value=encabezado.observaciones;actualizaAutomaticos();
    buscador('camino','caminos');buscador('actividad','actividades');
    for(const [id,campo]of [['produccion','produccionTexto'],['estacionamiento-inicio','estacionamientoInicioTexto'],['estacionamiento-final','estacionamientoFinalTexto'],['problema','problema'],['observaciones','observaciones']])$(id).addEventListener('input',()=>{if(id==='produccion'&&esAcarreo(encabezado))return;encabezado[campo]=$(id).value;cambiado();});
    // Los dos módulos comparten el borrador; ningún selector modifica la otra lista.
    const modelo={leer:()=>encabezado,agregarTrabajador:id=>prepararTrabajador({id}),guardarTrabajadorManual:(datos,editando)=>prepararTrabajador({datos,editando}),agregarMaquina:id=>prepararEquipo({id}),guardarMaquinaManual:(datos,editando)=>prepararEquipo({datos,editando}),actualizar:b=>{
      encabezado=b;cambiado();
      if(notificacionPersonal){
        const {destino,creada}=notificacionPersonal;notificacionPersonal=null;
        const numero=(destino+1)+' / '+conjunto.reportes.length,actual=encabezado.numeroReporteTexto;
        // Se espera al cierre del selector para que no sobrescriba el destino.
        queueMicrotask(()=>{
          const texto='El trabajador se agregó al reporte '+numero+'. Sigues en el reporte '+actual+'. Usa el selector superior cuando quieras cambiar de hoja.';
          $('coincidencias-personal').textContent=texto;
          if(creada){$('mensaje-continuacion').textContent='Se completaron los 11 espacios de personal y se creó el reporte '+numero+'. '+texto;$('aviso-continuacion').showModal();}
        });
      }
    }};
    iniciarCalendario(modelo);selecciones=iniciarSelecciones(catalogos,modelo);capturaMateriales=iniciarMateriales(catalogos,modelo);capturaAcarreos=iniciarAcarreos(catalogos,modelo);actualizaAutomaticos();
    $('cerrar-aviso-continuacion').addEventListener('click',()=>$('aviso-continuacion').close());
    $('aviso-continuacion').addEventListener('close',()=>$('personal').focus());
    $('guardar').addEventListener('click',()=>{clearTimeout(temporizador);guardar(true);});$('ver').addEventListener('click',()=>{$('vista').hidden=false;pintar();$('vista').scrollIntoView({behavior:'smooth',block:'start'});});
    for(const tipo of ['excel','pdf','imagen'])$(tipo).addEventListener('click',()=>exportar(tipo));
    $('nuevo').addEventListener('click',()=>{if(!confirm('¿Crear un conjunto nuevo? Se reemplazará el borrador de todos los reportes. Descárgalo primero si deseas conservarlo.'))return;conjunto=nuevoConjunto();encabezado=conjunto.reportes[0];cargarFormulario();guardar(true);});
    $('reporte-activo').addEventListener('change',()=>cambiarHoja(Number($('reporte-activo').value)));
    $('reporte-anterior').addEventListener('click',()=>cambiarHoja(conjunto.activo-1));
    $('reporte-siguiente').addEventListener('click',()=>cambiarHoja(conjunto.activo+1));
    $('quitar-continuacion').addEventListener('click',()=>{if(Object.keys(pendientes()).length){aviso('Confirma o cancela los datos pendientes antes de quitar la continuación.');return;}conjunto=quitarContinuacion(conjunto);encabezado=conjunto.reportes[conjunto.activo];cargarFormulario();guardar(true);});
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
