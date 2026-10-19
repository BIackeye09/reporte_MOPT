import {guardarPersonalManual,guardarEquipoManual,personalDelReporte,equipoDelReporte,
  erroresPersonalManual,erroresEquipoManual} from './core.mjs';

// Los formularios agregan al mismo borrador que usan las búsquedas y las horas.
// Corregir un registro mantiene su ID; cancelar sólo descarta la edición abierta.
export function iniciarEntradasManuales(catalogos,{leer,actualizar,redibujar,limpiarBusqueda,guardarTrabajadorManual,guardarMaquinaManual}) {
  const formularios={};
  for(const tipo of ['personal','equipos']) {
    const esPersonal=tipo==='personal',panel=document.createElement('details');panel.id='manual-'+tipo;panel.className='entrada-manual';
    const titulo=document.createElement('summary'),tituloInicial=esPersonal?'Agregar trabajador manualmente':'Agregar equipo manualmente';titulo.textContent=tituloInicial;
    const ayuda=document.createElement('p');ayuda.className='ayuda';ayuda.textContent='Completa los datos que no aparecen en el catálogo. Se guardan en este reporte. PART (C) del MOPT: 000.';
    const rejilla=document.createElement('div');rejilla.className='rejilla';
    const campos=esPersonal?[['nombre','Nombre y apellidos',160],['cedula','Cédula · X-XXXX-XXXX',11],['codigo','Código (D)',2]]:
      [['codigoEquipo','COD. (F)',3],['numeroEquipo','N.º de equipo',12],['descripcion','Descripción del equipo (opcional)',120]];
    const controles={},errores={};let editando=null;
    for(const [campo,etiqueta,max] of campos) {
      const grupo=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input'),error=document.createElement('p');
      input.id='manual-'+tipo+'-'+campo;input.type='text';input.maxLength=max;input.autocomplete='off';
      if(['cedula','codigoEquipo','numeroEquipo'].includes(campo))input.inputMode='numeric';
      input.setAttribute('aria-required',String(campo!=='descripcion'));input.setAttribute('aria-describedby',input.id+'-error');
      label.htmlFor=input.id;label.textContent=etiqueta;error.id=input.id+'-error';error.className='error';error.setAttribute('role','alert');
      grupo.append(label,input,error);rejilla.append(grupo);controles[campo]=input;errores[campo]=error;
      input.addEventListener('input',()=>{error.textContent='';input.setAttribute('aria-invalid','false');});
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guardar();}});
    }
    const aviso=document.createElement('p');aviso.id='error-manual-'+tipo;aviso.className='error';aviso.setAttribute('role','alert');
    const acciones=document.createElement('div');acciones.className='acciones-manuales';
    const confirmar=document.createElement('button'),cancelar=document.createElement('button');confirmar.type=cancelar.type='button';
    const textoAgregar=esPersonal?'Agregar trabajador':'Agregar equipo';confirmar.textContent=textoAgregar;confirmar.id='guardar-manual-'+tipo;
    cancelar.textContent='Cancelar';cancelar.className='secundario';acciones.append(confirmar,cancelar);
    panel.append(titulo,ayuda,rejilla,aviso,acciones);document.getElementById('entrada-manual-'+tipo).append(panel);
    const datos=()=>Object.fromEntries(Object.entries(controles).map(([k,c])=>[k,c.value]));
    const pendiente=()=>Boolean(editando)||Object.values(controles).some(c=>c.value.trim());
    function limpiar(){
      editando=null;titulo.textContent=tituloInicial;confirmar.textContent=textoAgregar;aviso.textContent='';panel.open=false;
      for(const [k,c]of Object.entries(controles)){c.value='';c.removeAttribute('aria-invalid');errores[k].textContent='';}
    }
    function enfocar(){panel.open=true;(Object.values(controles).find(c=>c.getAttribute('aria-invalid')==='true')??Object.values(controles)[0]).focus();}
    function guardar(){
      const d=datos(),validar=esPersonal?erroresPersonalManual:erroresEquipoManual,e=validar(d);
      for(const [k,c]of Object.entries(controles)){errores[k].textContent=e[k]??'';c.setAttribute('aria-invalid',String(Boolean(e[k])));}
      if(Object.keys(e).length){enfocar();return;}
      try {
        const siguiente=(esPersonal&&guardarTrabajadorManual?guardarTrabajadorManual(d,editando):!esPersonal&&guardarMaquinaManual?guardarMaquinaManual(d,editando):(esPersonal?guardarPersonalManual:guardarEquipoManual)(leer(),d,catalogos,editando)),edicion=Boolean(editando);
        limpiar();limpiarBusqueda(tipo);actualizar(siguiente);redibujar(tipo);
        document.getElementById('coincidencias-'+tipo).textContent=edicion?'Datos manuales actualizados. Se conservan sus horas.':'Registro manual agregado. Sus datos se incluirán en el reporte.';
        titulo.focus();
      }catch(e){aviso.textContent=e.message;enfocar();}
    }
    confirmar.addEventListener('click',guardar);cancelar.addEventListener('click',()=>{limpiar();titulo.focus();});
    formularios[tipo]={limpiar,pendiente,enfocar,retirado:id=>{if(editando===id)limpiar();},editar:id=>{
      const f=(esPersonal?personalDelReporte:equipoDelReporte)(leer(),id,catalogos);if(!f?.manual)return;
      limpiar();limpiarBusqueda(tipo);editando=id;titulo.textContent=esPersonal?'Editar trabajador manual':'Editar equipo manual';confirmar.textContent='Guardar cambios';
      for(const [k,c]of Object.entries(controles))c.value=f[k]??'';enfocar();
    }};
  }
  return {editar:(tipo,id)=>formularios[tipo].editar(id),retirado:(tipo,id)=>formularios[tipo].retirado(id),
    reiniciar:()=>Object.values(formularios).forEach(f=>f.limpiar()),
    enfocar:tipo=>{if(!formularios[tipo].pendiente())return false;formularios[tipo].enfocar();return true;},
    pendientes:()=>Object.fromEntries(Object.entries(formularios).filter(([,f])=>f.pendiente()).map(([tipo])=>[tipo,'Confirma o cancela los datos manuales antes de descargar el reporte.']))};
}
