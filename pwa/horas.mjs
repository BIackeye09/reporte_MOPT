import {CAMPOS_HORAS,JUSTIFICACIONES,horasDePersonal,actualizarHorasPersonal,erroresHoras,totalHoras} from './core.mjs';

// Cada menú lee y actualiza exclusivamente las horas del ID de su trabajador.
export function agregarMenuHoras(tarjeta,id,{leer,actualizar}) {
  const panel=document.createElement('details');panel.className='horas-personal';panel.open=true;
  const titulo=document.createElement('summary');titulo.textContent='Horas del trabajador';panel.append(titulo);
  const ayuda=document.createElement('p');ayuda.className='ayuda-horas';
  ayuda.textContent='Opcional. TOTAL suma horas ordinarias, extras, traslado y no trabajadas.';panel.append(ayuda);
  const rejilla=document.createElement('div');rejilla.className='rejilla-horas';
  const controles={},mensajes={},prefijo='horas-'+id+'-';
  const etiquetas={
    ordinarias:'H.O. · Horas ordinarias',extras:'EXTRAS · CAN.',pagoExtras:'EXTRAS · PAG.',
    traslado:'TRAS. · Horas de traslado',noTrabajadas:'NO TRAB. · CAN.',justificacion:'NO TRAB. · JUST. (*)'
  };
  const ayudas={
    extras:'Cantidad de horas extra laboradas.',
    pagoExtras:'Indica si se pagan las horas extra: Si o No. No se suma al total.',
    traslado:'0,25 h = 15 min · 0,5 h = 30 min · 0,75 h = 45 min. Puedes usar coma o punto; vacío o 0 si no corresponde.',
    noTrabajadas:'Cantidad de horas no trabajadas.',
    justificacion:'Opcional. Sin justificar deja JUST. vacía en Excel, PDF e imagen.'
  };
  for(const campo of CAMPOS_HORAS) {
    const grupo=document.createElement('div'),etiqueta=document.createElement('label');
    etiqueta.htmlFor=prefijo+campo;etiqueta.textContent=etiquetas[campo];
    const control=document.createElement(['justificacion','pagoExtras'].includes(campo)?'select':'input');
    control.id=prefijo+campo;control.dataset.campoHoras=campo;
    if(campo==='justificacion') {
      control.add(new Option('Sin justificar',''));
      for(const [codigo,nombre] of JUSTIFICACIONES)control.add(new Option(codigo+' · '+nombre,codigo));
    } else if(campo==='pagoExtras') {
      control.add(new Option('Sin completar',''));control.add(new Option('Si','SI'));control.add(new Option('No','NO'));
    } else {
      control.type='text';control.inputMode=campo==='pagoExtras'?'numeric':'decimal';control.autocomplete='off';
      if(campo==='pagoExtras')control.maxLength=3;
    }
    control.value=horasDePersonal(leer(),id)[campo];
    const error=document.createElement('p');error.className='error';error.id=prefijo+campo+'-error';error.setAttribute('role','alert');
    control.setAttribute('aria-describedby',error.id+(ayudas[campo]?' '+prefijo+campo+'-ayuda':''));
    grupo.append(etiqueta,control);
    if(ayudas[campo]){const nota=document.createElement('small');nota.id=prefijo+campo+'-ayuda';nota.textContent=ayudas[campo];grupo.append(nota);}
    grupo.append(error);rejilla.append(grupo);controles[campo]=control;mensajes[campo]=error;
    control.addEventListener('input',()=>{
      actualizar(actualizarHorasPersonal(leer(),id,{[campo]:control.value}));
      // No se reconstruye el menú: se conservan el foco y el cursor al escribir.
      refrescar();
    });
  }
  const total=document.createElement('output');total.id=prefijo+'total';total.className='total-horas';total.setAttribute('aria-live','polite');
  total.setAttribute('for',CAMPOS_HORAS.filter(c=>!['pagoExtras','justificacion'].includes(c)).map(c=>prefijo+c).join(' '));
  const etiquetaTotal=document.createElement('label');etiquetaTotal.htmlFor=total.id;etiquetaTotal.textContent='TOTAL · Horas del reporte';
  const bloqueTotal=document.createElement('div');bloqueTotal.className='bloque-total-horas';bloqueTotal.append(etiquetaTotal,total);
  const errorTotal=document.createElement('p');errorTotal.className='error';errorTotal.setAttribute('role','alert');bloqueTotal.append(errorTotal);
  panel.append(rejilla,bloqueTotal);tarjeta.append(panel);
  const anterior=document.createElement('p');anterior.className='advertencia';panel.append(anterior);
  function refrescar() {
    const h=horasDePersonal(leer(),id),errores=erroresHoras(h),valor=totalHoras(h);
    total.value=valor===null?'Sin completar':String(valor).replace('.',',')+' h';
    errorTotal.textContent=errores.total??'';
    for(const campo of CAMPOS_HORAS) {
      mensajes[campo].textContent=errores[campo]??'';
      controles[campo].setAttribute('aria-invalid',String(Boolean(errores[campo])));
    }
    controles.pagoExtras.setAttribute('aria-required',String(Number(h.extras.replace(',','.'))>0));
    const codigo=leer().pagosAnteriores?.[id];anterior.hidden=!codigo;
    anterior.textContent=codigo?'El borrador anterior tenía PAG. '+codigo+' como institución. Selecciona Si o No; ese código no indica si las extras se pagan.':'';
    controles.justificacion.setAttribute('aria-required','false');
  }
  refrescar();
}
export function enfocarErrorHoras(contenedor) {
  const campo=contenedor.querySelector('.horas-personal [aria-invalid="true"]');
  if(!campo)return false;
  campo.closest('details').open=true;campo.focus();campo.scrollIntoView({behavior:'smooth',block:'center'});return true;
}
