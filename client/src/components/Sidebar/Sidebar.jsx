import React from "react";

function Sidebar({
  usuario,
  seccion,
  notificacionesInfo,
  notificacionesPrivadas,
  abrirInformacion,
  abrirConversaciones,
  abrirAdministracion,
  cerrarSesion,
  estilos,
}) {
  return (
    <aside
      className="app-sidebar"
      style={estilos.sidebar}
    >
      <div
        className="brand-area"
        style={estilos.logoArea}
      >
        <img
          src="/logo-digital.png"
          alt="Digital Contact Center Colombia S.A.S."
          className="sidebar-logo"
        />

        <div className="brand-text">
          <div style={estilos.logoTitulo}>
            Chat Digital
          </div>

          <div style={estilos.logoTexto}>
            Comunicación interna
          </div>
        </div>
      </div>

      {/* USUARIO */}

      <div
        className="current-user"
        style={estilos.usuarioActual}
      >
        <div
          className="current-avatar"
          style={estilos.avatar}
        >
          {usuario.nombre
            ? usuario.nombre
                .charAt(0)
                .toUpperCase()
            : "U"}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={estilos.nombreUsuario}>
            {usuario.nombre}
          </div>

          <div style={estilos.rolUsuario}>
            {usuario.rol}
            {usuario.esSuperAdmin
              ? " · SuperAdmin"
              : ""}
          </div>
        </div>
      </div>

      {/* MENÚ */}

      <div
        className="main-menu"
        style={estilos.menu}
      >
        {/* INFORMACIÓN */}

        <button
          className="menu-item"
          style={{
            ...estilos.menuBoton,
            ...(seccion === "informacion"
              ? estilos.menuActivo
              : {}),
          }}
          onClick={abrirInformacion}
        >
          <span>📢</span>

          <span style={{ flex: 1 }}>
            Información
          </span>

          {notificacionesInfo > 0 && (
            <span style={estilos.badge}>
              {notificacionesInfo}
            </span>
          )}
        </button>

        {/* CONVERSACIONES */}

        <button
          className="menu-item"
          style={{
            ...estilos.menuBoton,
            ...(seccion === "privado"
              ? estilos.menuActivo
              : {}),
          }}
          onClick={abrirConversaciones}
        >
          <span>💬</span>

          <span style={{ flex: 1 }}>
            Conversaciones
          </span>

          {notificacionesPrivadas > 0 && (
            <span style={estilos.badge}>
              {notificacionesPrivadas}
            </span>
          )}
        </button>

        {/* ADMINISTRACIÓN */}

        {usuario.rol === "Administrador" &&
  (usuario.esSuperAdmin ||
    usuario.usuario === "andres.cardozo") && (
            <button
              className="menu-item"
              style={{
                ...estilos.menuBoton,
                ...(seccion === "administracion"
                  ? estilos.menuActivo
                  : {}),
              }}
              onClick={abrirAdministracion}
            >
              <span>⚙️</span>
              <span>Administración</span>
            </button>
          )}
      </div>

      {/* CERRAR SESIÓN */}

      <button
        className="logout-button"
        style={estilos.botonCerrar}
        onClick={cerrarSesion}
      >
        🚪 Cerrar sesión
      </button>
    </aside>
  );
}

export default Sidebar;
