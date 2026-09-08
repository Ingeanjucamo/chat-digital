import React from "react";

function Contacts({
  usuario,
  seccion,
  busqueda,
  setBusqueda,
  contactos,
  pendientesPorUsuario,
  usuarioChat,
  abrirChatPrivado,
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
          BUSCADOR
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
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
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
          LISTA CONTACTOS
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
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <span
            style={{
              width: 27,
              height: 27,
              borderRadius: 8,
              background: "#eaf4ff",
              color: "#1769e8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            ✦
          </span>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#334155",
              }}
            >
              Hecho por Anjucamo
            </div>

            <div
              style={{
                marginTop: 2,
                fontSize: 9,
                color: "#94a3b8",
              }}
            >
              Diseño y desarrollo
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contacts;

