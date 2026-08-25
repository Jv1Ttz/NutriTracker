import { REFEICOES } from '../lib/calculo.js';
import { medidasDe } from '../lib/medidas.js';
import { inteiro } from '../lib/util.js';

/**
 * Bloco compartilhado por "adicionar alimento" e "editar item do diario":
 * quantidade + medidas caseiras + refeicao + previa dos valores.
 */
export default function EditorPorcao({
  alimento,
  por100,
  qtd,
  setQtd,
  refeicao,
  setRefeicao,
  medidasUsuario,
}) {
  const medidas = medidasDe(alimento, medidasUsuario);
  const q = Number(String(qtd).replace(',', '.')) || 0;
  const f = q / 100;

  return (
    <>
      <div className="campo" style={{ marginTop: 12 }}>
        <label htmlFor="qtd">Quantidade (gramas ou ml)</label>
        <input
          id="qtd"
          type="number"
          inputMode="decimal"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {medidas.map((m) => (
          <button
            key={`${m.label}-${m.g}`}
            className={`chip ${q === m.g ? 'marcado' : ''}`}
            onClick={() => setQtd(String(m.g))}
          >
            {m.label}
          </button>
        ))}
      </div>

      {setRefeicao && (
        <div className="campo">
          <label>Em qual refeição</label>
          <div className="chips">
            {REFEICOES.map((r) => (
              <button
                key={r.id}
                className={`chip ${refeicao === r.id ? 'marcado' : ''}`}
                onClick={() => setRefeicao(r.id)}
              >
                {r.emoji} {r.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="cartao" style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="sub">Vai somar</span>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {inteiro((por100.kcal ?? 0) * f)}
            <span className="sub" style={{ fontSize: 13, fontWeight: 400 }}>
              {' '}
              kcal
            </span>
          </span>
        </div>
        <div
          className="linha"
          style={{
            textAlign: 'center',
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--borda)',
          }}
        >
          {[
            ['Proteína', (por100.prot ?? 0) * f, 'var(--prot)'],
            ['Carbo', (por100.carb ?? 0) * f, 'var(--carb)'],
            ['Gordura', (por100.gord ?? 0) * f, 'var(--gord)'],
          ].map(([nome, valor, cor]) => (
            <div key={nome}>
              <div style={{ color: cor, fontSize: 17, fontWeight: 620 }}>{inteiro(valor)} g</div>
              <div className="sub" style={{ fontSize: 11 }}>
                {nome}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
