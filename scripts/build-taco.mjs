/**
 * Converte a TACO bruta (4a edicao, UNICAMP - 597 alimentos) para o formato
 * enxuto que o app consome. Roda com: npm run build:taco
 *
 * Na TACO os valores sao SEMPRE por 100 g de parte comestivel.
 * Marcadores especiais da tabela:
 *   "Tr" = traco (quantidade insignificante) -> 0
 *   "NA" = nao analisado                     -> null (desconhecido)
 *   "*"  = valor nao disponivel              -> null (ver correcoes.json)
 *   ""   = nao consta                        -> null
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));

function num(v) {
  if (v === 'Tr') return 0;
  if (v === 'NA' || v === '*' || v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** minusculo, sem acento, sem pontuacao - usado pela busca */
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const bruto = JSON.parse(readFileSync(join(aqui, 'TACO-bruto.json'), 'utf-8'));
const correcoes = JSON.parse(readFileSync(join(aqui, 'correcoes.json'), 'utf-8'));

let alimentos = bruto.map((a) => {
  const id = `taco-${a.id}`;
  const base = {
    id,
    nome: a.description,
    categoria: a.category,
    busca: normalizar(a.description),
    // tudo por 100 g
    kcal: num(a.energy_kcal),
    prot: num(a.protein_g),
    carb: num(a.carbohydrate_g),
    gord: num(a.lipid_g),
    fibra: num(a.fiber_g),
    sodio: num(a.sodium_mg),
    calcio: num(a.calcium_mg),
    ferro: num(a.iron_mg),
    colesterol: num(a.cholesterol_mg),
    fonte: 'taco',
  };
  const fix = correcoes[id];
  if (fix) {
    const { origem, ...valores } = fix;
    return { ...base, ...valores, fonte: 'taco+', origem };
  }
  return base;
});

// Quem ficou sem energia E sem macros nao tem como ser contabilizado: sai da base.
const removidos = alimentos.filter((a) => a.kcal === null);
alimentos = alimentos.filter((a) => a.kcal !== null);

// Macros faltando individualmente viram 0 (nao ha valor melhor a assumir)
for (const a of alimentos) {
  a.prot ??= 0;
  a.carb ??= 0;
  a.gord ??= 0;
}

const categorias = [...new Set(alimentos.map((a) => a.categoria))].sort();

writeFileSync(
  join(aqui, '..', 'src', 'data', 'alimentos.json'),
  JSON.stringify(alimentos),
  'utf-8'
);

console.log(`OK: ${alimentos.length} alimentos em ${categorias.length} categorias`);
if (removidos.length) {
  console.log(`\nRemovidos por falta de dados na TACO (${removidos.length}):`);
  for (const r of removidos) console.log(`  - ${r.id} ${r.nome}`);
}
const corrigidos = alimentos.filter((a) => a.fonte === 'taco+');
if (corrigidos.length) {
  console.log(`\nCompletados via correcoes.json (${corrigidos.length}):`);
  for (const c of corrigidos) console.log(`  - ${c.id} ${c.nome} -> ${c.origem}`);
}
