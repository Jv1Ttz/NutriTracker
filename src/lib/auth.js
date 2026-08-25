import { obterSupabase } from './supabase.js';

/**
 * Acoes de login, compartilhadas pela tela de acesso (primeira abertura) e
 * pelo cartao de conta dos Ajustes.
 *
 * Existiam duas copias disso; virou um lugar so para as duas telas nao
 * divergirem em regra de negocio nem em texto de erro.
 */

/**
 * As mensagens do Supabase vem em ingles e falam a lingua da API, nao a do
 * usuario. "Invalid login credentials" nao ajuda ninguem a entender que
 * errou a senha.
 */
const TRADUCOES = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/user already registered|already been registered/i,
    'Esse e-mail já tem conta. Use "Entrar" em vez de "Criar conta".'],
  [/password should be at least (\d+)/i, (m) => `A senha precisa de pelo menos ${m[1]} caracteres.`],
  [/unable to validate email address|invalid format/i, 'E-mail inválido.'],
  [/email not confirmed/i,
    'Esse e-mail ainda não foi confirmado. Confirmação de e-mail está ligada no Supabase — desligue em Authentication → Providers → Email, ou confirme pelo link que chegou.'],
  [/signups not allowed/i, 'O cadastro está desativado no servidor.'],
  [/for security purposes.*?(\d+) seconds/i,
    (m) => `Muitas tentativas seguidas. Espere ${m[1]} segundos e tente de novo.`],
  [/rate limit|too many requests/i, 'Muitas tentativas seguidas. Espere um pouco.'],
  [/failed to fetch|networkerror|network request failed/i,
    'Sem conexão com o servidor. O app continua funcionando offline.'],
];

export function traduzirErro(mensagem) {
  const texto = String(mensagem ?? '');
  for (const [padrao, saida] of TRADUCOES) {
    const m = texto.match(padrao);
    if (m) return typeof saida === 'function' ? saida(m) : saida;
  }
  return texto;
}

/** Roda a acao e devolve erro ja traduzido em vez de estourar em ingles. */
async function tentar(fn) {
  try {
    const { error } = (await fn()) ?? {};
    if (error) throw error;
    return null;
  } catch (e) {
    return traduzirErro(e.message);
  }
}

export async function entrarComGoogle() {
  const sb = await obterSupabase();
  return tentar(() =>
    sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // volta para a propria pagina; precisa estar na allow list do
        // Supabase (Authentication > URL Configuration)
        redirectTo: window.location.origin + window.location.pathname,
      },
    })
  );
}

export async function criarConta(email, senha) {
  const sb = await obterSupabase();
  return tentar(() => sb.auth.signUp({ email: email.trim(), password: senha }));
}

export async function entrarComSenha(email, senha) {
  const sb = await obterSupabase();
  return tentar(() => sb.auth.signInWithPassword({ email: email.trim(), password: senha }));
}

export async function pedirCodigo(email) {
  const sb = await obterSupabase();
  return tentar(() =>
    sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
  );
}

export async function confirmarCodigo(email, codigo) {
  const sb = await obterSupabase();
  return tentar(() =>
    sb.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: 'email' })
  );
}

export async function sair() {
  const sb = await obterSupabase();
  return tentar(() => sb.auth.signOut());
}

/**
 * O `signUp` pode voltar sem sessao quando a confirmacao de e-mail esta
 * ligada no servidor. Nesse caso a conta existe mas ninguem entrou, e a tela
 * precisa dizer isso em vez de fingir que deu certo.
 */
export async function temSessao() {
  const sb = await obterSupabase();
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return Boolean(data.session);
}
