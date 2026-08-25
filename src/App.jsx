import { useState, useMemo } from 'react';
import { useStore } from './lib/db.js';
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

export default function App() {
  const estado = useStore();
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
