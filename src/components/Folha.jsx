import { useEffect, useRef } from 'react';
import { empilhar } from '../lib/navegacao.js';

/**
 * Painel que sobe de baixo (bottom sheet). Fecha no ESC, no toque no fundo e
 * no botao voltar do celular - que e o gesto que as pessoas usam primeiro, e
 * que antes fazia sair do app com a folha ainda aberta na tela.
 */
export default function Folha({ children, onFechar, rotulo }) {
  // em ref para o efeito nao remontar quando o pai recria a funcao: remontar
  // empurraria outra entrada no historico a cada render
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && fechar.current();
    document.addEventListener('keydown', aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desempilhar = empilhar(() => fechar.current());
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
      desempilhar();
    };
  }, []);

  return (
    <div className="fundo" onClick={onFechar}>
      <div
        className="folha"
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="folha-alca" />
        {children}
      </div>
    </div>
  );
}
