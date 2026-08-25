import { useState } from 'react';
import { salvarPerfil } from '../lib/db.js';
import { FATORES, OBJETIVOS, calcularMetas, imc, faixaIMC } from '../lib/metas.js';
import { decimal } from '../lib/util.js';

const PASSOS = ['Você', 'Rotina', 'Objetivo', 'Metas'];

export default function Onboarding() {
  const [passo, setPasso] = useState(0);
  const [form, setForm] = useState({
    nome: '',
    sexo: 'masculino',
    idade: '',
    altura: '',
    peso: '',
    atividade: 'leve',
    objetivo: 'perder',
  });

  const muda = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const perfil = {
    ...form,
    idade: Number(form.idade),
    altura: Number(form.altura),
    peso: Number(form.peso.replace(',', '.')),
  };

  const dadosOk =
    perfil.idade >= 10 &&
    perfil.idade <= 110 &&
    perfil.altura >= 100 &&
    perfil.altura <= 250 &&
    perfil.peso >= 25 &&
    perfil.peso <= 400;

  const metas = dadosOk ? calcularMetas(perfil) : null;

  return (
    <div className="app">
      <main className="conteudo">
        <div className="cabecalho">
          <div>
            <h1>NutriTracker</h1>
            <p className="sub">
              Passo {passo + 1} de {PASSOS.length} · {PASSOS[passo]}
            </p>
          </div>
        </div>

        <div className="barra" style={{ marginBottom: 22 }}>
          <i
            style={{
              width: `${((passo + 1) / PASSOS.length) * 100}%`,
              background: 'var(--kcal)',
            }}
          />
        </div>

        {passo === 0 && (
          <div className="cartao">
            <div className="campo">
              <label htmlFor="nome">Como quer ser chamado? (opcional)</label>
              <input id="nome" value={form.nome} onChange={muda('nome')} placeholder="Seu nome" />
            </div>

            <div className="campo">
              <label>Sexo biológico</label>
              <p className="sub" style={{ marginBottom: 8 }}>
                A fórmula de gasto energético usa esse dado.
              </p>
              <div className="chips">
                {['masculino', 'feminino'].map((s) => (
                  <button
                    key={s}
                    className={`chip ${form.sexo === s ? 'marcado' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, sexo: s }))}
                  >
                    {s === 'masculino' ? 'Masculino' : 'Feminino'}
                  </button>
                ))}
              </div>
            </div>

            <div className="linha">
              <div className="campo">
                <label htmlFor="idade">Idade</label>
                <input
                  id="idade"
                  type="number"
                  inputMode="numeric"
                  value={form.idade}
                  onChange={muda('idade')}
                  placeholder="anos"
                />
              </div>
              <div className="campo">
                <label htmlFor="altura">Altura</label>
                <input
                  id="altura"
                  type="number"
                  inputMode="numeric"
                  value={form.altura}
                  onChange={muda('altura')}
                  placeholder="cm"
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="peso">Peso atual (kg)</label>
              <input
                id="peso"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.peso}
                onChange={muda('peso')}
                placeholder="kg"
              />
            </div>

            {dadosOk && (
              <p className="sub">
                IMC {decimal(imc(perfil.peso, perfil.altura))} ·{' '}
                <span style={{ color: faixaIMC(imc(perfil.peso, perfil.altura)).cor }}>
                  {faixaIMC(imc(perfil.peso, perfil.altura)).label}
                </span>
              </p>
            )}
          </div>
        )}

        {passo === 1 && (
          <div className="cartao">
            <div className="cartao-titulo">Quanto você se mexe</div>
            <div className="opcoes">
              {Object.entries(FATORES).map(([id, f]) => (
                <button
                  key={id}
                  className={`opcao ${form.atividade === id ? 'marcada' : ''}`}
                  onClick={() => setForm((x) => ({ ...x, atividade: id }))}
                >
                  <div className="opcao-txt">
                    <b>{f.label}</b>
                    <span>{f.desc}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 12 }}>
              Na dúvida, escolha o mais baixo. É melhor errar para menos e ajustar depois pela
              balança.
            </p>
          </div>
        )}

        {passo === 2 && (
          <div className="cartao">
            <div className="cartao-titulo">O que você quer</div>
            <div className="opcoes">
              {Object.entries(OBJETIVOS).map(([id, o]) => (
                <button
                  key={id}
                  className={`opcao ${form.objetivo === id ? 'marcada' : ''}`}
                  onClick={() => setForm((x) => ({ ...x, objetivo: id }))}
                >
                  <div className="opcao-txt">
                    <b>{o.label}</b>
                    <span>{o.ritmo}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {passo === 3 && metas && (
          <>
            <div className="cartao">
              <div className="cartao-titulo">Sua meta diária</div>
              <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
                <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em' }}>
                  {metas.kcal}
                </div>
                <div className="sub">kcal por dia</div>
              </div>
              <div className="linha" style={{ textAlign: 'center' }}>
                {[
                  ['Proteína', metas.prot, 'var(--prot)'],
                  ['Carbo', metas.carb, 'var(--carb)'],
                  ['Gordura', metas.gord, 'var(--gord)'],
                ].map(([nome, valor, cor]) => (
                  <div key={nome}>
                    <div style={{ color: cor, fontSize: 20, fontWeight: 650 }}>{valor} g</div>
                    <div className="sub">{nome}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cartao">
              <div className="cartao-titulo">De onde vem esse número</div>
              <p className="sub" style={{ lineHeight: 1.6 }}>
                Seu metabolismo basal (só para existir) é de <b>{metas.tmb} kcal</b>. Somando sua
                rotina, o gasto estimado sobe para <b>{metas.get} kcal</b>. O objetivo
                &ldquo;{OBJETIVOS[form.objetivo].label}&rdquo; aplica o ajuste que chega em{' '}
                <b>{metas.kcal} kcal</b>.
              </p>
            </div>

            {metas.limitadaPeloPiso && (
              <div className="aviso">
                O cálculo daria menos que {metas.piso} kcal. Limitei nesse valor: déficits muito
                agressivos costumam custar massa muscular e são difíceis de sustentar. Se quiser ir
                abaixo disso, vale conversar com um nutricionista.
              </div>
            )}

            <div className="aviso info">
              Isso é uma <b>estimativa</b>. O número real aparece nas próximas 2 a 3 semanas: se o
              peso não se mexer no ritmo esperado, o app sugere o ajuste na aba Peso.
            </div>
          </>
        )}

        <div className="linha" style={{ marginTop: 18 }}>
          {passo > 0 && (
            <button className="btn" onClick={() => setPasso((p) => p - 1)}>
              Voltar
            </button>
          )}
          {passo < 3 ? (
            <button
              className="btn principal"
              disabled={passo === 0 && !dadosOk}
              style={passo === 0 && !dadosOk ? { opacity: 0.4 } : undefined}
              onClick={() => dadosOk && setPasso((p) => p + 1)}
            >
              Continuar
            </button>
          ) : (
            <button className="btn principal" onClick={() => salvarPerfil(perfil)}>
              Começar
            </button>
          )}
        </div>

        {passo === 0 && !dadosOk && (form.idade || form.altura || form.peso) && (
          <p className="sub" style={{ marginTop: 10, textAlign: 'center' }}>
            Preencha idade, altura e peso com valores plausíveis para continuar.
          </p>
        )}
      </main>
    </div>
  );
}
