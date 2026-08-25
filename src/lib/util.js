/** minusculo, sem acento, sem pontuacao */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 'YYYY-MM-DD' no fuso local (nao usar toISOString, que converte pra UTC) */
export function chaveData(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function dataDeChave(chave) {
  const [a, m, d] = chave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function somarDias(chave, dias) {
  const d = dataDeChave(chave);
  d.setDate(d.getDate() + dias);
  return chaveData(d);
}

/**
 * Dias inteiros entre duas chaves 'YYYY-MM-DD'. Arredonda porque um dia de
 * calendario pode ter 23 ou 25 horas em fuso com horario de verao.
 */
export function diasEntre(de, ate) {
  return Math.round((dataDeChave(ate) - dataDeChave(de)) / 86400000);
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rotuloData(chave) {
  const hoje = chaveData();
  if (chave === hoje) return 'Hoje';
  if (chave === somarDias(hoje, -1)) return 'Ontem';
  if (chave === somarDias(hoje, 1)) return 'Amanhã';
  const d = dataDeChave(chave);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function dataCurta(chave) {
  const d = dataDeChave(chave);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** arredonda pra inteiro, escondendo o -0 */
export function inteiro(n) {
  const v = Math.round(Number(n) || 0);
  return v === 0 ? 0 : v;
}

/** numero com 1 casa, virgula decimal */
export function decimal(n, casas = 1) {
  return (Number(n) || 0).toFixed(casas).replace('.', ',');
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
