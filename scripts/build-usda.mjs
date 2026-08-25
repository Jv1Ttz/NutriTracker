/**
 * Extrai da USDA FoodData Central (SR Legacy) uma selecao curada de alimentos
 * que a TACO nao tem, e grava em scripts/usda-selecao.json.
 *
 * Roda com:  node scripts/build-usda.mjs <pasta-do-csv>
 *
 * A pasta e a que sai do zip publicado em
 *   https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
 * Os CSV somam 35 MB e NAO ficam no repositorio - o que fica versionado e o
 * usda-selecao.json, pequeno, do mesmo jeito que a TACO-bruto.json.
 *
 * Por que a USDA: e dominio publico (obra do governo americano), entao pode
 * ser embutida sem atrito de licenca. E o buraco que a TACO deixa e de
 * alimento GENERICO moderno - quinoa, chia, iogurte grego, leite vegetal,
 * whey - onde o valor americano vale igual. Produto de marca brasileira
 * continua vindo do Open Food Facts pelo codigo de barras, em tempo real.
 *
 * Nada aqui e inventado: os numeros saem do CSV como estao. O que e nosso e
 * so o nome em portugues e a categoria, escolhida entre as que a TACO ja usa
 * para as duas bases se misturarem sem costura aparente.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const pasta = process.argv[2];

if (!pasta) {
  console.error('uso: node scripts/build-usda.mjs <pasta-com-os-csv-da-usda>');
  process.exit(1);
}

/* ------------------------------------------------------------------- CSV */

/** parser minimo: lida com campo entre aspas contendo virgula e aspas duplas */
function linhasDe(texto) {
  const linhas = [];
  let campo = '';
  let linha = [];
  let dentro = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentro) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentro = false;
      } else campo += c;
    } else if (c === '"') dentro = true;
    else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

function tabela(arquivo) {
  const l = linhasDe(readFileSync(join(pasta, arquivo), 'utf8'));
  const cab = l[0];
  return l
    .slice(1)
    .filter((r) => r.length === cab.length)
    .map((r) => Object.fromEntries(cab.map((k, i) => [k, r[i]])));
}

/* ------------------------------------------------------------- selecao */

/** ids conferidos um a um contra a descricao original do CSV */
const SELECAO = [
  // --- cereais ---
  [168874, 'Quinoa, crua', 'Cereais e derivados'],
  [168917, 'Quinoa, cozida', 'Cereais e derivados'],
  [170286, 'Trigo sarraceno, cru', 'Cereais e derivados'],
  [169699, 'Cuscuz marroquino, cru', 'Cereais e derivados'],
  [169700, 'Cuscuz marroquino, cozido', 'Cereais e derivados'],

  // --- nozes e sementes ---
  [170554, 'Chia, semente, seca', 'Nozes e sementes'],
  [169415, 'Semente de abóbora, sem casca, torrada', 'Nozes e sementes'],
  [169418, 'Semente de girassol, torrada', 'Nozes e sementes'],
  [172470, 'Pasta de amendoim, integral, sem sal', 'Nozes e sementes'],
  [172458, 'Pasta de amendoim, com menos gordura', 'Nozes e sementes'],
  [168604, 'Tahine, pasta de gergelim', 'Nozes e sementes'],

  // --- leite e derivados ---
  [170894, 'Iogurte grego, natural, desnatado', 'Leite e derivados'],
  [171304, 'Iogurte grego, natural, integral', 'Leite e derivados'],
  [170904, 'Kefir, natural, semidesnatado', 'Leite e derivados'],
  [169081, 'Cream cheese, requeijão cremoso', 'Leite e derivados'],
  [167703, 'Queijo cottage, 1% de gordura', 'Leite e derivados'],

  // --- bebidas vegetais ---
  [174832, 'Leite de amêndoas, bebida vegetal, sem açúcar', 'Bebidas (alcoólicas e não alcoólicas)'],
  [172446, 'Leite de soja, bebida vegetal, sem açúcar', 'Bebidas (alcoólicas e não alcoólicas)'],
  // "bebida de coco" e nao "leite de coco" de proposito: a TACO ja tem o
  // leite de coco de cozinhar, que e outra coisa e tem cinco vezes mais gordura
  [174116, 'Bebida de coco, adoçada', 'Bebidas (alcoólicas e não alcoólicas)'],

  // --- leguminosas ---
  [168410, 'Edamame, congelado, cru', 'Leguminosas e derivados'],
  [168411, 'Edamame, cozido', 'Leguminosas e derivados'],
  [172448, 'Tofu, firme', 'Leguminosas e derivados'],
  [172449, 'Tofu, macio', 'Leguminosas e derivados'],
  [172454, 'Homus, caseiro', 'Leguminosas e derivados'],
  [174289, 'Homus, industrializado', 'Leguminosas e derivados'],
  [173757, 'Grão-de-bico, cozido', 'Leguminosas e derivados'],

  // --- suplementos: categoria que a TACO nao tem ---
  //
  // Nomeados pelo teor de proteina que os numeros mostram, nao pelo rotulo
  // da USDA. Ela chama o 173177 de "isolate", mas ele tem 58 g de proteina e
  // 29 g de carboidrato - isolado de verdade tem ~90 g e quase nenhum carbo.
  // Quem comprou isolado e escolhesse aquele item lancaria 29 g de carbo que
  // nao existem no pote. A descricao original fica no campo `origem`.
  //
  // A porcentagem no nome tambem ajuda a escolher: em suplemento a
  // composicao muda muito de marca para marca, e da para casar com o rotulo.
  [173180, 'Whey protein em pó, 78% proteína', 'Suplementos'],
  [173177, 'Whey protein em pó com carboidrato, 58% proteína', 'Suplementos'],
  [173181, 'Proteína de soja em pó, 56% proteína', 'Suplementos'],

  // --- verduras ---
  [168462, 'Espinafre, cru', 'Verduras, hortaliças e derivados'],
  [168421, 'Kale, couve-crespa, crua', 'Verduras, hortaliças e derivados'],
  [168434, 'Cogumelo paris, cru', 'Verduras, hortaliças e derivados'],
  [168483, 'Batata-doce, assada com casca', 'Verduras, hortaliças e derivados'],

  // --- frutas ---
  [171711, 'Mirtilo, blueberry, cru', 'Frutas e derivados'],

  // --- ovos ---
  [172183, 'Clara de ovo, crua', 'Ovos e derivados'],

  // --- pescados ---
  [175167, 'Salmão atlântico de cativeiro, cru', 'Pescados e frutos do mar'],
  [175168, 'Salmão atlântico de cativeiro, grelhado', 'Pescados e frutos do mar'],
  [171986, 'Atum claro, em conserva na água, sem sal', 'Pescados e frutos do mar'],

  // --- acucares e outros ---
  [169640, 'Mel', 'Produtos açucarados'],
  [169593, 'Cacau em pó, sem açúcar', 'Produtos açucarados'],
  [172241, 'Vinagre balsâmico', 'Miscelâneas'],
];

