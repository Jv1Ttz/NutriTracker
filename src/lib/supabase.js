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

let promessa = null;

export function obterSupabase() {
  if (!configurado) return Promise.resolve(null);
  promessa ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL, CHAVE, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // o app nao tem rotas e o login e por codigo, nao por link
        detectSessionInUrl: false,
      },
    })
  );
  return promessa;
}
