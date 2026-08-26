/**
 * Faz o botao voltar do celular voltar DENTRO do app.
 *
 * O app nao tem rotas: aba e folha sao estado do React. Sem isto o navegador
 * nao tem para onde voltar, e o "voltar" do Android sai do site - inclusive
 * com uma folha aberta na frente do usuario, que e onde mais incomoda.
 *
 * Uma pilha so, e um unico ouvinte de popstate. Com um ouvinte por tela, um
 * toque em voltar dispararia TODOS eles: fecharia a folha e trocaria de aba
 * na mesma acao, porque popstate nao para na primeira resposta.
 *
 * Quem empilha recebe de volta uma funcao para desempilhar. Ela existe para o
 * caso de a tela ser fechada por outro caminho - toque no X, no fundo, em
 * "cancelar" - quando a entrada que empurramos continua no historico e
 * precisa ser removida, senao o proximo voltar nao faz nada visivel.
 */

const pilha = [];
let ouvindo = false;

/**
 * Quantos popstate sao nossos e devem ser ignorados.
 *
 * Fechar uma folha no X ou no fundo faz o desempilhar chamar history.back()
 * para tirar do historico a entrada que ele mesmo empurrou. So que esse back
 * dispara popstate, e sem este contador o ouvinte desempilharia a entrada
 * SEGUINTE - a da aba. Um toque no fundo fechava a folha E voltava para Hoje.
 */
let aIgnorar = 0;

function ouvir() {
  if (ouvindo || typeof window === 'undefined') return;
  ouvindo = true;
  window.addEventListener('popstate', () => {
    if (aIgnorar > 0) {
      aIgnorar--;
      return;
    }
    const entrada = pilha.pop();
    // pilha vazia = estamos na raiz, e o voltar sai do app mesmo
    if (entrada) entrada.aoVoltar();
  });
}

/**
 * @param {() => void} aoVoltar  chamado quando o usuario aperta voltar
 * @returns {() => void} desempilha, para quando a tela fecha por outro caminho
 */
export function empilhar(aoVoltar) {
  if (typeof window === 'undefined') return () => {};
  ouvir();

  const entrada = { aoVoltar };
  pilha.push(entrada);
  window.history.pushState({ nutri: pilha.length }, '');

  return () => {
    const i = pilha.indexOf(entrada);
    // ja saiu pelo botao voltar: o historico se resolveu sozinho
    if (i === -1) return;
    pilha.splice(i, 1);
    aIgnorar++;
    window.history.back();
  };
}
