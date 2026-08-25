/**
 * Gera os icones PNG do PWA sem depender de nenhuma biblioteca de imagem:
 * desenha os pixels na mao e monta o arquivo PNG (IHDR + IDAT + IEND).
 * Roda com: npm run build:icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const saida = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/* ------------------------------------------------------------------ PNG */

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pedaco(tipo, dados) {
  const nome = Buffer.from(tipo, 'ascii');
  const corpo = Buffer.concat([nome, dados]);
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}

/** rgba: Uint8Array com 4 bytes por pixel */
function montarPNG(largura, altura, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  // 10, 11, 12 = compressao, filtro e entrelacamento padrao (0)

  // cada linha comeca com o byte de filtro 0 (sem filtro)
  const bruto = Buffer.alloc(altura * (1 + largura * 4));
  for (let y = 0; y < altura; y++) {
    const destino = y * (1 + largura * 4);
    bruto[destino] = 0;
    Buffer.from(rgba.buffer, y * largura * 4, largura * 4).copy(bruto, destino + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(bruto, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- desenho */

/**
 * A marca, desenhada em pixels.
 *
 * A mesma geometria vive em src/components/Marca.jsx, em SVG. Sao dois
 * desenhos da mesma coisa porque o manifesto do PWA quer PNG e a tela quer
 * vetor: mexeu em um, mexa no outro. O sistema de coordenadas e o mesmo
 * quadrado 64x64 do viewBox, para os numeros baterem entre os dois.
 *
 * Curvas viram polilinhas e o traco vira "distancia ate a polilinha menor
 * que metade da espessura" - que e exatamente o que stroke-linecap="round"
 * significa. Assim nao entra biblioteca de imagem so para isto.
 */

// [x0,y0, cx1,cy1, cx2,cy2, x1,y1]
const MACA = [
  [32, 27, 28, 21, 21, 18, 16, 22],
  [16, 22, 10, 27, 9, 36, 12, 44],
  [12, 44, 15, 52, 21, 58, 26, 57],
  [26, 57, 29, 56.5, 30.5, 55, 32, 55],
  [32, 55, 33.5, 55, 35, 56.5, 38, 57],
  [38, 57, 43, 58, 49, 52, 52, 44],
  [52, 44, 55, 36, 54, 27, 48, 22],
  [48, 22, 43, 18, 36, 21, 32, 27],
];
const FOLHA_DIREITA = [
  [32, 26, 34, 17, 40, 11, 47, 10],
  [47, 10, 47, 18, 42, 25, 32, 26],
];
const FOLHA_ESQUERDA = [
  [32, 26, 29, 19, 25, 14, 20, 13],
  [20, 13, 19, 20, 23, 25, 32, 26],
];
const CHECK = [[25, 38], [30.5, 44], [42, 31]];
const MEDIDAS = [
  [[14.5, 33], [20.5, 33]],
  [[13.8, 39], [20, 39]],
  [[15, 45], [20.5, 45]],
];

const VERDE = [76, 175, 80]; // #4CAF50
const LIMA = [155, 195, 74]; // #9BC34A
const BRANCO = [255, 255, 255];

function achatar(segmentos, passos = 24) {
  const pontos = [];
  for (const [x0, y0, x1, y1, x2, y2, x3, y3] of segmentos) {
    for (let i = 0; i < passos; i++) {
      const t = i / passos;
      const u = 1 - t;
      pontos.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ]);
    }
  }
  pontos.push([segmentos.at(-1)[6], segmentos.at(-1)[7]]);
  return pontos;
}

function distanciaAteSegmento(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const comprimento = dx * dx + dy * dy;
  const t = comprimento ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / comprimento)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanciaAtePolilinha(px, py, pontos) {
  let menor = Infinity;
  for (let i = 1; i < pontos.length; i++) {
    const d = distanciaAteSegmento(px, py, pontos[i - 1], pontos[i]);
    if (d < menor) menor = d;
  }
  return menor;
}

/** cruzamentos de raio: par = fora, impar = dentro */
function dentro(px, py, pontos) {
  let d = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const [xi, yi] = pontos[i];
    const [xj, yj] = pontos[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

const CONTORNO_MACA = achatar(MACA);
const POLI_FOLHA_D = achatar(FOLHA_DIREITA);
const POLI_FOLHA_E = achatar(FOLHA_ESQUERDA);

function misturar(a, b, t) {
  const u = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

/**
 * @param tamanho  lado do PNG em pixels
 * @param ocupacao quanto do lado a marca ocupa. O launcher do Android recorta
 *                 as bordas do icone maskable, entao la ela encolhe.
 * @param cantos   raio dos cantos, em fracao do lado. O maskable vai quadrado
 *                 porque quem arredonda e o sistema.
 * @param simples  sem os tracinhos de medida e com traco mais grosso. Abaixo
 *                 de ~32 px eles se fundem com o check e a maca vira borrao.
 */
function desenhar(tamanho, ocupacao, cantos, simples = false) {
  const SS = 4; // 4x4 amostras por pixel: as curvas ficam limpas
  const rgba = new Uint8Array(tamanho * tamanho * 4);
  const escala = (tamanho * ocupacao) / 64;
  const deslocamento = (tamanho - 64 * escala) / 2;
  const raioCanto = tamanho * cantos;

  // no espaco 64x64, para a espessura acompanhar a escala
  const meiaMaca = (simples ? 4.6 : 4) / 2;
  const meioCheck = (simples ? 5 : 4.5) / 2;
  const meiaMedida = 2.6 / 2;

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;

          // fora do quadrado de cantos arredondados nao ha icone
          const dx = Math.max(raioCanto - px, px - (tamanho - raioCanto), 0);
          const dy = Math.max(raioCanto - py, py - (tamanho - raioCanto), 0);
          if (Math.hypot(dx, dy) > raioCanto) continue;

          // fundo: os dois verdes da marca na diagonal
          let cor = misturar(VERDE, LIMA, (px + py) / (2 * tamanho));

          const mx = (px - deslocamento) / escala;
          const my = (py - deslocamento) / escala;

          const naMarca =
            distanciaAtePolilinha(mx, my, CONTORNO_MACA) <= meiaMaca ||
            distanciaAtePolilinha(mx, my, CHECK) <= meioCheck ||
            (!simples && MEDIDAS.some(([p, q]) => distanciaAteSegmento(mx, my, p, q) <= meiaMedida)) ||
            dentro(mx, my, POLI_FOLHA_D) ||
            dentro(mx, my, POLI_FOLHA_E);

          if (naMarca) cor = BRANCO;

          r += cor[0];
          g += cor[1];
          b += cor[2];
          a += 255;
        }
      }

      const n = SS * SS;
      const i = (y * tamanho + x) * 4;
      // divide pela cobertura, nao pelo total: senao a borda arredondada
      // escurece em vez de ficar transparente
      const cobertos = a / 255 || 1;
      rgba[i] = Math.round(r / cobertos);
      rgba[i + 1] = Math.round(g / cobertos);
      rgba[i + 2] = Math.round(b / cobertos);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return rgba;
}

for (const [arquivo, tamanho, ocupacao, cantos, simples] of [
  ['icone-192.png', 192, 0.7, 0.22],
  ['icone-512.png', 512, 0.7, 0.22],
  ['icone-maskable-512.png', 512, 0.52, 0],
  // a aba do navegador nao le o manifesto: precisa do seu proprio arquivo
  ['favicon-32.png', 32, 0.78, 0.22, true],
]) {
  writeFileSync(join(saida, arquivo), montarPNG(tamanho, tamanho, desenhar(tamanho, ocupacao, cantos, simples)));
  console.log(`gerado public/${arquivo} (${tamanho}x${tamanho})`);
}

/* ------------------------------------------------------------- favicon.svg */

/**
 * O favicon tambem sai daqui, em SVG, para nao virar uma TERCEIRA copia da
 * geometria (as outras duas sao este arquivo e src/components/Marca.jsx).
 *
 * Vai sem os tracinhos de medida e com traco mais grosso: a 16 px eles se
 * fundem com o check. Cores literais porque arquivo solto nao enxerga as
 * variaveis CSS do app.
 */
function paraPath(segmentos) {
  const [x0, y0] = segmentos[0];
  const curvas = segmentos
    .map(([, , c1x, c1y, c2x, c2y, x, y]) => `C${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`)
    .join('');
  return `M${x0} ${y0}${curvas}Z`;
}

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
  '<defs><linearGradient id="f" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">',
  '<stop stop-color="#4CAF50"/><stop offset="1" stop-color="#9BC34A"/></linearGradient></defs>',
  '<rect width="64" height="64" rx="14" fill="url(#f)"/>',
  '<g transform="translate(32 32) scale(0.82) translate(-32 -32)">',
  `<g fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">`,
  `<path d="${paraPath(MACA)}"/>`,
  `<path d="M${CHECK[0][0]} ${CHECK[0][1]}L${CHECK[1][0]} ${CHECK[1][1]}L${CHECK[2][0]} ${CHECK[2][1]}" stroke-width="5"/>`,
  '</g>',
  `<path d="${paraPath(FOLHA_DIREITA)}" fill="#fff"/>`,
  `<path d="${paraPath(FOLHA_ESQUERDA)}" fill="#fff"/>`,
  '</g></svg>',
].join('');

writeFileSync(join(saida, 'favicon.svg'), svg, 'utf-8');
console.log('gerado public/favicon.svg');
