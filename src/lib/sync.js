import { obterSupabase } from './supabase.js';
import { lerEstado, aplicarSincronizacao } from './db.js';

/**
 * Sincronizacao entre aparelhos.
 *
 * O localStorage continua sendo a fonte de verdade local - o app funciona
 * inteiro offline e a sincronizacao e um encontro eventual, nao um requisito.
 *
 * Como funciona uma rodada:
 *
 *   1. BAIXA  o que mudou no servidor desde a ultima marca d'agua
 *   2. FUNDE  com o local, resolvendo conflito por hora de edicao
 *   3. SOBE   o que mudou aqui desde a ultima sincronizacao
 *
 * Os dois relogios (ver a migracao no banco):
 *   atualizadoEm     - relogio do cliente, decide QUEM GANHA o conflito
 *   sincronizado_em  - relogio do servidor, decide O QUE ENTRA no delta
 *
 * O passo 3 compara so datas geradas por este aparelho ("o que mudou aqui
 * desde a ultima vez que eu subi"), entao relogio torto de outro aparelho
 * nunca faz um item local deixar de ser enviado.
 */

const EPOCA = '1970-01-01T00:00:00.000Z';
const agora = () => new Date().toISOString();

/**
 * Depois de tanto tempo, todo aparelho ja se sincronizou e viu a exclusao.
 * Sem esta poda as lapides so crescem, para sempre, dentro do localStorage.
 */
const DIAS_DE_LAPIDE = 90;

function podar(tumulos) {
  const limite = new Date(Date.now() - DIAS_DE_LAPIDE * 86400000).toISOString();
  return Object.fromEntries(Object.entries(tumulos).filter(([, quando]) => quando > limite));
}

/** ISO mais recente entre dois, tolerando null. */
const maisNovo = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

/* ------------------------------------------------------------- conversao */

/**
 * Lapide e item vivo precisam sair com EXATAMENTE as mesmas chaves.
 *
 * O PostgREST decide as colunas do INSERT pelo primeiro objeto do lote: se a
 * lapide omitir `fonte`, ela chega NULL numa coluna NOT NULL e o lote inteiro
 * falha - justamente no caso comum de apagar um item e adicionar outro na
 * mesma sincronizacao. Por isso a lapide e construida pela mesma funcao, em
 * vez de ser um objeto escrito a mao parecido com o outro.
 */
export function itemParaLinha(userId, data, i) {
  return {
    user_id: userId,
    uid: i.uid,
    data,
    refeicao: i.refeicao,
    alimento_id: i.alimentoId,
    nome: i.nome,
    marca: i.marca ?? null,
    fonte: i.fonte ?? 'taco',
    qtd: i.qtd,
    por100: i.por100,
    atualizado_em: i.atualizadoEm ?? agora(),
    removido_em: null,
  };
}

export function lapideDeItem(userId, uid, quando) {
  const base = itemParaLinha(userId, '1970-01-01', {
    uid,
    refeicao: 'lanches',
    alimentoId: '',
    nome: '',
    marca: null,
    fonte: 'taco',
    qtd: 1, // a coluna exige > 0, mesmo sem significado aqui
    por100: {},
    atualizadoEm: quando,
  });
  return { ...base, removido_em: quando };
}

function linhaParaItem(l) {
  return {
    uid: l.uid,
    refeicao: l.refeicao,
    alimentoId: l.alimento_id,
    nome: l.nome,
    marca: l.marca,
    fonte: l.fonte,
    qtd: Number(l.qtd),
    por100: l.por100,
    atualizadoEm: l.atualizado_em,
  };
}

/* ----------------------------------------------------------------- baixar */

async function baixar(supabase, marca) {
  const [perfil, itens, pesos, customs] = await Promise.all([
    supabase.from('perfis').select('*').gt('sincronizado_em', marca).maybeSingle(),
    supabase.from('itens_diario').select('*').gt('sincronizado_em', marca),
    supabase.from('pesos').select('*').gt('sincronizado_em', marca),
    supabase.from('alimentos_custom').select('*').gt('sincronizado_em', marca),
  ]);

  for (const r of [perfil, itens, pesos, customs]) {
    if (r.error) throw new Error(r.error.message);
  }

  // A nova marca d'agua sai do maior sincronizado_em RECEBIDO, nunca do
  // relogio local: se o relogio daqui estiver adiantado, avancar a marca
  // pelo relogio local pularia linhas que ainda nem chegaram.
  let novaMarca = marca;
  for (const l of [
    ...(perfil.data ? [perfil.data] : []),
    ...(itens.data ?? []),
    ...(pesos.data ?? []),
    ...(customs.data ?? []),
  ]) {
    novaMarca = maisNovo(novaMarca, l.sincronizado_em);
  }

  return {
    perfil: perfil.data,
    itens: itens.data ?? [],
    pesos: pesos.data ?? [],
    customs: customs.data ?? [],
    novaMarca,
  };
}

