import { useState, useEffect } from 'react';
import { obterSupabase, configurado } from '../lib/supabase.js';
import { sincronizar } from '../lib/sync.js';

/**
 * Conta e sincronizacao, dentro dos Ajustes.
 *
 * O login e por CODIGO de 6 digitos, nao por link magico: no celular o link
 * abre no navegador padrao, fora do app instalado, e a sessao fica no lugar
 * errado. Digitar o codigo mantem tudo dentro do PWA.
 */
export default function Conta() {
  const [sb, setSb] = useState(null);
  const [sessao, setSessao] = useState(null);
  const [etapa, setEtapa] = useState('email'); // email | codigo
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [recado, setRecado] = useState('');

  useEffect(() => {
    let vivo = true;
    let desinscrever = () => {};
    obterSupabase().then((cliente) => {
      if (!cliente || !vivo) return;
      setSb(cliente);
      cliente.auth.getSession().then(({ data }) => vivo && setSessao(data.session));
      const { data: sub } = cliente.auth.onAuthStateChange((_e, s) => vivo && setSessao(s));
      desinscrever = () => sub.subscription.unsubscribe();
    });
    return () => {
      vivo = false;
      desinscrever();
    };
  }, []);

  if (!configurado) return null;
  const carregando = !sb;

  async function tentar(fn, aoDarCerto) {
    setOcupado(true);
    setErro('');
    setRecado('');
    try {
      await fn();
      aoDarCerto?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const pedirCodigo = () =>
    tentar(
      async () => {
        const { error } = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      },
      () => {
        setEtapa('codigo');
        setRecado('Código enviado. Olhe a caixa de entrada (e o spam).');
      }
    );

  const confirmarCodigo = () =>
    tentar(async () => {
      const { error } = await sb.auth.verifyOtp({
        email: email.trim(),
        token: codigo.trim(),
        type: 'email',
      });
      if (error) throw error;
      const r = await sincronizar();
      if (r.estado === 'ok') {
        setRecado(`Sincronizado: ${r.baixados} recebidos, ${r.enviados} enviados.`);
      }
    });

  const sincronizarAgora = () =>
    tentar(async () => {
      const r = await sincronizar();
      setRecado(
        r.estado === 'ok'
          ? `Sincronizado: ${r.baixados} recebidos, ${r.enviados} enviados.`
          : 'Nada a fazer.'
      );
    });

  const sair = () =>
    tentar(async () => {
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      setEtapa('email');
      setCodigo('');
      setRecado('Você saiu. Os dados continuam salvos neste aparelho.');
    });

  return (
    <div className="cartao">
      <div className="cartao-titulo">Sincronizar entre aparelhos</div>

      {sessao ? (
        <>
          <p className="sub" style={{ marginBottom: 12, lineHeight: 1.55 }}>
            Conectado como <b>{sessao.user.email}</b>. Entre com esse mesmo e-mail no outro
            aparelho e os dois passam a compartilhar diário, pesos e alimentos cadastrados.
          </p>
          <div className="linha">
            <button className="btn principal" onClick={sincronizarAgora} disabled={ocupado}>
              {ocupado ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
            <button className="btn" onClick={sair} disabled={ocupado}>
              Sair
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="sub" style={{ marginBottom: 12, lineHeight: 1.55 }}>
            Opcional. Sem conta, o app segue funcionando offline e os dados ficam só neste
            aparelho — que é como ele nasceu. Com conta, o mesmo diário aparece no celular e no
            PC.
          </p>

          {etapa === 'email' ? (
            <div className="campo">
              <label htmlFor="conta-email">Seu e-mail</label>
              <div className="linha">
                <input
                  id="conta-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
                <button
                  className="btn principal"
                  onClick={pedirCodigo}
                  disabled={ocupado || carregando || !email.includes('@')}
                  style={{ flex: '0 0 120px' }}
                >
                  {ocupado ? '...' : 'Enviar código'}
                </button>
              </div>
            </div>
          ) : (
            <div className="campo">
              <label htmlFor="conta-codigo">Código de 6 dígitos</label>
              <div className="linha">
                <input
                  id="conta-codigo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="000000"
                />
                <button
                  className="btn principal"
                  onClick={confirmarCodigo}
                  disabled={ocupado || carregando || codigo.trim().length < 6}
                  style={{ flex: '0 0 120px' }}
                >
                  {ocupado ? '...' : 'Entrar'}
                </button>
              </div>
              <button className="sub" onClick={() => setEtapa('email')} style={{ padding: 0 }}>
                usar outro e-mail
              </button>
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
