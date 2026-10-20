import {fechaHoy,fechaVisible,fechaDeTexto,fechaValida,diasCalendario} from './core.mjs';

// El campo DD/MM/AAAA se puede escribir sin depender del selector del navegador.
// El calendario utiliza la misma fecha civil que el borrador y las exportaciones.
export function iniciarCalendario({leer,actualizar}) {
  const $=id=>document.getElementById(id),dialogo=$('dialogo-calendario');
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  meses.forEach((nombre,i)=>$('mes-calendario').add(new Option(nombre,String(i+1))));
  for(let ano=1900;ano<=2100;ano++)$('ano-calendario').add(new Option(String(ano),String(ano)));

  function cambiar(iso,texto=fechaVisible(iso)) {
    actualizar({...leer(),fecha:iso,fechaTexto:texto});
    $('error-fecha').textContent='';$('fecha').removeAttribute('aria-invalid');
  }
  function elegir(iso) {
    cambiar(iso);$('fecha').value=fechaVisible(iso);dialogo.close();
  }
  function pintar() {
    const ano=Number($('ano-calendario').value),mes=Number($('mes-calendario').value);
    $('dias-calendario').replaceChildren();
    const seleccion=leer().fecha,hoy=fechaHoy();
    for(const iso of diasCalendario(ano,mes)) {
      if(!iso){$('dias-calendario').append(document.createElement('span'));continue;}
      const boton=document.createElement('button');boton.type='button';
      boton.textContent=String(Number(iso.slice(-2)));boton.dataset.fecha=iso;
      boton.setAttribute('aria-label',fechaVisible(iso));
      boton.setAttribute('aria-pressed',String(iso===seleccion));
      if(iso===hoy)boton.setAttribute('aria-current','date');
      boton.addEventListener('click',()=>elegir(iso));$('dias-calendario').append(boton);
    }
    $('mes-anterior').disabled=ano===1900&&mes===1;
    $('mes-siguiente').disabled=ano===2100&&mes===12;
    $('dias-calendario').setAttribute('aria-label',meses[mes-1]+' '+ano);
  }
  function desplazar(cantidad) {
    const ano=Number($('ano-calendario').value),mes=Number($('mes-calendario').value);
    const fecha=new Date(Date.UTC(ano,mes-1+cantidad,1));
    if(fecha.getUTCFullYear()<1900||fecha.getUTCFullYear()>2100)return;
    $('ano-calendario').value=String(fecha.getUTCFullYear());
    $('mes-calendario').value=String(fecha.getUTCMonth()+1);pintar();
  }

  // La fecha incompleta también se conserva al guardar; se valida antes de exportar.
  $('fecha').addEventListener('input',()=>cambiar(fechaDeTexto($('fecha').value)??'',$('fecha').value));
  $('fecha').addEventListener('blur',()=>{
    if(fechaValida(leer().fecha)){$('fecha').value=fechaVisible(leer().fecha);cambiar(leer().fecha);}
    else{$('error-fecha').textContent='Escribe una fecha válida en DD/MM/AAAA.';$('fecha').setAttribute('aria-invalid','true');}
  });
  $('calendario').addEventListener('click',()=>{
    const iso=fechaValida(leer().fecha)?leer().fecha:fechaHoy();
    $('ano-calendario').value=iso.slice(0,4);$('mes-calendario').value=String(Number(iso.slice(5,7)));
    pintar();dialogo.showModal();
    $('dias-calendario').querySelector('[data-fecha="'+iso+'"]')?.focus();
  });
  $('cerrar-calendario').addEventListener('click',()=>dialogo.close());
  $('mes-anterior').addEventListener('click',()=>desplazar(-1));
  $('mes-siguiente').addEventListener('click',()=>desplazar(1));
  $('mes-calendario').addEventListener('change',pintar);$('ano-calendario').addEventListener('change',pintar);
  $('hoy').addEventListener('click',()=>elegir(fechaHoy()));
  $('hoy-calendario').addEventListener('click',()=>elegir(fechaHoy()));
  // Las flechas recorren los días; Tab mantiene disponibles los controles del mes.
  $('dias-calendario').addEventListener('keydown',evento=>{
    const pasos={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    if(!(evento.key in pasos))return;
    const botones=[...$('dias-calendario').querySelectorAll('button')],i=botones.indexOf(document.activeElement);
    if(i<0)return;const siguiente=botones[i+pasos[evento.key]];
    if(siguiente){evento.preventDefault();siguiente.focus();}
  });
}
