import { diasEntre } from './util.js';

/** Valores de um item do diario, ja escalados pela quantidade registrada. */
export function valoresItem(item) {
  const f = (item.qtd ?? 0) / 100;
  const p = item.por100 ?? {};
  return {
    kcal: (p.kcal ?? 0) * f,
    prot: (p.prot ?? 0) * f,
    carb: (p.carb ?? 0) * f,
    gord: (p.gord ?? 0) * f,
    fibra: (p.fibra ?? 0) * f,
    sodio: (p.sodio ?? 0) * f,
  };
}

/** Valores de um alimento da base para uma quantidade em gramas. */
export function valoresPara(alimento, qtd) {
  const f = (qtd ?? 0) / 100;
  return {
    kcal: (alimento.kcal ?? 0) * f,
    prot: (alimento.prot ?? 0) * f,
    carb: (alimento.carb ?? 0) * f,
    gord: (alimento.gord ?? 0) * f,
    fibra: (alimento.fibra ?? 0) * f,
    sodio: (alimento.sodio ?? 0) * f,
  };
}

const ZERO = { kcal: 0, prot: 0, carb: 0, gord: 0, fibra: 0, sodio: 0 };

export function somar(itens) {
  return (itens ?? []).reduce((acc, item) => {
    const v = valoresItem(item);
    return {
      kcal: acc.kcal + v.kcal,
      prot: acc.prot + v.prot,
      carb: acc.carb + v.carb,
      gord: acc.gord + v.gord,
      fibra: acc.fibra + v.fibra,
      sodio: acc.sodio + v.sodio,
    };
  }, ZERO);
}

/**
 * As refeicoes nao carregam mais emoji.
 *
 * Emoji e desenhado pelo SISTEMA: o mesmo ☕ vira uma coisa no Android, outra
 * no iPhone e outra no Windows, sempre colorido e sempre destoando de um
 * conjunto de traco fino. O icone virou responsabilidade da interface, em
 * ICONE_REFEICAO no Icones.jsx.
 */
export const REFEICOES = [
  { id: 'cafe', nome: 'Café da manhã' },
  { id: 'almoco', nome: 'Almoço' },
  { id: 'janta', nome: 'Jantar' },
  { id: 'lanches', nome: 'Lanches' },
];

/**
 * Média móvel de N dias sobre uma série [{data, peso}] já ordenada.
 *
 * A janela é de DIAS de calendário, não de registros: quem pesa uma vez por
 * semana receberia, contando por índice, uma "média de 7 dias" que na prática
 * cobre sete semanas e fica mais de um quilo atrás do peso real.
 */
export function mediaMovel(serie, janela = 7) {
  return serie.map((ponto, i) => {
    let ini = i;
    while (ini > 0 && diasEntre(serie[ini - 1].data, ponto.data) <= janela - 1) ini -= 1;
    const fatia = serie.slice(ini, i + 1);
    const soma = fatia.reduce((s, p) => s + p.peso, 0);
    return { ...ponto, media: soma / fatia.length };
  });
}
