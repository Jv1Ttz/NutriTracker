import { useId } from 'react';

/**
 * A marca do NutriTracker em SVG.
 *
 * Vetor e nao imagem porque ela aparece de 20 a 512 px - do icone da aba ao
 * icone do PWA - e PNG redimensionado borra nos dois extremos.
 *
 * A variante `simples` tira os tracinhos de medida do lado esquerdo. Abaixo
 * de uns 28 px eles se fundem com o check e a maca vira um borrao verde.
 */

const MACA =
  'M32 27C28 21 21 18 16 22C10 27 9 36 12 44C15 52 21 58 26 57C29 56.5 30.5 55 32 55' +
  'C33.5 55 35 56.5 38 57C43 58 49 52 52 44C55 36 54 27 48 22C43 18 36 21 32 27Z';
const CHECK = 'M25 38L30.5 44L42 31';
const MEDIDAS = 'M14.5 33h6M13.8 39h6.2M15 45h5.5';
const FOLHA_DIREITA = 'M32 26C34 17 40 11 47 10C47 18 42 25 32 26Z';
const FOLHA_ESQUERDA = 'M32 26C29 19 25 14 20 13C19 20 23 25 32 26Z';

export default function Marca({ tamanho = 64, cor, simples = false, ...resto }) {
  // sem id unico, dois SVGs na mesma pagina brigam pelo mesmo gradiente
  const id = useId();
  const traco = cor ?? `url(#${id})`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      fill="none"
      role="img"
      aria-label="NutriTracker"
      {...resto}
    >
      {!cor && (
        <defs>
          <linearGradient id={id} x1="10" y1="10" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--marca)" />
            <stop offset="1" stopColor="var(--marca2)" />
          </linearGradient>
        </defs>
      )}
      <g
        stroke={traco}
        strokeWidth={simples ? 4.6 : 4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={MACA} />
        <path d={CHECK} strokeWidth={simples ? 5 : 4.5} />
        {!simples && <path d={MEDIDAS} strokeWidth="2.6" />}
      </g>
      <path d={FOLHA_DIREITA} fill={cor ?? 'var(--marca2)'} />
      <path d={FOLHA_ESQUERDA} fill={cor ?? 'var(--marca)'} />
    </svg>
  );
}

/** Marca + nome, do jeito que aparece na abertura. */
export function Logotipo({ tamanho = 64 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Marca tamanho={tamanho} />
      <span
        style={{
          fontSize: tamanho * 0.44,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        <span style={{ color: 'var(--marca)' }}>Nutri</span>
        <span style={{ color: 'var(--txt)' }}>Tracker</span>
      </span>
    </div>
  );
}
