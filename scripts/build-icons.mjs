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

const FUNDO_TOPO = [26, 46, 33];
const FUNDO_BASE = [15, 21, 18];
const LIMA = [154, 230, 110];
const TRILHA = [40, 58, 47];

function misturar(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Desenha o anel de progresso. `escala` encolhe o desenho para caber na
 * zona segura do icone maskable (o launcher pode recortar as bordas).
 */
function desenhar(tamanho, escala = 1) {
  const SS = 3; // supersampling: 3x3 amostras por pixel, para suavizar as bordas
  const rgba = new Uint8Array(tamanho * tamanho * 4);
  const centro = tamanho / 2;
  const raio = tamanho * 0.34 * escala;
  const espessura = tamanho * 0.115 * escala;
  const interno = raio - espessura / 2;
  const externo = raio + espessura / 2;
  const inicio = -Math.PI / 2;
  const fim = inicio + Math.PI * 2 * 0.72; // anel em 72%

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;

          const cor = misturar(FUNDO_TOPO, FUNDO_BASE, py / tamanho);
          let [cr, cg, cb] = cor;

          const dx = px - centro;
          const dy = py - centro;
          const dist = Math.hypot(dx, dy);

          if (dist >= interno && dist <= externo) {
            let ang = Math.atan2(dy, dx);
            if (ang < inicio) ang += Math.PI * 2;
            [cr, cg, cb] = ang <= fim ? LIMA : TRILHA;
          }

          r += cr;
          g += cg;
          b += cb;
        }
      }

      const n = SS * SS;
      const i = (y * tamanho + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

for (const [arquivo, tamanho, escala] of [
  ['icone-192.png', 192, 1],
  ['icone-512.png', 512, 1],
  ['icone-maskable-512.png', 512, 0.62],
]) {
  writeFileSync(join(saida, arquivo), montarPNG(tamanho, tamanho, desenhar(tamanho, escala)));
  console.log(`gerado public/${arquivo} (${tamanho}x${tamanho})`);
}
