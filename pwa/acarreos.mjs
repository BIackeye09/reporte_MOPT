import {codigoEquipoVisible,equipoDelReporte} from './core.mjs';
import {esAcarreo,agregarAcarreo,actualizarAcarreo,retirarAcarreo,acarreoDe,codigoParticipante,
  numeroViajes,subtotalAcarreo,totalAcarreos,erroresAcarreos,VIAJES_MAXIMOS} from './acarreos-reglas.mjs';

export function iniciarAcarreos(catalogos,{leer,actualizar}) {
  const $=id=>document.getElementById(id),panel=$('acarreos'),lista=$('acarreos-reporte');
  const selector=$('equipo-acarreo'),agregar=$('agregar-acarreo');
  const tarjetas=new Map();let firma='';
  const cantidad=n=>n===null?'Sin completar':n.toFixed(2).replace('.',',');
  function tarjeta(id) {
    const equipo=equipoDelReporte(leer(),id,catalogos),r=acarreoDe(leer(),id);
    const article=document.createElement('article');article.className='registro registro-acarreo';article.dataset.id=id;
    const cabecera=document.createElement('div');cabecera.className='registro-cabecera';
    const nombre=document.createElement('strong');nombre.textContent=codigoEquipoVisible(equipo)+' · '+equipo.descripcion;
    const retirar=document.createElement('button');retirar.type='button';retirar.className='enlace';retirar.textContent='Retirar del acarreo';
    retirar.setAttribute('aria-label','Retirar '+codigoEquipoVisible(equipo)+' del acarreo');
    retirar.addEventListener('click',()=>{actualizar(retirarAcarreo(leer(),id));refrescar();selector.focus();});
    cabecera.append(nombre,retirar);article.append(cabecera);
    const rejilla=document.createElement('div');rejilla.className='rejilla rejilla-acarreo';article.append(rejilla);
    const controles={},mensajes={},grupos={},prefijo='acarreo-'+id+'-';
    function campo(k,etiqueta,tipo='text',opciones=[]) {
      const grupo=document.createElement('div'),label=document.createElement('label');label.htmlFor=prefijo+k;label.textContent=etiqueta;
      const input=document.createElement(tipo==='select'?'select':tipo==='textarea'?'textarea':'input');input.id=prefijo+k;
      if(tipo==='select')for(const [v,t] of opciones)input.add(new Option(t,v));
      else if(tipo==='textarea'){input.rows=2;}
      else {input.type='text';input.inputMode=['capacidadTexto'].includes(k)?'decimal':k==='longitudTexto'||k==='codigoParticipante'?'numeric':'text';input.autocomplete='off';}
      input.value=r[k];
      const error=document.createElement('p');error.className='error';error.id=input.id+'-error';error.setAttribute('role','alert');
      input.setAttribute('aria-describedby',error.id);grupo.append(label,input,error);rejilla.append(grupo);
      controles[k]=input;mensajes[k]=error;grupos[k]=grupo;
      input.addEventListener(tipo==='select'?'change':'input',()=>{actualizar(actualizarAcarreo(leer(),id,{[k]:input.value}));refrescar();});
      return input;
    }
    campo('participante','Participante','select',[
      ['mopt','MOPT · 000'],['municipalidad','Municipalidad'],['800','Participante · 800–899'],['900','Participante · 900–999']]);
    const cod=document.createElement('output');cod.id=prefijo+'cod';cod.className='total-horas';
    const codLabel=document.createElement('label');codLabel.htmlFor=cod.id;codLabel.textContent='COD. · PART (C)';
    const codGrupo=document.createElement('div');codGrupo.append(codLabel,cod);rejilla.append(codGrupo);
    campo('provincia','Provincia','select',[['','Selecciona una provincia'],...['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'].map((t,i)=>[String(i+1),(i+1)+' · '+t])]);
    campo('canton','Cantón','select',[['','Selecciona el número de cantón'],...Array.from({length:20},(_,i)=>{const n=String(i+1).padStart(2,'0');return [n,n];})]);
    campo('codigoParticipante','Código del participante');controles.codigoParticipante.maxLength=3;
    campo('capacidadTexto','CAPACIDAD · m³');
    campo('longitudTexto','LONG. ACARREO · km enteros');
    campo('fuente','FUENTE DE MATERIALES','textarea');campo('material','TIPO DE MATERIAL','textarea');
    const notaTexto=document.createElement('p');notaTexto.className='ayuda';notaTexto.textContent='Fuente y tipo de material se exportan en tamaño 14 sin negrita, en hasta dos líneas por casilla.';article.append(notaTexto);
    const alquilerLabel=document.createElement('label');alquilerLabel.className='check';
    const alquiler=document.createElement('input');alquiler.type='checkbox';alquiler.id=prefijo+'alquilado';alquiler.checked=r.alquilado;
    alquilerLabel.append(alquiler,document.createTextNode('Equipo alquilado · colocar en ese bloque del reverso'));article.append(alquilerLabel);
    alquiler.addEventListener('change',()=>{actualizar(actualizarAcarreo(leer(),id,{alquilado:alquiler.checked}));refrescar();});
    const viajes=document.createElement('fieldset');viajes.className='viajes-acarreo';
    const legend=document.createElement('legend');legend.textContent='VIAJES · marca una casilla por cada viaje';viajes.append(legend);
    const casillas=document.createElement('div');casillas.className='casillas-viajes';
    const checks=Array.from({length:VIAJES_MAXIMOS},(_,i)=>{
      const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id=prefijo+'viaje-'+(i+1);input.checked=r.viajes[i];
      input.setAttribute('aria-label','Viaje '+(i+1)+' de '+codigoEquipoVisible(equipo));label.append(input,document.createTextNode(String(i+1)));casillas.append(label);
      input.addEventListener('change',()=>{const marcados=acarreoDe(leer(),id).viajes;marcados[i]=input.checked;actualizar(actualizarAcarreo(leer(),id,{viajes:marcados}));refrescar();});return input;
    });
    viajes.append(casillas);article.append(viajes);
    const pie=document.createElement('div');pie.className='bloque-total-horas';
    const contador=document.createElement('span');contador.id=prefijo+'cantidad-viajes';
    const total=document.createElement('output');total.className='total-horas';total.id=prefijo+'subtotal';total.setAttribute('aria-live','polite');
    const totalLabel=document.createElement('label');totalLabel.htmlFor=total.id;totalLabel.textContent='Subtotal M³/KM';
    const errorTotal=document.createElement('p');errorTotal.className='error';errorTotal.setAttribute('role','alert');
    pie.append(contador,totalLabel,total,errorTotal);article.append(pie);
    lista.append(article);tarjetas.set(id,{article,controles,mensajes,grupos,cod,total,contador,checks,alquiler,errorTotal});
  }
  function refrescar() {
    const b=leer();panel.hidden=!esAcarreo(b);
    if(panel.hidden)return;
    $('codigo-acarreos').textContent=b.codigoActividad;$('titulo-acarreos').textContent=b.codigoActividad==='534'?'Acarreo de material contratado':'Acarreo de material';
    $('nota-534').hidden=b.codigoActividad!=='534';
    const seleccionados=b.equipos.filter(f=>b.acarreos?.[f.id]&&equipoDelReporte(b,f.id,catalogos));
    const disponibles=b.equipos.filter(f=>!b.acarreos?.[f.id]&&equipoDelReporte(b,f.id,catalogos));
    const valor=selector.value,opciones=disponibles.map(f=>f.id+':'+codigoEquipoVisible(equipoDelReporte(b,f.id,catalogos))).join('|');
    if(selector.dataset.opciones!==opciones){selector.replaceChildren(new Option('Elige un equipo del frente',''));for(const f of disponibles)selector.add(new Option(codigoEquipoVisible(equipoDelReporte(b,f.id,catalogos)),f.id));selector.value=disponibles.some(f=>f.id===valor)?valor:'';selector.dataset.opciones=opciones;}
    agregar.disabled=!selector.value;
    $('ayuda-equipo-acarreo').textContent=!b.equipos.length?'Agrega primero las máquinas en Equipo, arriba.':'Elige sólo los equipos que realizaron el acarreo. Sus horas se completan en Equipo.';
    const nuevaFirma=seleccionados.map(f=>{const e=equipoDelReporte(b,f.id,catalogos);return f.id+':'+codigoEquipoVisible(e)+':'+e.descripcion;}).join('|');
    if(firma!==nuevaFirma||(!tarjetas.size&&!seleccionados.length)) {
      firma=nuevaFirma;lista.replaceChildren();tarjetas.clear();seleccionados.forEach(f=>tarjeta(f.id));
      if(!seleccionados.length){const p=document.createElement('p');p.className='vacio-registros';p.textContent='Todavía no hay equipos en el acarreo. El reverso se conservará vacío.';lista.append(p);}
    }
    const errores=erroresAcarreos(b);
    for(const {id} of seleccionados) {
      const t=tarjetas.get(id),r=acarreoDe(b,id),e=errores[id]??{};
      t.cod.value=codigoParticipante(r)||'Sin completar';t.total.value=cantidad(subtotalAcarreo(r));t.contador.textContent=numeroViajes(r)+' de 12 viajes marcados';
      t.errorTotal.textContent=e.grupo??e.total??'';
      for(const [k,control] of Object.entries(t.controles)){
        if(document.activeElement!==control)control.value=r[k];
        t.mensajes[k].textContent=e[k]??'';control.setAttribute('aria-invalid',String(Boolean(e[k])));
      }
      t.grupos.provincia.hidden=t.grupos.canton.hidden=r.participante!=='municipalidad';
      t.grupos.codigoParticipante.hidden=!['800','900'].includes(r.participante);
      t.alquiler.checked=r.alquilado;t.checks.forEach((c,i)=>c.checked=r.viajes[i]);
    }
    const total=totalAcarreos(b);$('total-acarreos').value=cantidad(total);
    $('nota-produccion-acarreos').textContent=total===null?'Completa las capacidades y las longitudes de todos los equipos agregados.':'Este total se coloca automáticamente en Producción, al frente.';
    $('error-acarreos').textContent=Object.keys(errores).length?Object.values(Object.values(errores)[0])[0]:'';
  }
  selector.addEventListener('change',()=>{agregar.disabled=!selector.value;});
  agregar.addEventListener('click',()=>{
    try{const id=selector.value;actualizar(agregarAcarreo(leer(),id));refrescar();tarjetas.get(id)?.controles.capacidadTexto.focus();}
    catch(e){$('error-acarreos').textContent=e.message;}
  });
  refrescar();
  return {refrescar,enfocarError:()=>{const campo=lista.querySelector('[aria-invalid="true"]');(campo??panel).focus();(campo??panel).scrollIntoView({behavior:'smooth',block:'center'});}};
}
