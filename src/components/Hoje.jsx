import { useState } from 'react';
import Anel from './Anel.jsx';
import ItemSheet from './ItemSheet.jsx';
import { REFEICOES, somar, valoresItem } from '../lib/calculo.js';
import { copiarDia } from '../lib/db.js';
import { chaveData, somarDias, rotuloData, inteiro, decimal } from '../lib/util.js';
import { IconeEsquerda, IconeDireita, IconeRepetir, IconeMais, ICONE_REFEICAO } from './Icones.jsx';

function Macro({ nome, consumido, meta, cor }) {
  const pct = meta > 0 ? Math.min((consumido / meta) * 100, 100) : 0;
  const passou = consumido > meta;
  return (
    <div>
      <div className="macro-topo">
        <span className="macro-nome">{nome}</span>
        <span className="macro-val">
          <b style={passou ? { color: 'var(--gord)' } : undefined}>{inteiro(consumido)}</b> /{' '}
          {inteiro(meta)} g
        </span>
      </div>
      <div className="barra">
        <i style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}

export default function Hoje({ estado, metas, data, setData, onAdicionar }) {
  const [itemAberto, setItemAberto] = useState(null);
  const itens = estado.diario[data] ?? [];
  const total = somar(itens);
  const hoje = chaveData();

  const ontem = somarDias(data, -1);
  const temOntem = (estado.diario[ontem] ?? []).length > 0;

  return (
    <>
      <div className="cabecalho">
        <div className="navdata" style={{ width: '100%' }}>
          <button onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">
            <IconeEsquerda />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 19 }}>{rotuloData(data)}</h1>
            {data !== hoje && (
              <button className="sub" onClick={() => setData(hoje)} style={{ padding: 0 }}>
                voltar para hoje
              </button>
            )}
          </div>
          <button
            onClick={() => setData(somarDias(data, 1))}
            disabled={data >= somarDias(hoje, 1)}
            aria-label="Próximo dia"
          >
            <IconeDireita />
          </button>
        </div>
      </div>

      <div className="cartao">
        <div className="resumo">
          <Anel consumido={total.kcal} meta={metas.kcal} />
          <div className="macros">
            <Macro nome="Proteína" consumido={total.prot} meta={metas.prot} cor="var(--prot)" />
            <Macro nome="Carboidrato" consumido={total.carb} meta={metas.carb} cor="var(--carb)" />
            <Macro nome="Gordura" consumido={total.gord} meta={metas.gord} cor="var(--gord)" />
          </div>
        </div>
        <div
          className="sub"
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--borda)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Consumido: <b className="mono">{inteiro(total.kcal)}</b> de {metas.kcal} kcal
          </span>
          <span>
            Fibra <b className="mono">{inteiro(total.fibra)}</b> g
          </span>
        </div>
      </div>

      {REFEICOES.map((r) => {
        const doGrupo = itens.filter((i) => i.refeicao === r.id);
        const kcalGrupo = somar(doGrupo).kcal;
        return (
          <section className="refeicao" key={r.id}>
            <div className="refeicao-topo">
              <div className="refeicao-nome">
                {ICONE_REFEICAO[r.id]?.({ width: 17, height: 17, 'aria-hidden': 'true' })}
                {r.nome}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="refeicao-kcal mono">{inteiro(kcalGrupo)} kcal</span>
                <button
                  className="btn-add"
                  onClick={() => onAdicionar(r.id)}
                  aria-label={`Adicionar em ${r.nome}`}
                >
                  <IconeMais width={17} height={17} />
                </button>
              </div>
            </div>

            {doGrupo.length === 0 ? (
              <div className="vazio">Nada registrado.</div>
            ) : (
              doGrupo.map((item) => {
                const v = valoresItem(item);
                return (
                  <button className="item" key={item.uid} onClick={() => setItemAberto(item)}>
                    <div className="item-info">
                      <div className="item-nome">{item.nome}</div>
                      <div className="item-det">
                        {decimal(item.qtd, 0)} g · P {inteiro(v.prot)} · C {inteiro(v.carb)} · G{' '}
                        {inteiro(v.gord)}
                      </div>
                    </div>
                    <div className="item-kcal mono">{inteiro(v.kcal)}</div>
                  </button>
                );
              })
            )}
          </section>
        );
      })}

      {itens.length === 0 && temOntem && (
        <button
          className="btn bloco"
          style={{ marginTop: 6 }}
          onClick={() => copiarDia(ontem, data)}
        >
          <IconeRepetir style={{ width: 17, height: 17 }} />
          Repetir tudo que comi ontem
        </button>
      )}

      {itemAberto && (
        <ItemSheet
          item={itemAberto}
          data={data}
          onFechar={() => setItemAberto(null)}
        />
      )}
    </>
  );
}
