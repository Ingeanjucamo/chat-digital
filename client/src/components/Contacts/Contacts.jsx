import React from "react";

function Contacts({
  usuario,
  seccion,
  miChat,
  setMiChat,
  busqueda,
  setBusqueda,
  contactos,
  pendientesPorUsuario,
  usuarioChat,
  abrirChatPrivado,
  abrirMiChat,
  estilos,
}) {
  return (
    <section
      className="contacts-panel"
      style={estilos.contactos}
    >
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div style={estilos.contactosTitulo}>
        <h2 style={estilos.tituloContactos}>
          {seccion === "privado"
            ? "Conversaciones"
            : "Información"}
        </h2>

        <p style={estilos.subtituloContactos}>
          {usuario?.rol === "Asesor"
            ? "Administradores disponibles"
            : "Asesores disponibles"}
        </p>
      </div>

      {/* =====================================================
          INFORMACIÓN
      ===================================================== */}

      {seccion === "informacion" && (
        <div
          className="contacts-empty"
          style={{ flex: 1 }}
        />
      )}

      {/* =====================================================
          BUSCADOR DE CONTACTOS
      ===================================================== */}

      {seccion === "privado" && (
        <div
          className="search-box"
          style={estilos.busquedaCaja}
        >
          <span>🔎</span>

          <input
            type="text"
            placeholder="Buscar asesor o administrador..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
            }}
            style={estilos.inputBusqueda}
          />

          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={estilos.botonLimpiarBusqueda}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* =====================================================
          MI CHAT
      ===================================================== */}

      {seccion === "privado" && (
        <button
          type="button"
          onClick={() => {
            setBusqueda("");
            abrirMiChat();
          }}
          className="contact-item"
          style={{
            ...estilos.contacto,
            margin: "0 12px 8px",
            width: "calc(100% - 24px)",
            background: miChat
              ? "#f1f5f9"
              : "#ffffff",
          }}
        >
          <div
            className="contact-avatar"
            style={{
              ...estilos.avatarContacto,
              background: "#eaf4ff",
              color: "#1769e8",
            }}
          >
            📝
          </div>

          <div
            className="contact-info"
            style={estilos.infoContacto}
          >
            <div
              className="contact-name"
              style={estilos.nombreContacto}
            >
              Mi chat
            </div>

            <div
              className="contact-role"
              style={estilos.funcionesContacto}
            >
              Mis notas personales
            </div>
          </div>
        </button>
      )}

      {/* =====================================================
          LISTA DE CONTACTOS
      ===================================================== */}

      {seccion === "privado" && (
        <div
          className="contacts-list"
          style={{
            ...estilos.listaContactos,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {contactos.length === 0 ? (
            <div style={estilos.sinContactos}>
              <div style={{ fontSize: 40 }}>
                👥
              </div>

              <p>
                {busqueda
                  ? "No se encontraron contactos"
                  : "No hay contactos"}
              </p>
            </div>
          ) : (
            contactos.map((contacto) => {
              const pendientes =
                pendientesPorUsuario[contacto.id] || 0;

              return (
                <button
                  key={contacto.id}
                  onClick={() => {
                    console.log(
                      "CONTACTO SELECCIONADO:",
                      contacto
                    );

                    abrirChatPrivado(contacto);
                  }}
                  className="contact-item"
                  style={{
                    ...estilos.contacto,
                    ...(usuarioChat?.id === contacto.id
                      ? estilos.contactoActivo
                      : {}),
                  }}
                >
                  <div
                    className="contact-avatar"
                    style={estilos.avatarContacto}
                  >
                    {contacto.nombre
                      ? contacto.nombre
                          .charAt(0)
                          .toUpperCase()
                      : "U"}
                  </div>

                  <div
                    className="contact-info"
                    style={estilos.infoContacto}
                  >
                    <div
                      className="contact-name"
                      style={estilos.nombreContacto}
                    >
                      {contacto.nombre}
                    </div>

                    <div
                      className="contact-role"
                      style={estilos.funcionesContacto}
                    >
                      {contacto.rol}
                    </div>
                  </div>

                  {pendientes > 0 && (
                    <span
                      style={estilos.badgeContacto}
                    >
                      {pendientes}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* =====================================================
          CRÉDITO
      ===================================================== */}

      <div
        className="contacts-credit"
        style={{
          flexShrink: 0,
          padding: "12px 18px 14px",
          borderTop: "1px solid #edf0f4",
          background: "#ffffff",
        }}
      ></div>
    </section>
  );
}

export default Contacts;