/** id do nutriente na USDA -> campo do app. Todos ja vem por 100 g. */
const NUTRIENTES = {
  1008: 'kcal',
  1003: 'prot',
  1005: 'carb',
  1004: 'gord',
  1079: 'fibra',
  1093: 'sodio',
  1087: 'calcio',
  1089: 'ferro',
  1253: 'colesterol',
};

/* ---------------------------------------------------------------- extrai */

const querido = new Map(SELECAO.map(([id, nome, categoria]) => [String(id), { nome, categoria }]));

const descricoes = new Map(
  tabela('food.csv')
    .filter((f) => querido.has(f.fdc_id))
    .map((f) => [f.fdc_id, f.description])
);

const valores = new Map([...querido.keys()].map((id) => [id, {}]));
for (const l of tabela('food_nutrient.csv')) {
  if (!querido.has(l.fdc_id)) continue;
  const campo = NUTRIENTES[l.nutrient_id];
  if (!campo) continue;
  const n = Number(l.amount);
  if (Number.isFinite(n)) valores.get(l.fdc_id)[campo] = Math.round(n * 100) / 100;
}

const arredonda = (v) => (v === undefined ? null : v);
const alimentos = [];
const problemas = [];

for (const [id, { nome, categoria }] of querido) {
  const v = valores.get(id);
  const original = descricoes.get(id);
  if (!original) {
    problemas.push(`${id} nao existe no food.csv`);
    continue;
  }
  // sem energia ou sem macros nao da para contabilizar: fica de fora
  if (v.kcal === undefined || v.prot === undefined || v.carb === undefined || v.gord === undefined) {
    problemas.push(`${id} ${nome} - faltam macros`);
    continue;
  }
  alimentos.push({
    id: `usda-${id}`,
    nome,
    categoria,
    kcal: v.kcal,
    prot: v.prot,
    carb: v.carb,
    gord: v.gord,
    fibra: arredonda(v.fibra),
    sodio: arredonda(v.sodio),
    calcio: arredonda(v.calcio),
    ferro: arredonda(v.ferro),
    colesterol: arredonda(v.colesterol),
    fonte: 'usda',
    // guarda a descricao original: e o que permite conferir de onde veio
    origem: `USDA FDC ${id} (${original})`,
  });
}

alimentos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
writeFileSync(join(aqui, 'usda-selecao.json'), JSON.stringify(alimentos, null, 2), 'utf-8');

console.log(`OK: ${alimentos.length} de ${SELECAO.length} alimentos gravados em scripts/usda-selecao.json`);
if (problemas.length) {
  console.log(`\nDeixados de fora (${problemas.length}):`);
  for (const p of problemas) console.log(`  - ${p}`);
}
