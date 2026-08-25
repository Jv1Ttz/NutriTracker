/**
 * Cliente do Supabase, usado so pela sincronizacao entre aparelhos.
 *
 * O app inteiro funciona sem isto. Se as variaveis nao estiverem definidas,
 * `obterSupabase()` devolve null, a secao de conta some dos Ajustes e o
 * NutriTracker segue como nasceu: localStorage, offline, sem servidor.
 *
 * A biblioteca entra por import dinamico e so quando faz falta. Ela sozinha
 * pesa mais que todo o resto do app; carregar no boot atrasaria a abertura
 * no celular de quem nunca vai criar conta.
 *
 * A chave publicavel e feita para ficar no bundle - quem protege os dados e
 * a RLS no banco, que so deixa cada usuario ver as proprias linhas.
 */
const URL = import.meta.env.VITE_SUPABASE_URL;
const CHAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configurado = Boolean(URL && CHAVE);

/** Habilita o login por codigo no e-mail; exige SMTP proprio no Supabase. */
export const loginPorEmail = import.meta.env.VITE_LOGIN_EMAIL === '1';

/**
 * Ja existe sessao guardada neste aparelho?
 *
 * Serve para nao baixar a biblioteca a toa: quem nunca entrou em uma conta
 * nao tem essa chave no localStorage, e a sincronizacao automatica nem tenta.
 */
export function temSessaoGuardada() {
  if (!configurado) return false;
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
  } catch {
    return false;
  }
}

/**
 * Estamos voltando do Google agora?
 *
 * Sem esta checagem o login travaria: o usuario cai na aba "Hoje" com o
 * ?code= na URL, ainda sem sessao guardada, entao nada carregaria a
 * biblioteca - e o codigo nunca viraria sessao.
 */
export function voltandoDeLogin() {
  if (!configurado || typeof window === 'undefined') return false;
  return (
    new URLSearchParams(window.location.search).has('code') ||
    window.location.hash.includes('access_token')
  );
}

/** Tira o ?code= da barra de enderecos depois que ele ja foi trocado. */
export function limparUrlDeLogin() {
  if (typeof window === 'undefined') return;
  const limpa = window.location.origin + window.location.pathname;
  window.history.replaceState({}, '', limpa);
}

let promessa = null;

export function obterSupabase() {
  if (!configurado) return Promise.resolve(null);
  promessa ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL, CHAVE, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // o login com Google volta com o codigo de autorizacao na URL, e e
        // aqui que ele vira sessao
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  );
  return promessa;
}
