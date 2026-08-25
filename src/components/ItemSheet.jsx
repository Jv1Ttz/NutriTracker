import { useState } from 'react';
import Folha from './Folha.jsx';
import EditorPorcao from './EditorPorcao.jsx';
import { atualizarItem, removerItem, useStore } from '../lib/db.js';
import { porId } from '../lib/busca.js';
import { IconeLixo } from './Icones.jsx';

export default function ItemSheet({ item, data, onFechar }) {
  const estado = useStore();
  const [qtd, setQtd] = useState(String(item.qtd));
  const [refeicao, setRefeicao] = useState(item.refeicao);
  const alimento = porId(item.alimentoId, estado.customs);

  function salvar() {
    const q = Number(String(qtd).replace(',', '.'));
    if (!(q > 0)) return;
    atualizarItem(data, item.uid, { qtd: q, refeicao });
    onFechar();
  }

  function excluir() {
    removerItem(data, item.uid);
    onFechar();
  }

  return (
    <Folha onFechar={onFechar} rotulo="Editar item">
      <h2>{item.nome}</h2>
      <p className="sub">
        {item.marca ? `${item.marca} · ` : ''}
        {item.por100.kcal} kcal por 100 g
      </p>

      <EditorPorcao
        alimento={alimento}
        por100={item.por100}
        qtd={qtd}
        setQtd={setQtd}
        refeicao={refeicao}
        setRefeicao={setRefeicao}
        medidasUsuario={estado.medidasUsuario}
      />

      <div className="linha" style={{ marginTop: 6 }}>
        <button className="btn perigo" onClick={excluir} style={{ flex: '0 0 58px' }}>
          <IconeLixo style={{ width: 18, height: 18 }} />
        </button>
        <button className="btn principal" onClick={salvar}>
          Salvar
        </button>
      </div>
    </Folha>
  );
}
