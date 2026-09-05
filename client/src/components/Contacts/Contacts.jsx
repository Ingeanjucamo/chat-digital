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
      <div
        className="contacts-heading"
        style={estilos.contactosTitulo}
      >
        <h2
          className="contacts-title"
          style={estilos.tituloContactos}
        >
          {seccion === "informacion"
            ? "Información"
            : seccion === "administracion"
            ? "Administración"
            : "Conversaciones"}
        </h2>

        <p
          className="contacts-subtitle"
          style={estilos.subtituloContactos}
        >
          {seccion === "informacion"
            ? "Comunicados generales"
            : seccion === "administracion"
            ? "Panel administrativo"
            : usuario.rol === "Asesor"
            ? "Administradores disponibles"
            : "Asesores disponibles"}
        </p>
      </div>

      {/* INFORMACIÓN */}

      {seccion === "informacion" && (
        <div
          className="info-card"
          style={estilos.infoPanel}
        >
          <div
            className="info-icon"
            style={estilos.infoIcono}
          >
            📢
          </div>

          <h3>
            Canal de información
          </h3>

          <p>
            Aquí los administradores
            publican comunicados para
            todo el equipo.
          </p>

          {usuario.rol === "Administrador" ? (
            <div style={estilos.infoPermitido}>
              ✓ Puedes publicar información
            </div>
          ) : (
            <div style={estilos.infoSoloLectura}>
              👁 Solo lectura para asesores
            </div>
          )}
        </div>
      )}

      {/* BUSCADOR */}

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

      {/* LISTA CONTACTOS */}

      {seccion === "privado" && (
        <div
          className="contacts-list"
          style={estilos.listaContactos}
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
                  onClick={() =>
                    abrirChatPrivado(contacto)
                  }
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
    </section>
  );
}

export default Contacts;
