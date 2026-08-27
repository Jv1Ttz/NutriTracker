import { useState, useEffect } from 'react';
import {
  obterSupabase,
  configurado,
  loginPorEmail,
  limparUrlDeLogin,
  DIGITOS_DO_CODIGO,
} from '../lib/supabase.js';
import {
  entrarComGoogle,
  criarConta,
  entrarComSenha,
  pedirCodigo,
  confirmarCodigo,
  sair,
  temSessao,
  traduzirErro,
} from '../lib/auth.js';
import { sincronizar } from '../lib/sync.js';
import { IconeGoogle } from './Icones.jsx';

/**
 * Conta e sincronizacao, dentro dos Ajustes.
 *
 * Oferece o mesmo que a tela de acesso da primeira abertura - Google e
 * e-mail com senha - para quem escolheu "continuar sem conta" la e mudou de
 * ideia. As acoes vem todas de lib/auth.js, para as duas telas nao
 * divergirem.
 *
 * O login por codigo continua atras de VITE_LOGIN_EMAIL=1:
 * depende de o template do Supabase trazer {{ .Token }}, e o Supabase so
 * libera editar template com SMTP proprio.
 */
export default function Conta() {
  const [sessao, setSessao] = useState(null);
  const [pronto, setPronto] = useState(false);
  const [modo, setModo] = useState('entrar'); // entrar | criar
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [esperandoCodigo, setEsperandoCodigo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [recado, setRecado] = useState('');

  useEffect(() => {
    let vivo = true;
    let desinscrever = () => {};
    obterSupabase().then((cliente) => {
      if (!cliente || !vivo) return;
      cliente.auth.getSession().then(({ data }) => {
        if (!vivo) return;
        setSessao(data.session);
        setPronto(true);
      });
      const { data: sub } = cliente.auth.onAuthStateChange((_e, s) => vivo && setSessao(s));
      desinscrever = () => sub.subscription.unsubscribe();
    });
    return () => {
      vivo = false;
      desinscrever();
    };
  }, []);

  if (!configurado) return null;

  function limpar() {
    setErro('');
    setRecado('');
  }

  async function rodar(fn) {
    setOcupado(true);
    limpar();
    try {
      await fn();
    } catch (e) {
      setErro(traduzirErro(e.message));
    } finally {
      setOcupado(false);
    }
  }

  const sincronizarAgora = () =>
    rodar(async () => {
      const r = await sincronizar();
      setRecado(
        r.estado === 'ok'
          ? `Sincronizado: ${r.baixados} recebidos, ${r.enviados} enviados.`
          : 'Nada a fazer.'
      );
    });

  const comGoogle = () =>
    rodar(async () => {
      const falha = await entrarComGoogle();
      if (falha) setErro(falha);
    });

  const comSenha = () =>
    rodar(async () => {
      const falha =
        modo === 'criar' ? await criarConta(email, senha) : await entrarComSenha(email, senha);
      if (falha) return setErro(falha);
      if (!(await temSessao())) {
        return setErro('Não consegui concluir o cadastro por e-mail. Tente entrar com o Google.');
      }
      const r = await sincronizar();
      if (r.estado === 'ok') {
        setRecado(`Sincronizado: ${r.baixados} recebidos, ${r.enviados} enviados.`);
      }
    });

  const enviarCodigo = () =>
    rodar(async () => {
      const falha = await pedirCodigo(email);
      if (falha) return setErro(falha);
      setEsperandoCodigo(true);
      setRecado('Código enviado. Olhe a caixa de entrada (e o spam).');
    });

  const validarCodigo = () =>
    rodar(async () => {
      const falha = await confirmarCodigo(email, codigo);
      if (falha) return setErro(falha);
      const r = await sincronizar();
      if (r.estado === 'ok') {
        setRecado(`Sincronizado: ${r.baixados} recebidos, ${r.enviados} enviados.`);
      }
    });

  const sairDaConta = () =>
    rodar(async () => {
      const falha = await sair();
      if (falha) return setErro(falha);
      limparUrlDeLogin();
      setEsperandoCodigo(false);
      setSenha('');
      setCodigo('');
      setRecado('Você saiu. Os dados continuam salvos neste aparelho.');
    });

  const podeEnviar = email.includes('@') && senha.length >= 6 && !ocupado;

  return (
    <div className="cartao">
      <div className="cartao-titulo">Sincronizar entre aparelhos</div>

      {sessao ? (
        <>
          <p className="sub" style={{ marginBottom: 12, lineHeight: 1.55 }}>
            Conectado como <b>{sessao.user.email}</b>. Entre com essa mesma conta no outro aparelho
            e os dois passam a compartilhar diário, pesos e alimentos cadastrados.
          </p>
          <div className="linha">
            <button className="btn principal" onClick={sincronizarAgora} disabled={ocupado}>
              {ocupado ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
            <button className="btn" onClick={sairDaConta} disabled={ocupado}>
              Sair
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="sub" style={{ marginBottom: 14, lineHeight: 1.55 }}>
            Opcional. Sem conta o app segue funcionando offline e os dados ficam só neste aparelho
            — que é como ele nasceu. Com conta, o mesmo diário aparece no celular e no PC.
          </p>

          <button
            className="btn bloco"
            onClick={comGoogle}
            disabled={ocupado || !pronto}
            style={{ gap: 10 }}
          >
            <IconeGoogle />
            Continuar com Google
          </button>

          <div className="acesso-ou">
            <span>ou com e-mail</span>
          </div>

          <div className="chips" style={{ marginBottom: 12 }}>
            {[
              ['entrar', 'Entrar'],
              ['criar', 'Criar conta'],
            ].map(([id, rotulo]) => (
              <button
                key={id}
                className={`chip ${modo === id ? 'marcado' : ''}`}
                onClick={() => {
                  setModo(id);
                  limpar();
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="campo">
            <label htmlFor="conta-email">E-mail</label>
            <input
              id="conta-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>

          <div className="campo">
            <label htmlFor="conta-senha">Senha</label>
            <input
              id="conta-senha"
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

          {loginPorEmail && (
            <div className="campo" style={{ marginTop: 16 }}>
              <label htmlFor="conta-codigo">
                {esperandoCodigo
                  ? `Código de ${DIGITOS_DO_CODIGO} dígitos`
                  : 'Ou receba um código por e-mail'}
              </label>
              <div className="linha">
                {esperandoCodigo ? (
                  <>
                    <input
                      id="conta-codigo"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder={'0'.repeat(DIGITOS_DO_CODIGO)}
                    />
                    <button
                      className="btn"
                      onClick={validarCodigo}
                      disabled={ocupado || codigo.trim().length < 6}
                      style={{ flex: '0 0 110px' }}
                    >
                      Validar
                    </button>
                  </>
                ) : (
                  <button
                    className="btn bloco"
                    onClick={enviarCodigo}
                    disabled={ocupado || !email.includes('@')}
                  >
                    Enviar código para {email || 'o e-mail acima'}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {recado && (
        <div className="aviso info" style={{ marginTop: 12 }}>
          {recado}
        </div>
      )}
      {erro && (
        <div className="aviso" style={{ marginTop: 12 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
