import {CAMPOS_HORAS_EQUIPO,horasDeEquipo,actualizarHorasEquipo,erroresHorasEquipo,totalHorasEquipo} from './core.mjs';

export function agregarMenuHorasEquipo(tarjeta,id,{leer,actualizar}) {
  const panel=document.createElement('details');panel.className='horas-equipo';panel.open=true;
  const titulo=document.createElement('summary');titulo.textContent='Horas del equipo';panel.append(titulo);
  const ayuda=document.createElement('p');ayuda.className='ayuda-horas';
  ayuda.textContent='Opcional. TOTAL suma H.T. y TRAS. Puedes usar coma o punto: 0,25 h = 15 min, 0,5 h = 30 min y 0,75 h = 45 min.';panel.append(ayuda);
  const rejilla=document.createElement('div');rejilla.className='rejilla-horas rejilla-horas-equipo';
  const controles={},mensajes={},prefijo='horas-equipo-'+id+'-';
  const etiquetas={trabajadas:'H.T. · Horas trabajadas',traslado:'TRAS. · Horas de traslado'};
  for(const campo of CAMPOS_HORAS_EQUIPO) {
    const grupo=document.createElement('div'),label=document.createElement('label');
    label.htmlFor=prefijo+campo;label.textContent=etiquetas[campo];
    const control=document.createElement('input');control.id=prefijo+campo;control.type='text';
    control.inputMode='decimal';control.autocomplete='off';control.dataset.campoHorasEquipo=campo;
    control.value=horasDeEquipo(leer(),id)[campo];
    const error=document.createElement('p');error.className='error';error.id=control.id+'-error';error.setAttribute('role','alert');
    control.setAttribute('aria-describedby',error.id);grupo.append(label,control,error);rejilla.append(grupo);
    controles[campo]=control;mensajes[campo]=error;
    control.addEventListener('input',()=>{actualizar(actualizarHorasEquipo(leer(),id,{[campo]:control.value}));refrescar();});
  }
  const total=document.createElement('output');total.id=prefijo+'total';total.className='total-horas';total.setAttribute('aria-live','polite');
  total.setAttribute('for',CAMPOS_HORAS_EQUIPO.map(c=>prefijo+c).join(' '));
  const label=document.createElement('label');label.htmlFor=total.id;label.textContent='TOTAL · Horas del equipo';
  const bloque=document.createElement('div');bloque.className='bloque-total-horas';
  const errorTotal=document.createElement('p');errorTotal.className='error';errorTotal.setAttribute('role','alert');
  bloque.append(label,total,errorTotal);panel.append(rejilla,bloque);tarjeta.append(panel);
  function refrescar() {
    const h=horasDeEquipo(leer(),id),e=erroresHorasEquipo(h),n=totalHorasEquipo(h);
    total.value=n===null?'Sin completar':String(n).replace('.',',')+' h';errorTotal.textContent=e.total??'';
    for(const campo of CAMPOS_HORAS_EQUIPO){mensajes[campo].textContent=e[campo]??'';controles[campo].setAttribute('aria-invalid',String(Boolean(e[campo])));}
  }
  refrescar();
}
export function enfocarErrorHorasEquipo(contenedor) {
  const campo=contenedor.querySelector('.horas-equipo [aria-invalid="true"]');
  if(!campo)return false;
  campo.closest('details').open=true;campo.focus();campo.scrollIntoView({behavior:'smooth',block:'center'});return true;
}
