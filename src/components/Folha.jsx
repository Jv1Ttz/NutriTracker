import { useEffect } from 'react';

/** Painel que sobe de baixo (bottom sheet). Fecha no ESC e no toque no fundo. */
export default function Folha({ children, onFechar, rotulo }) {
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [onFechar]);

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
