import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument,PDFArray} from '../vendor/pdf-lib.min.mjs';
import {generarPdfConPlantilla} from '../pdf.mjs';

const original=await readFile(new URL('../assets/reverso-original.pdf',import.meta.url));
const imagen=await readFile(new URL('../icons/icono-192.png',import.meta.url));

// Se comprueban los contenidos originales del PDF, no una réplica del título.
function contenidos(pagina) {
  const contenido=pagina.node.Contents();
  const partes=contenido instanceof PDFArray?contenido.asArray():[contenido];
  return partes.map(p=>Buffer.from(pagina.doc.context.lookup(p).getContents()).toString('base64'));
}

test('El PDF conserva el reverso original y dos caras de tamaño carta',async()=>{
  const antes=Buffer.from(original),fuente=await PDFDocument.load(original);
  const resultado=await PDFDocument.load(await generarPdfConPlantilla(imagen,original));
  assert.equal(resultado.getPageCount(),2);
  for(const pagina of resultado.getPages())assert.deepEqual(pagina.getSize(),{width:612,height:792});
  assert.deepEqual(contenidos(resultado.getPage(1)),contenidos(fuente.getPage(0)));
  assert.deepEqual(original,antes);
});

test('Añadir datos superpone una capa y conserva los contenidos del reverso',async()=>{
  const fuente=await PDFDocument.load(original);
  const resultado=await PDFDocument.load(await generarPdfConPlantilla(imagen,original,imagen));
  const originales=contenidos(fuente.getPage(0)),superpuestos=contenidos(resultado.getPage(1));
  for(const contenido of originales)assert.ok(superpuestos.includes(contenido));
  assert.ok(superpuestos.length>originales.length);
});

test('Una plantilla de dos páginas se rechaza para evitar un reverso equivocado',async()=>{
  const equivocada=await PDFDocument.create();equivocada.addPage([612,792]);equivocada.addPage([612,792]);
  await assert.rejects(generarPdfConPlantilla(imagen,await equivocada.save()),/una página/);
});
