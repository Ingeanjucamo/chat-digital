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
  mensajeRespondido,
  setMensajeRespondido,
}) {
  const mensajesAreaRef = useRef(null);

  // =====================================================
  // BAJAR AUTOMÁTICAMENTE AL ÚLTIMO MENSAJE
  // =====================================================

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

    window.addEventListener("paste", manejarPegado);

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

  // =====================================================
  // RESPONDER UN MENSAJE
  // =====================================================

  function seleccionarMensajeParaResponder(mensaje) {
    setMensajeRespondido(mensaje);

    setTimeout(() => {
      const input = document.querySelector(
        ".message-input"
      );

      if (input) {
        input.focus();
      }
    }, 50);
  }

  // =====================================================
  // CANCELAR RESPUESTA
  // =====================================================

  function cancelarRespuesta() {
    setMensajeRespondido(null);
  }

  // =====================================================
  // OBTENER TEXTO DEL MENSAJE RESPONDIDO
  // =====================================================

  function obtenerTextoMensaje(mensaje) {
    if (!mensaje) return "";

    if (mensaje.texto) {
      return mensaje.texto;
    }

    if (mensaje.archivo?.tipo?.startsWith("image/")) {
      return "📷 Imagen";
    }

    if (mensaje.archivo) {
      return `📎 ${mensaje.archivo.nombre || "Archivo"}`;
    }

    return "Mensaje";
  }

  // =====================================================
  // BUSCAR MENSAJE ORIGINAL
  // =====================================================

  function obtenerMensajeOriginal(mensaje) {
    if (!mensaje?.mensaje_respondido_id) {
      return null;
    }

    return mensajes.find(
      (m) =>
        Number(m.id) ===
        Number(mensaje.mensaje_respondido_id)
    );
  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <main
      className="chat-panel"
      style={estilos.chat}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        className="chat-header"
        style={estilos.chatHeader}
      >
        {seccion === "privado" && usuarioChat ? (
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

      {/* =====================================================
          MENSAJES
      ===================================================== */}

      <div
        ref={mensajesAreaRef}
        className="messages-area"
        style={estilos.mensajes}
      >
        {mensajes.length === 0 ? (
          <div
            style={estilos.pantallaCentro}
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

            const mensajeOriginal =
              obtenerMensajeOriginal(mensaje);

            return (
              <div
  key={mensaje.id}
  id={`mensaje-${mensaje.id}`}
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
                    position: "relative",
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

                  {/* =====================================================
                      MENSAJE AL QUE SE ESTÁ RESPONDIENDO
                  ===================================================== */}

                  {mensajeOriginal && (
                  <div
  onClick={() => {
    const elemento = document.getElementById(
      `mensaje-${mensajeOriginal.id}`
    );

    if (elemento) {
      elemento.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      elemento.classList.add("mensaje-destacado");

setTimeout(() => {
  elemento.classList.remove("mensaje-destacado");
}, 2000);
    }
  }}
  style={{
    borderLeft: "4px solid rgba(255,255,255,0.7)",
                        background:
                          propio
                            ? "rgba(0,0,0,0.15)"
                            : "rgba(0,0,0,0.05)",
                        borderRadius: 6,
                        padding:
                          "6px 8px",
                        marginBottom: 8,
                        fontSize: 12,
                        opacity: 0.9,
                        cursor: "pointer",
                      }}
                      title="Mensaje respondido"
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: 2,
                        }}
                      >
                        {mensajeOriginal.nombre ||
                          obtenerTextoMensaje(
                            mensajeOriginal
                          )}
                      </div>

                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {obtenerTextoMensaje(
                          mensajeOriginal
                        )}
                      </div>
                    </div>
                  )}

                  {/* =====================================================
                      TEXTO
                  ===================================================== */}

                  {mensaje.texto && (
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {mensaje.texto}
                    </div>
                  )}

                  {/* =====================================================
                      ARCHIVO / IMAGEN
                  ===================================================== */}

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
                              mensaje.archivo.nombre
                            }
                            style={{
                              maxWidth: "100%",
                              maxHeight: 250,
                              borderRadius: 8,
                              display: "block",
                              cursor: "pointer",
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
                            fontWeight: "bold",
                            display:
                              "inline-block",
                            wordBreak:
                              "break-word",
                          }}
                        >
                          📎{" "}
                          {mensaje.archivo.nombre}
                        </a>
                      )}
                    </div>
                  )}

                  {/* =====================================================
                      HORA + RESPONDER
                  ===================================================== */}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      gap: 8,
                      marginTop: 5,
                    }}
                  >
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

                    {/* RESPONDER SOLO EN CHAT PRIVADO */}

                    {seccion === "privado" &&
                      usuarioChat && (
                        <button
                          type="button"
                          onClick={() =>
                            seleccionarMensajeParaResponder(
                              mensaje
                            )
                          }
                          style={{
                            border: "none",
                            background:
                              "transparent",
                            color: propio
                              ? "rgba(255,255,255,0.85)"
                              : "#2563eb",
                            cursor: "pointer",
                            fontSize: 12,
                            padding: 0,
                          }}
                          title="Responder este mensaje"
                        >
                          ↩️ Responder
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =====================================================
          ZONA PARA ESCRIBIR
      ===================================================== */}

      {(seccion === "privado" ||
        seccion === "informacion") && (
        <>
          {/* SOLO INFORMACIÓN PARA ASESORES */}

          {seccion === "informacion" &&
          usuario.rol !== "Administrador" ? (
            <div
              className="read-only"
              style={estilos.soloLectura}
            >
              👁 Los asesores pueden leer la
              información, pero solo los
              administradores pueden publicar.
            </div>
          ) : (
            <>
              {/* =====================================================
                  MENSAJE QUE ESTAMOS RESPONDIENDO
              ===================================================== */}

              {mensajeRespondido &&
                seccion === "privado" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding:
                        "8px 12px",
                      margin:
                        "0 10px 6px 10px",
                      borderRadius: 8,
                      background:
                        "rgba(37, 99, 235, 0.08)",
                      borderLeft:
                        "4px solid #2563eb",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: "bold",
                          color: "#2563eb",
                          marginBottom: 2,
                        }}
                      >
                        Respondiendo a{" "}
                        {mensajeRespondido.nombre ||
                          "Usuario"}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          whiteSpace:
                            "nowrap",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                        }}
                      >
                        {obtenerTextoMensaje(
                          mensajeRespondido
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        cancelarRespuesta
                      }
                      style={{
                        border: "none",
                        background:
                          "transparent",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: 4,
                      }}
                      title="Cancelar respuesta"
                    >
                      ✕
                    </button>
                  </div>
                )}

              <form
                onSubmit={enviarMensaje}
                className="message-form"
                style={estilos.formMensaje}
              >
                {/* =====================================================
                    BOTÓN ADJUNTAR
                ===================================================== */}

                {(
                  (
                    seccion === "informacion" &&
                    usuario.rol === "Administrador"
                  ) ||
                  (
                    seccion === "privado" &&
                    usuarioChat &&
                    usuarioChat.rol !== usuario.rol
                  )
                ) && (
                  <>
                    <input
                      ref={archivoInputRef}
                      type="file"
                      style={{
                        display: "none",
                      }}
                      accept={
                        seccion === "privado"
                          ? "image/*"
                          : "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      }
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
                      title={
                        seccion === "privado"
                          ? "Adjuntar imagen"
                          : "Adjuntar archivo"
                      }
                      disabled={
                        subiendoArchivo
                      }
                    >
                      📎
                    </button>
                  </>
                )}

                {/* =====================================================
                    ARCHIVO SELECCIONADO
                ===================================================== */}

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

                {/* =====================================================
                    CAMPO DE TEXTO
                ===================================================== */}

                <textarea
                  value={texto}
                  onChange={(e) =>
                    setTexto(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      enviarMensaje(e);
                    }
                  }}
                  placeholder={
                    seccion === "informacion"
                      ? "Escribe un comunicado..."
                      : mensajeRespondido
                      ? "Escribe tu respuesta..."
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

                {/* =====================================================
                    BOTÓN ENVIAR
                ===================================================== */}

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
            </>
          )}
        </>
      )}
    </main>
  );
}



export default Chat;

