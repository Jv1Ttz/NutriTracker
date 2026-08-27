import { useState, useEffect } from 'react';
import Folha from './Folha.jsx';
import EditorPorcao from './EditorPorcao.jsx';
import { adicionarItem, salvarCustom, lerEstado } from '../lib/db.js';
import { inteiro } from '../lib/util.js';
import { buscarFoto } from '../lib/openfoodfacts.js';

export default function AdicionarSheet({
  alimento,
  data,
  refeicaoInicial,
  medidasUsuario,
  onFechar,
  onAdicionado,
}) {
  const sugestao = lerEstado().ultimaQtd[alimento.id];
  const [qtd, setQtd] = useState(String(sugestao ?? alimento.medidas?.[0]?.g ?? 100));
  const [refeicao, setRefeicao] = useState(refeicaoInicial);

  /**
   * Foto do produto, buscada so aqui - quando a pessoa JA escolheu o item.
   *
   * Na lista de resultados custaria caro: sao ate 60 produtos por busca, a
   * uns 3 kB de miniatura cada, entao 240 kB a cada termo digitado. E no
   * mercado com sinal fraco, que e onde o app mais serve, a lista apareceria
   * com sessenta buracos no lugar das fotos.
   *
   * Aqui e uma requisicao, quando ela tem a funcao mais util que a foto pode
   * ter: confirmar que e a embalagem que voce esta segurando.
   */
  const [foto, setFoto] = useState(alimento.imagem ?? null);
  useEffect(() => {
    if (foto || alimento.fonte !== 'off' || !alimento.codigo) return;
    const ctrl = new AbortController();
    buscarFoto(alimento.codigo, ctrl.signal).then((u) => u && setFoto(u));
    return () => ctrl.abort();
  }, [alimento.codigo, alimento.fonte, foto]);

  function confirmar() {
    const q = Number(String(qtd).replace(',', '.'));
    if (!(q > 0)) return;
    // produtos vindos do Open Food Facts entram na base pessoal para
    // aparecerem na busca sem precisar de internet da proxima vez
    if (alimento.fonte === 'off') salvarCustom(alimento);
    adicionarItem(data, refeicao, alimento, q);
    onAdicionado();
  }

  return (
    <Folha onFechar={onFechar} rotulo="Adicionar alimento">
      {/* Carrega de imediato, sem `lazy`: a folha acabou de abrir e a foto ja
          esta na tela. Lazy serve para lista longa; aqui so atrasaria o que a
          pessoa esta olhando. */}
      {foto && (
        <img
          className="foto-produto"
          src={foto}
          alt=""
          decoding="async"
          onError={() => setFoto(null)}
        />
      )}

      <h2>{alimento.nome}</h2>
      <p className="sub">
        {alimento.marca ? `${alimento.marca} · ` : ''}
        {inteiro(alimento.kcal)} kcal por 100 g · {alimento.categoria}
      </p>

      {alimento.fonte === 'off' && !alimento.completo && (
        <div className="aviso" style={{ marginTop: 12 }}>
          Faltam informações neste produto. Confira o rótulo antes de confiar no número.
        </div>
      )}

      {alimento.origem && (
        <div className="aviso info" style={{ marginTop: 12 }}>
          {alimento.fonte === 'usda'
            ? 'Este alimento não está na tabela brasileira. Os valores vêm de uma base internacional.'
            : 'Os valores deste item vieram de outra fonte, porque a tabela brasileira não os traz.'}
        </div>
      )}

      <EditorPorcao
        alimento={alimento}
        por100={alimento}
        qtd={qtd}
        setQtd={setQtd}
        refeicao={refeicao}
        setRefeicao={setRefeicao}
        medidasUsuario={medidasUsuario}
      />

      <button className="btn principal bloco" onClick={confirmar}>
        Adicionar
      </button>
    </Folha>
  );
}
