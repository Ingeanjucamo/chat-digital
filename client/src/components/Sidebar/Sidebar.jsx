import React, { useState } from "react";

function Sidebar({
  usuario,
  seccion,
  notificacionesInfo,
  notificacionesPrivadas,
  abrirInformacion,
  abrirConversaciones,
  abrirAdministracion,
  abrirVentas,
  abrirVentasCantadas,
  abrirDashboard,
  cerrarSesion,
  estilos,
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={`app-sidebar ${collapsed ? "sidebar-collapsed" : ""}`}
      style={estilos.sidebar}
    >
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        title={collapsed ? "Expandir menú" : "Contraer menú"}
      >
        {collapsed ? "›" : "‹"}
      </button>
      <div
        className="brand-area"
        style={estilos.logoArea}
      >
        <img
          src="/amv-logo.png"
          alt="AMV CRM & SOFTWARE"
          className="sidebar-logo"
        />

        <div className={`brand-text ${collapsed ? "sidebar-hidden" : ""}`}>
          <div style={estilos.logoTitulo}>
            AMV CRM &amp; SOFTWARE
          </div>

          <div style={estilos.logoTexto}>
            Gestiona, conecta y haz crecer tu negocio.
          </div>
        </div>
      </div>

      {/* USUARIO */}

      <div
        className={`current-user ${collapsed ? "sidebar-user-collapsed" : ""}`}
        style={estilos.usuarioActual}
      >
        <div
          className="current-avatar"
          style={estilos.avatar}
        >
          {usuario.nombre
            ? usuario.nombre.charAt(0).toUpperCase()
            : "U"}
        </div>

        <div className={collapsed ? "sidebar-hidden" : ""} style={{ minWidth: 0 }}>
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
        className={`main-menu ${collapsed ? "sidebar-menu-collapsed" : ""}`}
        style={estilos.menu}
      >

        {/* DASHBOARD */}

        <button
          className={`menu-item ${collapsed ? "sidebar-menu-item-collapsed" : ""}`}
          style={{
            ...estilos.menuBoton,
            ...(seccion === "dashboard"
              ? estilos.menuActivo
              : {}),
          }}
          onClick={abrirDashboard}
        >
          <span>📈</span>

          <span className={collapsed ? "sidebar-hidden" : ""} style={{ flex: 1 }}>
            Dashboard
          </span>
        </button>


        {/* INFORMACIÓN */}

        <button
          className={`menu-item ${collapsed ? "sidebar-menu-item-collapsed" : ""}`}
          style={{
            ...estilos.menuBoton,
            ...(seccion === "informacion"
              ? estilos.menuActivo
              : {}),
          }}
          onClick={abrirInformacion}
        >
          <span>📢</span>

          <span className={collapsed ? "sidebar-hidden" : ""} style={{ flex: 1 }}>
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
          className={`menu-item ${collapsed ? "sidebar-menu-item-collapsed" : ""}`}
          style={{
            ...estilos.menuBoton,
            ...(seccion === "privado"
              ? estilos.menuActivo
              : {}),
          }}
          onClick={abrirConversaciones}
        >
          <span>💬</span>

          <span className={collapsed ? "sidebar-hidden" : ""} style={{ flex: 1 }}>
            Conversaciones
          </span>

          {notificacionesPrivadas > 0 && (
            <span style={estilos.badge}>
              {notificacionesPrivadas}
            </span>
          )}
        </button>


        {/* VENTAS */}

        <button
          className={`menu-item ${collapsed ? "sidebar-menu-item-collapsed" : ""}`}
          style={{
            ...estilos.menuBoton,
            ...(seccion === "ventas"
              ? estilos.menuActivo
              : {}),
          }}
          onClick={abrirVentas}
        >
          <span>📊</span>

          <span className={collapsed ? "sidebar-hidden" : ""} style={{ flex: 1 }}>
            Ventas
          </span>
        </button>


        {/* VENTAS CANTADAS */}
        {(usuario.rol === "Administrador" || usuario.rol === "Supervisor" ||
          usuario.esSuperAdmin || usuario.es_super_admin) && (
          <button className={`menu-item ${collapsed ? "sidebar-menu-item-collapsed" : ""}`}
            style={{...estilos.menuBoton,...(seccion === "ventasCantadas" ? estilos.menuActivo : {})}}
            onClick={abrirVentasCantadas}>
            <span>📣</span><span className={collapsed ? "sidebar-hidden" : ""} style={{flex:1}}>Venta Cantadas</span>
          </button>
        )}

        {/* ADMINISTRACIÓN */}

        {usuario.rol === "Administrador" &&
          (usuario.esSuperAdmin ||
            usuario.usuario === "andres.cardozo") && (
            <button
              className={`menu-item ${collapsed ? "sidebar-menu-item-collapsed" : ""}`}
              style={{
                ...estilos.menuBoton,
                ...(seccion === "administracion"
                  ? estilos.menuActivo
                  : {}),
              }}
              onClick={abrirAdministracion}
            >
              <span>⚙️</span>

              <span className={collapsed ? "sidebar-hidden" : ""}>
                Administración
              </span>
            </button>
          )}
      </div>


      {/* PARTE INFERIOR */}

      <div
        style={{
          marginTop: "auto",
          paddingTop: 12,
        }}
      >

        {/* CERRAR SESIÓN */}

        <button
          className={`logout-button ${collapsed ? "sidebar-logout-collapsed" : ""}`}
          style={estilos.botonCerrar}
          onClick={cerrarSesion}
        >
          <span style={{ fontSize: 16 }}>
            🚪
          </span>

          <span className={collapsed ? "sidebar-hidden" : ""}>
            Cerrar sesión
          </span>
        </button>


        {/* FIRMA */}

        <div
          className={`sidebar-credit ${collapsed ? "sidebar-hidden" : ""}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 15,
            marginTop: 10,
            padding: "12px 8px 4px",
            borderTop:
              "1px solid rgba(255,255,255,0.08)",
          }}
        >

          <div
            style={{
              color: "#b9d2ff",
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              minWidth: 25,
              paddingTop: 1,
            }}
          >
            {"</>"}
          </div>

          <div
            className="sidebar-credit-text"
            style={{
              minWidth: 0,
              lineHeight: 1.3,
            }}
          >

            <div
              style={{
                color:
                  "rgba(255,255,255,0.88)",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Hecho por <strong>Anjucamo</strong>
            </div>

            <div
              style={{
                marginTop: 5,
                color:
                  "rgba(255,255,255,0.48)",
                fontSize: 10,
                whiteSpace: "nowrap",
              }}
            >
              Diseño y desarrollo
            </div>

          </div>
        </div>

      </div>
    </aside>
  );
}

export default Sidebar;