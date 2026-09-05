import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const API = `http://${window.location.hostname}:3000`;

const socket = io(API, {
  transports: ["websocket", "polling"],
});

function App() {
  const [usuario, setUsuario] = useState(null);

  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");

  const [usuarios, setUsuarios] = useState([]);

  /* =====================================================
     ADMINISTRACIÓN
  ===================================================== */

  const [usuariosAdmin, setUsuariosAdmin] = useState([]);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioPassword, setUsuarioPassword] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [mostrarFormularioUsuario, setMostrarFormularioUsuario] =
    useState(false);

  const [formUsuario, setFormUsuario] = useState({
    usuario: "",
    nombre: "",
    password: "",
    rol: "Asesor",
  });

  const [cargandoAdmin, setCargandoAdmin] = useState(false);

  const [seccion, setSeccion] = useState("informacion");
  const [usuarioChat, setUsuarioChat] = useState(null);

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");

  /* ARCHIVOS */
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const archivoInputRef = useRef(null);

  const [busqueda, setBusqueda] = useState("");

  /* NOTIFICACIONES */
  const [notificacionesPrivadas, setNotificacionesPrivadas] = useState(0);
  const [notificacionesInfo, setNotificacionesInfo] = useState(0);

  const [pendientesPorUsuario, setPendientesPorUsuario] = useState({});

  const [alerta, setAlerta] = useState(null);

  useEffect(() => {
    document.title = "Chat Digital | Comunicación Interna";
  }, []);

  /* =====================================================
     CARGAR USUARIOS
  ===================================================== */

  async function cargarUsuarios() {
    try {
      const respuesta = await fetch(`${API}/api/usuarios`);

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los usuarios");
      }

      const datos = await respuesta.json();

      setUsuarios(datos);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  }

  /* =====================================================
     NOTIFICACIONES
  ===================================================== */

  async function solicitarNotificaciones() {
    if ("Notification" in window) {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch (error) {
        console.log("No se pudo solicitar permiso:", error);
      }
    }
  }

  function mostrarNotificacion(titulo, mensaje) {
    if (
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(titulo, {
          body: mensaje,
        });
      } catch (error) {
        console.log("No se pudo mostrar notificación:", error);
      }
    }

    setAlerta({
      titulo,
      mensaje,
    });

    setTimeout(() => {
      setAlerta(null);
    }, 5000);
  }

  /* =====================================================
     ADMINISTRACIÓN - CARGAR USUARIOS
  ===================================================== */

  async function cargarUsuariosAdministracion() {
    if (!usuario?.esSuperAdmin) return;

    try {
      setCargandoAdmin(true);

      const respuesta = await fetch(
        `${API}/api/administracion/usuarios`,
        {
          headers: {
            "x-usuario-id": String(usuario.id),
          },
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudieron cargar los usuarios"
        );
      }

      setUsuariosAdmin(datos);
    } catch (error) {
      console.error(
        "Error cargando usuarios de administración:",
        error
      );

      setAlerta({
        titulo: "Error",
        mensaje: error.message,
      });
    } finally {
      setCargandoAdmin(false);
    }
  }

  /* =====================================================
     LOGIN
  ===================================================== */

  async function iniciarSesion(e) {
    e.preventDefault();

    setErrorLogin("");

    try {
      const respuesta = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario: loginUsuario.trim(),
          password: loginPassword,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setErrorLogin(
          datos.error || "Usuario o contraseña incorrectos"
        );
        return;
      }

      setUsuario(datos.usuario);

      await cargarUsuarios();

      solicitarNotificaciones();

      socket.emit("usuario:conectar", datos.usuario.id);
    } catch (error) {
      console.error(error);

      setErrorLogin("No se pudo conectar con el servidor");
    }
  }

  /* =====================================================
     SOCKET
  ===================================================== */

  useEffect(() => {
    if (!usuario) {
      return;
    }

    function conectarUsuario() {
      socket.emit("usuario:conectar", usuario.id);
    }

    conectarUsuario();

    socket.on("connect", conectarUsuario);

    function recibirMensaje(mensaje) {
      const miId = Number(usuario.id);
      const emisorId = Number(mensaje.emisorId);

      const receptorId = mensaje.receptorId
        ? Number(mensaje.receptorId)
        : null;

      const textoNotificacion =
        mensaje.texto ||
        `📎 ${mensaje.archivo?.nombre || "Archivo adjunto"}`;

      /* MENSAJE PRIVADO */

      if (receptorId !== null) {
        const esParaMi =
          receptorId === miId &&
          emisorId !== miId;

        if (esParaMi) {
          const chatAbierto =
            seccion === "privado" &&
            usuarioChat &&
            Number(usuarioChat.id) === emisorId;

          if (chatAbierto) {
            setMensajes((anteriores) => {
              if (
                anteriores.some(
                  (m) => m.id === mensaje.id
                )
              ) {
                return anteriores;
              }

              return [...anteriores, mensaje];
            });

            return;
          }

          setNotificacionesPrivadas(
            (cantidad) => cantidad + 1
          );

          setPendientesPorUsuario((anteriores) => ({
            ...anteriores,
            [emisorId]:
              (anteriores[emisorId] || 0) + 1,
          }));

          mostrarNotificacion(
            `💬 Nuevo mensaje de ${mensaje.nombre}`,
            textoNotificacion
          );

          return;
        }

        return;
      }

      /* INFORMACIÓN GENERAL */

      if (mensaje.grupo === "informacion") {
        if (emisorId === miId) {
          setMensajes((anteriores) => {
            if (
              anteriores.some(
                (m) => m.id === mensaje.id
              )
            ) {
              return anteriores;
            }

            return [...anteriores, mensaje];
          });

          return;
        }

        if (seccion === "informacion") {
          setMensajes((anteriores) => {
            if (
              anteriores.some(
                (m) => m.id === mensaje.id
              )
            ) {
              return anteriores;
            }

            return [...anteriores, mensaje];
          });

          return;
        }

        setNotificacionesInfo(
          (cantidad) => cantidad + 1
        );

        mostrarNotificacion(
          `📢 Nueva información de ${mensaje.nombre}`,
          textoNotificacion
        );
      }
    }

    socket.on(
      "mensaje:nuevo",
      recibirMensaje
    );

    return () => {
      socket.off(
        "mensaje:nuevo",
        recibirMensaje
      );

      socket.off(
        "connect",
        conectarUsuario
      );
    };
  }, [usuario, seccion, usuarioChat]);

  /* =====================================================
     CONTACTOS
  ===================================================== */

  const contactos = useMemo(() => {
    if (!usuario) {
      return [];
    }

    let lista = [];

    if (usuario.rol === "Asesor") {
      lista = usuarios.filter(
        (u) =>
          u.rol === "Administrador" &&
          u.id !== usuario.id &&
          u.activo !== false
      );
    }

    if (usuario.rol === "Administrador") {
      lista = usuarios.filter(
        (u) =>
          u.rol === "Asesor" &&
          u.id !== usuario.id &&
          u.activo !== false
      );
    }

    if (busqueda.trim() !== "") {
      const textoBusqueda =
        busqueda.toLowerCase().trim();

      lista = lista.filter((u) => {
        const nombre =
          u.nombre
            ? u.nombre.toLowerCase()
            : "";

        const usuarioNombre =
          u.usuario
            ? u.usuario.toLowerCase()
            : "";

        return (
          nombre.includes(textoBusqueda) ||
          usuarioNombre.includes(textoBusqueda)
        );
      });
    }

    return lista;
  }, [
    usuarios,
    usuario,
    busqueda,
  ]);

  /* =====================================================
     ABRIR INFORMACIÓN
  ===================================================== */

  async function abrirInformacion() {
    setSeccion("informacion");
    setUsuarioChat(null);
    setTexto("");
    setBusqueda("");
    setNotificacionesInfo(0);
    setArchivoSeleccionado(null);

    if (archivoInputRef.current) {
      archivoInputRef.current.value = "";
    }

    try {
      const respuesta = await fetch(
        `${API}/api/mensajes/informacion`
      );

      const datos = await respuesta.json();

      if (respuesta.ok) {
        setMensajes(datos);
      }
    } catch (error) {
      console.error(
        "Error cargando información:",
        error
      );
    }
  }

  /* =====================================================
     ABRIR CONVERSACIONES
  ===================================================== */

  function abrirConversaciones() {
    setSeccion("privado");
    setUsuarioChat(null);
    setMensajes([]);
    setTexto("");
    setBusqueda("");
    setArchivoSeleccionado(null);

    if (archivoInputRef.current) {
      archivoInputRef.current.value = "";
    }
  }

  /* =====================================================
     ABRIR CHAT PRIVADO
  ===================================================== */

  async function abrirChatPrivado(contacto) {
    if (!usuario || !contacto) {
      return;
    }

    setUsuarioChat(contacto);
    setSeccion("privado");
    setTexto("");
    setArchivoSeleccionado(null);

    if (archivoInputRef.current) {
      archivoInputRef.current.value = "";
    }

    const cantidadPendiente =
      pendientesPorUsuario[contacto.id] || 0;

    if (cantidadPendiente > 0) {
      setNotificacionesPrivadas(
        (cantidad) =>
          Math.max(
            0,
            cantidad - cantidadPendiente
          )
      );

      setPendientesPorUsuario(
        (anteriores) => {
          const nuevo = {
            ...anteriores,
          };

          delete nuevo[contacto.id];

          return nuevo;
        }
      );
    }

    try {
      const respuesta = await fetch(
        `${API}/api/conversacion/${usuario.id}/${contacto.id}`
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        alert(
          datos.error ||
            "No tienes permiso para esta conversación"
        );
        return;
      }

      setMensajes(datos);
    } catch (error) {
      console.error(
        "Error cargando conversación:",
        error
      );
    }
  }

  /* =====================================================
     ENVIAR MENSAJE
  ===================================================== */

  async function enviarMensaje(e) {
    e.preventDefault();

    const mensajeTexto = texto.trim();

    if (
      (!mensajeTexto && !archivoSeleccionado) ||
      !usuario
    ) {
      return;
    }

    if (
      archivoSeleccionado &&
      !(
        seccion === "informacion" &&
        usuario.rol === "Administrador"
      )
    ) {
      alert(
        "Los archivos solo pueden adjuntarse en Información."
      );
      return;
    }

    if (
      seccion === "informacion" &&
      usuario.rol !== "Administrador"
    ) {
      alert(
        "Solo los administradores pueden publicar información."
      );
      return;
    }

    if (
      seccion === "privado" &&
      !usuarioChat
    ) {
      alert(
        "Selecciona un contacto primero."
      );
      return;
    }

    try {
      const cuerpo = {
        emisorId: usuario.id,
        nombre: usuario.nombre,
        texto: mensajeTexto,
      };

      /* SUBIR ARCHIVO */

      if (archivoSeleccionado) {
        setSubiendoArchivo(true);

        try {
          const formData = new FormData();

          formData.append(
            "archivo",
            archivoSeleccionado
          );

          formData.append(
            "emisorId",
            usuario.id
          );

          const respuestaArchivo =
            await fetch(
              `${API}/api/archivos`,
              {
                method: "POST",
                body: formData,
              }
            );

          const datosArchivo =
            await respuestaArchivo.json();

          if (!respuestaArchivo.ok) {
            alert(
              datosArchivo.error ||
                "No se pudo subir el archivo"
            );
            return;
          }

          cuerpo.archivo =
            datosArchivo.archivo;
        } finally {
          setSubiendoArchivo(false);
        }
      }

      /* PRIVADO */

      if (
        seccion === "privado" &&
        usuarioChat
      ) {
        cuerpo.receptorId =
          usuarioChat.id;
      }

      /* INFORMACIÓN */

      if (seccion === "informacion") {
        cuerpo.grupo = "informacion";
      }

      const respuesta = await fetch(
        `${API}/api/mensajes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cuerpo),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        alert(
          datos.error ||
            "No se pudo enviar el mensaje"
        );
        return;
      }

      setTexto("");
      setArchivoSeleccionado(null);

      if (archivoInputRef.current) {
        archivoInputRef.current.value = "";
      }

      setMensajes((anteriores) => {
        if (
          anteriores.some(
            (m) => m.id === datos.id
          )
        ) {
          return anteriores;
        }

        return [...anteriores, datos];
      });
    } catch (error) {
      console.error(
        "Error enviando mensaje:",
        error
      );

      alert(
        "No se pudo conectar con el servidor"
      );
    }
  }

  /* =====================================================
     ADMINISTRACIÓN
  ===================================================== */

  function abrirAdministracion() {
    if (!usuario?.esSuperAdmin) return;

    setSeccion("administracion");
    setUsuarioChat(null);
    setMensajes([]);
    setBusqueda("");
    cargarUsuariosAdministracion();
  }

  /* =====================================================
     CERRAR SESIÓN
  ===================================================== */

  function cerrarSesion() {
    setUsuario(null);
    setUsuarioChat(null);
    setMensajes([]);
    setTexto("");
    setBusqueda("");
    setLoginUsuario("");
    setLoginPassword("");
    setErrorLogin("");
    setNotificacionesPrivadas(0);
    setNotificacionesInfo(0);
    setPendientesPorUsuario({});
    setAlerta(null);
    setArchivoSeleccionado(null);
    setSubiendoArchivo(false);

    setUsuariosAdmin([]);
    setUsuarioEditando(null);
    setUsuarioPassword(null);
    setNuevaPassword("");
    setMostrarFormularioUsuario(false);

    if (archivoInputRef.current) {
      archivoInputRef.current.value = "";
    }
  }

  /* =====================================================
     LOGIN
  ===================================================== */

  if (!usuario) {
    return (
      <div
        className="login-page"
        style={estilos.loginPagina}
      >
        <div
          className="login-card"
          style={estilos.loginCaja}
        >
          <div className="login-brand">
  <img
    src="/logo-digital.png"
    alt="Digital Contact Center Colombia S.A.S."
    className="login-logo"
  />
</div>

<h1 style={estilos.loginTitulo}>
  Chat Digital
</h1>

          <p style={estilos.loginSubtitulo}>
            Comunicación interna · Chat corporativo
          </p>

          <form onSubmit={iniciarSesion}>
            <input
              type="text"
              placeholder="Usuario"
              value={loginUsuario}
              onChange={(e) =>
                setLoginUsuario(
                  e.target.value
                )
              }
              style={estilos.input}
              autoComplete="username"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={loginPassword}
              onChange={(e) =>
                setLoginPassword(
                  e.target.value
                )
              }
              style={estilos.input}
              autoComplete="current-password"
            />

            {errorLogin && (
              <div style={estilos.error}>
                {errorLogin}
              </div>
            )}

            <button
              type="submit"
              style={estilos.botonLogin}
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* =====================================================
     INTERFAZ PRINCIPAL
  ===================================================== */

  return (
    <div
      className="app-shell"
      style={estilos.app}
    >
      {/* NOTIFICACIÓN */}

      {alerta && (
        <div style={estilos.alerta}>
          <div style={estilos.alertaIcono}>
            🔔
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={estilos.alertaTitulo}>
              {alerta.titulo}
            </div>

            <div style={estilos.alertaMensaje}>
              {alerta.mensaje}
            </div>
          </div>

          <button
            onClick={() =>
              setAlerta(null)
            }
            style={estilos.alertaCerrar}
          >
            ✕
          </button>
        </div>
      )}

      {/* SIDEBAR */}

      <aside
        className="app-sidebar"
        style={estilos.sidebar}
      >
        <div className="brand-area" style={estilos.logoArea}>
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
            usuario.esSuperAdmin && (
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

        <button
          className="logout-button"
          style={estilos.botonCerrar}
          onClick={cerrarSesion}
        >
          🚪 Cerrar sesión
        </button>
      </aside>

      <div className="app-credit">
        Hecho por IngeAnjucamo
      </div>

      {/* CONTACTOS */}

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
              <div
                style={estilos.infoPermitido}
              >
                ✓ Puedes publicar información
              </div>
            ) : (
              <div
                style={estilos.infoSoloLectura}
              >
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
                setBusqueda(
                  e.target.value
                )
              }
              style={estilos.inputBusqueda}
            />

            {busqueda && (
              <button
                onClick={() =>
                  setBusqueda("")
                }
                style={
                  estilos.botonLimpiarBusqueda
                }
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
              <div
                style={estilos.sinContactos}
              >
                <div
                  style={{
                    fontSize: 40,
                  }}
                >
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
                  pendientesPorUsuario[
                    contacto.id
                  ] || 0;

                return (
                  <button
                    key={contacto.id}
                    onClick={() =>
                      abrirChatPrivado(
                        contacto
                      )
                    }
                    className="contact-item"
                    style={{
                      ...estilos.contacto,
                      ...(usuarioChat?.id ===
                      contacto.id
                        ? estilos.contactoActivo
                        : {}),
                    }}
                  >
                    <div
                      className="contact-avatar"
                      style={
                        estilos.avatarContacto
                      }
                    >
                      {contacto.nombre
                        ? contacto.nombre
                            .charAt(0)
                            .toUpperCase()
                        : "U"}
                    </div>

                    <div
                      className="contact-info"
                      style={
                        estilos.infoContacto
                      }
                    >
                      <div
                        className="contact-name"
                        style={
                          estilos.nombreContacto
                        }
                      >
                        {contacto.nombre}
                      </div>

                      <div
                        className="contact-role"
                        style={
                          estilos.funcionesContacto
                        }
                      >
                        {contacto.rol}
                      </div>
                    </div>

                    {pendientes > 0 && (
                      <span
                        style={
                          estilos.badgeContacto
                        }
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

      {/* CHAT */}

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
                  : seccion === "administracion"
                  ? "⚙️"
                  : "💬"}
              </div>

              <div>
                <div
                  className="chat-name"
                  style={estilos.chatNombre}
                >
                  {seccion === "informacion"
                    ? "Información general"
                    : seccion === "administracion"
                    ? "Administración"
                    : "Conversaciones"}
                </div>

                <div
                  className="chat-status"
                  style={estilos.chatEstado}
                >
                  {seccion === "informacion"
                    ? "Comunicados para todo el equipo"
                    : seccion === "administracion"
                    ? "Gestión de usuarios"
                    : "Selecciona un contacto"}
                </div>
              </div>
            </>
          )}
        </header>

        {/* =====================================================
            ADMINISTRACIÓN
        ===================================================== */}

        {seccion === "administracion" ? (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 25,
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#111827",
                  }}
                >
                  Administración de usuarios
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#6b7280",
                    fontSize: 13,
                  }}
                >
                  Gestiona asesores y administradores
                </p>
              </div>

              <button
                onClick={() => {
                  setUsuarioEditando(null);

                  setFormUsuario({
                    usuario: "",
                    nombre: "",
                    password: "",
                    rol: "Asesor",
                  });

                  setMostrarFormularioUsuario(true);
                }}
                style={{
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  padding: "11px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ➕ Nuevo usuario
              </button>
            </div>

            {cargandoAdmin ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "#6b7280",
                }}
              >
                Cargando usuarios...
              </div>
            ) : (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                {usuariosAdmin.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 15,
                      padding: 15,
                      borderBottom:
                        "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        minWidth: 42,
                        borderRadius: "50%",
                        background:
                          u.rol === "Administrador"
                            ? "#7c3aed"
                            : "#2563eb",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {u.nombre
                        ? u.nombre
                            .charAt(0)
                            .toUpperCase()
                        : "U"}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "#111827",
                        }}
                      >
                        {u.nombre}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginTop: 3,
                        }}
                      >
                        @{u.usuario}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "5px 9px",
                        borderRadius: 8,
                        background:
                          u.rol === "Administrador"
                            ? "#ede9fe"
                            : "#dbeafe",
                        color:
                          u.rol === "Administrador"
                            ? "#6d28d9"
                            : "#1d4ed8",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    >
                      {u.rol}
                    </div>

                    <div
                      style={{
                        padding: "5px 9px",
                        borderRadius: 8,
                        background: u.activo
                          ? "#dcfce7"
                          : "#fee2e2",
                        color: u.activo
                          ? "#15803d"
                          : "#b91c1c",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    >
                      {u.activo
                        ? "Activo"
                        : "Desactivado"}
                    </div>

                    {/* EDITAR */}

                    {!u.esSuperAdmin && (
                      <button
                        onClick={() => {
                          setUsuarioEditando(u);

                          setFormUsuario({
                            usuario: u.usuario,
                            nombre: u.nombre,
                            password: "",
                            rol: u.rol,
                          });

                          setMostrarFormularioUsuario(
                            true
                          );
                        }}
                        style={{
                          border:
                            "1px solid #d1d5db",
                          background: "#ffffff",
                          color: "#374151",
                          padding: "8px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Editar
                      </button>
                    )}

                    {/* CONTRASEÑA */}

                    {!u.esSuperAdmin && (
                      <button
                        onClick={() => {
                          setUsuarioPassword(u);
                          setNuevaPassword("");
                        }}
                        style={{
                          border:
                            "1px solid #d1d5db",
                          background: "#ffffff",
                          color: "#374151",
                          padding: "8px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        🔑 Contraseña
                      </button>
                    )}

                    {/* SUPERADMIN */}

                    {u.esSuperAdmin && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#7c3aed",
                          fontWeight: "bold",
                        }}
                      >
                        👑 SuperAdmin
                      </div>
                    )}
                  </div>
                ))}

                {usuariosAdmin.length === 0 && (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No hay usuarios registrados.
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                MODAL CREAR / EDITAR
            ================================================= */}

            {mostrarFormularioUsuario && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 5000,
                }}
              >
                <div
                  style={{
                    width: 420,
                    maxWidth: "90%",
                    background: "#ffffff",
                    borderRadius: 16,
                    padding: 25,
                    boxShadow:
                      "0 20px 50px rgba(0,0,0,0.3)",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      color: "#111827",
                    }}
                  >
                    {usuarioEditando
                      ? "Editar usuario"
                      : "Nuevo usuario"}
                  </h2>

                  <input
                    type="text"
                    placeholder="Usuario"
                    value={formUsuario.usuario}
                    onChange={(e) =>
                      setFormUsuario({
                        ...formUsuario,
                        usuario: e.target.value,
                      })
                    }
                    style={estilos.input}
                  />

                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={formUsuario.nombre}
                    onChange={(e) =>
                      setFormUsuario({
                        ...formUsuario,
                        nombre: e.target.value,
                      })
                    }
                    style={estilos.input}
                  />

                  {!usuarioEditando && (
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={formUsuario.password}
                      onChange={(e) =>
                        setFormUsuario({
                          ...formUsuario,
                          password:
                            e.target.value,
                        })
                      }
                      style={estilos.input}
                    />
                  )}

                  <select
                    value={formUsuario.rol}
                    onChange={(e) =>
                      setFormUsuario({
                        ...formUsuario,
                        rol: e.target.value,
                      })
                    }
                    style={{
                      ...estilos.input,
                      background: "#ffffff",
                    }}
                  >
                    <option value="Asesor">
                      Asesor
                    </option>

                    <option value="Administrador">
                      Administrador
                    </option>
                  </select>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <button
                      onClick={() => {
                        setMostrarFormularioUsuario(
                          false
                        );

                        setUsuarioEditando(null);

                        setFormUsuario({
                          usuario: "",
                          nombre: "",
                          password: "",
                          rol: "Asesor",
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: 12,
                        border:
                          "1px solid #d1d5db",
                        borderRadius: 10,
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          if (
                            !formUsuario.usuario.trim() ||
                            !formUsuario.nombre.trim()
                          ) {
                            alert(
                              "Usuario y nombre son obligatorios."
                            );
                            return;
                          }

                          if (
                            !usuarioEditando &&
                            !formUsuario.password.trim()
                          ) {
                            alert(
                              "La contraseña es obligatoria."
                            );
                            return;
                          }

                          const url =
                            usuarioEditando
                              ? `${API}/api/administracion/usuarios/${usuarioEditando.id}`
                              : `${API}/api/administracion/usuarios`;

                          const metodo =
                            usuarioEditando
                              ? "PUT"
                              : "POST";

                          const cuerpo =
                            usuarioEditando
                              ? {
                                  usuario:
                                    formUsuario.usuario.trim(),
                                  nombre:
                                    formUsuario.nombre.trim(),
                                  rol: formUsuario.rol,
                                }
                              : {
                                  usuario:
                                    formUsuario.usuario.trim(),
                                  nombre:
                                    formUsuario.nombre.trim(),
                                  password:
                                    formUsuario.password,
                                  rol: formUsuario.rol,
                                };

                          const respuesta =
                            await fetch(url, {
                              method: metodo,
                              headers: {
                                "Content-Type":
                                  "application/json",
                                "x-usuario-id":
                                  String(usuario.id),
                              },
                              body: JSON.stringify(
                                cuerpo
                              ),
                            });

                          const datos =
                            await respuesta.json();

                          if (!respuesta.ok) {
                            alert(
                              datos.error ||
                                "No se pudo guardar el usuario."
                            );
                            return;
                          }

                          setMostrarFormularioUsuario(
                            false
                          );

                          setUsuarioEditando(null);

                          setFormUsuario({
                            usuario: "",
                            nombre: "",
                            password: "",
                            rol: "Asesor",
                          });

                          await cargarUsuariosAdministracion();
                          await cargarUsuarios();

                          alert(
                            usuarioEditando
                              ? "Usuario actualizado correctamente."
                              : "Usuario creado correctamente."
                          );
                        } catch (error) {
                          console.error(error);

                          alert(
                            "No se pudo conectar con el servidor."
                          );
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: 12,
                        border: "none",
                        borderRadius: 10,
                        background: "#2563eb",
                        color: "#ffffff",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      {usuarioEditando
                        ? "Guardar cambios"
                        : "Crear usuario"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                MODAL CAMBIAR CONTRASEÑA
                IMPORTANTE:
                ESTÁ FUERA DEL MODAL ANTERIOR
            ================================================= */}

            {usuarioPassword && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 6000,
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    padding: 24,
                    borderRadius: 14,
                    width: 400,
                    maxWidth: "90%",
                    boxShadow:
                      "0 20px 50px rgba(0,0,0,0.3)",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      color: "#111827",
                    }}
                  >
                    Cambiar contraseña
                  </h2>

                  <p
                    style={{
                      color: "#374151",
                      fontSize: 14,
                    }}
                  >
                    Usuario:{" "}
                    <strong>
                      {usuarioPassword.nombre}
                    </strong>
                  </p>

                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={nuevaPassword}
                    onChange={(e) =>
                      setNuevaPassword(
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      padding: 12,
                      marginBottom: 16,
                      border:
                        "1px solid #d1d5db",
                      borderRadius: 8,
                      boxSizing: "border-box",
                      fontSize: 14,
                    }}
                    autoFocus
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => {
                        setUsuarioPassword(null);
                        setNuevaPassword("");
                      }}
                      style={{
                        padding:
                          "10px 16px",
                        borderRadius: 8,
                        border:
                          "1px solid #d1d5db",
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={async () => {
                        if (
                          !nuevaPassword.trim()
                        ) {
                          alert(
                            "Escribe una nueva contraseña"
                          );
                          return;
                        }

                        try {
                          const respuesta =
                            await fetch(
                              `${API}/api/administracion/usuarios/${usuarioPassword.id}/password`,
                              {
                                method: "PUT",
                                headers: {
                                  "Content-Type":
                                    "application/json",
                                  "x-usuario-id":
                                    String(
                                      usuario.id
                                    ),
                                },
                                body: JSON.stringify({
                                  password:
                                    nuevaPassword,
                                }),
                              }
                            );

                          const datos =
                            await respuesta.json();

                          if (!respuesta.ok) {
                            throw new Error(
                              datos.error ||
                                "No se pudo cambiar la contraseña"
                            );
                          }

                          setUsuarioPassword(null);
                          setNuevaPassword("");

                          alert(
                            "Contraseña cambiada correctamente."
                          );
                        } catch (error) {
                          alert(
                            error.message
                          );
                        }
                      }}
                      style={{
                        padding:
                          "10px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: "#2563eb",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Cambiar contraseña
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* MENSAJES */}

            <div
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
                    {seccion ===
                    "informacion"
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
                      mensaje.emisorId
                    ) ===
                    Number(usuario.id);

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
                        justifyContent:
                          propio
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
                          <div>
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
                                href={`${API}${mensaje.archivo.url}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={`${API}${mensaje.archivo.url}`}
                                  alt={
                                    mensaje
                                      .archivo
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
                                href={`${API}${mensaje.archivo.url}`}
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
                                  mensaje
                                    .archivo
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
                            mensaje.fecha
                          ).toLocaleTimeString(
                            "es-CO",
                            {
                              hour: "2-digit",
                              minute:
                                "2-digit",
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
                usuario.rol !==
                  "Administrador" ? (
                  <div
                    className="read-only"
                    style={
                      estilos.soloLectura
                    }
                  >
                    👁 Los asesores pueden
                    leer la información,
                    pero solo los
                    administradores pueden
                    publicar.
                  </div>
                ) : (
                  <form
                    onSubmit={enviarMensaje}
                    className="message-form"
                    style={
                      estilos.formMensaje
                    }
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
                                e.target
                                  .files?.[0] ||
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
                        {
                          archivoSeleccionado.name
                        }

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

                    <input
                      type="text"
                      value={texto}
                      onChange={(e) =>
                        setTexto(
                          e.target.value
                        )
                      }
                      placeholder={
                        seccion ===
                        "informacion"
                          ? "Escribe un comunicado..."
                          : "Escribe un mensaje..."
                      }
                      className="message-input"
                      style={
                        estilos.inputMensaje
                      }
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
          </>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const estilos = {
  loginPagina: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #111827, #1f2937)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  loginCaja: {
    width: 380,
    maxWidth: "90%",
    padding: 35,
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.3)",
  },

  logo: {
    width: 70,
    height: 70,
    margin: "0 auto 15px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 35,
    background: "#2563eb",
  },

  loginTitulo: {
    textAlign: "center",
    margin: 0,
    color: "#111827",
  },

  loginSubtitulo: {
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 25,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    marginBottom: 14,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 15,
    outline: "none",
  },

  botonLogin: {
    width: "100%",
    padding: 14,
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    fontSize: 14,
  },

  app: {
    height: "100vh",
    display: "flex",
    overflow: "hidden",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    background: "#f3f4f6",
  },

  alerta: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 9999,
    width: 340,
    maxWidth: "calc(100vw - 40px)",
    background: "#ffffff",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow:
      "0 15px 40px rgba(0,0,0,0.25)",
    border:
      "1px solid #e5e7eb",
  },

  alertaIcono: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: "50%",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  alertaTitulo: {
    fontWeight: "bold",
    color: "#111827",
    fontSize: 13,
  },

  alertaMensaje: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 220,
  },

  alertaCerrar: {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
  },

  sidebar: {
    width: 240,
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: 18,
    boxSizing: "border-box",
  },

  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 25,
  },

  logoPequeno: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  },

  logoTitulo: {
    fontWeight: "bold",
    fontSize: 16,
  },

  logoTexto: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 3,
  },

  usuarioActual: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    background: "#1f2937",
    marginBottom: 20,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },

  nombreUsuario: {
    fontSize: 13,
    fontWeight: "bold",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 145,
  },

  rolUsuario: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 3,
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  menuBoton: {
    border: "none",
    background: "transparent",
    color: "#d1d5db",
    padding: "12px 10px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
    textAlign: "left",
    cursor: "pointer",
    fontSize: 14,
  },

  menuActivo: {
    background: "#2563eb",
    color: "#ffffff",
  },

  badge: {
    minWidth: 20,
    height: 20,
    padding: "0 6px",
    boxSizing: "border-box",
    borderRadius: 10,
    background: "#ef4444",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: "bold",
  },

  botonCerrar: {
    marginTop: "auto",
    border: "none",
    background: "#374151",
    color: "#ffffff",
    padding: 12,
    borderRadius: 10,
    cursor: "pointer",
  },

  contactos: {
    width: 320,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
  },

  contactosTitulo: {
    padding: "22px 18px 10px",
  },

  tituloContactos: {
    margin: 0,
    fontSize: 21,
    color: "#111827",
  },

  subtituloContactos: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: 12,
  },

  busquedaCaja: {
    margin: "10px 15px",
    padding: "10px 12px",
    background: "#f3f4f6",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  inputBusqueda: {
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    fontSize: 13,
  },

  botonLimpiarBusqueda: {
    border: "none",
    background: "transparent",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: 13,
    padding: 2,
  },

  listaContactos: {
    overflowY: "auto",
    flex: 1,
  },

  contacto: {
    width: "100%",
    border: "none",
    background: "#ffffff",
    padding: 13,
    display: "flex",
    alignItems: "center",
    gap: 11,
    textAlign: "left",
    cursor: "pointer",
    borderBottom:
      "1px solid #f3f4f6",
  },

  contactoActivo: {
    background: "#eff6ff",
  },

  avatarContacto: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },

  infoContacto: {
    minWidth: 0,
    flex: 1,
  },

  nombreContacto: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  funcionesContacto: {
    marginTop: 4,
    fontSize: 10,
    color: "#6b7280",
  },

  badgeContacto: {
    minWidth: 22,
    height: 22,
    padding: "0 6px",
    borderRadius: 11,
    background: "#ef4444",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: "bold",
  },

  sinContactos: {
    textAlign: "center",
    padding: 30,
    color: "#9ca3af",
  },

  infoPanel: {
    padding: 25,
    textAlign: "center",
    color: "#6b7280",
  },

  infoIcono: {
    fontSize: 45,
    marginBottom: 10,
  },

  infoPermitido: {
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
    background: "#ecfdf5",
    color: "#047857",
    fontSize: 12,
  },

  infoSoloLectura: {
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
  },

  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },

  chatHeader: {
    height: 72,
    background: "#ffffff",
    borderBottom:
      "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: 12,
  },

  avatarChat: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  chatNombre: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#111827",
  },

  chatEstado: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },

  mensajes: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
    background: "#f9fafb",
  },

  mensajeFila: {
    display: "flex",
    marginBottom: 10,
  },

  mensaje: {
    maxWidth: "65%",
    padding: "9px 12px",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.4,
    wordBreak: "break-word",
  },

  mensajePropio: {
    background: "#2563eb",
    color: "#ffffff",
    borderBottomRightRadius: 3,
  },

  mensajeOtro: {
    background: "#ffffff",
    color: "#111827",
    border:
      "1px solid #e5e7eb",
    borderBottomLeftRadius: 3,
  },

  nombreMensaje: {
    fontWeight: "bold",
    fontSize: 11,
    marginBottom: 4,
    color: "#2563eb",
  },

  horaMensaje: {
    marginTop: 4,
    fontSize: 9,
    opacity: 0.7,
    textAlign: "right",
  },

  formMensaje: {
    padding: 12,
    background: "#ffffff",
    borderTop:
      "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  inputMensaje: {
    flex: 1,
    padding: 13,
    border:
      "1px solid #d1d5db",
    borderRadius: 10,
    outline: "none",
    fontSize: 14,
    minWidth: 0,
  },

  botonAdjuntar: {
    width: 44,
    height: 44,
    flexShrink: 0,
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#f9fafb",
    color: "#374151",
    fontSize: 19,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  archivoSeleccionado: {
    maxWidth: 190,
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 10px",
    borderRadius: 8,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 11,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    flexShrink: 1,
  },

  botonQuitarArchivo: {
    border: "none",
    background: "transparent",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: 11,
    padding: 2,
    flexShrink: 0,
  },

  botonEnviar: {
    width: 48,
    height: 44,
    flexShrink: 0,
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 20,
    cursor: "pointer",
  },

  soloLectura: {
    padding: 14,
    background: "#eff6ff",
    color: "#1d4ed8",
    borderTop:
      "1px solid #dbeafe",
    textAlign: "center",
    fontSize: 12,
  },

  pantallaCentro: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    textAlign: "center",
  },
};

export default App;