/**
 * Icones do app.
 *
 * A geometria vem do Lucide (https://lucide.dev), licenca ISC, copiada para
 * ca em vez de instalada. Sao dezesseis icones: uma dependencia nova, com o
 * build e o bundle que vem junto, nao se paga por isso - e o app e
 * offline-first, onde cada kB do boot importa.
 *
 * O traco fica em 1.8 e nao nos 2 do Lucide: e o peso que o resto do app ja
 * usava, e a troca aqui e de DESENHO, nao de peso visual.
 */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

export const IconeHoje = (p) => (
  <svg {...base} {...p}>
    <path d="M8 2v3" />
    <path d="M16 2v3" />
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M8 13h.01" />
    <path d="M12 13h.01" />
    <path d="M16 13h.01" />
    <path d="M8 17h.01" />
    <path d="M12 17h.01" />
    <path d="M16 17h.01" />
  </svg>
);

export const IconeBuscar = (p) => (
  <svg {...base} {...p}>
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </svg>
);

export const IconePeso = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v18" />
    <path d="m19 8 3 8a5 5 0 0 1-6 0zV7" />
    <path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" />
    <path d="m5 8 3 8a5 5 0 0 1-6 0zV7" />
    <path d="M7 21h10" />
  </svg>
);

export const IconeAjustes = (p) => (
  <svg {...base} {...p}>
    <path d="M14 17H5" />
    <path d="M19 7h-9" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </svg>
);

export const IconeCodigoBarras = (p) => (
  <svg {...base} {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M8 7v10" />
    <path d="M12 7v10" />
    <path d="M17 7v10" />
  </svg>
);

export const IconeEsquerda = (p) => (
  <svg {...base} {...p}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const IconeDireita = (p) => (
  <svg {...base} {...p}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const IconeLixo = (p) => (
  <svg {...base} {...p}>
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconeRepetir = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const IconeFechar = (p) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const IconeMais = (p) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export const IconeLapis = (p) => (
  <svg {...base} {...p}>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
);

export const IconeCafe = (p) => (
  <svg {...base} {...p}>
    <path d="M10 2v2" />
    <path d="M14 2v2" />
    <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
    <path d="M6 2v2" />
  </svg>
);

export const IconeAlmoco = (p) => (
  <svg {...base} {...p}>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
);

export const IconeJanta = (p) => (
  <svg {...base} {...p}>
    <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
  </svg>
);

export const IconeLanche = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
    <path d="M8.5 8.5v.01" />
    <path d="M16 15.5v.01" />
    <path d="M12 12v.01" />
    <path d="M11 17v.01" />
    <path d="M7 14v.01" />
  </svg>
);

/** icone de cada refeicao, para o Hoje e o editor de porcao */
export const ICONE_REFEICAO = {
  cafe: IconeCafe,
  almoco: IconeAlmoco,
  janta: IconeJanta,
  lanches: IconeLanche,
};

// O "G" do Google, nas cores oficiais - por isso nao usa `base`, que pinta
// tudo com currentColor.
export const IconeGoogle = (p) => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" {...p}>
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.87z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.09A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.87 8.87 4.75 12 4.75z"
    />
  </svg>
);
