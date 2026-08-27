/**
 * A TACO grafa os nomes como em 2011 e o usuario digita como fala. Sem isso,
 * "mussarela" devolvia zero resultado - a base escreve "Queijo, mozarela".
 *
 * Cada grupo junta grafias que valem uma pela outra na hora de casar o termo.
 * So entra aqui o que foi conferido contra `src/data/alimentos.json`: se a
 * palavra da direita nao existe na base, o grupo nao serve para nada.
 */
const GRUPOS = [
  // grafia da TACO       // como as pessoas escrevem
  ['mozarela', 'mussarela', 'muzarela', 'mucarela'],
  ['tangerina', 'mexerica', 'poncan', 'bergamota'],
  ['mandioca', 'aipim', 'macaxeira'],
  ['abobora', 'jerimum'],
  ['refrigerante', 'refri'],
  ['iogurte', 'yogurte', 'yogurt'],

  // Metade do pais fala bolacha, a outra metade biscoito, e a base so tem
  // "Biscoito". Sozinha, "bolacha" ate achava coisa; o problema aparecia ao
  // juntar com o produto: "bolacha oreo" dava ZERO, porque os Oreo estao
  // cadastrados como "Biscoito ... Oreo".
  ['biscoito', 'bolacha'],
  ['sanduiche', 'sanduba', 'sanduba', 'lanche'],
  ['frances', 'cacetinho', 'sal'],
  ['inhame', 'cara'],

  // Nao e grafia, e o que a palavra quer dizer na pratica: quem procura
  // "file de frango" quer o peito. Os files de peixe continuam achando pelo
  // proprio nome ("file de merluza" ainda exige "merluza").
  ['file', 'peito'],
];

/** palavra -> todas as equivalentes, ela inclusa */
const MAPA = new Map();
for (const grupo of GRUPOS) {
  for (const palavra of grupo) {
    MAPA.set(palavra, [...new Set([...(MAPA.get(palavra) ?? []), ...grupo])]);
  }
}

export function alternativas(termo) {
  return MAPA.get(termo) ?? [termo];
}
