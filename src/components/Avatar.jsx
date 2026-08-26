import { useRef, useState } from 'react';
import { salvarFoto } from '../lib/db.js';
import { prepararFoto, tamanhoEmKb } from '../lib/foto.js';
import { IconeLapis } from './Icones.jsx';

/** Iniciais como reserva: melhor que um boneco cinza generico. */
function iniciais(nome) {
  const partes = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return '';
  return (partes[0][0] + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase();
}

export default function Avatar({ perfil, editavel = false, tamanho = 64 }) {
  const campo = useRef(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo
    if (!arquivo) return;
    setOcupado(true);
    setErro('');
    try {
      salvarFoto(await prepararFoto(arquivo));
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const letras = iniciais(perfil?.nome);

  const circulo = (
    <div className="avatar" style={{ width: tamanho, height: tamanho }}>
      {perfil?.foto ? (
        <img src={perfil.foto} alt="" />
      ) : (
        <span style={{ fontSize: tamanho * 0.36 }}>{letras || '·'}</span>
      )}
    </div>
  );

  if (!editavel) return circulo;

  return (
    <div className="avatar-editor">
      <button
        type="button"
        className="avatar-botao"
        onClick={() => campo.current?.click()}
        disabled={ocupado}
        aria-label={perfil?.foto ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
      >
        {circulo}
        <span className="avatar-selo" aria-hidden="true">
          {ocupado ? '…' : <IconeLapis width={13} height={13} />}
        </span>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="avatar-nome">{perfil?.nome || 'Sem nome'}</div>
        <div className="linha" style={{ gap: 8, marginTop: 6 }}>
          <button className="btn pequeno" onClick={() => campo.current?.click()} disabled={ocupado}>
            {perfil?.foto ? 'Trocar foto' : 'Escolher foto'}
          </button>
          {perfil?.foto && (
            <button className="btn pequeno" onClick={() => salvarFoto(null)} disabled={ocupado}>
              Remover
            </button>
          )}
        </div>
        {perfil?.foto && (
          <p className="sub" style={{ marginTop: 8, fontSize: 12 }}>
            Reduzida para 256 px · {tamanhoEmKb(perfil.foto)} KB. Fica no aparelho e acompanha a
            sincronização.
          </p>
        )}
      </div>

      <input
        ref={campo}
        type="file"
        accept="image/*"
        hidden
        onChange={escolher}
      />

      {erro && (
        <div className="aviso" style={{ width: '100%', marginTop: 10, marginBottom: 0 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
