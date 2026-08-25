/**
 * Open Food Facts: base aberta e colaborativa de produtos industrializados,
 * com codigo de barras. Gratuita, sem chave de API.
 *
 * Como e colaborativa, a qualidade varia: alguns produtos vem sem tabela
 * nutricional. Por isso todo retorno vem marcado com `completo`.
 */

const BASE = 'https://world.openfoodfacts.org';
const CAMPOS = [
  'code',
  'product_name',
  'product_name_pt',
  'generic_name_pt',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'image_front_small_url',
].join(',');

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : null;
}

function converter(p) {
  const nut = p.nutriments ?? {};
  const nome =
    p.product_name_pt || p.product_name || p.generic_name_pt || 'Produto sem nome';

  // A OFF guarda energia em kcal quando disponivel; senao, converte de kJ.
  let kcal = n(nut['energy-kcal_100g']);
  if (kcal === null && nut['energy_100g'] != null) kcal = n(nut['energy_100g'] / 4.184);

  const prot = n(nut['proteins_100g']);
  const carb = n(nut['carbohydrates_100g']);
  const gord = n(nut['fat_100g']);

  // sodio na OFF vem em GRAMAS por 100 g -> converter para mg
  let sodio = nut['sodium_100g'] != null ? n(nut['sodium_100g'] * 1000) : null;
  if (sodio === null && nut['salt_100g'] != null) sodio = n((nut['salt_100g'] / 2.5) * 1000);

  const medidas = [];
  const porcao = Number(p.serving_quantity);
  if (Number.isFinite(porcao) && porcao > 0 && porcao < 2000) {
    medidas.push({ label: `1 porção (${p.serving_size || `${porcao} g`})`, g: porcao });
  }

  return {
    id: `off-${p.code}`,
    codigo: p.code,
    nome,
    marca: p.brands ? p.brands.split(',')[0].trim() : null,
    categoria: 'Código de barras',
    imagem: p.image_front_small_url ?? null,
    kcal: kcal ?? 0,
    prot: prot ?? 0,
    carb: carb ?? 0,
    gord: gord ?? 0,
    fibra: n(nut['fiber_100g']),
    sodio,
    medidas,
    fonte: 'off',
    completo: kcal !== null && prot !== null && carb !== null && gord !== null,
  };
}

export async function buscarPorCodigo(codigo, sinal) {
  const url = `${BASE}/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${CAMPOS}`;
  const r = await fetch(url, { signal: sinal });

  // 404 aqui quer dizer "esse codigo nao esta cadastrado", que e uma resposta
  // legitima e comum - a base e colaborativa e nao tem tudo. Tratar como erro
  // fazia o app dizer "falha ao consultar, confira a internet" para quem
  // estava com a internet perfeita.
  if (r.status === 404) return null;

  if (r.status >= 500) {
    throw new Error('O Open Food Facts está fora do ar no momento');
  }
  if (!r.ok) throw new Error(`Open Food Facts respondeu ${r.status}`);

  const dados = await r.json();
  if (dados.status !== 1 || !dados.product) return null;
  return converter(dados.product);
}

export async function buscarPorTexto(termo, sinal, limite = 20) {
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(termo)}` +
    `&search_simple=1&action=process&json=1&page_size=${limite}` +
    `&fields=${CAMPOS}&countries_tags_pt=brasil`;
  const r = await fetch(url, { signal: sinal });
  if (!r.ok) throw new Error(`Open Food Facts respondeu ${r.status}`);
  const dados = await r.json();
  return (dados.products ?? []).map(converter).filter((p) => p.completo && p.kcal > 0);
}
