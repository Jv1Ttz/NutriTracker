import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from './lib/db.js';
import { sincronizar } from './lib/sync.js';
import { temSessaoGuardada, voltandoDeLogin, limparUrlDeLogin } from './lib/supabase.js';
import { calcularMetas } from './lib/metas.js';
import { chaveData } from './lib/util.js';
import Onboarding from './components/Onboarding.jsx';
import Hoje from './components/Hoje.jsx';
import Buscar from './components/Buscar.jsx';
import Peso from './components/Peso.jsx';
import Ajustes from './components/Ajustes.jsx';
import { IconeHoje, IconeBuscar, IconePeso, IconeAjustes } from './components/Icones.jsx';

const ABAS = [
  { id: 'hoje', nome: 'Hoje', Icone: IconeHoje },
  { id: 'buscar', nome: 'Adicionar', Icone: IconeBuscar },
  { id: 'peso', nome: 'Peso', Icone: IconePeso },
  { id: 'ajustes', nome: 'Ajustes', Icone: IconeAjustes },
];

/**
 * Sincroniza ao abrir o app, ao voltar o foco e ao voltar a internet.
 * Silencioso: se estiver deslogado ou offline, nao faz nada e nao reclama -
 * a tela de Ajustes tem o botao para sincronizar na mao e mostrar o erro.
 */
function useSincronizacaoAutomatica() {
  const rodando = useRef(false);

  useEffect(() => {
    async function rodar() {
      if (rodando.current || !navigator.onLine) return;

      // Voltando do Google, o usuario cai aqui na aba Hoje com o ?code= na
      // URL e ainda sem sessao guardada. Sem tratar esse caso, nada carrega
      // a biblioteca e o codigo nunca vira sessao - o login travaria calado.
      const voltando = voltandoDeLogin();
      if (!voltando && !temSessaoGuardada()) return;

      rodando.current = true;
      try {
        // sincronizar() chama getSession(), que espera a troca do codigo
        await sincronizar();
        // so depois da troca: tirar o ?code= antes dela quebraria o login
        if (voltando) limparUrlDeLogin();
      } catch (e) {
        console.warn('Sincronização adiada:', e.message);
      } finally {
        rodando.current = false;
      }
    }

    rodar();
    const aoVoltar = () => document.visibilityState === 'visible' && rodar();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', rodar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', rodar);
    };
  }, []);
}

export default function App() {
  const estado = useStore();
  useSincronizacaoAutomatica();
  const [aba, setAba] = useState('hoje');
  const [data, setData] = useState(() => chaveData());
  const [refeicaoAlvo, setRefeicaoAlvo] = useState('almoco');

  const metas = useMemo(() => {
    if (!estado.perfil) return null;
    const calculadas = calcularMetas(estado.perfil);
    return estado.metasManuais ? { ...calculadas, ...estado.metasManuais } : calculadas;
  }, [estado.perfil, estado.metasManuais]);

  if (!estado.perfil) {
    return <Onboarding />;
  }

  function irParaAdicionar(refeicao) {
    setRefeicaoAlvo(refeicao);
    setAba('buscar');
  }

  return (
    <div className="app">
      <main className="conteudo">
        {aba === 'hoje' && (
          <Hoje
            estado={estado}
            metas={metas}
            data={data}
            setData={setData}
            onAdicionar={irParaAdicionar}
          />
        )}
        {aba === 'buscar' && (
          <Buscar
            estado={estado}
            data={data}
            refeicaoInicial={refeicaoAlvo}
            onDepoisDeAdicionar={() => setAba('hoje')}
          />
        )}
        {aba === 'peso' && <Peso estado={estado} metas={metas} />}
        {aba === 'ajustes' && <Ajustes estado={estado} metas={metas} />}
      </main>

      <nav className="tabs">
        {ABAS.map(({ id, nome, Icone }) => (
          <button
            key={id}
            className={aba === id ? 'ativa' : ''}
            onClick={() => setAba(id)}
            aria-current={aba === id ? 'page' : undefined}
          >
            <Icone />
            {nome}
          </button>
        ))}
      </nav>
    </div>
  );
}
