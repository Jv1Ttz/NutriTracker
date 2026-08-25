import ALIMENTOS from '../data/alimentos.json';
import { normalizar } from './util.js';
import { alternativas } from './sinonimos.js';

export { ALIMENTOS };

/**
 * Palavras de ligacao, descartadas dos termos obrigatorios.
 *
 * A TACO inverte o nome por virgula ("Frango, peito, sem pele, grelhado"),
 * entao exigir "de" fazia "peito de frango" devolver zero mesmo com 5 itens
 * na base. Note que "com", "sem" e "tipo" NAO entram aqui: na TACO eles
 * separam alimentos de verdade (com pele x sem pele).
 */
const LIGACAO = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'ao', 'aos',
  'na', 'no', 'nas', 'nos', 'um', 'uma',
]);

/**
 * Variacoes de plural e genero. A base escreve "acem, moido" e a pessoa
 * digita "carne moida"; "ovos" precisa achar "Ovo, de galinha".
 * Corta so um caractere, e o 's' com limite menor que a vogal para nao
 * transformar "coxa" em "cox" (que casaria com "coxao").
 */
function raizes(termo) {
  const r = [termo];
  if (termo.length >= 4 && termo.endsWith('s')) r.push(termo.slice(0, -1));
  if (termo.length >= 5 && 'aeo'.includes(termo.at(-1))) r.push(termo.slice(0, -1));
  return r;
}

function casa(alvo, termo) {
  return alternativas(termo).some((alt) => raizes(alt).some((r) => alvo.includes(r)));
}

const POR_ID = new Map(ALIMENTOS.map((a) => [a.id, a]));

export function porId(id, customs = []) {
  return POR_ID.get(id) ?? customs.find((c) => c.id === id) ?? null;
}

/**
 * Busca por termos: todos precisam aparecer no nome, menos as palavras de
 * ligacao. Um termo casa pela grafia, por um sinonimo ou pela raiz (plural
 * e genero).
 *
 * Ordena por relevancia - quem casa no comeco do nome sobe, e quem casa com
 * a palavra exatamente como foi escrita passa na frente de quem so casou por
 * sinonimo ou raiz.
 */
export function buscar(consulta, customs = [], limite = 60) {
  const q = normalizar(consulta);
  if (!q) return [];
  const todos = q.split(' ').filter(Boolean);
  // se a pessoa digitou so ligacao ("de"), volta a exigir o que ela escreveu
  const semLigacao = todos.filter((t) => !LIGACAO.has(t));
  const termos = semLigacao.length ? semLigacao : todos;
  const raizesQ = raizes(q);

  const universo = [
    ...customs.map((c) => ({ ...c, busca: c.busca ?? normalizar(`${c.nome} ${c.marca ?? ''}`) })),
    ...ALIMENTOS,
  ];

  const achados = [];
  for (const a of universo) {
    const alvo = a.busca;
    if (!termos.every((t) => casa(alvo, t))) continue;

    let pontos = 0;
    // tambem pela raiz, senao "ovos" premiava "Macarrao, com ovos" (casamento
    // no meio do nome) em vez de "Ovo, de galinha" (casamento no comeco)
    if (raizesQ.some((r) => alvo.startsWith(r))) pontos += 100;
    else if (raizesQ.some((r) => alvo.includes(` ${r}`))) pontos += 50;
    if (raizes(termos[0]).some((r) => alvo.startsWith(r))) pontos += 25;
    // casar com a palavra escrita vale mais que casar por sinonimo ou raiz:
    // "peito de frango" tem que trazer o peito antes do file a milanesa,
    // e "ovos" tem que trazer o ovo antes do macarrao com ovos
    for (const t of termos) if (alvo.includes(t)) pontos += 6;
    // so o que E do usuario sobe: alimento cadastrado por ele ou produto que
    // ele escaneou. A USDA e base embutida como a TACO, e concorre de igual
    // para igual - senao quinoa apareceria na frente de arroz
    if (a.fonte === 'custom' || a.fonte === 'off') pontos += 15;
    pontos -= alvo.length * 0.15; // nomes curtos e mais especificos primeiro

    achados.push({ alimento: a, pontos });
  }

  achados.sort((x, y) => y.pontos - x.pontos);
  return achados.slice(0, limite).map((r) => r.alimento);
}

/** Alimentos mais registrados no diario, do mais usado para o menos. */
export function frequentes(diario, customs = [], limite = 30) {
  const contagem = new Map();
  for (const itens of Object.values(diario)) {
    for (const i of itens) {
      const atual = contagem.get(i.alimentoId) ?? { n: 0, ultimo: '' };
      contagem.set(i.alimentoId, { n: atual.n + 1, ultimo: i.nome });
    }
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, limite)
    .map(([id, info]) => porId(id, customs) ?? { id, nome: info.ultimo, indisponivel: true })
    .filter((a) => !a.indisponivel);
}

export const CATEGORIAS = [...new Set(ALIMENTOS.map((a) => a.categoria))].sort();

export function porCategoria(categoria) {
  return ALIMENTOS.filter((a) => a.categoria === categoria);
}
