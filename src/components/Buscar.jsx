import { useState, useMemo, useEffect, useRef } from 'react';
import AdicionarSheet from './AdicionarSheet.jsx';
import Scanner from './Scanner.jsx';
import CriarAlimento from './CriarAlimento.jsx';
import { buscar, frequentes } from '../lib/busca.js';
import { buscarPorTexto } from '../lib/openfoodfacts.js';
import { inteiro } from '../lib/util.js';
import { REFEICOES } from '../lib/calculo.js';
import { IconeCodigoBarras } from './Icones.jsx';

function Resultado({ alimento, onEscolher }) {
  return (
    <button className="resultado" onClick={() => onEscolher(alimento)}>
      {alimento.imagem && <img src={alimento.imagem} alt="" loading="lazy" />}
      <div className="resultado-info">
        <div className="resultado-nome">{alimento.nome}</div>
        <div className="resultado-det">
          {inteiro(alimento.kcal)} kcal · P {inteiro(alimento.prot)} · C {inteiro(alimento.carb)} · G{' '}
          {inteiro(alimento.gord)}
          {' · '}
          {alimento.marca || alimento.categoria}
        </div>
      </div>
      {alimento.fonte === 'usda' && <span className="tag usda">USDA</span>}
      {alimento.fonte === 'off' && <span className="tag off">barras</span>}
      {alimento.fonte === 'custom' && <span className="tag custom">meu</span>}
    </button>
  );
}

export default function Buscar({ estado, data, refeicaoInicial, onDepoisDeAdicionar }) {
  const [consulta, setConsulta] = useState('');
  const [escolhido, setEscolhido] = useState(null);
  const [scanner, setScanner] = useState(false);
  const [criando, setCriando] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [buscandoOff, setBuscandoOff] = useState(false);
  const campoRef = useRef(null);

  const locais = useMemo(
    () => buscar(consulta, estado.customs),
    [consulta, estado.customs]
  );
  const usados = useMemo(
    () => frequentes(estado.diario, estado.customs),
    [estado.diario, estado.customs]
  );

  // Busca de produtos industrializados: so entra quando a base local nao
  // resolve, para nao gastar rede a toa.
  useEffect(() => {
    setProdutos([]);
    const termo = consulta.trim();
    if (termo.length < 3 || locais.length >= 8) return;

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoOff(true);
      try {
        setProdutos(await buscarPorTexto(termo, ctrl.signal, 15));
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Open Food Facts indisponível:', e.message);
      } finally {
        setBuscandoOff(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [consulta, locais.length]);

  const nomeRefeicao = REFEICOES.find((r) => r.id === refeicaoInicial)?.nome ?? '';

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Adicionar</h1>
          <p className="sub">em {nomeRefeicao.toLowerCase()}</p>
        </div>
      </div>

      <div className="busca-campo">
        <input
          ref={campoRef}
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="arroz, frango, banana..."
          autoComplete="off"
          enterKeyHint="search"
        />
        <button
          className="icone-btn"
          onClick={() => setScanner(true)}
          aria-label="Ler código de barras"
        >
          <IconeCodigoBarras />
        </button>
      </div>

      {!consulta && usados.length > 0 && (
        <>
          <div className="cartao-titulo">O que você mais come</div>
          {usados.map((a) => (
            <Resultado key={a.id} alimento={a} onEscolher={setEscolhido} />
          ))}
        </>
      )}

      {!consulta && usados.length === 0 && (
        <div className="centro-txt">
          Busque pelo nome do alimento.
          <br />
          São 633 itens embutidos — a tabela TACO e uma seleção da USDA — e o leitor de código de
          barras acha os industrializados.
        </div>
      )}

      {consulta && (
        <>
          {locais.length > 0 && <div className="cartao-titulo">Tabela TACO</div>}
          {locais.map((a) => (
            <Resultado key={a.id} alimento={a} onEscolher={setEscolhido} />
          ))}

          {(produtos.length > 0 || buscandoOff) && (
            <div className="cartao-titulo" style={{ marginTop: 18 }}>
              Produtos com código de barras {buscandoOff && '· buscando...'}
            </div>
          )}
          {produtos.map((a) => (
            <Resultado key={a.id} alimento={a} onEscolher={setEscolhido} />
          ))}

          {locais.length === 0 && produtos.length === 0 && !buscandoOff && (
            <div className="centro-txt">
              Nada encontrado para &ldquo;{consulta}&rdquo;.
              <br />
              Tente o nome simples (&ldquo;frango&rdquo;, &ldquo;arroz&rdquo;) ou cadastre o
              alimento.
            </div>
          )}
        </>
      )}

      <button className="btn bloco" style={{ marginTop: 16 }} onClick={() => setCriando(true)}>
        Cadastrar um alimento meu
      </button>

      {escolhido && (
        <AdicionarSheet
          alimento={escolhido}
          data={data}
          refeicaoInicial={refeicaoInicial}
          medidasUsuario={estado.medidasUsuario}
          onFechar={() => setEscolhido(null)}
          onAdicionado={() => {
            setEscolhido(null);
            setConsulta('');
            onDepoisDeAdicionar();
          }}
        />
      )}

      {scanner && (
        <Scanner
          onFechar={() => setScanner(false)}
          onProduto={(p) => {
            setScanner(false);
            setEscolhido(p);
          }}
        />
      )}

      {criando && (
        <CriarAlimento
          onFechar={() => setCriando(false)}
          onCriado={(a) => {
            setCriando(false);
            setEscolhido(a);
          }}
        />
      )}
    </>
  );
}
