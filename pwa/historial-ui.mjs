import {fechaVisible} from './core.mjs';
import {fechaDelHistorial,errorFechasHistorial,filtrarHistorial} from './historial-filtros.mjs';

// El historial consulta y descarga sin sustituir el reporte que se está
// completando. Abrir para editar es una acción separada y explícita.
export function iniciarHistorial({almacen,leerActual,guardarActual,abrir,ver,exportar,descargar}) {
  const $=id=>document.getElementById(id),panel=$('historial-reportes');let filas=[],limite=20,ocupado=false;
  const mensaje=t=>{$('estado-historial').textContent=t;};
  function bloquear(valor){ocupado=valor;for(const b of panel.querySelectorAll('button,input,select'))b.disabled=valor;}
  async function ejecutar(accion) {
    if(ocupado)return;bloquear(true);
    try{await accion();}catch(e){mensaje('No se pudo completar la acción: '+e.message);}finally{bloquear(false);pintar();}
  }
  function pintar() {
    const filtros={busqueda:$('buscar-historial').value,desde:$('fecha-desde-historial').value,hasta:$('fecha-hasta-historial').value,orden:$('orden-historial').value};
    const error=errorFechasHistorial(filtros),agrupado=filtros.orden!=='guardado-desc';
    $('error-fechas-historial').textContent=error;
    for(const id of ['fecha-desde-historial','fecha-hasta-historial'])$(id).setAttribute('aria-invalid',String(Boolean(error)));
    $('limpiar-filtros-historial').disabled=ocupado||!(filtros.busqueda.trim()||filtros.desde||filtros.hasta||filtros.orden!=='fecha-desc');
    const lista=$('lista-historial');lista.replaceChildren();
    if(error){$('cantidad-historial').textContent='Corrige el intervalo de fechas para ver los reportes.';$('mas-historial').hidden=true;return;}
    const visibles=filtrarHistorial(filas,filtros);
    $('cantidad-historial').textContent=visibles.length+' de '+filas.length+' conjuntos · '+visibles.reduce((n,e)=>n+e.conjunto.reportes.length,0)+' reportes.'+(visibles.length>limite?' Mostrando '+limite+' conjuntos.':'');
    if(!visibles.length){const p=document.createElement('p');p.className='vacio-registros';p.textContent=filas.length?'No hay reportes que coincidan. Amplía las fechas o pulsa Limpiar filtros para volver a verlos.':'Los reportes se guardarán aquí automáticamente al completarlos, incluso antes de descargarlos.';lista.append(p);}
    let fechaAnterior,contenedor=lista;
    for(const e of visibles.slice(0,limite)) {
      const fechaReporte=fechaDelHistorial(e);
      if(agrupado&&fechaReporte!==fechaAnterior){
        const grupo=document.createElement('section'),titulo=document.createElement('h3');grupo.className='grupo-fecha-historial';
        titulo.id='fecha-historial-'+(fechaReporte??'pendiente');titulo.textContent=fechaReporte?'Reportes del '+fechaVisible(fechaReporte):'Sin fecha completa';grupo.setAttribute('aria-labelledby',titulo.id);
        contenedor=document.createElement('div');contenedor.className='registros';grupo.append(titulo,contenedor);lista.append(grupo);fechaAnterior=fechaReporte;
      }
      const primero=e.conjunto.reportes[0],actual=e.id===leerActual().historialId,card=document.createElement('article');card.className='registro';card.dataset.historialId=e.id;
      const h=document.createElement(agrupado?'h4':'h3');h.textContent=(!agrupado||!fechaReporte?(fechaVisible(primero.fecha)||primero.fechaTexto||'Fecha sin completar')+' · ':'')+(primero.codigoCamino||'Camino sin completar')+(actual?' · Actual':'');
      const detalle=document.createElement('p');detalle.textContent='Actividad '+(primero.codigoActividad||'sin completar')+' · '+e.conjunto.reportes.length+' reporte(s) · '+e.conjunto.reportes.reduce((n,b)=>n+b.personal.length,0)+' trabajadores.';
      const fecha=document.createElement('small');fecha.textContent='Último guardado: '+new Date(e.modificado).toLocaleString('es-CR');
      const acciones=document.createElement('div');acciones.className='acciones-historial';
      function boton(texto,accion,clase='secundario') {const b=document.createElement('button');b.type='button';b.className=clase;b.textContent=texto;b.disabled=ocupado;b.addEventListener('click',()=>ejecutar(accion));acciones.append(b);return b;}
      boton('Consultar',()=>ver(e.id));
      for(const [tipo,nombre] of [['excel','Excel'],['pdf','PDF'],['imagen','Imagen']])boton(nombre,()=>exportar(tipo,e.id));
      boton(actual?'Volver al reporte actual':'Abrir para editar',()=>actual?document.getElementById('formulario').scrollIntoView({behavior:'smooth'}):abrir(e.id));
      if(!actual)boton('Eliminar del historial',async()=>{if(!confirm('¿Eliminar este conjunto del historial local? Los archivos descargados se conservan.'))return;await almacen.eliminar(e.id);await refrescar();mensaje('Conjunto eliminado del historial local.');},'enlace');
      card.append(h,detalle,fecha,acciones);contenedor.append(card);
    }
    $('mas-historial').hidden=limite>=visibles.length;
  }
  async function refrescar(){try{filas=await almacen.listar();pintar();}catch(e){mensaje('El historial local no está disponible: '+e.message);}}
  async function mostrar(){panel.open=true;await guardarActual();await refrescar();panel.scrollIntoView({behavior:'smooth',block:'start'});$('buscar-historial').focus({preventScroll:true});}
  $('historial').addEventListener('click',mostrar);
  panel.addEventListener('toggle',()=>{if(panel.open)refrescar();});
  $('buscar-historial').addEventListener('input',()=>{limite=20;pintar();});
  for(const id of ['fecha-desde-historial','fecha-hasta-historial'])$(id).addEventListener('input',()=>{limite=20;pintar();});
  $('orden-historial').addEventListener('change',()=>{limite=20;pintar();});
  $('limpiar-filtros-historial').addEventListener('click',()=>{
    for(const id of ['buscar-historial','fecha-desde-historial','fecha-hasta-historial'])$(id).value='';
    $('orden-historial').value='fecha-desc';limite=20;pintar();$('buscar-historial').focus();
  });
  $('mas-historial').addEventListener('click',()=>{limite+=20;pintar();});
  $('actualizar-historial').addEventListener('click',()=>ejecutar(async()=>{await guardarActual();await refrescar();}));
  $('respaldar-historial').addEventListener('click',()=>ejecutar(async()=>{
    const actualGuardado=await guardarActual();
    const datos=await almacen.respaldo();if(!datos.reportes.length){mensaje('Todavía no hay reportes para respaldar.');return;}
    descargar(new TextEncoder().encode(JSON.stringify(datos)),'Respaldo_Reportes_MOPT_'+new Date().toISOString().slice(0,10)+'.json','application/json');mensaje(actualGuardado?'Respaldo descargado. Puedes importarlo en otro navegador o dispositivo.':'Se respaldó el historial existente. Los últimos cambios del reporte actual no pudieron guardarse: descárgalo también por separado.');
  }));
  $('importar-historial').addEventListener('click',()=>$('archivo-historial').click());
  $('archivo-historial').addEventListener('change',()=>ejecutar(async()=>{
    const archivo=$('archivo-historial').files[0];if(!archivo)return;
    try{if(archivo.size>50*1024*1024)throw new Error('El respaldo supera 50 MB.');const r=await almacen.importar(await archivo.text());await refrescar();mensaje('Respaldo importado: '+r.agregados+' conjuntos agregados, '+r.omitidos+' ya existentes y '+r.copias+' copias conservadas por diferencias. El reporte actual se mantiene.');}
    finally{$('archivo-historial').value='';}
  }));
  return {refrescar,mensaje,abierto:()=>panel.open};
}
