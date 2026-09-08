
import React, { useEffect, useRef } from "react";

function Chat({
  usuario,
  seccion,
  usuarioChat,
  mensajes,
  texto,
  setTexto,
  enviarMensaje,
  archivoInputRef,
  archivoSeleccionado,
  setArchivoSeleccionado,
  subiendoArchivo,
  estilos,
  API,
}) {
    const mensajesAreaRef = useRef(null);

  useEffect(() => {
    const elemento = mensajesAreaRef.current;

    if (!elemento) return;

    elemento.scrollTop = elemento.scrollHeight;
  }, [mensajes, usuarioChat, seccion]);

    // =====================================================
  // PEGAR IMAGEN DESDE EL PORTAPAPELES
  // =====================================================

  useEffect(() => {
    const manejarPegado = (e) => {
      // Solo permitir pegar imágenes en chats privados
      if (
        seccion !== "privado" ||
        !usuarioChat ||
        usuarioChat.rol === usuario.rol
      ) {
        return;
      }

      const items = e.clipboardData?.items;

      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();

          const archivo = item.getAsFile();

          if (!archivo) return;

          const extension =
            archivo.type.split("/")[1] || "png";

          const nombreArchivo =
            `captura_${Date.now()}.${extension}`;

          const archivoCaptura = new File(
            [archivo],
            nombreArchivo,
            {
              type: archivo.type,
            }
          );

          setArchivoSeleccionado(archivoCaptura);

          return;
        }
      }
    };

    window.addEventListener(
      "paste",
      manejarPegado
    );

    return () => {
      window.removeEventListener(
        "paste",
        manejarPegado
      );
    };
  }, [
    seccion,
    usuarioChat,
    usuario,
    setArchivoSeleccionado,
  ]);

  // Bajar automáticamente al último mensaje
  useEffect(() => {
    const elemento =
      mensajesAreaRef.current;

    if (!elemento) return;

    elemento.scrollTop =
      elemento.scrollHeight;
  }, [
    mensajes,
    usuarioChat,
    seccion,
  ]);

  return (
    <main
      className="chat-panel"
      style={estilos.chat}
    >
      {/* HEADER */}

      <header
        className="chat-header"
        style={estilos.chatHeader}
      >
        {seccion === "privado" &&
        usuarioChat ? (
          <>
            <div
              className="chat-avatar"
              style={estilos.avatarChat}
            >
              {usuarioChat.nombre
                ? usuarioChat.nombre
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

            <div>
              <div
                className="chat-name"
                style={estilos.chatNombre}
              >
                {usuarioChat.nombre}
              </div>

              <div
                className="chat-status"
                style={estilos.chatEstado}
              >
                {usuarioChat.rol}
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className="chat-avatar"
              style={estilos.avatarChat}
            >
              {seccion === "informacion"
                ? "📢"
                : "💬"}
            </div>

            <div>
              <div
                className="chat-name"
                style={estilos.chatNombre}
              >
                {seccion === "informacion"
                  ? "Información general"
                  : "Conversaciones"}
              </div>

              <div
                className="chat-status"
                style={estilos.chatEstado}
              >
                {seccion === "informacion"
                  ? "Comunicados para todo el equipo"
                  : "Selecciona un contacto"}
              </div>
            </div>
          </>
        )}
      </header>

      {/* MENSAJES */}

      <div
        ref={mensajesAreaRef}
        className="messages-area"
        style={estilos.mensajes}
      >
        {mensajes.length === 0 ? (
          <div
            style={
              estilos.pantallaCentro
            }
          >
            <div
              style={{
                fontSize: 55,
              }}
            >
              {seccion === "informacion"
                ? "📢"
                : "💬"}
            </div>

            <h2>
              {seccion === "privado"
                ? usuarioChat
                  ? "Nueva conversación"
                  : "Selecciona un contacto"
                : "Información general"}
            </h2>

            <p>
              {seccion === "privado"
                ? usuarioChat
                  ? "Envía el primer mensaje."
                  : "Selecciona un asesor o administrador."
                : "Aquí aparecerán los comunicados."}
            </p>
          </div>
        ) : (
          mensajes.map((mensaje) => {
            const propio =
              Number(
                mensaje.emisor_id ??
                  mensaje.emisorId
              ) === Number(usuario.id);

            const esImagen =
              mensaje.archivo?.tipo?.startsWith(
                "image/"
              );

            return (
              <div
                key={mensaje.id}
                className="message-row"
                style={{
                  ...estilos.mensajeFila,
                  justifyContent: propio
                    ? "flex-end"
                    : "flex-start",
                }}
              >
                <div
                  className="message-bubble"
                  style={{
                    ...estilos.mensaje,
                    ...(propio
                      ? estilos.mensajePropio
                      : estilos.mensajeOtro),
                  }}
                >
                  {!propio && (
                    <div
                      className="message-author"
                      style={
                        estilos.nombreMensaje
                      }
                    >
                      {mensaje.nombre}
                    </div>
                  )}

                  {mensaje.texto && (
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      {mensaje.texto}
                    </div>
                  )}

                  {mensaje.archivo && (
                    <div
                      style={{
                        marginTop:
                          mensaje.texto
                            ? 8
                            : 0,
                      }}
                    >
                      {esImagen ? (
                        <a
                          href={
                            mensaje.archivo.url
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={
                              mensaje.archivo.url
                            }
                            alt={
                              mensaje.archivo
                                .nombre
                            }
                            style={{
                              maxWidth:
                                "100%",
                              maxHeight: 250,
                              borderRadius: 8,
                              display:
                                "block",
                              cursor:
                                "pointer",
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          href={
                            mensaje.archivo.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: propio
                              ? "#ffffff"
                              : "#2563eb",
                            textDecoration:
                              "none",
                            fontWeight:
                              "bold",
                            display:
                              "inline-block",
                            wordBreak:
                              "break-word",
                          }}
                        >
                          📎{" "}
                          {
                            mensaje.archivo
                              .nombre
                          }
                        </a>
                      )}
                    </div>
                  )}

                  <div
                    className="message-time"
                    style={
                      estilos.horaMensaje
                    }
                  >
                    {new Date(
                      mensaje.created_at ??
                        mensaje.fecha
                    ).toLocaleTimeString(
                      "es-CO",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ESCRIBIR */}

      {(seccion === "privado" ||
        seccion === "informacion") && (
        <>
          {seccion === "informacion" &&
          usuario.rol !== "Administrador" ? (
            <div
              className="read-only"
              style={
                estilos.soloLectura
              }
            >
              👁 Los asesores pueden leer la
              información, pero solo los
              administradores pueden publicar.
            </div>
          ) : (
            <form
              onSubmit={enviarMensaje}
              className="message-form"
              style={estilos.formMensaje}
            >
              {seccion ===
                "informacion" &&
                usuario.rol ===
                  "Administrador" && (
                  <>
                    <input
                      ref={archivoInputRef}
                      type="file"
                      style={{
                        display: "none",
                      }}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      onChange={(e) => {
                        const archivo =
                          e.target.files?.[0] ||
                          null;

                        setArchivoSeleccionado(
                          archivo
                        );
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        archivoInputRef.current?.click()
                      }
                      style={
                        estilos.botonAdjuntar
                      }
                      title="Adjuntar archivo"
                      disabled={
                        subiendoArchivo
                      }
                    >
                      📎
                    </button>
                  </>
                )}

              {archivoSeleccionado && (
                <div
                  style={
                    estilos.archivoSeleccionado
                  }
                  title={
                    archivoSeleccionado.name
                  }
                >
                  📎{" "}
                  {archivoSeleccionado.name}

                  <button
                    type="button"
                    onClick={() => {
                      setArchivoSeleccionado(
                        null
                      );

                      if (
                        archivoInputRef.current
                      ) {
                        archivoInputRef.current.value =
                          "";
                      }
                    }}
                    style={
                      estilos.botonQuitarArchivo
                    }
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
  value={texto}
  onChange={(e) => setTexto(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje(e);
    }
  }}
  placeholder={
    seccion === "informacion"
      ? "Escribe un comunicado..."
      : "Escribe un mensaje..."
  }
  className="message-input"
  style={{
    ...estilos.inputMensaje,
    resize: "none",
    minHeight: 43,
    maxHeight: 120,
    overflowY: "auto",
    fontFamily: "inherit",
    lineHeight: 1.4,
  }}
  rows={1}
/>

              <button
                type="submit"
                className="send-button"
                style={{
                  ...estilos.botonEnviar,
                  opacity:
                    subiendoArchivo
                      ? 0.6
                      : 1,
                }}
                disabled={
                  subiendoArchivo
                }
                title={
                  subiendoArchivo
                    ? "Subiendo archivo..."
                    : "Enviar"
                }
              >
                {subiendoArchivo
                  ? "⏳"
                  : "➤"}
              </button>
            </form>
          )}
        </>
      )}
    </main>
  );
}

export default Chat;

