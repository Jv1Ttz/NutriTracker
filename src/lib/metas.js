import { chaveData, clamp, diasEntre } from './util.js';
import { mediaMovel } from './calculo.js';

/**
 * Calculo de meta calorica e de macros.
 *
 * TMB: equacao de Mifflin-St Jeor (1990) - a mais precisa para populacao geral
 * segundo a revisao da Academy of Nutrition and Dietetics.
 *   homem:  10*peso + 6.25*altura - 5*idade + 5
 *   mulher: 10*peso + 6.25*altura - 5*idade - 161
 *
 * GET (gasto total) = TMB * fator de atividade.
 * Meta = GET + ajuste do objetivo, respeitando um piso de seguranca.
 *
 * Tudo isso e ESTIMATIVA. O numero real se descobre acompanhando o peso
 * por 2-3 semanas e ajustando (ver `sugerirAjuste`).
 */

export const FATORES = {
  sedentario: {
    label: 'Sedentário',
    desc: 'Trabalho sentado, pouco ou nenhum exercício',
    valor: 1.2,
  },
  leve: {
    label: 'Levemente ativo',
    desc: 'Exercício leve 1 a 3x por semana',
    valor: 1.375,
  },
  moderado: {
    label: 'Moderadamente ativo',
    desc: 'Exercício moderado 3 a 5x por semana',
    valor: 1.55,
  },
  intenso: {
    label: 'Muito ativo',
    desc: 'Exercício intenso 6 a 7x por semana',
    valor: 1.725,
  },
  atleta: {
    label: 'Extremamente ativo',
    desc: 'Treino pesado 2x ao dia ou trabalho braçal',
    valor: 1.9,
  },
};

export const OBJETIVOS = {
  perder_rapido: { label: 'Perder peso rápido', ajuste: -0.2, ritmo: 'cerca de 0,7 kg por semana' },
  perder: { label: 'Perder peso', ajuste: -0.15, ritmo: 'cerca de 0,5 kg por semana' },
  perder_leve: { label: 'Perder devagar', ajuste: -0.1, ritmo: 'cerca de 0,3 kg por semana' },
  manter: { label: 'Manter o peso', ajuste: 0, ritmo: 'peso estável' },
  ganhar: { label: 'Ganhar massa', ajuste: 0.1, ritmo: 'cerca de 0,25 kg por semana' },
};

/** Piso de seguranca amplamente usado para dietas sem acompanhamento clinico. */
const PISO_KCAL = { masculino: 1500, feminino: 1200 };

export function calcularTMB({ sexo, peso, altura, idade }) {
  const base = 10 * peso + 6.25 * altura - 5 * idade;
  return sexo === 'feminino' ? base - 161 : base + 5;
}

export function calcularMetas(perfil) {
  const { sexo, peso, altura, idade, atividade, objetivo } = perfil;
  const tmb = calcularTMB({ sexo, peso, altura, idade });
  const fator = FATORES[atividade]?.valor ?? 1.375;
  const get = tmb * fator;
  const ajuste = OBJETIVOS[objetivo]?.ajuste ?? 0;

  const bruta = get * (1 + ajuste);
  const piso = PISO_KCAL[sexo] ?? 1200;
  const kcal = Math.round(Math.max(bruta, piso) / 10) * 10;
  const limitadaPeloPiso = bruta < piso - 5;

  const emDeficit = ajuste < 0;
  // Proteina mais alta em deficit: preserva massa magra e segura a fome.
  const protPorKg = emDeficit ? 2.0 : 1.6;
  const prot = Math.round(clamp(peso * protPorKg, 40, 250));

  // Gordura: minimo fisiologico ~0,8 g/kg, ou 25% das calorias - o que for maior.
  const gord = Math.round(Math.max(peso * 0.8, (kcal * 0.25) / 9));

  // O resto vai para carboidrato.
  const restoKcal = kcal - prot * 4 - gord * 9;
  const carb = Math.max(30, Math.round(restoKcal / 4));

  return {
    tmb: Math.round(tmb),
    get: Math.round(get),
    kcal,
    prot,
    carb,
    gord,
    fibra: Math.round((kcal / 1000) * 14), // recomendacao: 14 g por 1000 kcal
    limitadaPeloPiso,
    piso,
  };
}

