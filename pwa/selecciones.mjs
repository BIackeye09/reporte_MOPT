import {buscarPersonal,buscarEquipos,codigoEquipoVisible,agregarPersonal,agregarEquipo,retirarPersonal,retirarEquipo,partEquipo,normalizar,PART_MOPT,FILAS_PERSONAL,FILAS_EQUIPOS} from './core.mjs';
import {agregarMenuHoras,enfocarErrorHoras} from './horas.mjs';
import {agregarMenuHorasEquipo,enfocarErrorHorasEquipo} from './horas-equipo.mjs';

// Personal y equipos se guardan en listas distintas. La posición de una lista
// nunca asigna una máquina a la persona situada en la misma fila del documento.
export function iniciarSelecciones(catalogos,{leer,actualizar}) {
  const $=id=>document.getElementById(id);
  function dato(dl,nombre,valor) {
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=nombre;dd.textContent=valor||'Sin dato';dl.append(dt,dd);return dd;
  }
  function dibujarRegistros(tipo) {
    const filas=leer()[tipo],contenedor=$(tipo+'-reporte');contenedor.replaceChildren();
    $('cantidad-'+tipo).textContent=filas.length+' de '+(tipo==='personal'?FILAS_PERSONAL.length:FILAS_EQUIPOS.length);
    if(!filas.length){const p=document.createElement('p');p.className='vacio-registros';
      p.textContent=tipo==='personal'?'Todavía no hay trabajadores agregados.':'Todavía no hay equipos agregados.';contenedor.append(p);return;}
    filas.forEach((entrada,i)=>{
      const id=tipo==='personal'?entrada:entrada.id,fila=catalogos[tipo].get(id);
      const tarjeta=document.createElement('article');tarjeta.className='registro';tarjeta.dataset.id=id;
      const cabecera=document.createElement('div');cabecera.className='registro-cabecera';
      const nombre=document.createElement('strong');nombre.textContent=(i+1)+'. '+(fila?(tipo==='personal'?fila.nombre:codigoEquipoVisible(fila)+' · '+fila.descripcion):'Registro ausente del catálogo');
      const retirar=document.createElement('button');retirar.type='button';retirar.className='enlace';retirar.textContent='Retirar';
      retirar.setAttribute('aria-label','Retirar '+(tipo==='personal'?(fila?.nombre??'trabajador'):(fila?codigoEquipoVisible(fila):'equipo')));
      retirar.addEventListener('click',()=>{
        actualizar(tipo==='personal'?retirarPersonal(leer(),id):retirarEquipo(leer(),id));dibujarRegistros(tipo);
        $('error-'+tipo).textContent='';$(tipo).removeAttribute('aria-invalid');
      });
      cabecera.append(nombre,retirar);tarjeta.append(cabecera);
      if(fila){const dl=document.createElement('dl');dl.className='datos-registro';
        if(tipo==='personal'){dato(dl,'Cédula',fila.cedula);dato(dl,'Código (D)',fila.codigo);}
        else{dato(dl,'COD. (F)',fila.codigoEquipo);dato(dl,'N.º EQ',fila.numeroEquipo);}
        const part=dato(dl,'PART (C)',tipo==='personal'?PART_MOPT:partEquipo(leer(),id));
        if(tipo==='equipos')part.dataset.partEquipo=id;
        dato(dl,'Regional',fila.regional);tarjeta.append(dl);
      }
      if(tipo==='personal'&&fila)agregarMenuHoras(tarjeta,id,{leer,actualizar});
      if(tipo==='equipos'&&fila)agregarMenuHorasEquipo(tarjeta,id,{leer,actualizar});
      contenedor.append(tarjeta);
    });
  }
  function crearBusqueda(tipo) {
    let limite=20,coincidencias=[];
    const input=$(tipo),lista=$('lista-'+tipo);
    for(const regional of [...new Set(catalogos.datos[tipo].map(f=>f.regional))].sort((a,b)=>
      (a==='V Heredia'?-1:b==='V Heredia'?1:a.localeCompare(b,'es'))))
      $('regional-'+tipo).add(new Option(regional,regional));
    function limpiarFicha() {
      $('ficha-'+tipo).hidden=true;
    }
    function seleccionar(fila) {
      input.value=tipo==='personal'?fila.nombre:codigoEquipoVisible(fila);
      lista.hidden=true;$('mas-'+tipo).hidden=true;input.setAttribute('aria-expanded','false');
      $('error-'+tipo).textContent='';input.removeAttribute('aria-invalid');$('ficha-'+tipo).hidden=false;
      if(tipo==='personal') {
        for(const campo of ['nombre','cedula','codigo'])$(campo+'-personal').value=fila[campo];
        $('part-personal').value=PART_MOPT;
      } else {
        $('descripcion-equipos').value=fila.descripcion;$('codigo-equipos').value=fila.codigoEquipo;
        $('numero-equipos').value=fila.numeroEquipo;$('identificador-equipos').value=codigoEquipoVisible(fila);
        $('part-equipos').value=PART_MOPT;
        $('advertencias-equipos').replaceChildren();
        for(const mensaje of fila.advertencias??[]){const p=document.createElement('p');p.className='advertencia';p.textContent=mensaje;$('advertencias-equipos').append(p);}
      }
      $('origen-'+tipo).textContent=fila.regional;
      // Elegir una coincidencia agrega sus datos al mismo borrador que utiliza
      // el exportador. No hace falta un segundo botón para trasladarlos a Excel.
      try {
        const agregar=tipo==='personal'?agregarPersonal:agregarEquipo;
        actualizar(agregar(leer(),fila.id,catalogos));dibujarRegistros(tipo);
        input.value='';limpiarFicha();
        $('coincidencias-'+tipo).textContent=(tipo==='personal'?'Trabajador agregado: '+fila.nombre:'Equipo agregado: '+codigoEquipoVisible(fila))+'. Sus datos se incluirán al descargar el reporte.';
      } catch(error) {
        $('error-'+tipo).textContent=error.message;input.setAttribute('aria-invalid','true');
        $('coincidencias-'+tipo).textContent='Revisa el registro antes de continuar.';
      }
      input.focus();
    }
    function mostrar() {
      lista.replaceChildren();
      for(const fila of coincidencias.slice(0,limite)) {
        const opcion=document.createElement('button');opcion.type='button';opcion.setAttribute('role','option');opcion.setAttribute('aria-selected','false');opcion.dataset.id=fila.id;
        const titulo=document.createElement('strong'),detalle=document.createElement('small');
        titulo.textContent=tipo==='personal'?fila.nombre:codigoEquipoVisible(fila)+' · '+fila.descripcion;
        detalle.textContent=tipo==='personal'?`Cédula: ${fila.cedula} · Código: ${fila.codigo} · ${fila.regional}`:`COD. (F): ${fila.codigoEquipo||'sin dato'} · N.º EQ: ${fila.numeroEquipo||'sin dato'} · ${fila.regional}`;
        opcion.append(titulo,detalle);opcion.addEventListener('click',()=>seleccionar(fila));lista.append(opcion);
      }
      if(!coincidencias.length){const p=document.createElement('p');p.textContent='No hay coincidencias. Prueba otro dato o cambia la regional.';lista.append(p);}
      $('coincidencias-'+tipo).textContent=coincidencias.length+' coincidencias'+(coincidencias.length>limite?' · mostrando '+limite:'')+'.';
      lista.hidden=false;$('mas-'+tipo).hidden=coincidencias.length<=limite;input.setAttribute('aria-expanded','true');
    }
    function buscar() {
      limpiarFicha();limite=20;$('error-'+tipo).textContent='';input.removeAttribute('aria-invalid');
      if(!input.value.trim()){lista.hidden=true;$('mas-'+tipo).hidden=true;$('coincidencias-'+tipo).textContent='';input.setAttribute('aria-expanded','false');return;}
      const consulta=tipo==='personal'?buscarPersonal:buscarEquipos;
      coincidencias=consulta(catalogos,input.value,$('regional-'+tipo).value);mostrar();
    }
    input.addEventListener('input',buscar);$('regional-'+tipo).addEventListener('change',buscar);
    $('mas-'+tipo).addEventListener('click',()=>{limite+=20;mostrar();});
    input.addEventListener('keydown',evento=>{
      if(evento.key==='ArrowDown'&&!lista.hidden){lista.querySelector('button')?.focus();evento.preventDefault();}
      if(evento.key==='Enter'&&input.value.trim()) {
        evento.preventDefault();buscar();
        // Enter acepta un dato completo únicamente si identifica un registro.
        // Un código compartido conserva las coincidencias para elegir la persona
        // o máquina correcta; nunca se toma el primer resultado por suposición.
        const clave=valor=>normalizar(valor).replaceAll(' ','');
        const campos=tipo==='personal'?['nombre','cedula','codigo']:['codigoEquipo','numeroEquipo','codigoPorComponentes','descripcion'];
        const exactas=coincidencias.filter(f=>campos.some(campo=>clave(f[campo]??'')===clave(input.value)));
        if(exactas.length===1)seleccionar(exactas[0]);
        else{$('coincidencias-'+tipo).textContent='Elige una coincidencia para agregar sus datos al reporte.';lista.querySelector('button')?.focus();}
      }
      if(evento.key==='Escape'){lista.hidden=true;input.setAttribute('aria-expanded','false');}
    });
    lista.addEventListener('keydown',evento=>{
      const opciones=[...lista.querySelectorAll('button')],i=opciones.indexOf(document.activeElement);
      if(evento.key==='ArrowDown'||evento.key==='ArrowUp'){opciones[(i+(evento.key==='ArrowDown'?1:-1)+opciones.length)%opciones.length]?.focus();evento.preventDefault();}
      if(evento.key==='Escape'){lista.hidden=true;input.setAttribute('aria-expanded','false');input.focus();}
    });
    function reiniciar(){input.value='';limpiarFicha();lista.hidden=true;lista.replaceChildren();coincidencias=[];$('mas-'+tipo).hidden=true;$('coincidencias-'+tipo).textContent='';$('error-'+tipo).textContent='';input.removeAttribute('aria-invalid');input.setAttribute('aria-expanded','false');}
    reiniciar();return reiniciar;
  }
  const limpiar=[crearBusqueda('personal'),crearBusqueda('equipos')];
  dibujarRegistros('personal');dibujarRegistros('equipos');
  return {
    refrescar:()=>{limpiar.forEach(f=>f());dibujarRegistros('personal');dibujarRegistros('equipos');},
    enfocarError:()=>{if(!enfocarErrorHoras($('personal-reporte')))$('personal').focus();},
    enfocarErrorEquipo:()=>{if(!enfocarErrorHorasEquipo($('equipos-reporte')))$('equipos').focus();},
    refrescarParticipantes:()=>{$('equipos-reporte').querySelectorAll('[data-part-equipo]').forEach(dd=>{dd.textContent=partEquipo(leer(),dd.dataset.partEquipo)||'Completa el participante en acarreos';});},
    // Una búsqueda sin elegir no debe desaparecer silenciosamente del Excel.
    // Se puede completar la selección o borrar el texto si no se desea agregarla.
    erroresPendientes:()=>Object.fromEntries(['personal','equipos'].filter(tipo=>$(tipo).value.trim()).map(tipo=>
      [tipo,$('error-'+tipo).textContent||'Elige una coincidencia o borra la búsqueda antes de descargar el reporte.']))
  };
}
