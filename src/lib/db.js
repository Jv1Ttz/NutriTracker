import { useSyncExternalStore } from 'react';
import { chaveData, uid } from './util.js';

const CHAVE = 'nutritracker.v1';

/** Carimbo de quando a mudanca aconteceu, para resolver conflito na sincronizacao. */
const agora = () => new Date().toISOString();

const VAZIO = {
  versao: 1,
  perfil: null, // { nome, sexo, idade, altura, peso, atividade, objetivo }
  metasManuais: null, // { kcal, prot, carb, gord } quando o usuario sobrescreve
  diario: {}, // { 'YYYY-MM-DD': [item] }
  pesos: [], // [{ data, peso }]
  customs: [], // alimentos criados pelo usuario ou importados do Open Food Facts
  medidasUsuario: {}, // { alimentoId: [{ label, g }] }
  ultimaQtd: {}, // { alimentoId: gramas }

  // ---- daqui para baixo, so a sincronizacao usa ----

  // Quando algo e apagado aqui, a linha correspondente no servidor continua
  // existindo. Sem registrar a exclusao, o outro aparelho reenviaria a linha
  // na proxima sincronizacao e o item ressuscitaria. Cada lapide guarda a
  // chave e a hora do enterro.
  tumulos: { itens: {}, pesos: {}, customs: {} },
  carimboPerfil: null, // perfil, metas, medidas e ultimaQtd vivem na mesma linha
  sync: { marca: null, em: null }, // marca d'agua do servidor + ultima sincronizacao
};

function carregar() {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return VAZIO;
    const salvo = JSON.parse(cru);
    return { ...VAZIO, ...salvo, tumulos: { ...VAZIO.tumulos, ...salvo.tumulos } };
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

/** Enterra uma chave, para a exclusao chegar aos outros aparelhos. */
function enterrar(tipo, chave) {
  return { ...estado.tumulos, [tipo]: { ...estado.tumulos[tipo], [chave]: agora() } };
}

/** Desenterra: o usuario recriou algo que tinha apagado. */
function desenterrar(tipo, chave) {
  if (!estado.tumulos[tipo][chave]) return estado.tumulos;
  const { [chave]: _ido, ...resto } = estado.tumulos[tipo];
  return { ...estado.tumulos, [tipo]: resto };
}

/* ---------------------------------------------------------------- perfil */

export function salvarPerfil(perfil) {
  // o peso informado no perfil entra como primeiro registro, se ainda nao houver
  const primeiroPeso = perfil?.peso && estado.pesos.length === 0;
  definir({ perfil, carimboPerfil: agora() });
  if (primeiroPeso) registrarPeso(chaveData(), perfil.peso);
}

/** A foto vive dentro do perfil, entao viaja na mesma linha na sincronizacao. */
export function salvarFoto(dataUrl) {
  if (!estado.perfil) return;
  definir({ perfil: { ...estado.perfil, foto: dataUrl }, carimboPerfil: agora() });
}

export function salvarMetasManuais(metas) {
  definir({ metasManuais: metas, carimboPerfil: agora() });
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
    atualizadoEm: agora(),
  };
  const doDia = estado.diario[data] ?? [];
  definir({
    diario: { ...estado.diario, [data]: [...doDia, item] },
    ultimaQtd: { ...estado.ultimaQtd, [alimento.id]: qtd },
    carimboPerfil: agora(), // ultimaQtd viaja junto com o perfil
  });
  return item;
}

export function atualizarItem(data, itemUid, mudancas) {
  const doDia = estado.diario[data] ?? [];
  definir({
    diario: {
      ...estado.diario,
      [data]: doDia.map((i) =>
        i.uid === itemUid ? { ...i, ...mudancas, atualizadoEm: agora() } : i
      ),
    },
  });
}

export function removerItem(data, itemUid) {
  const doDia = estado.diario[data] ?? [];
  definir({
    diario: { ...estado.diario, [data]: doDia.filter((i) => i.uid !== itemUid) },
    tumulos: enterrar('itens', itemUid),
  });
}

/** Copia todos os itens de um dia para outro (util para "repetir ontem"). */
export function copiarDia(de, para, refeicao = null) {
  const origem = (estado.diario[de] ?? []).filter((i) => !refeicao || i.refeicao === refeicao);
  if (!origem.length) return 0;
  const destino = estado.diario[para] ?? [];
  const copias = origem.map((i) => ({ ...i, uid: uid(), atualizadoEm: agora() }));
  definir({ diario: { ...estado.diario, [para]: [...destino, ...copias] } });
  return copias.length;
}

/* ----------------------------------------------------------------- pesos */

export function registrarPeso(data, peso) {
  const semODia = estado.pesos.filter((p) => p.data !== data);
  const pesos = [...semODia, { data, peso, atualizadoEm: agora() }].sort((a, b) =>
    a.data.localeCompare(b.data)
  );
  definir({
    pesos,
    tumulos: desenterrar('pesos', data),
    ...(estado.perfil ? { perfil: { ...estado.perfil, peso }, carimboPerfil: agora() } : {}),
  });
}

export function removerPeso(data) {
  definir({
    pesos: estado.pesos.filter((p) => p.data !== data),
    tumulos: enterrar('pesos', data),
  });
}

/* --------------------------------------------------------------- customs */

export function salvarCustom(alimento) {
  const semEle = estado.customs.filter((c) => c.id !== alimento.id);
  definir({
    customs: [...semEle, { ...alimento, atualizadoEm: agora() }],
    tumulos: desenterrar('customs', alimento.id),
  });
  return alimento;
}

export function removerCustom(id) {
  definir({
    customs: estado.customs.filter((c) => c.id !== id),
    tumulos: enterrar('customs', id),
  });
}

export function salvarMedidaUsuario(alimentoId, medida) {
  const atuais = estado.medidasUsuario[alimentoId] ?? [];
  definir({
    medidasUsuario: {
      ...estado.medidasUsuario,
      [alimentoId]: [...atuais.filter((m) => m.label !== medida.label), medida],
    },
    carimboPerfil: agora(),
  });
}

/* ------------------------------------------------------------ sincronizacao */

/**
 * Grava o resultado de uma sincronizacao. Diferente de tudo acima, NAO
 * carimba hora: os carimbos ja vieram decididos pela fusao em `sync.js`.
 */
export function aplicarSincronizacao(parcial) {
  definir(parcial);
}

/* -------------------------------------------------- exportar / importar */

export function exportar() {
  return JSON.stringify(estado, null, 2);
}

export function importar(texto) {
  const dados = JSON.parse(texto);
  if (typeof dados !== 'object' || dados === null) throw new Error('Arquivo inválido');
  definir({ ...VAZIO, ...dados, tumulos: { ...VAZIO.tumulos, ...dados.tumulos } });
}

export function apagarTudo() {
  estado = VAZIO;
  localStorage.removeItem(CHAVE);
  for (const fn of ouvintes) fn();
}
