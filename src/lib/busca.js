import { normalizar } from './util.js';
import { alternativas } from './sinonimos.js';

/**
 * A base entra por import dinamico, nao estatico.
 *
 * Sao 4 mil alimentos, 1,2 MB de JSON. No import estatico isso ia junto no
 * bundle inicial e era analisado na abertura, mesmo para quem so queria ver
 * o diario do dia - o chunk principal passou de 384 kB para 1,5 MB quando os
 * produtos da Open Food Facts entraram.
 *
 * Quem precisa da base sao a aba Adicionar, a folha de editar item e o
 * leitor de codigo de barras. Nenhuma dessas telas aparece na abertura,
 * entao a base chega junto com elas.
 */
export let ALIMENTOS = [];

let POR_ID = new Map();
let POR_CODIGO = new Map();
let promessa = null;

export function baseCarregada() {
  return ALIMENTOS.length > 0;
}

export function carregarBase() {
  promessa ??= import('../data/alimentos.json').then((m) => {
    // os produtos da Open Food Facts vao sem `fonte` e sem `categoria`: sao
    // a mesma string para 19 mil itens, e devolve-las aqui custa um laco
    // barato contra quase 1 MB a menos para baixar e analisar
    ALIMENTOS = m.default.map((a) =>
      a.fonte ? a : { ...a, fonte: 'off', categoria: 'Código de barras' }
    );
    POR_ID = new Map(ALIMENTOS.map((a) => [a.id, a]));
    POR_CODIGO = new Map(ALIMENTOS.filter((a) => a.codigo).map((a) => [a.codigo, a]));
    return ALIMENTOS;
  });
  return promessa;
}

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

export function porId(id, customs = []) {
  return POR_ID.get(id) ?? customs.find((c) => c.id === id) ?? null;
}

/**
 * Acha um produto pelo codigo de barras SEM internet.
 *
 * E o que faz o leitor funcionar no mercado sem sinal. Olha primeiro o que o
 * usuario ja escaneou antes, depois a base embutida.
 */
export function porCodigo(codigo, customs = []) {
  return customs.find((c) => c.codigo === codigo) ?? POR_CODIGO.get(codigo) ?? null;
}

/**
 * Outros produtos do mesmo fabricante, para quando o codigo lido nao existe.
 *
 * Os primeiros digitos de um EAN identificam a empresa. Um chiclete Mentos
 * que nao esta na base tem varios irmaos que estao - e a embalagem que a
 * pessoa tem na mao costuma ser um deles, em outro sabor ou tamanho.
 *
 * Tenta 8 digitos primeiro, que e mais especifico, e afrouxa para 7 se der
 * pouca coisa: o prefixo da empresa na GS1 nao tem tamanho fixo.
 */
export function porFabricante(codigo, customs = [], limite = 6) {
  if (!codigo || codigo.length < 8) return [];
  const todos = [...customs.filter((c) => c.codigo), ...ALIMENTOS.filter((a) => a.codigo)];
  const comPrefixo = (n) =>
    todos.filter((a) => a.codigo !== codigo && a.codigo.startsWith(codigo.slice(0, n)));

  let achados = comPrefixo(8);
  if (achados.length < 3) achados = comPrefixo(7);

  // Ordena por PROXIMIDADE DE CODIGO, nao por nome.
  //
  // Fabricante numera SKU em sequencia: um chiclete 7895144899930 que nao
  // esta na base tem o vizinho 7895144899947 na prateleira ao lado, quase
  // sempre o mesmo produto em outro sabor. Quanto mais digitos iniciais em
  // comum, maior a chance de ser a embalagem que a pessoa tem na mao.
  const comum = (c) => {
    let i = 0;
    while (i < c.length && i < codigo.length && c[i] === codigo[i]) i++;
    return i;
  };
  return achados
    .sort((a, b) => comum(b.codigo) - comum(a.codigo) || a.nome.length - b.nome.length)
    .slice(0, limite);
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
    ...customs.map((c) => ({
      ...c,
      doUsuario: true,
      busca: c.busca ?? normalizar(`${c.nome} ${c.marca ?? ''}`),
    })),
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
    // Sobe o que E do usuario - cadastrado ou escaneado por ele. Antes o
    // teste era pela fonte, mas com os produtos da OFF embutidos isso passou
    // a promover a base inteira, nao o que a pessoa usou.
    if (a.doUsuario) pontos += 15;
    // e produto de marca desce um pouco: quem busca "arroz" quer o arroz da
    // TACO, nao trinta pacotes de arroz de marca
    // A penalidade cobre o teto do bonus de popularidade logo abaixo, de
    // proposito: produto de marca popular sobe entre OS OUTROS DE MARCA, mas
    // nunca acima da TACO. Sem isso, buscar "leite" passava a trazer "Leite
    // UHT Integral" antes do leite de vaca da tabela.
    else if (a.fonte === 'off') pontos -= 14;
    // Produto que gente de verdade escaneou sobe. Limitado a 12 de proposito:
    // e desempate entre resultados parecidos, nao deve atropelar quem casou
    // melhor com o que foi digitado. Sem isso, procurar "oreo" trazia "Oreo
    // Picole" e "Oreo Selena Gomes" na frente do biscoito - o nome curto que
    // COMECA com o termo ganhava do nome longo que o tem no meio.
    if (a.pop) pontos += Math.min(a.pop, 12);
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

export function categorias() {
  return [...new Set(ALIMENTOS.map((a) => a.categoria))].sort();
}

export function porCategoria(categoria) {
  return ALIMENTOS.filter((a) => a.categoria === categoria);
}
