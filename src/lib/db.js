import { useSyncExternalStore } from 'react';
import { chaveData, uid } from './util.js';

const CHAVE = 'nutritracker.v1';

const VAZIO = {
  versao: 1,
  perfil: null, // { nome, sexo, idade, altura, peso, atividade, objetivo }
  metasManuais: null, // { kcal, prot, carb, gord } quando o usuario sobrescreve
  diario: {}, // { 'YYYY-MM-DD': [item] }
  pesos: [], // [{ data, peso }]
  customs: [], // alimentos criados pelo usuario ou importados do Open Food Facts
  medidasUsuario: {}, // { alimentoId: [{ label, g }] }
  ultimaQtd: {}, // { alimentoId: gramas }
};

function carregar() {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return VAZIO;
    return { ...VAZIO, ...JSON.parse(cru) };
  } catch {
    console.warn('Não consegui ler os dados salvos, começando do zero.');
    return VAZIO;
  }
}

let estado = carregar();
const ouvintes = new Set();

function persistir() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (e) {
    console.error('Falha ao salvar:', e);
  }
}

function definir(novo) {
  estado = { ...estado, ...novo };
  persistir();
  for (const fn of ouvintes) fn();
}

function inscrever(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function useStore() {
  return useSyncExternalStore(
    inscrever,
    () => estado,
    () => estado
  );
}

export function lerEstado() {
  return estado;
}

/* ---------------------------------------------------------------- perfil */

export function salvarPerfil(perfil) {
  definir({ perfil });
  // o peso informado no perfil entra como primeiro registro, se ainda nao houver
  if (perfil?.peso && estado.pesos.length === 0) {
    registrarPeso(chaveData(), perfil.peso);
  }
}

export function salvarMetasManuais(metas) {
  definir({ metasManuais: metas });
}

/* ---------------------------------------------------------------- diario */

/**
 * @param {string} data     'YYYY-MM-DD'
 * @param {string} refeicao 'cafe' | 'almoco' | 'janta' | 'lanches'
 * @param {object} alimento objeto da base (ou custom)
 * @param {number} qtd      gramas (ou ml)
 */
export function adicionarItem(data, refeicao, alimento, qtd) {
  const item = {
    uid: uid(),
    refeicao,
    alimentoId: alimento.id,
    nome: alimento.nome,
    marca: alimento.marca ?? null,
    fonte: alimento.fonte ?? 'taco',
    qtd,
    // congela os valores por 100 g no momento do registro: se a base mudar,
    // o historico continua batendo com o que foi comido
    por100: {
      kcal: alimento.kcal ?? 0,
      prot: alimento.prot ?? 0,
      carb: alimento.carb ?? 0,
      gord: alimento.gord ?? 0,
      fibra: alimento.fibra ?? 0,
      sodio: alimento.sodio ?? 0,
    },
  };
  const doDia = estado.diario[data] ?? [];
  definir({
    diario: { ...estado.diario, [data]: [...doDia, item] },
    ultimaQtd: { ...estado.ultimaQtd, [alimento.id]: qtd },
  });
  return item;
}

export function atualizarItem(data, itemUid, mudancas) {
  const doDia = estado.diario[data] ?? [];
  definir({
    diario: {
      ...estado.diario,
      [data]: doDia.map((i) => (i.uid === itemUid ? { ...i, ...mudancas } : i)),
    },
  });
}

export function removerItem(data, itemUid) {
  const doDia = estado.diario[data] ?? [];
  definir({ diario: { ...estado.diario, [data]: doDia.filter((i) => i.uid !== itemUid) } });
}

/** Copia todos os itens de um dia para outro (util para "repetir ontem"). */
export function copiarDia(de, para, refeicao = null) {
  const origem = (estado.diario[de] ?? []).filter((i) => !refeicao || i.refeicao === refeicao);
  if (!origem.length) return 0;
  const destino = estado.diario[para] ?? [];
  const copias = origem.map((i) => ({ ...i, uid: uid() }));
  definir({ diario: { ...estado.diario, [para]: [...destino, ...copias] } });
  return copias.length;
}

/* ----------------------------------------------------------------- pesos */

export function registrarPeso(data, peso) {
  const semODia = estado.pesos.filter((p) => p.data !== data);
  const pesos = [...semODia, { data, peso }].sort((a, b) => a.data.localeCompare(b.data));
  definir({ pesos });
  if (estado.perfil) definir({ perfil: { ...estado.perfil, peso } });
}

export function removerPeso(data) {
  definir({ pesos: estado.pesos.filter((p) => p.data !== data) });
}

/* --------------------------------------------------------------- customs */

export function salvarCustom(alimento) {
  const semEle = estado.customs.filter((c) => c.id !== alimento.id);
  definir({ customs: [...semEle, alimento] });
  return alimento;
}

export function removerCustom(id) {
  definir({ customs: estado.customs.filter((c) => c.id !== id) });
}

export function salvarMedidaUsuario(alimentoId, medida) {
  const atuais = estado.medidasUsuario[alimentoId] ?? [];
  definir({
    medidasUsuario: {
      ...estado.medidasUsuario,
      [alimentoId]: [...atuais.filter((m) => m.label !== medida.label), medida],
    },
  });
}

/* -------------------------------------------------- exportar / importar */

export function exportar() {
  return JSON.stringify(estado, null, 2);
}

export function importar(texto) {
  const dados = JSON.parse(texto);
  if (typeof dados !== 'object' || dados === null) throw new Error('Arquivo inválido');
  definir({ ...VAZIO, ...dados });
}

export function apagarTudo() {
  estado = VAZIO;
  localStorage.removeItem(CHAVE);
  for (const fn of ouvintes) fn();
}
