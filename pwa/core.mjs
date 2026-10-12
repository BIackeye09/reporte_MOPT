// Reglas compartidas por el formulario, las exportaciones y las pruebas.
export const VERSION = 7;
// Las tres líneas de observaciones ya existen en la plantilla original.
export const FILAS_OBSERVACIONES = Object.freeze([38,39,40]);
export const CARACTERES_LINEA_OBSERVACIONES = 70;
export function lineasObservaciones(texto='') {
  const normal=texto.replace(/\r\n?/g,'\n').trim();
  if(!normal)return [];
  const lineas=[];
  for(const parrafo of normal.split('\n')) {
    let caracteres=Array.from(parrafo.trim().replace(/\s+/g,' '));
    // Se respetan los saltos manuales y se continúa por palabras; un código
    // muy largo se divide sin perder caracteres ni partir pares Unicode.
    while(caracteres.length>CARACTERES_LINEA_OBSERVACIONES) {
      const espacio=caracteres.lastIndexOf(' ',CARACTERES_LINEA_OBSERVACIONES);
      const corte=espacio>0?espacio:CARACTERES_LINEA_OBSERVACIONES;
      lineas.push(caracteres.slice(0,corte).join(''));
      caracteres=caracteres.slice(corte+(espacio>0?1:0));
    }
    lineas.push(caracteres.join(''));
  }
  return lineas;
}
export function errorObservaciones(texto='') {
  if(typeof texto!=='string')return 'Escribe las observaciones como texto.';
  if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(texto))return 'Las observaciones contienen un carácter que Excel no puede mostrar. Elimínalo antes de descargar.';
  if(lineasObservaciones(texto).length>FILAS_OBSERVACIONES.length)return 'Reduce el texto o los saltos de línea: el reporte tiene tres líneas para observaciones.';
  return '';
}
export const CLAVE = 'mopt.borrador.encabezado';
// Todos los registros del reporte pertenecen al MOPT. Se conserva como texto
// para que Excel y las otras exportaciones mantengan los tres ceros.
export const PART_MOPT = '000';
// Se respetan las filas combinadas de cierre del documento recibido.
// La fila 33 queda disponible para el cierre, sin mover la simbología.
export const FILAS_PERSONAL = Object.freeze([22,23,24,25,26,27,28,29,31,32]);
export const FILAS_EQUIPOS = Object.freeze([22,23,24,26,27,28,29,30,31,32]);
export const CAMPOS_HORAS = Object.freeze(['ordinarias','extras','pagoExtras','traslado','noTrabajadas','justificacion']);
export const JUSTIFICACIONES = Object.freeze([
  ['1','Vacaciones'],['2','Enfermedad'],['3','Permiso con sueldo'],
  ['4','Falta de herramienta o maquinaria'],['5','Maquinaria varada'],
  ['6','Mal tiempo'],['7','Permiso sin sueldo']
].map(f=>Object.freeze(f)));
// Sólo estas ocho filas pertenecen a la tabla de materiales del documento.
export const FILAS_MATERIALES = Object.freeze([39,40,41,42,43,44,45,46]);
export function normalizar(valor) {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
export function coincide(texto, consulta) {
  const base = normalizar(texto);
  return normalizar(consulta).split(' ').filter(Boolean).every(t => base.includes(t));
}
export function decimal(texto) {
  if (!/^\d+([.,]\d+)?$/.test(String(texto).trim())) return null;
  const n = Number(String(texto).trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function nuevasHoras() {
  return Object.fromEntries(CAMPOS_HORAS.map(campo=>[campo,'']));
}
export function horasDePersonal(b,id) {
  return {...nuevasHoras(),...(b.horasPersonal?.[id]??{})};
}
export function actualizarHorasPersonal(b,id,cambios) {
  if(!b.personal.includes(id))throw new Error('El trabajador no está en el reporte.');
  for(const [campo,valor] of Object.entries(cambios))
    if(!CAMPOS_HORAS.includes(campo)||typeof valor!=='string')throw new Error('Horas inválidas.');
  return {...b,horasPersonal:{...b.horasPersonal,[id]:{...horasDePersonal(b,id),...cambios}}};
}
export function retirarPersonal(b,id) {
  const horas={...b.horasPersonal};delete horas[id];
  return {...b,personal:b.personal.filter(f=>f!==id),horasPersonal:horas};
}
export function totalHoras(h) {
  const textos=['ordinarias','extras','traslado','noTrabajadas'].map(k=>h[k]??'').filter(t=>t.trim());
  if(!textos.length||textos.some(t=>decimal(t)===null))return null;
  // Se suman las cantidades decimales exactas antes de convertir el resultado
  // a número; 0,1 + 0,2 debe mostrarse como 0,3, sin redondear a dos decimales.
  const partes=textos.map(t=>t.trim().replace(',','.').split('.'));
  const precision=Math.max(...partes.map(p=>(p[1]??'').length));
  const suma=partes.reduce((n,[entero,fraccion=''])=>n+BigInt(entero+fraccion.padEnd(precision,'0')),0n);
  const cadena=suma.toString().padStart(precision+1,'0');
  const numero=Number(precision?cadena.slice(0,-precision)+'.'+cadena.slice(-precision):cadena);
  return Number.isFinite(numero)?numero:null;
}
export function erroresHoras(h) {
  const e={};
  for(const campo of ['ordinarias','extras','traslado','noTrabajadas'])
    if(typeof h[campo]!=='string'||(h[campo].trim()&&decimal(h[campo])===null))
      e[campo]='Escribe horas iguales o mayores que cero, con coma o punto decimal.';
  if(!e.traslado&&decimal(h.traslado)>0&&decimal(h.traslado)<2)
    e.traslado='TRAS. corresponde a dos o más horas de traslado. Usa 0 o deja vacío si no corresponde.';
  const pago=String(h.pagoExtras??'').trim(),justificacion=String(h.justificacion??'').trim();
  if(pago&&!/^\d{3}$/.test(pago))e.pagoExtras='Escribe el código de institución de tres dígitos, por ejemplo 000.';
  else if(decimal(h.extras)>0&&!pago)e.pagoExtras='Indica la institución que pagará las horas extra.';
  if(justificacion&&!JUSTIFICACIONES.some(([codigo])=>codigo===justificacion))e.justificacion='Selecciona un motivo de la plantilla.';
  else if(decimal(h.noTrabajadas)>0&&!justificacion)e.justificacion='Selecciona el motivo de las horas no trabajadas.';
  if(!['ordinarias','extras','traslado','noTrabajadas'].some(c=>e[c])&&
    ['ordinarias','extras','traslado','noTrabajadas'].some(c=>h[c].trim())&&totalHoras(h)===null)
    e.total='El total de horas es demasiado grande.';
  return e;
}
export function filaUltimaLinea(tipo,cantidad) {
  const filas=tipo==='personal'?FILAS_PERSONAL:FILAS_EQUIPOS;
  if(!Number.isInteger(cantidad)||cantidad<0||cantidad>filas.length)throw new Error('La lista no cabe en el reporte.');
  // Se utiliza la fila física siguiente, también en los cierres 25 y 30.
  return cantidad?filas[cantidad-1]+1:22;
}
export function fechaHoy(dispositivo = new Date()) {
  // Se usa la fecha local del teléfono, sin convertirla a UTC.
  return `${dispositivo.getFullYear()}-${String(dispositivo.getMonth()+1).padStart(2,'0')}-${String(dispositivo.getDate()).padStart(2,'0')}`;
}
export function fechaValida(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [a,m,d] = iso.split('-').map(Number), f = new Date(Date.UTC(a,m-1,d));
  return a>=1900 && a<=2100 && f.getUTCFullYear()===a && f.getUTCMonth()===m-1 && f.getUTCDate()===d;
}
export function fechaVisible(iso) {
  return fechaValida(iso) ? iso.split('-').reverse().join('/') : '';
}
// La escritura manual y el calendario terminan en la misma fecha civil.
export function fechaDeTexto(texto) {
  const partes = String(texto).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!partes) return null;
  const iso = `${partes[3]}-${partes[2].padStart(2,'0')}-${partes[1].padStart(2,'0')}`;
  return fechaValida(iso) ? iso : null;
}
// Lunes es la primera columna. Los días se construyen sin cambios de zona horaria.
export function diasCalendario(ano,mes) {
  if (!Number.isInteger(ano)||!Number.isInteger(mes)||ano<1900||ano>2100||mes<1||mes>12) return [];
  const inicio=(new Date(Date.UTC(ano,mes-1,1)).getUTCDay()+6)%7;
  const cantidad=new Date(Date.UTC(ano,mes,0)).getUTCDate();
  return [...Array(inicio).fill(null),...Array.from({length:cantidad},(_,i)=>
    `${ano}-${String(mes).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)];
}
export function crearCatalogos(datos) {
  function indice(lista,clave='codigo') {
    const mapa = new Map();
    for (const fila of lista) {
      if (mapa.has(fila[clave])) throw new Error(`Identificador repetido: ${fila[clave]}`);
      mapa.set(fila[clave], Object.freeze(fila));
    }
    return mapa;
  }
  if (datos.metadata?.version !== 2) throw new Error('Versión de catálogo no admitida.');
  // Los códigos personales y las parejas de equipo pueden repetirse por regional.
  // Se conservan todos los registros y se seleccionan mediante su ID de origen.
  return {datos,caminos:indice(datos.caminos),actividades:indice(datos.actividades),
    personal:indice(datos.personal,'id'),equipos:indice(datos.equipos,'id'),materiales:indice(datos.materiales)};
}
const compacto=valor=>normalizar(valor).replaceAll(' ','');
function buscarRegistros(filas,consulta,regional,campos,preferencia='V Heredia') {
  const q=normalizar(consulta),identificador=compacto(consulta);
  if (!q) return [];
  const numerica=/^[\d\s-]+$/.test(String(consulta).trim());
  return filas.filter(f=>!regional||f.regional===regional).map(f=>{
    const valores=campos.map(k=>String(f[k]??'')),completos=valores.map(normalizar);
    const coincideTexto=coincide(valores.join(' ')+' '+(f.regional??''),consulta);
    const coincideNumero=numerica&&valores.some(v=>compacto(v).includes(identificador));
    if (!coincideTexto&&!coincideNumero) return null;
    // Las coincidencias completas preceden a los prefijos y a las parciales.
    let puntos=1000;
    if (completos.some(v=>v===q)||valores.some(v=>compacto(v)===identificador)) puntos=6000;
    else if (completos.some(v=>v.startsWith(q))) puntos=4000;
    else if (numerica&&valores.some(v=>compacto(v).startsWith(identificador))) puntos=3000;
    if (f.regional===preferencia) puntos+=300;
    return {fila:f,puntos};
  }).filter(Boolean).sort((a,b)=>b.puntos-a.puntos||
    String(a.fila.nombre??a.fila.descripcion).localeCompare(String(b.fila.nombre??b.fila.descripcion),'es')||
    String(a.fila.id??a.fila.codigo).localeCompare(String(b.fila.id??b.fila.codigo))).map(x=>x.fila);
}
export function buscarPersonal(catalogos,consulta,regional='') {
  return buscarRegistros(catalogos.datos.personal,consulta,regional,['nombre','cedula','codigo']);
}
export function codigoEquipoVisible(equipo) {
  return `${equipo.codigoEquipo||'—'}-${equipo.numeroEquipo||'—'}`;
}
export function buscarEquipos(catalogos,consulta,regional='') {
  // Se busca también por los componentes reales; no se interpreta una placa.
  return buscarRegistros(catalogos.datos.equipos,consulta,regional,
    ['codigoEquipo','numeroEquipo','codigoPorComponentes','descripcion','clasificacion']);
}
export function buscarMateriales(catalogos,consulta) {
  return buscarRegistros(catalogos.datos.materiales,consulta,'',['codigo','descripcion']);
}
export function agregarMaterial(b,codigo,catalogos) {
  const lista=b.materiales??[];
  if(!catalogos.materiales.has(codigo))throw new Error('Selecciona un material del catálogo.');
  if(lista.some(f=>f.codigo===codigo))throw new Error('Ese material ya está en el reporte. Puedes editar su cantidad.');
  if(lista.length>=FILAS_MATERIALES.length)throw new Error('La tabla de esta plantilla admite 8 materiales.');
  // La cantidad comienza vacía. Elegir un material nunca supone cuánto se usó.
  return {...b,materiales:[...lista,{codigo,cantidadTexto:''}]};
}
export function errorCantidadMaterial(texto) {
  return typeof texto!=='string'||(texto.trim()&&decimal(texto)===null)
    ?'Escribe un entero o decimal igual o mayor que cero, con coma o punto, o deja la cantidad vacía.':'';
}
export function equipoCompleto(equipo) {
  return Boolean(equipo&&/^\d+$/.test(equipo.codigoEquipo)&&/^\d+$/.test(equipo.numeroEquipo));
}
function identidadPersonal(f) {
  const cedula=compacto(f.cedula);
  return /\d/.test(cedula)?cedula:f.id;
}
function identidadEquipo(f) {
  return [f.codigoEquipo,f.numeroEquipo].map(v=>v.replace(/^0+(?=\d)/,'')).join('-');
}
export function agregarPersonal(b,id,catalogos) {
  const fila=catalogos.personal.get(id),lista=b.personal??[];
  if (!fila) throw new Error('Selecciona un trabajador del catálogo.');
  if (lista.length>=FILAS_PERSONAL.length) throw new Error('El reporte admite 10 trabajadores y reserva una fila para Última línea.');
  if (lista.some(i=>{const f=catalogos.personal.get(i);return f&&identidadPersonal(f)===identidadPersonal(fila);}))
    throw new Error('Ese trabajador ya está en el reporte.');
  return {...b,personal:[...lista,id],horasPersonal:{...b.horasPersonal,[id]:nuevasHoras()}};
}
export function agregarEquipo(b,id,catalogos) {
  const fila=catalogos.equipos.get(id),lista=b.equipos??[];
  if (!equipoCompleto(fila)) throw new Error('Este registro no trae un COD. (F) y un N.º EQ completos.');
  if (lista.length>=FILAS_EQUIPOS.length) throw new Error('El reporte admite 10 equipos y reserva una fila para Última línea.');
  if (lista.some(i=>{const f=catalogos.equipos.get(i.id);return equipoCompleto(f)&&identidadEquipo(f)===identidadEquipo(fila);}))
    throw new Error('Ese equipo ya está en el reporte.');
  return {...b,equipos:[...lista,{id,part:PART_MOPT}]};
}
export function nuevoEncabezado() {
  const fecha=fechaHoy();
  return {version:VERSION,codigoCamino:null,codigoActividad:null,fecha,fechaTexto:fechaVisible(fecha),
    produccionTexto:'',senasInicio:'',problema:'',longitudTexto:'',observaciones:'',personal:[],equipos:[],materiales:[],horasPersonal:{},idCatalogo:null};
}
export function leerBorrador(texto) {
  const b = JSON.parse(texto);
  if (![1,2,3,4,5,6,7].includes(b.version) || (b.version<4&&!fechaValida(b.fecha))) throw new Error('Borrador inválido.');
  for (const k of ['produccionTexto','senasInicio','longitudTexto']) if (typeof b[k]!=='string') throw new Error('Borrador inválido.');
  for (const k of ['codigoCamino','codigoActividad','idCatalogo']) if (b[k]!=null && typeof b[k]!=='string') throw new Error('Borrador inválido.');
  if (b.version>=4 && (typeof b.fechaTexto!=='string'||typeof b.problema!=='string'||
    !Array.isArray(b.personal)||b.personal.some(id=>typeof id!=='string')||
    !Array.isArray(b.equipos)||b.equipos.some(f=>!f||typeof f.id!=='string'||typeof f.part!=='string')))
    throw new Error('Borrador inválido.');
  if(b.version>=5&&(!Array.isArray(b.materiales)||b.materiales.some(f=>!f||typeof f.codigo!=='string'||typeof f.cantidadTexto!=='string')))
    throw new Error('Borrador inválido.');
  if(b.version>=6&&typeof b.observaciones!=='string')throw new Error('Borrador inválido.');
  if(b.version>=7&&(!b.horasPersonal||typeof b.horasPersonal!=='object'||Array.isArray(b.horasPersonal)))
    throw new Error('Borrador inválido.');
  const horasPersonal={};
  for(const id of b.version>=4?b.personal:[]) {
    const registro=b.version>=7?b.horasPersonal[id]:undefined;
    if(registro!==undefined&&(!registro||typeof registro!=='object'||Array.isArray(registro)||
      CAMPOS_HORAS.some(k=>typeof registro[k]!=='string')))throw new Error('Borrador inválido.');
    horasPersonal[id]=Object.fromEntries(CAMPOS_HORAS.map(k=>[k,registro?.[k]??'']));
  }
  const fechaTexto=b.version>=4?b.fechaTexto:fechaVisible(b.fecha);
  return {version:VERSION,codigoCamino:b.codigoCamino??null,codigoActividad:b.codigoActividad??null,
    fecha:fechaDeTexto(fechaTexto)??'',fechaTexto,produccionTexto:b.produccionTexto,senasInicio:b.senasInicio,
    problema:b.version>=4?b.problema:'',longitudTexto:b.longitudTexto,personal:b.version>=4?b.personal:[],
    // Los borradores anteriores podían tener un PART de equipo manual.
    equipos:b.version>=4?b.equipos.map(f=>({id:f.id,part:PART_MOPT})):[],
    // Los borradores anteriores se recuperan completos, con materiales vacíos.
    materiales:b.version>=5?b.materiales.map(f=>({codigo:f.codigo,cantidadTexto:f.cantidadTexto})):[],
    // Los borradores anteriores conservan sus datos y comienzan sin observaciones.
    // El texto en edición se guarda íntegro, incluso si aún supera el espacio.
    observaciones:b.version>=6?b.observaciones:'',horasPersonal,idCatalogo:b.idCatalogo??null};
}
export function errores(b,catalogos) {
  const e = {};
  if (!catalogos.caminos.has(b.codigoCamino)) e.camino='Selecciona un código de camino del catálogo.';
  if (!catalogos.actividades.has(b.codigoActividad)) e.actividad='Selecciona una actividad del catálogo.';
  if (!fechaValida(b.fecha)) e.fecha='Selecciona una fecha válida.';
  if (!['','S','N'].includes(b.problema??'')) e.problema='Elige Sí, No o deja el campo vacío.';
  const observaciones=errorObservaciones(b.observaciones??'');
  if(observaciones)e.observaciones=observaciones;
  for (const [k,id] of [['produccionTexto','produccion'],['longitudTexto','avance']]) {
    if (b[k].trim() && decimal(b[k])===null) e[id]='Escribe un número igual o mayor que cero, con coma o punto decimal.';
  }
  const personal=b.personal??[],equipos=b.equipos??[];
  if (personal.length>FILAS_PERSONAL.length) e.personal='El reporte admite 10 trabajadores y reserva una fila para Última línea. Retira un trabajador o divídelo en otro reporte.';
  else if (personal.some(id=>!catalogos.personal.has(id))) e.personal='Hay un trabajador que ya no existe en el catálogo. Retíralo y selecciona el registro correcto.';
  else if (new Set(personal.map(id=>identidadPersonal(catalogos.personal.get(id)))).size!==personal.length) e.personal='Hay un trabajador repetido en el reporte.';
  else {
    const id=personal.find(id=>Object.keys(erroresHoras(horasDePersonal(b,id))).length);
    if(id)e.personal='Horas de '+catalogos.personal.get(id).nombre+': '+Object.values(erroresHoras(horasDePersonal(b,id)))[0];
  }
  if (equipos.length>FILAS_EQUIPOS.length) e.equipos='El reporte admite 10 equipos y reserva una fila para Última línea. Retira un equipo o divídelo en otro reporte.';
  else if (equipos.some(f=>!equipoCompleto(catalogos.equipos.get(f.id)))) e.equipos='Hay un equipo sin identificadores completos del catálogo. Retíralo y selecciona otro registro.';
  else if (new Set(equipos.map(f=>identidadEquipo(catalogos.equipos.get(f.id)))).size!==equipos.length) e.equipos='Hay un equipo repetido en el reporte.';
  const materiales=b.materiales??[];
  if(materiales.length>FILAS_MATERIALES.length)e.materiales='La tabla de esta plantilla admite 8 materiales.';
  else if(materiales.some(f=>!f||!catalogos.materiales.has(f.codigo)))e.materiales='Hay un material que ya no existe en el catálogo. Retíralo y selecciona el registro correcto.';
  else if(new Set(materiales.map(f=>f.codigo)).size!==materiales.length)e.materiales='Hay un material repetido en el reporte.';
  else {
    const incorrecto=materiales.find(f=>errorCantidadMaterial(f.cantidadTexto));
    if(incorrecto)e.materiales='Cantidad del material '+incorrecto.codigo+': '+errorCantidadMaterial(incorrecto.cantidadTexto);
  }
  return e;
}
// Correspondencia exacta con las celdas del frente del XLS recibido.
export function valoresCeldas(b,catalogos) {
  if (Object.keys(errores(b,catalogos)).length) throw new Error('Revisa el encabezado.');
  const c=catalogos.caminos.get(b.codigoCamino), a=catalogos.actividades.get(b.codigoActividad);
  const [ano,mes,dia]=b.fecha.split('-').map(Number);
  // Excel incluye un 29/02/1900 ficticio. Se corrigen los días anteriores.
  const serial=(Date.UTC(ano,mes-1,dia)-Date.UTC(1899,11,30))/86400000-(ano===1900&&mes<3?1:0);
  const valores={AD3:'',C10:'V',I10:c.codigo,O9:c.desde,O11:c.hasta,E13:a.codigo,J13:a.descripcion,
    AD8:'',AD10:serial,AE10:serial,AF10:serial,AD11:decimal(b.produccionTexto),AF11:a.unidad,
    AF13:b.problema??'',D14:b.senasInicio.trim(),AA16:decimal(b.longitudTexto)};
  // Cada registro de horas pertenece al ID del trabajador, no a la posición
  // que ocupa en la lista; retirar una persona no cambia las horas de otra.
  FILAS_PERSONAL.forEach((fila,i)=>{
    const f=catalogos.personal.get(b.personal?.[i]);
    const h=f?horasDePersonal(b,b.personal[i]):nuevasHoras();
    Object.assign(valores,{['B'+fila]:f?PART_MOPT:'',['C'+fila]:f?.codigo??'',
      ['E'+fila]:f?.cedula??'',['J'+fila]:f?.nombre??'',
      ['R'+fila]:decimal(h.ordinarias),['S'+fila]:decimal(h.extras),['T'+fila]:h.pagoExtras.trim(),
      ['U'+fila]:decimal(h.traslado),['V'+fila]:decimal(h.noTrabajadas),
      ['W'+fila]:h.justificacion.trim(),['X'+fila]:totalHoras(h)});
  });
  FILAS_EQUIPOS.forEach((fila,i)=>{
    const entrada=b.equipos?.[i],f=catalogos.equipos.get(entrada?.id);
    Object.assign(valores,{['Z'+fila]:f?PART_MOPT:'',['AA'+fila]:f?.codigoEquipo??'',
      ['AC'+fila]:f?.numeroEquipo??''});
  });
  FILAS_MATERIALES.forEach((fila,i)=>{
    const entrada=b.materiales?.[i],f=catalogos.materiales.get(entrada?.codigo);
    Object.assign(valores,{['B'+fila]:f?PART_MOPT:'',['C'+fila]:f?.codigo??'',
      ['E'+fila]:f?.descripcion??'',['O'+fila]:f?.unidad??'',
      ['P'+fila]:f?decimal(entrada.cantidadTexto):null});
  });
  const lineas=lineasObservaciones(b.observaciones??'');
  FILAS_OBSERVACIONES.forEach((fila,i)=>{valores['U'+fila]=lineas[i]??'';});
  return valores;
}
const escapeXml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function rellenarXml(xml, valores) {
  for (const [ref,valor] of Object.entries(valores)) {
    const re=new RegExp(`<c\\b([^>]*\\br="${ref}"[^>]*?)(?:\\s*\\/>|>[\\s\\S]*?<\\/c>)`);
    if (!re.test(xml)) throw new Error(`Falta la celda ${ref} en la plantilla.`);
    xml=xml.replace(re,(_,attrs)=>{
      attrs=attrs.replace(/\s+t="[^"]*"/g,'').replace(/\/$/,'');
      if(valor&&typeof valor==='object'&&typeof valor.formula==='string') {
        const vacio=valor.valor===null;
        return '<c'+attrs+(vacio?' t="str"':'')+'><f>'+escapeXml(valor.formula)+'</f>'+
          (vacio?'<v/>':'<v>'+valor.valor+'</v>')+'</c>';
      }
      if (valor==null || valor==='') return `<c${attrs}/>`;
      if (typeof valor==='number') return `<c${attrs}><v>${valor}</v></c>`;
      return `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${escapeXml(valor)}</t></is></c>`;
    });
  }
  return xml;
}
const enc=new TextEncoder();
export const utf8 = enc.encode.bind(enc);
const tablaCrc=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes) {let n=0xffffffff;for(const b of bytes)n=tablaCrc[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
const unir = partes => {const out=new Uint8Array(partes.reduce((n,p)=>n+p.length,0));let pos=0;for(const p of partes){out.set(p,pos);pos+=p.length;}return out;};
// ZIP sin compresión: no requiere bibliotecas externas ni descargas por Internet.
export function zipGuardado(archivos) {
  const partes=[], directorio=[];let offset=0;
  for (const {nombre,bytes} of archivos) {
    const nom=utf8(nombre), crc=crc32(bytes), h=new Uint8Array(30+nom.length), v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);
    v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,nom.length,true);h.set(nom,30);
    const d=new Uint8Array(46+nom.length),dv=new DataView(d.buffer);
    dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(8,0x800,true);dv.setUint16(14,0x21,true);
    dv.setUint32(16,crc,true);dv.setUint32(20,bytes.length,true);dv.setUint32(24,bytes.length,true);dv.setUint16(28,nom.length,true);dv.setUint32(42,offset,true);d.set(nom,46);
    partes.push(h,bytes);directorio.push(d);offset+=h.length+bytes.length;
  }
  const central=unir(directorio),fin=new Uint8Array(22),fv=new DataView(fin.buffer);
  fv.setUint32(0,0x06054b50,true);fv.setUint16(8,archivos.length,true);fv.setUint16(10,archivos.length,true);fv.setUint32(12,central.length,true);fv.setUint32(16,offset,true);
  return unir([...partes,central,fin]);
}
export function generarExcel(plantilla,b,catalogos) {
  const valores=valoresCeldas(b,catalogos);
  for(const [i,id] of (b.personal??[]).entries()) {
    const fila=FILAS_PERSONAL[i],ref='X'+fila;
    // CAN suma horas; PAG y JUST. son códigos y nunca participan en el total.
    const rango='R'+fila+':S'+fila+',U'+fila+',V'+fila;
    valores[ref]={formula:'IF(COUNT('+rango+')=0,"",SUM('+rango+'))',valor:totalHoras(horasDePersonal(b,id))};
  }
  const archivos=plantilla.map(f=>{
    const bytes=Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0));
    if(!/^xl\/worksheets\/sheet\d+\.xml$/.test(f.nombre))return {nombre:f.nombre,bytes};
    let hoja=new TextDecoder().decode(bytes);
    if(f.nombre==='xl/worksheets/sheet1.xml')hoja=rellenarXml(hoja,valores);
    return {nombre:f.nombre,bytes:utf8(corregirImpresionXml(hoja))};
  });
  const ajustar=[...FILAS_PERSONAL.slice(0,b.personal?.length??0).map(f=>'J'+f)];
  const hojaFrente=archivos.find(f=>f.nombre==='xl/worksheets/sheet1.xml');
  const cierres=cerrarTablas(new TextDecoder().decode(hojaFrente.bytes),b);
  hojaFrente.bytes=utf8(cierres.hoja);ajustar.push(...cierres.celdas);
  for(const [i,id] of (b.personal??[]).entries()) {
    const fila=FILAS_PERSONAL[i],h=horasDePersonal(b,id);
    // PAG y JUST. conservan formato de texto, también si se completan después
    // de descargar el Excel; escribir 000 no debe convertir el código en 0.
    ajustar.push('T'+fila,'W'+fila);
    for(const [col,campo] of [['R','ordinarias'],['S','extras'],['U','traslado'],['V','noTrabajadas']])
      if(h[campo].trim())ajustar.push(col+fila);
    if(totalHoras(h)!==null)ajustar.push('X'+fila);
  }
  // El texto es literal, aunque empiece con =; se conserva dentro de cada
  // línea original y nunca se escribe en las casillas de firma o sello.
  for(const [i,linea] of lineasObservaciones(b.observaciones??'').entries())if(linea)ajustar.push('U'+FILAS_OBSERVACIONES[i]);
  for(const [i,entrada] of (b.materiales??[]).entries()) {
    ajustar.push('E'+FILAS_MATERIALES[i],'P'+FILAS_MATERIALES[i]);
  }
  if(ajustar.length) {
    // Los nombres, descripciones y cantidades caben en sus casillas originales.
    // Se añaden estilos de ajuste; se conservan las filas y estilos de origen.
    const hoja=archivos.find(f=>f.nombre==='xl/worksheets/sheet1.xml');
    const estilos=archivos.find(f=>f.nombre==='xl/styles.xml');
    const resultado=ajustarAnchos(new TextDecoder().decode(hoja.bytes),new TextDecoder().decode(estilos.bytes),ajustar,cierres.celdas);
    hoja.bytes=utf8(resultado.hoja);estilos.bytes=utf8(resultado.estilos);
  }
  return zipGuardado(archivos);
}
function cerrarTablas(hoja,b) {
  const seccion=hoja.match(/<mergeCells\b[^>]*>([\s\S]*?)<\/mergeCells>/);
  if(!seccion)throw new Error('Faltan las combinaciones de la plantilla.');
  let referencias=[...seccion[1].matchAll(/<mergeCell\b[^>]*ref="([^"]+)"[^>]*\/>/g)].map(m=>m[1]);
  const columna=texto=>[...texto].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
  const nombre=n=>n<=26?String.fromCharCode(64+n):'A'+String.fromCharCode(64+n-26);
  const celdas=[];
  for(const [tipo,inicio,fin] of [['personal','B','X'],['equipos','Z','AH']]) {
    const fila=filaUltimaLinea(tipo,b[tipo]?.length??0),primera=columna(inicio),ultima=columna(fin),vacios={};
    for(let c=primera;c<=ultima;c++)vacios[nombre(c)+fila]='';
    vacios[inicio+fila]='Última línea';hoja=rellenarXml(hoja,vacios);celdas.push(inicio+fila);
    referencias=referencias.filter(ref=>{
      const m=ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if(!m)return true;
      const toca=Number(m[2])<=fila&&Number(m[4])>=fila&&columna(m[1])<=ultima&&columna(m[3])>=primera;
      if(toca&&(Number(m[2])!==fila||Number(m[4])!==fila||columna(m[1])<primera||columna(m[3])>ultima))
        throw new Error('El cierre invadiría otra sección de la plantilla.');
      return !toca;
    });
    referencias.push(inicio+fila+':'+fin+fila);
  }
  hoja=hoja.replace(seccion[0],'<mergeCells count="'+referencias.length+'">'+referencias.map(ref=>'<mergeCell ref="'+ref+'"/>').join('')+'</mergeCells>');
  return {hoja,celdas};
}
function corregirImpresionXml(xml) {
  // La plantilla convertida contiene márgenes predeterminados y los del XLS.
  // CT_Worksheet permite sólo uno: se conserva el último, que pertenece al XLS.
  // El orden requerido es printOptions, pageMargins, pageSetup y luego drawing.
  const configuracion=new Map();
  xml=xml.replace(/<(printOptions|pageMargins|pageSetup)\b[^>]*\/>/g,(elemento,nombre)=>{
    configuracion.set(nombre,elemento);return '';
  });
  const bloque=['printOptions','pageMargins','pageSetup'].map(n=>configuracion.get(n)??'').join('');
  if(!bloque)return xml;
  const siguiente=/<(?:headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|drawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b|<\/worksheet>/;
  if(!siguiente.test(xml))throw new Error('No se encontró el cierre de la hoja Excel.');
  return xml.replace(siguiente,elemento=>bloque+elemento);
}
function ajustarAnchos(hoja,estilos,referencias,centradas=[]) {
  const seccion=estilos.match(/<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/);
  if(!seccion)throw new Error('Faltan los estilos de la plantilla.');
  const originales=seccion[2].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)??[];
  const nuevos=[],mapa=new Map();
  for(const referencia of referencias) {
    const celda=new RegExp(`<c\\b([^>]*\\br="${referencia}"[^>]*?)>`),captura=hoja.match(celda);
    const id=Number(captura?.[1].match(/\bs="(\d+)"/)?.[1]);
    if(!originales[id])throw new Error('No se encontró el formato de la celda '+referencia+'.');
    const hora=referencia.match(/^([RSTUVWX])(\d+)$/),enHoras=hora&&Number(hora[2])>=22&&Number(hora[2])<=33;
    const cantidad=referencia.startsWith('P')||(enHoras&&['R','S','U','V','X'].includes(hora[1]));
    const codigo=enHoras&&['T','W'].includes(hora[1]),cierre=centradas.includes(referencia);
    const clave=(cierre?'cierre-':cantidad?'cantidad-':codigo?'codigo-':'texto-')+id;
    if(!mapa.has(clave)) {
      let formato=originales[id];
      // General conserva los decimales ingresados: la plantilla tenía 0.00,
      // que ocultaría parte de cantidades como 0.125. También permite enteros.
      if(cantidad||codigo)formato=formato.replace(/^<xf\b([^>]*)>/,(_,atributos)=>'<xf'+
        atributos.replace(/\s+(numFmtId|applyNumberFormat)="[^"]*"/g,'')+' numFmtId="'+(codigo?49:0)+'" applyNumberFormat="1">');
      if(/<alignment\b/.test(formato))formato=formato.replace(/<alignment\b([^>]*?)(\/?>)/,(_,atributos,fin)=>
        '<alignment'+atributos.replace(/\s+shrinkToFit="[^"]*"/g,'')+' shrinkToFit="1"'+fin);
      else if(formato.endsWith('/>'))formato=formato.slice(0,-2)+'><alignment shrinkToFit="1"/></xf>';
      else formato=formato.replace('</xf>','<alignment shrinkToFit="1"/></xf>');
      formato=formato.replace(/^<xf\b([^>]*)>/,(_,atributos)=>'<xf'+atributos.replace(/\s+applyAlignment="[^"]*"/g,'')+' applyAlignment="1">');
      if(cierre)formato=formato.replace(/<alignment\b([^>]*?)(\/?>)/,(_,atributos,fin)=>'<alignment'+
        atributos.replace(/\s+(horizontal|vertical|wrapText)="[^"]*"/g,'')+' horizontal="center" vertical="center" wrapText="0"'+fin);
      mapa.set(clave,originales.length+nuevos.length);nuevos.push(formato);
    }
    hoja=hoja.replace(celda,(_,atributos)=>'<c'+atributos.replace(/\bs="\d+"/,'s="'+mapa.get(clave)+'"')+'>');
  }
  estilos=estilos.replace(seccion[0],'<cellXfs'+seccion[1].replace(/\bcount="\d+"/,'count="'+(originales.length+nuevos.length)+'"')+'>'+seccion[2]+nuevos.join('')+'</cellXfs>');
  return {hoja,estilos};
}
// PDF de tamaño carta, con la misma imagen de alta resolución de la vista previa.
// No usa impresión del navegador, que añadiría márgenes o cambiaría los cuadros.
export function generarPdf(imagenes) {
  const objetos=[],ids=[];
  const objeto = partes => {objetos.push(unir(partes.map(p=>typeof p==='string'?utf8(p):p)));return objetos.length;};
  objeto(['<< /Type /Catalog /Pages 2 0 R >>']);objeto(['']);
  for(const {bytes,ancho,alto} of imagenes){
    const img=objeto([`<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,bytes,'\nendstream']);
    const comandos=utf8('q\n612 0 0 792 0 0 cm\n/Imagen Do\nQ\n');
    const contenido=objeto([`<< /Length ${comandos.length} >>\nstream\n`,comandos,'endstream']);
    ids.push(objeto([`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Imagen ${img} 0 R >> >> /Contents ${contenido} 0 R >>`]));
  }
  objetos[1]=utf8(`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id=>`${id} 0 R`).join(' ')}] >>`);
  const partes=[utf8('%PDF-1.4\n%MOPT\n')], offsets=[0];let total=partes[0].length;
  objetos.forEach((o,i)=>{offsets.push(total);const p=unir([utf8(`${i+1} 0 obj\n`),o,utf8('\nendobj\n')]);partes.push(p);total+=p.length;});
  const xref=total;
  partes.push(utf8(`xref\n0 ${objetos.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objetos.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return unir(partes);
}
