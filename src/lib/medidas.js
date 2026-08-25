/**
 * Medidas caseiras. A TACO nao traz porcoes, so valores por 100 g - entao
 * aqui ficam as equivalencias mais comuns, para nao ter que pesar tudo.
 *
 * Sao valores de referencia (porcao media). Pesar na balanca continua sendo
 * mais preciso; isso e para o dia a dia.
 */

export const MEDIDAS_POR_ID = {
  // cereais
  'taco-3': [
    { label: '1 colher de sopa', g: 25 },
    { label: '1 escumadeira', g: 90 },
  ],
  'taco-1': [
    { label: '1 colher de sopa', g: 25 },
    { label: '1 escumadeira', g: 90 },
  ],
  'taco-7': [{ label: '1 colher de sopa', g: 15 }],
  'taco-53': [{ label: '1 pão francês', g: 50 }],
  'taco-52': [{ label: '1 fatia', g: 25 }],
  // leguminosas
  'taco-561': [
    { label: '1 concha (só o grão)', g: 80 },
    { label: '1 colher de sopa', g: 30 },
  ],
  'taco-567': [
    { label: '1 concha (só o grão)', g: 80 },
    { label: '1 colher de sopa', g: 30 },
  ],
  // ovos
  'taco-488': [
    { label: '1 ovo', g: 50 },
    { label: '2 ovos', g: 100 },
    { label: '3 ovos', g: 150 },
  ],
  'taco-489': [{ label: '1 ovo', g: 50 }],
  'taco-490': [
    { label: '1 ovo', g: 50 },
    { label: '2 ovos', g: 100 },
  ],
  'taco-486': [{ label: '1 clara', g: 33 }],
  'taco-487': [{ label: '1 gema', g: 17 }],
  // frutas
  'taco-182': [{ label: '1 banana prata', g: 70 }],
  'taco-179': [{ label: '1 banana nanica', g: 85 }],
  'taco-222': [{ label: '1 maçã média', g: 130 }],
  'taco-214': [{ label: '1 laranja média', g: 130 }],
  'taco-225': [{ label: '1 fatia', g: 170 }],
  // carnes
  'taco-410': [
    { label: '1 filé médio', g: 100 },
    { label: '1 filé grande', g: 150 },
  ],
  'taco-408': [{ label: '1 filé médio', g: 100 }],
  'taco-377': [{ label: '1 bife médio', g: 100 }],
  // laticinios
  'taco-458': [
    { label: '1 copo (200 ml)', g: 200 },
    { label: '1 xícara (240 ml)', g: 240 },
  ],
  'taco-457': [{ label: '1 copo (200 ml)', g: 200 }],
  'taco-448': [{ label: '1 pote', g: 170 }],
  'taco-449': [{ label: '1 pote', g: 170 }],
  'taco-461': [{ label: '1 fatia', g: 30 }],
  // gorduras e acucar
  'taco-260': [
    { label: '1 colher de chá', g: 4 },
    { label: '1 colher de sopa', g: 13 },
  ],
  'taco-261': [
    { label: '1 ponta de faca', g: 5 },
    { label: '1 colher de sopa', g: 14 },
  ],
  'taco-494': [
    { label: '1 colher de chá', g: 5 },
    { label: '1 colher de sopa', g: 12 },
  ],
  // outros
  'taco-91': [{ label: '1 batata média', g: 100 }],
  'taco-471': [{ label: '1 xícara', g: 200 }],
};

const ATALHOS_GRAMAS = [
  { label: '30 g', g: 30 },
  { label: '50 g', g: 50 },
  { label: '100 g', g: 100 },
  { label: '150 g', g: 150 },
  { label: '200 g', g: 200 },
];

/**
 * Junta, sem repetir: medidas do proprio alimento (produtos do Open Food Facts
 * trazem a porcao do rotulo), medidas curadas, medidas salvas pelo usuario e
 * atalhos genericos em gramas.
 */
export function medidasDe(alimento, medidasUsuario = {}) {
  if (!alimento) return ATALHOS_GRAMAS;
  const lista = [
    ...(alimento.medidas ?? []),
    ...(MEDIDAS_POR_ID[alimento.id] ?? []),
    ...(medidasUsuario[alimento.id] ?? []),
  ];
  const faltando = ATALHOS_GRAMAS.filter((a) => !lista.some((m) => m.g === a.g));
  return [...lista, ...faltando.slice(0, lista.length ? 2 : 5)];
}
