/**
 * Cura a colheita da Open Food Facts e grava scripts/off-selecao.json.
 *
 * Roda com:  node scripts/build-off.mjs <off-brasil.json> [quantos]
 *
 * A entrada e o que sai do filtro em fluxo do dump completo (9 GB
 * descomprimido): todos os produtos vendidos no Brasil que tem tabela
 * nutricional completa, ordenados por numero de escaneamentos.
 *
 * LICENCA: a base da Open Food Facts e ODbL. Embutir uma selecao dela no app
 * e distribuir base derivada, entao o app credita a fonte e declara a
 * licenca em Ajustes e no LEIA-ME. Ver https://world.openfoodfacts.org/data
 *
 * A OFF e colaborativa e tem bastante registro torto. O filtro do fluxo ja
 * derrubou energia impossivel e macro que nao fecha em 100 g; aqui a faxina
 * e de NOME, que e o que o usuario ve: MAIUSCULA gritada, marca repetida
 * dentro do nome, sobra de pontuacao, duplicata do mesmo produto.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const entrada = process.argv[2];
const QUANTOS = Number(process.argv[3] ?? 1800);

if (!entrada) {
  console.error('uso: node scripts/build-off.mjs <off-brasil.json> [quantos]');
  process.exit(1);
}

const semAcento = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * "NESCAU 2.0 ACHOCOLATADO EM PO NESTLE" -> "Nescau 2.0 achocolatado em pó"
 *
 * Nome em caixa alta e o padrao na OFF e fica agressivo na lista. E a marca
 * repetida dentro do nome so ocupa espaco, porque ela ja aparece ao lado.
 */
function limparNome(nome, marca) {
  let n = nome.replace(/\s+/g, ' ').trim();

  // so mexe em quem esta gritando: 4+ letras e nenhuma minuscula
  const letras = n.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letras.length >= 4 && letras === letras.toUpperCase()) {
    n = n.toLowerCase().replace(/(^|[.!?]\s+)([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
  }

  if (marca) {
    const m = semAcento(marca);
    // tira a marca das pontas, nao do meio: no meio costuma fazer parte do nome
    const partes = n.split(' ');
    while (partes.length > 1 && semAcento(partes[0]) === m) partes.shift();
    while (partes.length > 1 && semAcento(partes.at(-1)) === m) partes.pop();
    n = partes.join(' ');
  }

  return n.replace(/^[\s\-–,.]+|[\s\-–,.]+$/g, '').trim();
}

/* ------------------------------------------------------------------ cura */

const bruto = JSON.parse(readFileSync(entrada, 'utf-8'));
console.log(`entrada: ${bruto.length} produtos do Brasil com tabela completa`);

const vistos = new Set();
const selecao = [];

for (const p of bruto) {
  if (selecao.length >= QUANTOS) break;

  const nome = limparNome(p.nome, p.marca);
  if (nome.length < 3) continue;

  // o mesmo produto aparece varias vezes, com codigos diferentes
  const impressao = semAcento(nome).replace(/[^a-z0-9]/g, '') + '|' + semAcento(p.marca ?? '');
  if (vistos.has(impressao)) continue;
  vistos.add(impressao);

  const medidas = [];
  if (p.porcaoQtd > 0 && p.porcaoQtd < 2000) {
    medidas.push({ label: `1 porção (${p.porcao || `${p.porcaoQtd} g`})`, g: p.porcaoQtd });
  }

  selecao.push({
    id: `off-${p.code}`,
    codigo: p.code, // e o que deixa o leitor achar o produto sem internet
    nome,
    marca: p.marca || null,
    categoria: 'Código de barras',
    kcal: p.kcal,
    prot: p.prot,
    carb: p.carb,
    gord: p.gord,
    fibra: p.fibra,
    sodio: p.sodio,
    ...(medidas.length ? { medidas } : {}),
    fonte: 'off',
    completo: true,
  });
}

writeFileSync(join(aqui, 'off-selecao.json'), JSON.stringify(selecao), 'utf-8');

const kb = (JSON.stringify(selecao).length / 1024).toFixed(0);
console.log(`OK: ${selecao.length} produtos gravados em scripts/off-selecao.json (${kb} KB)`);
console.log(`descartados por duplicata ou nome ruim: ${bruto.length - selecao.length > 0 ? 'ver corte' : 0}`);
console.log('\nos 12 mais escaneados que entraram:');
for (const p of selecao.slice(0, 12)) {
  console.log(`  ${String(p.kcal).padStart(4)} kcal  ${p.nome.slice(0, 44).padEnd(46)}${p.marca ?? ''}`);
}