/**
 * Compara a variacao de peso observada com a esperada e sugere um ajuste
 * nas calorias. So faz sentido com 14+ dias de registro.
 * 1 kg de gordura ~ 7700 kcal.
 *
 * Duas precaucoes aqui, as duas pelo mesmo motivo - o peso do dia mente:
 *
 * 1. Compara MEDIA MOVEL, nao pesagem crua. Com os valores crus, um unico dia
 *    inchado (sal, intestino, TPM) no extremo da serie virava uma recomendacao
 *    de cortar centenas de kcal em cima de uma dieta que estava no ritmo.
 * 2. Olha so a JANELA recente. Usando a historia inteira, depois de alguns
 *    meses a conta compara o primeiro mes com hoje, e um plato recente some
 *    diluido no progresso antigo.
 */
const JANELA_DIAS = 28;
const MIN_DIAS = 14;
const MIN_PONTOS = 4;

export function sugerirAjuste({ pesos, metaKcal, objetivo }) {
  if (!pesos || pesos.length < MIN_PONTOS) return null;

  const ordenados = [...pesos].sort((a, b) => a.data.localeCompare(b.data));
  // suaviza sobre a serie inteira: assim o comeco da janela ja chega suavizado,
  // aproveitando as pesagens imediatamente anteriores a ela
  const suave = mediaMovel(ordenados, 7);
  // a janela conta a partir de HOJE, nao da ultima pesagem: quem parou de
  // pesar ha meses nao deve receber conselho com base em dado velho
  const recentes = suave.filter((p) => diasEntre(p.data, chaveData()) <= JANELA_DIAS);
  if (recentes.length < MIN_PONTOS) return null;

  const inicio = recentes[0];
  const fim = recentes[recentes.length - 1];
  const dias = diasEntre(inicio.data, fim.data);
  if (dias < MIN_DIAS) return null;

  const deltaKg = fim.media - inicio.media;
  const kgPorSemana = (deltaKg / dias) * 7;

  const alvoSemana = {
    perder_rapido: -0.7,
    perder: -0.5,
    perder_leve: -0.3,
    manter: 0,
    ganhar: 0.25,
  }[objetivo] ?? 0;

  const diferenca = kgPorSemana - alvoSemana; // positivo = perdendo menos que o alvo
  if (Math.abs(diferenca) < 0.15) {
    return { status: 'ok', kgPorSemana, dias, mensagem: 'Está no ritmo. Não mexa em nada.' };
  }

  const ajusteKcal = Math.round((-diferenca * 7700) / 7 / 10) * 10;
  const nova = Math.max(1200, metaKcal + ajusteKcal);
  return {
    status: diferenca > 0 ? 'lento' : 'rapido',
    kgPorSemana,
    dias,
    ajusteKcal,
    novaMeta: nova,
    mensagem:
      diferenca > 0
        ? `Ritmo abaixo do alvo. Considere baixar para ${nova} kcal por dia.`
        : `Ritmo acima do alvo. Considere subir para ${nova} kcal por dia.`,
  };
}

export function imc(peso, alturaCm) {
  const m = alturaCm / 100;
  return peso / (m * m);
}

export function faixaIMC(valor) {
  if (valor < 18.5) return { label: 'Abaixo do peso', cor: '#5aa9e6' };
  if (valor < 25) return { label: 'Peso normal', cor: '#7bd88f' };
  if (valor < 30) return { label: 'Sobrepeso', cor: '#f2c14e' };
  if (valor < 35) return { label: 'Obesidade grau I', cor: '#f08c4b' };
  if (valor < 40) return { label: 'Obesidade grau II', cor: '#e8624a' };
  return { label: 'Obesidade grau III', cor: '#d94141' };
}
