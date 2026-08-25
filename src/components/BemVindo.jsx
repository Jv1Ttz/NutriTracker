import Marca from './Marca.jsx';

/**
 * Primeira tela de quem abre o app pela primeira vez.
 *
 * Antes o app jogava direto no formulario de cadastro - sem dizer o que era,
 * nem por que estava pedindo peso e idade. Aqui a pessoa ve o que o app faz e
 * onde os dados dela ficam ANTES de digitar qualquer coisa.
 */
const PONTOS = [
  ['4 mil alimentos embutidos', 'A tabela TACO, o que ela não tem (quinoa, chia, whey) e 3.400 produtos de mercado com código de barras. Tudo sem internet.'],
  ['Código de barras', 'Aponta a câmera para a embalagem e o produto entra com os valores do rótulo.'],
  ['A balança dá a palavra final', 'Toda meta é estimativa. O app compara seu ritmo real e corrige o número.'],
];

export default function BemVindo({ onComecar }) {
  return (
    <div className="app">
      <main className="conteudo abertura">
        <div className="abertura-topo">
          <Marca tamanho={104} />
          <h1 className="abertura-nome">
            <span style={{ color: 'var(--marca)' }}>Nutri</span>Tracker
          </h1>
          <p className="abertura-lema">Conte. Equilibre. Transforme.</p>
        </div>

        <div className="abertura-pontos">
          {PONTOS.map(([titulo, texto]) => (
            <div key={titulo} className="abertura-ponto">
              <Marca tamanho={22} simples aria-hidden="true" />
              <div>
                <b>{titulo}</b>
                <span className="sub">{texto}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="abertura-fim">
          <button className="btn principal bloco" onClick={onComecar}>
            Começar
          </button>
          <p className="sub" style={{ textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
            Seus dados ficam neste aparelho. Sem conta, nada sai daqui — sincronizar entre celular
            e PC é opcional, e você liga depois se quiser.
          </p>
          <p className="sub" style={{ textAlign: 'center', marginTop: 10 }}>
            <a href="/privacidade.html">Privacidade</a>
            {' · '}
            <a href="/termos.html">Termos</a>
          </p>
        </div>
      </main>
    </div>
  );
}
