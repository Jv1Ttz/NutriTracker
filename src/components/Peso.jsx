import { useState, useMemo } from 'react';
import { registrarPeso, removerPeso, salvarMetasManuais } from '../lib/db.js';
import { mediaMovel } from '../lib/calculo.js';
import { sugerirAjuste, imc, faixaIMC, OBJETIVOS } from '../lib/metas.js';
import { chaveData, dataCurta, decimal } from '../lib/util.js';
import { IconeLixo } from './Icones.jsx';

const L = 34; // margem esquerda para os rotulos do eixo
const A = 340;
const ALT = 170;

function Grafico({ serie }) {
  const pontos = mediaMovel(serie, 7);
  const valores = pontos.flatMap((p) => [p.peso, p.media]);
  const min = Math.min(...valores) - 0.4;
  const max = Math.max(...valores) + 0.4;
  const faixa = max - min || 1;

  const x = (i) => L + (i / Math.max(pontos.length - 1, 1)) * (A - L - 8);
  const y = (v) => 14 + (1 - (v - min) / faixa) * (ALT - 40);

  const linhaMedia = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.media)}`).join(' ');
  const area = `${linhaMedia} L${x(pontos.length - 1)},${ALT - 22} L${x(0)},${ALT - 22} Z`;

  return (
    <svg className="grafico" viewBox={`0 0 ${A} ${ALT}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="deg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--kcal)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--kcal)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[max, (max + min) / 2, min].map((v) => (
        <g key={v}>
          <line x1={L} x2={A - 8} y1={y(v)} y2={y(v)} stroke="var(--borda)" strokeWidth="1" />
          <text x="2" y={y(v) + 4} fill="var(--txt3)" fontSize="10">
            {decimal(v)}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#deg)" />
      <path
        d={linhaMedia}
        fill="none"
        stroke="var(--kcal)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {pontos.map((p, i) => (
        <circle key={p.data} cx={x(i)} cy={y(p.peso)} r="2.6" fill="var(--txt3)" />
      ))}

      <text x={L} y={ALT - 6} fill="var(--txt3)" fontSize="10">
        {dataCurta(pontos[0].data)}
      </text>
      <text x={A - 8} y={ALT - 6} fill="var(--txt3)" fontSize="10" textAnchor="end">
        {dataCurta(pontos[pontos.length - 1].data)}
      </text>
    </svg>
  );
}

export default function Peso({ estado, metas }) {
  const hoje = chaveData();
  const doDia = estado.pesos.find((p) => p.data === hoje);
  const [valor, setValor] = useState(doDia ? String(doDia.peso) : '');

  const serie = useMemo(
    () => [...estado.pesos].sort((a, b) => a.data.localeCompare(b.data)),
    [estado.pesos]
  );

  const sugestao = useMemo(
    () =>
      sugerirAjuste({
        pesos: serie,
        metaKcal: metas.kcal,
        objetivo: estado.perfil.objetivo,
      }),
    [serie, metas.kcal, estado.perfil.objetivo]
  );

  const primeiro = serie[0];
  const ultimo = serie[serie.length - 1];
  const delta = primeiro && ultimo ? ultimo.peso - primeiro.peso : 0;

  function salvar() {
    const p = Number(String(valor).replace(',', '.'));
    if (!(p > 20 && p < 400)) return;
    registrarPeso(hoje, p);
  }

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Peso</h1>
          <p className="sub">Pese sempre em jejum, depois do banheiro. Sempre no mesmo horário.</p>
        </div>
      </div>

      <div className="cartao">
        <div className="cartao-titulo">Registro de hoje</div>
        <div className="linha">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="kg"
            style={{
              padding: '12px 14px',
              background: 'var(--sup2)',
              border: '1px solid var(--borda)',
              borderRadius: 'var(--r-sm)',
              outline: 'none',
              width: '100%',
            }}
          />
          <button className="btn principal" onClick={salvar} style={{ flex: '0 0 110px' }}>
            {doDia ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
        {ultimo && (
          <p className="sub" style={{ marginTop: 12 }}>
            IMC {decimal(imc(ultimo.peso, estado.perfil.altura))} ·{' '}
            <span style={{ color: faixaIMC(imc(ultimo.peso, estado.perfil.altura)).cor }}>
              {faixaIMC(imc(ultimo.peso, estado.perfil.altura)).label}
            </span>
          </p>
        )}
      </div>

      {serie.length >= 2 && (
        <div className="cartao">
          <div className="cartao-titulo">
            Tendência · {delta >= 0 ? '+' : ''}
            {decimal(delta)} kg desde {dataCurta(primeiro.data)}
          </div>
          <Grafico serie={serie} />
          <p className="sub" style={{ marginTop: 8, lineHeight: 1.5 }}>
            A linha é a média dos últimos 7 dias. Os pontinhos são as pesagens do dia. O peso
            oscila 1 a 2 kg por água e intestino: olhe a linha, não o ponto.
          </p>
        </div>
      )}

      {sugestao && (
        <div className={`aviso ${sugestao.status === 'ok' ? 'info' : ''}`}>
          <b>Em {sugestao.dias} dias você variou {decimal(sugestao.kgPorSemana)} kg por semana.</b>
          <br />
          Seu objetivo é &ldquo;{OBJETIVOS[estado.perfil.objetivo].label}&rdquo; (
          {OBJETIVOS[estado.perfil.objetivo].ritmo}). {sugestao.mensagem}
          {sugestao.novaMeta && (
            <button
              className="btn pequeno"
              style={{ marginTop: 10, display: 'block' }}
              onClick={() =>
                salvarMetasManuais({
                  kcal: sugestao.novaMeta,
                  prot: metas.prot,
                  gord: metas.gord,
                  // proteina e gordura ficam onde estao; a diferenca sai do carbo
                  carb: Math.max(
                    30,
                    Math.round((sugestao.novaMeta - metas.prot * 4 - metas.gord * 9) / 4)
                  ),
                })
              }
            >
              Aplicar {sugestao.novaMeta} kcal
            </button>
          )}
        </div>
      )}

      {serie.length > 0 && (
        <div className="cartao">
          <div className="cartao-titulo">Histórico</div>
          {[...serie].reverse().slice(0, 20).map((p) => (
            <div
              key={p.data}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 0',
                borderTop: '1px solid var(--borda)',
              }}
            >
              <span className="sub">{dataCurta(p.data)}</span>
              <span className="mono">{decimal(p.peso)} kg</span>
              <button
                className="icone-btn"
                style={{ width: 30, height: 30 }}
                onClick={() => removerPeso(p.data)}
                aria-label={`Remover pesagem de ${dataCurta(p.data)}`}
              >
                <IconeLixo style={{ width: 15, height: 15 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {serie.length < 2 && (
        <div className="centro-txt">
          Registre o peso alguns dias seguidos.
          <br />
          Com 14 dias de dados eu comparo o ritmo real com o esperado e sugiro o ajuste nas
          calorias.
        </div>
      )}
    </>
  );
}
