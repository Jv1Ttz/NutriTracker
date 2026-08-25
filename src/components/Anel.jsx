import { inteiro } from '../lib/util.js';

/**
 * Anel de progresso das calorias. Quando passa de 100% o excedente e
 * desenhado por cima, em cor de alerta.
 */
export default function Anel({ consumido, meta }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const prop = meta > 0 ? consumido / meta : 0;
  const dentro = Math.min(prop, 1);
  const excedente = Math.max(0, Math.min(prop - 1, 1));
  const restante = meta - consumido;

  return (
    <div className="anel">
      <svg viewBox="0 0 124 124">
        <circle cx="62" cy="62" r={R} fill="none" stroke="var(--sup2)" strokeWidth="11" />
        <circle
          cx="62"
          cy="62"
          r={R}
          fill="none"
          stroke="var(--kcal)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - dentro)}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        {excedente > 0 && (
          <circle
            cx="62"
            cy="62"
            r={R}
            fill="none"
            stroke="var(--gord)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - excedente)}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        )}
      </svg>
      <div className="anel-centro">
        <div className="anel-num" style={restante < 0 ? { color: 'var(--gord)' } : undefined}>
          {inteiro(Math.abs(restante))}
        </div>
        <div className="anel-lab">{restante < 0 ? 'kcal acima' : 'kcal restantes'}</div>
      </div>
    </div>
  );
}
