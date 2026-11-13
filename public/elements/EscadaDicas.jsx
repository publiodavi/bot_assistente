import { useState } from "react";
import { Footprints, Lock, GraduationCap } from "lucide-react";

// Escada de dicas: camadas reveladas uma de cada vez, sempre em sequência.
// O servidor valida e grava cada abertura; aqui a tela responde na hora.
// `props` (dados da Escada enviados pelo servidor) e `callAction` (chamada a uma ação do
// Python) são variáveis globais que o Chainlit injeta nos elementos personalizados.
export default function EscadaDicas() {
  const camadas = [
    ...(props.dicas || []).map((texto, i) => ({ rotulo: `Dica ${i + 1}`, texto })),
    ...(props.exemplo_parcial ? [{ rotulo: "Exemplo parcial", texto: props.exemplo_parcial }] : []),
  ];
  const [abertas, setAbertas] = useState(props.reveladas || 0);
  const [ocupado, setOcupado] = useState(false);
  const [convite, setConvite] = useState(false);
  const reveladas = Math.max(abertas, props.reveladas || 0);
  const nome = props.companheiro || "Eva";

  // Abre a camada seguinte; se o servidor recusar, volta ao número registrado no banco.
  async function abrir(nivel) {
    if (ocupado) return;
    setOcupado(true);
    setAbertas(nivel);
    try {
      const resposta = await callAction({ name: "study_reveal", payload: { message_id: props.message_id, nivel } });
      const dados = resposta && resposta.response;
      if (dados && dados.ok === false) setAbertas(dados.reveladas || 0);
    } catch (erro) {
      setAbertas(nivel - 1);
    }
    setOcupado(false);
  }

  // Pede que a próxima resposta use o modo Aprende (o estudante explica ao companheiro).
  async function ensinar() {
    try {
      const resposta = await callAction({ name: "study_teach", payload: { message_id: props.message_id } });
      if (resposta && resposta.response && resposta.response.ok) setConvite(true);
    } catch (erro) {
      setConvite(false);
    }
  }

  const nota = props.tipo === "ensino" && props.nota;
  return (
    <section className="escada" aria-label={`Degrau ${props.degrau} da escada`}>
      <header className="escada__topo">
        <Footprints aria-hidden="true" size={16} />
        <span className="escada__degrau">Degrau {props.degrau}</span>
        {props.subiu_sozinho && (
          <span className="escada__selo" title={`Avaliação de ${nome}`}>subiu sozinho</span>
        )}
      </header>

      {nota && (
        <div className="escada__nota">
          <strong>Nota de {nome}</strong>
          {nota.claro.length > 0 && (
            <div>
              <span className="escada__nota-titulo">Ficou claro</span>
              <ul>{nota.claro.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          )}
          {nota.faltou.length > 0 && (
            <div>
              <span className="escada__nota-titulo">Faltou</span>
              <ul>{nota.faltou.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {camadas.length > 0 && (
        <ol className="escada__camadas">
          {camadas.map((camada, i) => {
            const nivel = i + 1;
            if (nivel <= reveladas) {
              return (
                <li key={i} className="escada__camada escada__camada--aberta">
                  <span className="escada__rotulo">{camada.rotulo}</span>
                  <p>{camada.texto}</p>
                </li>
              );
            }
            if (nivel === reveladas + 1) {
              return (
                <li key={i} className="escada__camada">
                  <button type="button" className="escada__botao" disabled={ocupado} onClick={() => abrir(nivel)}>
                    Ver {camada.rotulo.toLowerCase()}
                  </button>
                </li>
              );
            }
            return (
              <li key={i} className="escada__camada escada__camada--fechada" aria-label={`${camada.rotulo}, bloqueada`}>
                <Lock aria-hidden="true" size={14} />
                <span>{camada.rotulo}</span>
              </li>
            );
          })}
        </ol>
      )}

      {props.pronto_para_ensinar && props.tipo !== "ensino" && (
        <div className="escada__ensinar">
          {convite ? (
            <p role="status">Escreva sua explicação no campo de mensagem. {nome} vai tentar aprender com você.</p>
          ) : (
            <button type="button" className="escada__botao escada__botao--ensinar" onClick={ensinar}>
              <GraduationCap aria-hidden="true" size={16} />
              Explique para {nome}
            </button>
          )}
        </div>
      )}

      {Array.isArray(props.fontes) && props.fontes.length > 0 && (
        <p className="escada__fontes">
          Consultado: {props.fontes.map((fonte) => `${fonte.nome}, p. ${fonte.pagina}`).join("; ")}
        </p>
      )}
    </section>
  );
}
