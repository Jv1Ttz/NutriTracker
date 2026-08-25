/**
 * Tema claro, escuro ou seguindo o sistema.
 *
 * A preferencia NAO entra no estado sincronizado de proposito: e uma escolha
 * do aparelho, nao da pessoa. Faz sentido o celular ficar escuro na cabeceira
 * da cama enquanto o PC continua claro.
 *
 * O CSS so conhece 'claro' e 'escuro'. "Automatico" e resolvido aqui, e o
 * atributo que vai para o <html> ja e o resultado - assim a folha de estilo
 * nao precisa repetir o bloco de cores dentro de um prefers-color-scheme.
 */

const CHAVE = 'nutritracker.tema';

export const TEMAS = [
  { id: 'claro', nome: 'Claro' },
  { id: 'escuro', nome: 'Escuro' },
  { id: 'auto', nome: 'Automático' },
];

/** cor da barra do navegador, por tema; precisa casar com --bg */
const COR_DA_BARRA = { claro: '#ebf5e9', escuro: '#0f1512' };

const consultaEscuro = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export function lerPreferencia() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return TEMAS.some((t) => t.id === salvo) ? salvo : 'claro';
  } catch {
    return 'claro';
  }
}

/** 'auto' vira 'claro' ou 'escuro' conforme o sistema */
export function resolver(preferencia) {
  if (preferencia !== 'auto') return preferencia;
  return consultaEscuro()?.matches ? 'escuro' : 'claro';
}

export function aplicar(preferencia = lerPreferencia()) {
  const tema = resolver(preferencia);
  document.documentElement.dataset.tema = tema;
  // sem isto a barra do navegador no celular fica com a cor do outro tema
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COR_DA_BARRA[tema]);
  return tema;
}

export function salvarPreferencia(preferencia) {
  try {
    localStorage.setItem(CHAVE, preferencia);
  } catch {
    /* navegador sem armazenamento: o tema vale so nesta sessao */
  }
  return aplicar(preferencia);
}

/**
 * Em "automatico", acompanha o sistema mudando de tema com o app aberto -
 * o que acontece de verdade em quem agenda o modo escuro por horario.
 */
export function observarSistema(aoMudar) {
  const consulta = consultaEscuro();
  if (!consulta) return () => {};
  const reagir = () => {
    if (lerPreferencia() === 'auto') aoMudar(aplicar('auto'));
  };
  consulta.addEventListener('change', reagir);
  return () => consulta.removeEventListener('change', reagir);
}
