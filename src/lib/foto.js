/**
 * Foto de perfil.
 *
 * O arquivo escolhido nunca e guardado como veio. Uma foto de celular tem
 * uns 4 MB, e o estado inteiro do app e re-serializado no localStorage a cada
 * alimento registrado - guardar o original tornaria cada refeicao lenta, e
 * estouraria a cota do navegador em pouco tempo.
 *
 * Entao a imagem e recortada no centro em um quadrado, reduzida para 256 px e
 * salva em JPEG. Da uns 20 KB, cabe no localStorage sem incomodar e viaja na
 * sincronizacao junto com o resto do perfil.
 */

const LADO = 256;
const QUALIDADE = 0.82;

export async function prepararFoto(arquivo) {
  if (!arquivo) throw new Error('Nenhum arquivo escolhido.');
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    throw new Error('Não consegui ler essa imagem. Tente outra.');
  }

  // recorte central: a foto vira quadrada sem esticar ninguem
  const corte = Math.min(bitmap.width, bitmap.height);
  const x = (bitmap.width - corte) / 2;
  const y = (bitmap.height - corte) / 2;

  const tela = document.createElement('canvas');
  tela.width = LADO;
  tela.height = LADO;
  const ctx = tela.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, x, y, corte, corte, 0, 0, LADO, LADO);
  bitmap.close?.();

  return tela.toDataURL('image/jpeg', QUALIDADE);
}

/** Quantos KB a foto ocupa, para mostrar na tela. */
export function tamanhoEmKb(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.round((base64.length * 0.75) / 1024);
}
