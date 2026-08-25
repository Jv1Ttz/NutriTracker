/**
 * Sobe o servidor de desenvolvimento com https autoassinado.
 * Necessario para testar a camera (leitor de codigo de barras) pelo celular,
 * porque o navegador so libera getUserMedia em contexto seguro.
 *
 * O certificado nao e de uma autoridade conhecida, entao o celular mostra um
 * aviso de "conexao nao privada" - e so avancar.
 */
process.env.HTTPS = '1';

const { createServer } = await import('vite');

const servidor = await createServer({ server: { host: true } });
await servidor.listen();
servidor.printUrls();
