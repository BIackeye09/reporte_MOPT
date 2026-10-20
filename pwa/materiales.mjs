import {buscarMateriales,agregarMaterial,errorCantidadMaterial,normalizar,FILAS_MATERIALES,PART_MOPT} from './core.mjs';

// La selección y las cantidades usan el mismo borrador que las exportaciones.
export function iniciarMateriales(catalogos,{leer,actualizar}) {
  const $=id=>document.getElementById(id);
  const input=$('materiales'),lista=$('lista-materiales'),contenedor=$('materiales-reporte');
  let coincidencias=[],limite=20;
  function limpiarError() {$('error-materiales').textContent='';input.removeAttribute('aria-invalid');}
  function dato(dl,nombre,valor) {
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=nombre;dd.textContent=valor;dl.append(dt,dd);
  }
  function dibujar() {
    const entradas=leer().materiales??[];contenedor.replaceChildren();
    $('cantidad-materiales').textContent=entradas.length+' de '+FILAS_MATERIALES.length;
    if(!entradas.length) {
      const p=document.createElement('p');p.className='vacio-registros';
      p.textContent='Todavía no hay materiales agregados.';contenedor.append(p);return;
    }
    entradas.forEach((entrada,i)=>{
      const material=catalogos.materiales.get(entrada.codigo);
      const tarjeta=document.createElement('article');tarjeta.className='registro';tarjeta.dataset.codigo=entrada.codigo;
      const cabecera=document.createElement('div');cabecera.className='registro-cabecera';
      const titulo=document.createElement('strong');
      titulo.textContent=(i+1)+'. '+entrada.codigo+' · '+(material?.descripcion??'Material ausente del catálogo');
      const retirar=document.createElement('button');retirar.type='button';retirar.className='enlace';retirar.textContent='Retirar';
      retirar.setAttribute('aria-label','Retirar material '+entrada.codigo);
      retirar.addEventListener('click',()=>{
        actualizar({...leer(),materiales:leer().materiales.filter(f=>f.codigo!==entrada.codigo)});
        limpiarError();dibujar();
      });
      cabecera.append(titulo,retirar);tarjeta.append(cabecera);
      const dl=document.createElement('dl');dl.className='datos-registro';
      dato(dl,'PART (C)',PART_MOPT);dato(dl,'CÓDIGO (H)',entrada.codigo);dato(dl,'UNID.',material?.unidad??'Sin dato');tarjeta.append(dl);
      const id='cantidad-material-'+entrada.codigo;
      const etiqueta=document.createElement('label');etiqueta.htmlFor=id;etiqueta.textContent='Cantidad';
      const cantidad=document.createElement('input');cantidad.id=id;cantidad.type='text';cantidad.inputMode='decimal';
      cantidad.autocomplete='off';cantidad.value=entrada.cantidadTexto;cantidad.placeholder='';
      const nota=document.createElement('small');nota.id=id+'-nota';nota.textContent='Opcional. Acepta enteros y decimales con coma o punto.';
      const error=document.createElement('p');error.id=id+'-error';error.className='error';error.setAttribute('role','alert');
      cantidad.setAttribute('aria-describedby',nota.id+' '+error.id);
      function validarCantidad() {
        const mensaje=errorCantidadMaterial(cantidad.value);error.textContent=mensaje;
        cantidad.setAttribute('aria-invalid',String(Boolean(mensaje)));
      }
      validarCantidad();
      cantidad.addEventListener('input',()=>{
        // No se reconstruye la tarjeta mientras se escribe: se conserva el cursor
        // y también una cantidad incompleta para poder corregirla al reabrir.
        actualizar({...leer(),materiales:leer().materiales.map(f=>f.codigo===entrada.codigo?{...f,cantidadTexto:cantidad.value}:f)});
        limpiarError();validarCantidad();
      });
      tarjeta.append(etiqueta,cantidad,nota,error);
      for(const mensaje of material?.advertencias??[]) {
        const p=document.createElement('p');p.className='advertencia';p.textContent=mensaje;tarjeta.append(p);
      }
      contenedor.append(tarjeta);
    });
  }
  function seleccionar(material) {
    limpiarError();
    try {
      actualizar(agregarMaterial(leer(),material.codigo,catalogos));dibujar();
      input.value='';lista.hidden=true;$('mas-materiales').hidden=true;input.setAttribute('aria-expanded','false');
      $('coincidencias-materiales').textContent='Material agregado: '+material.codigo+' · '+material.descripcion+'. Puedes completar su cantidad o dejarla vacía.';
    } catch(error) {
      $('error-materiales').textContent=error.message;input.setAttribute('aria-invalid','true');
    }
    input.focus();
  }
  function mostrar() {
    lista.replaceChildren();
    for(const material of coincidencias.slice(0,limite)) {
      const opcion=document.createElement('button');opcion.type='button';opcion.setAttribute('role','option');
      opcion.setAttribute('aria-selected','false');opcion.dataset.codigo=material.codigo;
      const titulo=document.createElement('strong'),detalle=document.createElement('small');
      titulo.textContent=material.codigo+' · '+material.descripcion;detalle.textContent='Unidad: '+material.unidad;
      opcion.append(titulo,detalle);opcion.addEventListener('click',()=>seleccionar(material));lista.append(opcion);
    }
    if(!coincidencias.length) {
      const p=document.createElement('p');p.textContent='No hay coincidencias. Busca por código o descripción.';lista.append(p);
    }
    $('coincidencias-materiales').textContent=coincidencias.length+' coincidencias'+(coincidencias.length>limite?' · mostrando '+limite:'')+'.';
    lista.hidden=false;$('mas-materiales').hidden=coincidencias.length<=limite;input.setAttribute('aria-expanded','true');
  }
  function buscar() {
    limpiarError();limite=20;
    if(!input.value.trim()) {
      lista.hidden=true;$('mas-materiales').hidden=true;$('coincidencias-materiales').textContent='';input.setAttribute('aria-expanded','false');return;
    }
    coincidencias=buscarMateriales(catalogos,input.value);mostrar();
  }
  input.addEventListener('input',buscar);
  $('mas-materiales').addEventListener('click',()=>{limite+=20;mostrar();});
  input.addEventListener('keydown',evento=>{
    if(evento.key==='ArrowDown'&&!lista.hidden){lista.querySelector('button')?.focus();evento.preventDefault();}
    if(evento.key==='Escape'){lista.hidden=true;input.setAttribute('aria-expanded','false');}
    if(evento.key==='Enter'&&input.value.trim()) {
      evento.preventDefault();buscar();
      const clave=valor=>normalizar(valor).replaceAll(' ','');
      const exactas=coincidencias.filter(f=>[f.codigo,f.descripcion].some(v=>clave(v)===clave(input.value)));
      if(exactas.length===1)seleccionar(exactas[0]);
      else{$('coincidencias-materiales').textContent='Elige una coincidencia para agregar el material.';lista.querySelector('button')?.focus();}
    }
  });
  lista.addEventListener('keydown',evento=>{
    const opciones=[...lista.querySelectorAll('button')],i=opciones.indexOf(document.activeElement);
    if(evento.key==='ArrowDown'||evento.key==='ArrowUp') {
      opciones[(i+(evento.key==='ArrowDown'?1:-1)+opciones.length)%opciones.length]?.focus();evento.preventDefault();
    }
    if(evento.key==='Escape'){lista.hidden=true;input.setAttribute('aria-expanded','false');input.focus();}
  });
  function refrescar() {
    input.value='';coincidencias=[];limite=20;lista.replaceChildren();lista.hidden=true;
    $('mas-materiales').hidden=true;$('coincidencias-materiales').textContent='';input.setAttribute('aria-expanded','false');limpiarError();dibujar();
  }
  refrescar();
  return {refrescar,
    erroresPendientes:()=>input.value.trim()?{materiales:$('error-materiales').textContent||'Elige una coincidencia o borra la búsqueda del material antes de descargar.'}:{},
    enfocarError:()=>{(contenedor.querySelector('input[aria-invalid="true"]')??input).focus();}
  };
}
