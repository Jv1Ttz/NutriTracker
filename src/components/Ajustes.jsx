import { useState } from 'react';
import {
  salvarPerfil,
  salvarMetasManuais,
  exportar,
  importar,
  apagarTudo,
  removerCustom,
} from '../lib/db.js';
import { FATORES, OBJETIVOS, calcularMetas } from '../lib/metas.js';
import Conta from './Conta.jsx';
import { obterSupabase } from '../lib/supabase.js';
import { chaveData, inteiro } from '../lib/util.js';
import { IconeLixo } from './Icones.jsx';

export default function Ajustes({ estado, metas }) {
  const [perfil, setPerfil] = useState(estado.perfil);
  const [salvo, setSalvo] = useState(false);
  const [manuais, setManuais] = useState(
    estado.metasManuais ?? { kcal: metas.kcal, prot: metas.prot, carb: metas.carb, gord: metas.gord }
  );
  const usaManuais = !!estado.metasManuais;

  const num = (v) => Number(String(v).replace(',', '.')) || 0;
  const previa = calcularMetas({
    ...perfil,
    idade: num(perfil.idade),
    altura: num(perfil.altura),
    peso: num(perfil.peso),
  });

  function salvarDados() {
    salvarPerfil({
      ...perfil,
      idade: num(perfil.idade),
      altura: num(perfil.altura),
      peso: num(perfil.peso),
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  function baixarBackup() {
    const blob = new Blob([exportar()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutritracker-${chaveData()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function subirBackup(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    try {
      importar(await arquivo.text());
      alert('Backup restaurado.');
    } catch (err) {
      alert(`Arquivo inválido: ${err.message}`);
    }
    e.target.value = '';
  }

  async function zerar() {
    if (!confirm('Isso apaga perfil, diário, pesos e alimentos cadastrados deste aparelho, e sai da conta. Tem certeza?')) return;
    if (!confirm('Última chance: não dá para desfazer. Apagar mesmo?')) return;
    // Sair da conta ANTES de apagar. Mantendo a sessão, a sincronização
    // seguinte baixaria tudo de volta e o botão simplesmente não teria
    // efeito - o usuário mandaria apagar e veria os dados reaparecerem.
    try {
      const sb = await obterSupabase();
      await sb?.auth.signOut();
    } catch (e) {
      console.warn('Não consegui encerrar a sessão:', e.message);
    }
    apagarTudo();
  }

  return (
    <>
      <div className="cabecalho">
        <h1>Ajustes</h1>
      </div>

      <div className="cartao">
        <div className="cartao-titulo">Seus dados</div>

        <div className="linha">
          <div className="campo">
            <label htmlFor="a-idade">Idade</label>
            <input
              id="a-idade"
              type="number"
              inputMode="numeric"
              value={perfil.idade}
              onChange={(e) => setPerfil({ ...perfil, idade: e.target.value })}
            />
          </div>
          <div className="campo">
            <label htmlFor="a-altura">Altura (cm)</label>
            <input
              id="a-altura"
              type="number"
              inputMode="numeric"
              value={perfil.altura}
              onChange={(e) => setPerfil({ ...perfil, altura: e.target.value })}
            />
          </div>
          <div className="campo">
            <label htmlFor="a-peso">Peso (kg)</label>
            <input
              id="a-peso"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={perfil.peso}
              onChange={(e) => setPerfil({ ...perfil, peso: e.target.value })}
            />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="a-ativ">Nível de atividade</label>
          <select
            id="a-ativ"
            value={perfil.atividade}
            onChange={(e) => setPerfil({ ...perfil, atividade: e.target.value })}
          >
            {Object.entries(FATORES).map(([id, f]) => (
              <option key={id} value={id}>
                {f.label} — {f.desc}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="a-obj">Objetivo</label>
          <select
            id="a-obj"
            value={perfil.objetivo}
            onChange={(e) => setPerfil({ ...perfil, objetivo: e.target.value })}
          >
            {Object.entries(OBJETIVOS).map(([id, o]) => (
              <option key={id} value={id}>
                {o.label} — {o.ritmo}
              </option>
            ))}
          </select>
        </div>

        <p className="sub" style={{ marginBottom: 12 }}>
          Com esses dados a meta calculada é <b>{previa.kcal} kcal</b> (basal {previa.tmb}, gasto
          total {previa.get}).
        </p>

        <button className="btn principal bloco" onClick={salvarDados}>
          {salvo ? 'Salvo!' : 'Salvar dados'}
        </button>
      </div>

      <div className="cartao">
        <div className="cartao-titulo">Metas</div>
        <p className="sub" style={{ marginBottom: 12 }}>
          {usaManuais
            ? 'Você está usando metas definidas na mão.'
            : 'As metas estão sendo calculadas automaticamente pelo seu perfil.'}
        </p>

        <div className="linha">
          {[
            ['kcal', 'Calorias'],
            ['prot', 'Proteína'],
            ['carb', 'Carbo'],
            ['gord', 'Gordura'],
          ].map(([id, label]) => (
            <div className="campo" key={id}>
              <label htmlFor={`m-${id}`}>{label}</label>
              <input
                id={`m-${id}`}
                type="number"
                inputMode="numeric"
                value={manuais[id]}
                onChange={(e) => setManuais({ ...manuais, [id]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <div className="linha">
          <button className="btn" onClick={() => salvarMetasManuais(null)} disabled={!usaManuais}>
            Voltar ao automático
          </button>
          <button
            className="btn principal"
            onClick={() =>
              salvarMetasManuais({
                kcal: inteiro(manuais.kcal),
                prot: inteiro(manuais.prot),
                carb: inteiro(manuais.carb),
                gord: inteiro(manuais.gord),
              })
            }
          >
            Fixar essas metas
          </button>
        </div>
      </div>

      {estado.customs.length > 0 && (
        <div className="cartao">
          <div className="cartao-titulo">Meus alimentos ({estado.customs.length})</div>
          {estado.customs.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderTop: '1px solid var(--borda)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="item-nome">{c.nome}</div>
                <div className="item-det">
                  {inteiro(c.kcal)} kcal/100 g{c.marca ? ` · ${c.marca}` : ''}
                </div>
              </div>
              <button
                className="icone-btn"
                style={{ width: 32, height: 32 }}
                onClick={() => removerCustom(c.id)}
                aria-label={`Remover ${c.nome}`}
              >
                <IconeLixo style={{ width: 15, height: 15 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Conta />

      <div className="cartao">
        <div className="cartao-titulo">Seus dados são só seus</div>
        <p className="sub" style={{ marginBottom: 12, lineHeight: 1.55 }}>
          Por padrão tudo fica salvo no próprio navegador deste aparelho: sem servidor, sem conta,
          sem ninguém vendo. Se você ligar a sincronização acima, aí o diário passa a viajar por
          uma conta sua — e continua só sua, ninguém mais alcança esses dados.
        </p>
        <p className="sub" style={{ marginBottom: 12, lineHeight: 1.55 }}>
          De um jeito ou de outro, vale baixar um backup de vez em quando: limpar os dados do
          navegador apaga a cópia deste aparelho.
        </p>
        <div className="linha">
          <button className="btn" onClick={baixarBackup}>
            Baixar backup
          </button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            Restaurar
            <input type="file" accept="application/json" hidden onChange={subirBackup} />
          </label>
        </div>
      </div>

      <div className="cartao">
        <div className="cartao-titulo">Sobre os números</div>
        <p className="sub" style={{ lineHeight: 1.55 }}>
          Os alimentos vêm da <b>TACO 4ª edição</b> (UNICAMP, 2011) e do{' '}
          <b>Open Food Facts</b> para produtos com código de barras. A meta calórica usa a equação
          de <b>Mifflin-St Jeor</b>, que é uma estimativa populacional: o seu gasto real pode variar
          uns 10% para cima ou para baixo. Quem dá a palavra final é a balança ao longo das semanas.
          Isto aqui é uma ferramenta de acompanhamento, não substitui nutricionista ou médico.
        </p>
      </div>

      <button className="btn perigo bloco" onClick={zerar}>
        Apagar todos os dados
      </button>

      <p className="sub" style={{ textAlign: 'center', marginTop: 18 }}>
        <a href="/privacidade.html">Política de Privacidade</a>
        {' · '}
        <a href="/termos.html">Termos de Serviço</a>
      </p>
    </>
  );
}
