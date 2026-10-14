// Reglas del reverso. Sólo la actividad 533 utiliza estos datos y su producción.
export const VIAJES_MAXIMOS = 12;
export const FILAS_ACARREOS = Object.freeze({
  mopt:Object.freeze([4,5,6,7,8,9,10,11,12]),
  alquilado:Object.freeze([22,23,24,25,26,27,28,29,30]),
  otros:Object.freeze([35,36,37,38,39,40,41,42,43])
});
export const CAMPOS_ACARREO = Object.freeze(['capacidadTexto','longitudTexto','fuente','material',
  'participante','provincia','canton','codigoParticipante','alquilado','viajes']);
export const esAcarreo = b => b.codigoActividad === '533';
const numero = texto => /^\d+([.,]\d+)?$/.test(String(texto).trim()) &&
  Number.isFinite(Number(String(texto).trim().replace(',','.')))
    ? Number(String(texto).trim().replace(',','.')) : null;
export function enteroAcarreo(texto) {
  const t=String(texto).trim(),n=Number(t);
  return /^\d+$/.test(t)&&Number.isSafeInteger(n)?n:null;
}
export function nuevoAcarreo() {
  return {capacidadTexto:'',longitudTexto:'',fuente:'',material:'',participante:'mopt',
    provincia:'',canton:'',codigoParticipante:'',alquilado:false,viajes:Array(VIAJES_MAXIMOS).fill(false)};
}
export function acarreoDe(b,id) {
  const r=b.acarreos?.[id];return r?{...r,viajes:[...r.viajes]}:null;
}
export function registroAcarreoValido(r) {
  return Boolean(r&&typeof r==='object'&&!Array.isArray(r)&&
    CAMPOS_ACARREO.filter(k=>!['viajes','alquilado'].includes(k)).every(k=>typeof r[k]==='string')&&
    typeof r.alquilado==='boolean'&&Array.isArray(r.viajes)&&r.viajes.length===VIAJES_MAXIMOS&&
    r.viajes.every(v=>typeof v==='boolean'));
}
export function agregarAcarreo(b,id) {
  if(!esAcarreo(b))throw new Error('Los acarreos se completan con la actividad 533.');
  if(!b.equipos.some(f=>f.id===id))throw new Error('Agrega primero el equipo en la parte de enfrente.');
  if(b.acarreos?.[id])throw new Error('Ese equipo ya está en el acarreo.');
  return {...b,acarreos:{...b.acarreos,[id]:nuevoAcarreo()}};
}
export function actualizarAcarreo(b,id,cambios) {
  if(!b.equipos.some(f=>f.id===id)||!b.acarreos?.[id])throw new Error('El equipo no está en el acarreo.');
  if(Object.keys(cambios).some(k=>!CAMPOS_ACARREO.includes(k)))throw new Error('Campo de acarreo inválido.');
  const r={...acarreoDe(b,id),...cambios};
  if(!registroAcarreoValido(r))throw new Error('Datos de acarreo inválidos.');
  return {...b,acarreos:{...b.acarreos,[id]:r}};
}
export function retirarAcarreo(b,id) {
  const acarreos={...b.acarreos};delete acarreos[id];return {...b,acarreos};
}
export function codigoParticipante(r) {
  if(!r)return '000';
  if(r.participante==='mopt')return '000';
  if(r.participante==='municipalidad')return /^[1-7]$/.test(r.provincia)&&/^(0[1-9]|1\d|20)$/.test(r.canton)
    ?r.provincia+r.canton:'';
  const codigo=r.codigoParticipante.trim();
  if(r.participante==='800'&&/^8\d{2}$/.test(codigo))return codigo;
  if(r.participante==='900'&&/^9\d{2}$/.test(codigo))return codigo;
  return '';
}
export const grupoAcarreo = r => r.alquilado?'alquilado':r.participante==='mopt'?'mopt':'otros';
export const numeroViajes = r => r.viajes.filter(Boolean).length;
// Las capacidades se multiplican como decimales exactos. Cada subtotal se
// redondea a dos decimales, igual que ROUND de la hoja Excel, antes de sumarlo.
export function subtotalCentimos(r) {
  const distancia=enteroAcarreo(r.longitudTexto);
  if(numero(r.capacidadTexto)===null||distancia===null)return null;
  const [entero,fraccion='']=r.capacidadTexto.trim().replace(',','.').split('.');
  const potencia=10n**BigInt(fraccion.length);
  const producto=BigInt(entero+fraccion)*BigInt(distancia)*BigInt(numeroViajes(r))*100n;
  const centimos=(producto+potencia/2n)/potencia;
  return centimos<=BigInt(Number.MAX_SAFE_INTEGER)?centimos:null;
}
export function subtotalAcarreo(r) {
  const c=subtotalCentimos(r);return c===null?null:Number(c)/100;
}
export function capacidadVisible(texto) {
  if(numero(texto)===null)return '';
  const [entero,fraccion='']=texto.trim().replace(',','.').split('.');
  return entero.replace(/^0+(?=\d)/,'')+','+fraccion.replace(/0+$/,'').padEnd(2,'0');
}
export function filasAcarreos(b) {
  if(!esAcarreo(b))return [];
  const posiciones={mopt:0,alquilado:0,otros:0};
  return b.equipos.filter(f=>b.acarreos?.[f.id]).map(f=>{
    const r=acarreoDe(b,f.id),grupo=grupoAcarreo(r),i=posiciones[grupo]++;
    return {id:f.id,registro:r,grupo,fila:FILAS_ACARREOS[grupo][i]};
  });
}
export function totalAcarreos(b) {
  const filas=filasAcarreos(b);
  if(!filas.length)return null;
  let suma=0n;
  for(const {registro} of filas){const n=subtotalCentimos(registro);if(n===null)return null;suma+=n;}
  return suma<=BigInt(Number.MAX_SAFE_INTEGER)?Number(suma)/100:null;
}
// Se ajustan las palabras al espacio de tres líneas de cada celda original.
export function lineasAcarreo(texto,ancho) {
  const lineas=[];
  for(const parrafo of texto.replace(/\r\n?/g,'\n').trim().split('\n')) {
    let caracteres=Array.from(parrafo.trim().replace(/\s+/g,' '));
    while(caracteres.length>ancho) {
      const espacio=caracteres.lastIndexOf(' ',ancho),corte=espacio>0?espacio:ancho;
      lineas.push(caracteres.slice(0,corte).join(''));caracteres=caracteres.slice(corte+(espacio>0?1:0));
    }
    lineas.push(caracteres.join(''));
  }
  return lineas;
}
export function erroresAcarreo(r) {
  const e={};
  if(!codigoParticipante(r))e.participante='Completa el participante: MOPT 000, provincia y cantón, o código del rango elegido.';
  if(numero(r.capacidadTexto)===null)e.capacidadTexto='Escribe la capacidad, con coma o punto decimal, igual o mayor que cero.';
  if(enteroAcarreo(r.longitudTexto)===null)e.longitudTexto='Escribe una longitud de acarreo entera, igual o mayor que cero.';
  for(const [campo,ancho] of [['fuente',21],['material',16]]) {
    if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(r[campo]))e[campo]='El texto contiene un carácter que Excel no puede mostrar.';
    else if(lineasAcarreo(r[campo],ancho).length>3)e[campo]='Reduce el texto: esta casilla del reverso tiene espacio para tres líneas.';
  }
  if(!e.capacidadTexto&&!e.longitudTexto&&subtotalCentimos(r)===null)e.total='El subtotal es demasiado grande para el reporte.';
  return e;
}
export function erroresAcarreos(b) {
  if(!esAcarreo(b))return {};
  const e={};
  for(const {id,registro,fila} of filasAcarreos(b)) {
    const error=erroresAcarreo(registro);
    if(fila===undefined)error.grupo='Cada bloque del reverso admite nueve equipos. Divide el acarreo en otro reporte.';
    if(Object.keys(error).length)e[id]=error;
  }
  if(!Object.keys(e).length&&filasAcarreos(b).length&&totalAcarreos(b)===null)e.total={total:'El total es demasiado grande para el reporte.'};
  return e;
}
