import { useEffect, useRef, useState } from 'react';

/**
 * Animacoes em JavaScript, para o que o CSS nao alcanca.
 *
 * Tudo aqui respeita `prefers-reduced-motion`. Nao e detalhe de acessibilidade
 * distante: movimento na tela provoca enjoo e tontura em quem tem transtorno
 * vestibular, e o sistema ja pergunta isso para a pessoa. Quando a preferencia
 * esta ligada, o valor pula direto para o final - sem animacao, sem espera.
 */

export function menosMovimento() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** desacelera no fim, como o resto do app */
const suavizar = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Faz um numero caminhar ate o novo valor em vez de saltar.
 *
 * Existe porque o anel de calorias varre em 0,4 s enquanto o numero no centro
 * trocava de uma vez: os dois mostram a MESMA informacao e se moviam em
 * ritmos diferentes, que e o que fazia a tela parecer inacabada.
 *
 * Se o valor mudar no meio do caminho - alguem registrando varios alimentos
 * seguidos - a animacao recomeca de onde o numero esta agora, e nao do alvo
 * anterior. Sem isso o numero daria um pulo a cada novo registro.
 */
export function useNumeroAnimado(alvo, duracao = 400) {
  const [valor, setValor] = useState(alvo);
  const quadro = useRef(0);
  const atual = useRef(alvo);

  useEffect(() => {
    // Pula a animacao quando ela nao seria vista OU nao seria bem-vinda.
    //
    // O document.hidden nao e detalhe: com a aba em segundo plano o navegador
    // CONGELA o requestAnimationFrame, e sem esta saida o numero ficaria preso
    // no valor antigo ate a pessoa voltar para a aba. Animar o que ninguem
    // esta vendo tambem nao serve para nada.
    if (menosMovimento() || duracao <= 0 || (typeof document !== "undefined" && document.hidden)) {
      atual.current = alvo;
      setValor(alvo);
      return;
    }

    const de = atual.current;
    if (de === alvo) return;

    const inicio = performance.now();
    const passo = (agora) => {
      const t = Math.min((agora - inicio) / duracao, 1);
      const v = de + (alvo - de) * suavizar(t);
      atual.current = v;
      setValor(v);
      if (t < 1) quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro.current);
  }, [alvo, duracao]);

  return valor;
}
