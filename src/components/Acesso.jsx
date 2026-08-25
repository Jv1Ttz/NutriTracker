import { useState } from 'react';
import Marca from './Marca.jsx';
import { IconeGoogle } from './Icones.jsx';
import { configurado, loginPorEmail } from '../lib/supabase.js';
import { criarConta, entrarComSenha, entrarComGoogle, temSessao } from '../lib/auth.js';
import { sincronizar } from '../lib/sync.js';

/**
 * Segunda tela: entrar, criar conta, ou seguir sem nenhuma das duas.
 *
 * "Continuar sem conta" fica visivel de proposito, e nao escondido embaixo.
 * O app funciona inteiro offline e a politica de privacidade promete isso -
 * empurrar cadastro aqui seria vender uma coisa e entregar outra.
 *
 * Depois de entrar, quem ja tem perfil no servidor cai direto no app: o
 * `sincronizar()` traz o perfil, o App re-renderiza e o cadastro nem aparece.
 * Sem isso, entrar no segundo aparelho pediria idade e peso de novo.
 */
export default function Acesso({ onSeguir }) {
  const [modo, setModo] = useState('entrar'); // entrar | criar
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [recado, setRecado] = useState('');

  // sem Supabase configurado nao ha o que oferecer: segue direto
  if (!configurado) return onSeguir(), null;

  async function depoisDeEntrar() {
    setRecado('Sincronizando...');
    try {
      await sincronizar();
    } catch (e) {
      // entrou, mas a sincronizacao falhou. Nao trava o usuario na porta:
      // o app abre e tenta de novo sozinho ao voltar o foco.
      console.warn('Sincronização adiada:', e.message);
    }
    onSeguir();
  }

  async function comGoogle() {
    setOcupado(true);
    setErro('');
    const falha = await entrarComGoogle();
    if (falha) {
      setErro(falha);
      setOcupado(false);
    }
    // deu certo: o navegador sai para o Google e volta sozinho
  }

  async function comSenha() {
    setOcupado(true);
    setErro('');
    setRecado('');

    const falha =
      modo === 'criar' ? await criarConta(email, senha) : await entrarComSenha(email, senha);

    if (falha) {
      setErro(falha);
      setOcupado(false);
      return;
    }

    // conta criada mas sem sessao = confirmacao de e-mail ligada no servidor
    if (!(await temSessao())) {
      setErro(
        'Conta criada, mas o servidor exige confirmar o e-mail antes de entrar. ' +
          'Desligue "Confirm email" em Authentication → Providers → Email no Supabase.'
      );
      setOcupado(false);
      return;
    }

    await depoisDeEntrar();
  }

  const podeEnviar = email.includes('@') && senha.length >= 6 && !ocupado;

  return (
    <div className="app">
      <main className="conteudo acesso">
        <div className="acesso-topo">
          <Marca tamanho={54} />
          <h1>Sua conta</h1>
          <p className="sub">
            Entrar sincroniza o mesmo diário entre celular e PC. Dá para começar sem conta e criar
            depois, em Ajustes.
          </p>
        </div>

        <button className="btn bloco" onClick={comGoogle} disabled={ocupado} style={{ gap: 10 }}>
          <IconeGoogle />
          Continuar com Google
        </button>

        <div className="acesso-ou">
          <span>ou com e-mail</span>
        </div>

        <div className="chips" style={{ marginBottom: 14 }}>
          <button
            className={`chip ${modo === 'entrar' ? 'marcado' : ''}`}
            onClick={() => {
              setModo('entrar');
              setErro('');
            }}
          >
            Entrar
          </button>
          <button
            className={`chip ${modo === 'criar' ? 'marcado' : ''}`}
            onClick={() => {
              setModo('criar');
              setErro('');
            }}
          >
            Criar conta
          </button>
        </div>

        <div className="campo">
          <label htmlFor="ac-email">E-mail</label>
          <input
            id="ac-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
          />
        </div>

        <div className="campo">
          <label htmlFor="ac-senha">Senha</label>
          <input
            id="ac-senha"
            type="password"
            autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="pelo menos 6 caracteres"
            onKeyDown={(e) => e.key === 'Enter' && podeEnviar && comSenha()}
          />
        </div>

        <button className="btn principal bloco" onClick={comSenha} disabled={!podeEnviar}>
          {ocupado ? 'Um instante...' : modo === 'criar' ? 'Criar conta' : 'Entrar'}
        </button>

        {recado && <div className="aviso info">{recado}</div>}
        {erro && <div className="aviso">{erro}</div>}

        <div className="acesso-fim">
          <button className="btn bloco" onClick={onSeguir} disabled={ocupado}>
            Continuar sem conta
          </button>
          <p className="sub" style={{ textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            Sem conta o app funciona igual, offline, e nada sai deste aparelho.
            {loginPorEmail ? '' : ' Você pode criar uma conta depois, sem perder o que já registrou.'}
          </p>
        </div>
      </main>
    </div>
  );
}
