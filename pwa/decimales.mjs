// Las medidas se conservan como texto decimal. BigInt sólo se usa durante
// el cálculo, nunca dentro de los borradores o respaldos JSON.
export function decimalLiteral(texto) {
  const t=String(texto??'').trim().replace(',','.');
  return /^\d+(\.\d+)?$/.test(t)?t.replace(/^0+(?=\d)/,''):null;
}
export function decimalSinCeros(texto) {
  const t=decimalLiteral(texto);
  return t===null?null:t.includes('.')?t.replace(/0+$/,'').replace(/\.$/,''):t;
}
export const decimalVisible=texto=>decimalLiteral(texto)?.replace('.',',')??'';
export const escalaDecimal=texto=>(decimalLiteral(texto)?.split('.')[1]??'').length;
export function multiplicarDecimal(texto,...enteros) {
  const t=decimalLiteral(texto);
  if(t===null||enteros.some(n=>!Number.isSafeInteger(n)||n<0))return null;
  const escala=escalaDecimal(t);
  const n=enteros.reduce((p,n)=>p*BigInt(n),BigInt(t.replace('.','')));
  const s=n.toString().padStart(escala+1,'0');
  return escala?s.slice(0,-escala)+'.'+s.slice(-escala):s;
}
export function sumarDecimales(textos) {
  if(!textos.length||textos.some(t=>decimalLiteral(t)===null))return null;
  const escala=Math.max(...textos.map(escalaDecimal));
  const suma=textos.reduce((n,t)=>{const [e,f='']=decimalLiteral(t).split('.');return n+BigInt(e+f.padEnd(escala,'0'));},0n);
  const s=suma.toString().padStart(escala+1,'0');
  return escala?s.slice(0,-escala)+'.'+s.slice(-escala):s;
}
// Excel admite 15 cifras significativas. Los valores que exceden ese límite
// se guardan como texto literal para que Excel no descarte ninguna cifra.
export function admiteNumeroExcel(texto) {
  const t=decimalSinCeros(texto);
  return t!==null&&t.replace('.','').replace(/^0+/,'').length<=15&&escalaDecimal(texto)<=30&&Number.isFinite(Number(t));
}
export function decimalParaExcel(texto,formula=null) {
  const t=decimalLiteral(texto);
  if(t===null)return formula?{formula,valor:null}:null;
  if(!admiteNumeroExcel(t))return decimalVisible(t);
  return {decimalExacto:decimalSinCeros(t),formula,valor:Number(t)};
}