/* ------------------------------------------------------------------ fundir */

/**
 * Aplica as linhas remotas sobre um mapa local, chave a chave.
 *
 * @param mapa      { chave: registro }        estado local
 * @param tumulos   { chave: iso }             exclusoes locais ainda nao subidas
 * @param linhas    linhas vindas do servidor
 * @param chaveDe   (linha) => chave
 * @param converter (linha) => registro local
 * @param horaDe    (registro) => iso
 */
export function fundirMapa({ mapa, tumulos, linhas, chaveDe, converter, horaDe }) {
  const novoMapa = { ...mapa };
  const novosTumulos = { ...tumulos };
  const adotados = new Set();

  for (const linha of linhas) {
    const chave = chaveDe(linha);
    const horaRemota = linha.removido_em ?? linha.atualizado_em;
    const local = novoMapa[chave];
    const horaLocal = maisNovo(local ? horaDe(local) : null, novosTumulos[chave] ?? null);

    // O servidor ja registrou esta exclusao, entao a lapide local cumpriu o
    // papel e pode ir embora. Sem isto ela ficaria guardada para sempre,
    // porque o caso "empate fica com o local" logo abaixo pula o resto.
    if (linha.removido_em && novosTumulos[chave] && novosTumulos[chave] <= linha.removido_em) {
      delete novosTumulos[chave];
    }

    // quem editou por ultimo ganha; empate fica com o local (evita ping-pong)
    if (horaLocal && horaLocal >= horaRemota) continue;

    if (linha.removido_em) {
      delete novoMapa[chave];
      // a exclusao ja esta no servidor - nao precisa reenviar
      delete novosTumulos[chave];
    } else {
      novoMapa[chave] = converter(linha);
      delete novosTumulos[chave];
    }
    adotados.add(chave);
  }

  return { mapa: novoMapa, tumulos: novosTumulos, adotados };
}

/* -------------------------------------------------------------- uma rodada */

