import { useEffect, useRef, useState } from 'react';
import Folha from './Folha.jsx';
import { buscarPorCodigo } from '../lib/openfoodfacts.js';
import { porCodigo } from '../lib/busca.js';
import { lerEstado } from '../lib/db.js';

const FORMATOS_NATIVOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

/**
 * Leitor de codigo de barras.
 * Usa a API BarcodeDetector quando o navegador tem (Chrome Android), e cai
 * para o ZXing em WebAssembly no resto (inclusive Safari do iPhone).
 *
 * A camera so funciona em contexto seguro: https ou localhost. Pelo IP da
 * rede local em http o navegador bloqueia - ver `npm run dev:https`.
 */
export default function Scanner({ onFechar, onProduto }) {
  const videoRef = useRef(null);
  const [estado, setEstado] = useState('iniciando'); // iniciando | lendo | consultando | erro
  const [erro, setErro] = useState('');
  const [manual, setManual] = useState('');
  const jaLeu = useRef(false);
  // guardado em ref para o efeito da camera nao reiniciar a cada render
  const aoAchar = useRef(onProduto);
  aoAchar.current = onProduto;

  useEffect(() => {
    let parar = () => {};
    let vivo = true;

    async function consultar(codigo) {
      if (jaLeu.current) return;
      jaLeu.current = true;
      parar();

      // a base embutida primeiro: resolve sem rede, e a OFF ja saiu do ar
      // duas vezes so durante o desenvolvimento deste app
      const local = porCodigo(codigo, lerEstado().customs);
      if (local) {
        aoAchar.current(local);
        return;
      }

      setEstado('consultando');
      try {
        const produto = await buscarPorCodigo(codigo);
        if (!vivo) return;
        if (produto) {
          aoAchar.current(produto);
        } else {
          setErro(
            `O código ${codigo} não está no Open Food Facts. ` +
              'Dá para cadastrar o produto manualmente pelo botão "Cadastrar um alimento meu".'
          );
          setEstado('erro');
        }
      } catch (e) {
        if (!vivo) return;
        setErro(`Falha ao consultar: ${e.message}. Confira a internet.`);
        setEstado('erro');
      }
    }

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro(
          'Este navegador não dá acesso à câmera. Se você abriu pelo IP da rede em http, ' +
            'use https ou digite o código na mão.'
        );
        setEstado('erro');
        return;
      }

      try {
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: FORMATOS_NATIVOS });
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
          if (!vivo) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setEstado('lendo');

          let frame;
          const varrer = async () => {
            if (!vivo || jaLeu.current) return;
            try {
              const achados = await detector.detect(videoRef.current);
              if (achados.length) {
                consultar(achados[0].rawValue);
                return;
              }
            } catch {
              /* frame ruim, tenta o proximo */
            }
            frame = requestAnimationFrame(varrer);
          };
          frame = requestAnimationFrame(varrer);

          parar = () => {
            cancelAnimationFrame(frame);
            stream.getTracks().forEach((t) => t.stop());
          };
          return;
        }

        // Fallback: ZXing
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all(
          [import('@zxing/browser'), import('@zxing/library')]
        );
        const hints = new Map([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.CODE_128,
            ],
          ],
        ]);
        const leitor = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 });
        const controles = await leitor.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (resultado) => {
            if (resultado) consultar(resultado.getText());
          }
        );
        if (!vivo) {
          controles.stop();
          return;
        }
        setEstado('lendo');
        parar = () => controles.stop();
      } catch (e) {
        if (!vivo) return;
        const negado = e.name === 'NotAllowedError';
        setErro(
          negado
            ? 'Permissão de câmera negada. Libere nas configurações do site e tente de novo.'
            : `Não consegui abrir a câmera: ${e.message}`
        );
        setEstado('erro');
      }
    }

    iniciar();
    return () => {
      vivo = false;
      parar();
    };
  }, []);

  async function enviarManual(e) {
    e.preventDefault();
    const codigo = manual.replace(/\D/g, '');
    if (codigo.length < 8) return;
    jaLeu.current = false;

    const local = porCodigo(codigo, lerEstado().customs);
    if (local) return aoAchar.current(local);

    setEstado('consultando');
    try {
      const produto = await buscarPorCodigo(codigo);
      if (produto) aoAchar.current(produto);
      else {
        setErro(`O código ${codigo} não está no Open Food Facts.`);
        setEstado('erro');
      }
    } catch (err) {
      setErro(`Falha ao consultar: ${err.message}`);
      setEstado('erro');
    }
  }

  return (
    <Folha onFechar={onFechar} rotulo="Ler código de barras">
      <h2>Código de barras</h2>
      <p className="sub">Aponte para o código na embalagem.</p>

      {estado !== 'erro' && (
        <div style={{ position: 'relative', marginTop: 14 }}>
          <video ref={videoRef} className="scanner-video" muted playsInline />
          <div className="scanner-mira" />
        </div>
      )}

      {estado === 'iniciando' && <p className="centro-txt">Abrindo a câmera...</p>}
      {estado === 'consultando' && <p className="centro-txt">Procurando o produto...</p>}
      {estado === 'erro' && (
        <div className="aviso" style={{ marginTop: 14 }}>
          {erro}
        </div>
      )}

      <form onSubmit={enviarManual} style={{ marginTop: 16 }}>
        <div className="campo">
          <label htmlFor="cod">Ou digite o código</label>
          <div className="linha">
            <input
              id="cod"
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="7891000100103"
            />
            <button className="btn" type="submit" style={{ flex: '0 0 96px' }}>
              Buscar
            </button>
          </div>
        </div>
      </form>

      <p className="sub" style={{ lineHeight: 1.5 }}>
        Os produtos vêm do Open Food Facts, uma base aberta e colaborativa. Se algum valor estiver
        estranho, confira o rótulo.
      </p>
    </Folha>
  );
}
