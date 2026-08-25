import { useState } from 'react';
import Folha from './Folha.jsx';
import EditorPorcao from './EditorPorcao.jsx';
import { adicionarItem, salvarCustom, lerEstado } from '../lib/db.js';
import { inteiro } from '../lib/util.js';

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
      <h2>{alimento.nome}</h2>
      <p className="sub">
        {alimento.marca ? `${alimento.marca} · ` : ''}
        {inteiro(alimento.kcal)} kcal por 100 g · {alimento.categoria}
      </p>

      {alimento.fonte === 'off' && !alimento.completo && (
        <div className="aviso" style={{ marginTop: 12 }}>
          Esse produto está incompleto no Open Food Facts. Confira os valores no rótulo antes de
          confiar no número.
        </div>
      )}

      {alimento.origem && (
        <div className="aviso info" style={{ marginTop: 12 }}>
          {alimento.fonte === 'usda'
            ? `Esse item não está na TACO. Os valores vêm da ${alimento.origem}.`
            : `A TACO não traz os valores desse item. Usei os dados de: ${alimento.origem}.`}
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
