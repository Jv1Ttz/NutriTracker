import { useState } from 'react';
import Folha from './Folha.jsx';
import { salvarCustom } from '../lib/db.js';
import { normalizar, uid } from '../lib/util.js';

const CAMPOS = [
  { id: 'kcal', label: 'Calorias (kcal)', obrigatorio: true },
  { id: 'prot', label: 'Proteína (g)' },
  { id: 'carb', label: 'Carboidrato (g)' },
  { id: 'gord', label: 'Gordura (g)' },
  { id: 'fibra', label: 'Fibra (g)' },
];

/** Cadastro manual: para receita própria ou produto que não está em base nenhuma. */
export default function CriarAlimento({ onFechar, onCriado }) {
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [porcao, setPorcao] = useState('');
  const [vals, setVals] = useState({ kcal: '', prot: '', carb: '', gord: '', fibra: '' });

  const n = (v) => Number(String(v).replace(',', '.')) || 0;
  const valido = nome.trim().length >= 2 && n(vals.kcal) > 0;

  function criar() {
    if (!valido) return;
    const medidas = [];
    const p = n(porcao);
    if (p > 0) medidas.push({ label: `1 porção (${p} g)`, g: p });

    const alimento = {
      id: `custom-${uid()}`,
      nome: nome.trim(),
      marca: marca.trim() || null,
      categoria: 'Meus alimentos',
      busca: normalizar(`${nome} ${marca}`),
      kcal: n(vals.kcal),
      prot: n(vals.prot),
      carb: n(vals.carb),
      gord: n(vals.gord),
      fibra: n(vals.fibra),
      sodio: null,
      medidas,
      fonte: 'custom',
    };
    salvarCustom(alimento);
    onCriado(alimento);
  }

  return (
    <Folha onFechar={onFechar} rotulo="Cadastrar alimento">
      <h2>Novo alimento</h2>
      <p className="sub">Copie os valores do rótulo, na coluna de 100 g.</p>

      <div className="campo" style={{ marginTop: 14 }}>
        <label htmlFor="n">Nome</label>
        <input
          id="n"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Whey concentrado, Marmita da segunda..."
        />
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="m">Marca (opcional)</label>
          <input id="m" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="p">Porção (g, opcional)</label>
          <input
            id="p"
            type="number"
            inputMode="decimal"
            value={porcao}
            onChange={(e) => setPorcao(e.target.value)}
            placeholder="30"
          />
        </div>
      </div>

      <div className="cartao-titulo" style={{ marginTop: 6 }}>
        Valores por 100 g
      </div>

      {CAMPOS.map((c) => (
        <div className="campo" key={c.id}>
          <label htmlFor={c.id}>
            {c.label}
            {c.obrigatorio ? ' *' : ''}
          </label>
          <input
            id={c.id}
            type="number"
            inputMode="decimal"
            step="0.1"
            value={vals[c.id]}
            onChange={(e) => setVals((v) => ({ ...v, [c.id]: e.target.value }))}
          />
        </div>
      ))}

      <button
        className="btn principal bloco"
        onClick={criar}
        disabled={!valido}
        style={!valido ? { opacity: 0.4 } : undefined}
      >
        Salvar alimento
      </button>
      <p className="sub" style={{ marginTop: 10, lineHeight: 1.5 }}>
        Dica para marmita: some os ingredientes crus, pese a panela pronta e divida. O resultado é o
        valor por 100 g do prato.
      </p>
    </Folha>
  );
}