export async function sincronizar() {
  const supabase = await obterSupabase();
  if (!supabase) return { estado: 'sem-config' };

  const { data: sessao } = await supabase.auth.getSession();
  const userId = sessao?.session?.user?.id;
  if (!userId) return { estado: 'deslogado' };

  const s = lerEstado();
  const marca = s.sync.marca ?? EPOCA;
  const desde = s.sync.em ?? EPOCA;

  const remoto = await baixar(supabase, marca);

  /* ---- itens do diario: mapa uid -> {data, item} ---- */
  const itensLocais = {};
  for (const [data, lista] of Object.entries(s.diario)) {
    for (const i of lista) itensLocais[i.uid] = { data, item: i };
  }
  const fItens = fundirMapa({
    mapa: itensLocais,
    tumulos: s.tumulos.itens,
    linhas: remoto.itens,
    chaveDe: (l) => l.uid,
    converter: (l) => ({ data: l.data, item: linhaParaItem(l) }),
    horaDe: (r) => r.item.atualizadoEm,
  });

  /* ---- pesos: mapa data -> {data, peso} ---- */
  const pesosLocais = Object.fromEntries(s.pesos.map((p) => [p.data, p]));
  const fPesos = fundirMapa({
    mapa: pesosLocais,
    tumulos: s.tumulos.pesos,
    linhas: remoto.pesos,
    chaveDe: (l) => l.data,
    converter: (l) => ({ data: l.data, peso: Number(l.peso), atualizadoEm: l.atualizado_em }),
    horaDe: (r) => r.atualizadoEm,
  });

  /* ---- alimentos do usuario ---- */
  const customsLocais = Object.fromEntries(s.customs.map((c) => [c.id, c]));
  const fCustoms = fundirMapa({
    mapa: customsLocais,
    tumulos: s.tumulos.customs,
    linhas: remoto.customs,
    chaveDe: (l) => l.id,
    converter: (l) => ({ ...l.dados, id: l.id, atualizadoEm: l.atualizado_em }),
    horaDe: (r) => r.atualizadoEm,
  });

  /* ---- perfil: uma linha so, last-write-wins no conjunto ---- */
  let perfil = s.perfil;
  let metasManuais = s.metasManuais;
  let medidasUsuario = s.medidasUsuario;
  let ultimaQtd = s.ultimaQtd;
  let carimboPerfil = s.carimboPerfil;
  const rp = remoto.perfil;
  if (rp && (!carimboPerfil || rp.atualizado_em > carimboPerfil)) {
    perfil = rp.nome === null && rp.idade === null
      ? perfil
      : {
          nome: rp.nome ?? '',
          sexo: rp.sexo,
          idade: rp.idade,
          altura: Number(rp.altura),
          peso: Number(rp.peso),
          atividade: rp.atividade,
          objetivo: rp.objetivo,
        };
    metasManuais = rp.metas_manuais;
    medidasUsuario = rp.medidas_usuario ?? {};
    ultimaQtd = rp.ultima_qtd ?? {};
    carimboPerfil = rp.atualizado_em;
  }

  /* ---- remonta o diario a partir do mapa fundido ---- */
  const diario = {};
  for (const { data, item } of Object.values(fItens.mapa)) {
    (diario[data] ??= []).push(item);
  }

  const pesos = Object.values(fPesos.mapa).sort((a, b) => a.data.localeCompare(b.data));
  const customs = Object.values(fCustoms.mapa);

  /* ---- SOBE o que mudou aqui desde a ultima sincronizacao ---- */
  const enviar = [];

  const itensNovos = Object.entries(fItens.mapa)
    .filter(([uid, r]) => !fItens.adotados.has(uid) && (r.item.atualizadoEm ?? EPOCA) > desde)
    .map(([, r]) => itemParaLinha(userId, r.data, r.item));
  const itensMortos = Object.entries(fItens.tumulos)
    .filter(([, quando]) => quando > desde)
    .map(([uid, quando]) => lapideDeItem(userId, uid, quando));
  if (itensNovos.length || itensMortos.length) {
    enviar.push(supabase.from('itens_diario').upsert([...itensNovos, ...itensMortos]));
  }

  const pesosNovos = Object.values(fPesos.mapa)
    .filter((p) => !fPesos.adotados.has(p.data) && (p.atualizadoEm ?? EPOCA) > desde)
    .map((p) => ({
      user_id: userId,
      data: p.data,
      peso: p.peso,
      atualizado_em: p.atualizadoEm ?? agora(),
      removido_em: null,
    }));
  const pesosMortos = Object.entries(fPesos.tumulos)
    .filter(([, quando]) => quando > desde)
    .map(([data, quando]) => ({
      user_id: userId,
      data,
      peso: 20,
      atualizado_em: quando,
      removido_em: quando,
    }));
  if (pesosNovos.length || pesosMortos.length) {
    enviar.push(supabase.from('pesos').upsert([...pesosNovos, ...pesosMortos]));
  }

  const customsNovos = Object.values(fCustoms.mapa)
    .filter((c) => !fCustoms.adotados.has(c.id) && (c.atualizadoEm ?? EPOCA) > desde)
    .map(({ atualizadoEm, ...dados }) => ({
      user_id: userId,
      id: dados.id,
      dados,
      atualizado_em: atualizadoEm ?? agora(),
      removido_em: null,
    }));
  const customsMortos = Object.entries(fCustoms.tumulos)
    .filter(([, quando]) => quando > desde)
    .map(([id, quando]) => ({
      user_id: userId,
      id,
      dados: {},
      atualizado_em: quando,
      removido_em: quando,
    }));
  if (customsNovos.length || customsMortos.length) {
    enviar.push(supabase.from('alimentos_custom').upsert([...customsNovos, ...customsMortos]));
  }

  if (perfil && carimboPerfil && carimboPerfil > desde && carimboPerfil !== rp?.atualizado_em) {
    enviar.push(
      supabase.from('perfis').upsert({
        user_id: userId,
        nome: perfil.nome || null,
        sexo: perfil.sexo,
        idade: perfil.idade,
        altura: perfil.altura,
        peso: perfil.peso,
        atividade: perfil.atividade,
        objetivo: perfil.objetivo,
        metas_manuais: metasManuais,
        medidas_usuario: medidasUsuario,
        ultima_qtd: ultimaQtd,
        atualizado_em: carimboPerfil,
      })
    );
  }

  for (const r of await Promise.all(enviar)) {
    if (r.error) throw new Error(r.error.message);
  }

  aplicarSincronizacao({
    perfil,
    metasManuais,
    medidasUsuario,
    ultimaQtd,
    carimboPerfil,
    diario,
    pesos,
    customs,
    tumulos: {
      itens: podar(fItens.tumulos),
      pesos: podar(fPesos.tumulos),
      customs: podar(fCustoms.tumulos),
    },
    sync: { marca: remoto.novaMarca, em: agora() },
  });

  return {
    estado: 'ok',
    baixados: remoto.itens.length + remoto.pesos.length + remoto.customs.length,
    enviados: itensNovos.length + pesosNovos.length + customsNovos.length,
  };
}
