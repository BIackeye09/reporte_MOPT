import {coincide,fechaVisible} from './core.mjs';

// El historial consulta y descarga sin sustituir el reporte que se está
// completando. Abrir para editar es una acción separada y explícita.
export function iniciarHistorial({almacen,leerActual,guardarActual,abrir,ver,exportar,descargar}) {
  const $=id=>document.getElementById(id),panel=$('historial-reportes');let filas=[],limite=20,ocupado=false;
  const mensaje=t=>{$('estado-historial').textContent=t;};
  function bloquear(valor){ocupado=valor;for(const b of panel.querySelectorAll('button,input'))b.disabled=valor;}
  async function ejecutar(accion) {
    if(ocupado)return;bloquear(true);
    try{await accion();}catch(e){mensaje('No se pudo completar la acción: '+e.message);}finally{bloquear(false);pintar();}
  }
  function pintar() {
    const q=$('buscar-historial').value.trim(),visibles=filas.filter(e=>coincide(e.conjunto.reportes.map(b=>[b.fecha,b.fechaTexto,b.codigoCamino,b.codigoActividad,b.inspectorTexto,b.observaciones,b.numeroReporteTexto].join(' ')).join(' '),q));
    const lista=$('lista-historial');lista.replaceChildren();
    $('cantidad-historial').textContent=visibles.length+' conjuntos encontrados · '+visibles.reduce((n,e)=>n+e.conjunto.reportes.length,0)+' reportes.';
    if(!visibles.length){const p=document.createElement('p');p.textContent=filas.length?'No hay coincidencias con esa búsqueda.':'Los reportes se guardarán aquí automáticamente al completarlos, incluso antes de descargarlos.';lista.append(p);}
    for(const e of visibles.slice(0,limite)) {
      const primero=e.conjunto.reportes[0],actual=e.id===leerActual().historialId,card=document.createElement('article');card.className='registro';card.dataset.historialId=e.id;
      const h=document.createElement('h3');h.textContent=(fechaVisible(primero.fecha)||primero.fechaTexto||'Fecha sin completar')+' · '+(primero.codigoCamino||'Camino sin completar')+(actual?' · Actual':'');
      const detalle=document.createElement('p');detalle.textContent='Actividad '+(primero.codigoActividad||'sin completar')+' · '+e.conjunto.reportes.length+' reporte(s) · '+e.conjunto.reportes.reduce((n,b)=>n+b.personal.length,0)+' trabajadores.';
      const fecha=document.createElement('small');fecha.textContent='Último guardado: '+new Date(e.modificado).toLocaleString('es-CR');
      const acciones=document.createElement('div');acciones.className='acciones-historial';
      function boton(texto,accion,clase='secundario') {const b=document.createElement('button');b.type='button';b.className=clase;b.textContent=texto;b.disabled=ocupado;b.addEventListener('click',()=>ejecutar(accion));acciones.append(b);return b;}
      boton('Consultar',()=>ver(e.id));
      for(const [tipo,nombre] of [['excel','Excel'],['pdf','PDF'],['imagen','Imagen']])boton(nombre,()=>exportar(tipo,e.id));
      boton(actual?'Volver al reporte actual':'Abrir para editar',()=>actual?document.getElementById('formulario').scrollIntoView({behavior:'smooth'}):abrir(e.id));
      if(!actual)boton('Eliminar del historial',async()=>{if(!confirm('¿Eliminar este conjunto del historial local? Los archivos descargados se conservan.'))return;await almacen.eliminar(e.id);await refrescar();mensaje('Conjunto eliminado del historial local.');},'enlace');
      card.append(h,detalle,fecha,acciones);lista.append(card);
    }
    $('mas-historial').hidden=limite>=visibles.length;
  }
  async function refrescar(){try{filas=await almacen.listar();pintar();}catch(e){mensaje('El historial local no está disponible: '+e.message);}}
  async function mostrar(){panel.open=true;await guardarActual();await refrescar();panel.scrollIntoView({behavior:'smooth',block:'start'});$('buscar-historial').focus({preventScroll:true});}
  $('historial').addEventListener('click',mostrar);
  panel.addEventListener('toggle',()=>{if(panel.open)refrescar();});
  $('buscar-historial').addEventListener('input',()=>{limite=20;pintar();});
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
