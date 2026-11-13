import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

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

  const [seccion, setSeccion] = useState("informacion");
  const [usuarioChat, setUsuarioChat] = useState(null);

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");

  const [busqueda, setBusqueda] = useState("");

  // Notificaciones generales
  const [notificacionesPrivadas, setNotificacionesPrivadas] = useState(0);
  const [notificacionesInfo, setNotificacionesInfo] = useState(0);

  // Mensajes pendientes por persona
  const [pendientesPorUsuario, setPendientesPorUsuario] = useState({});

  // Toast dentro del chat
  const [alerta, setAlerta] = useState(null);

  useEffect(() => {
    document.title = "Digital Contact | Comunicación Interna";
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
    // Notificación del navegador
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

    // Notificación dentro del sistema
    setAlerta({
      titulo,
      mensaje,
    });

    setTimeout(() => {
      setAlerta(null);
    }, 5000);
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

      // Conectar usuario al Socket
      socket.emit("usuario:conectar", datos.usuario.id);
    } catch (error) {
      console.error(error);

      setErrorLogin(
        "No se pudo conectar con el servidor"
      );
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

      // ================================================
      // MENSAJE PRIVADO
      // ================================================

      if (receptorId !== null) {
        const esParaMi =
          receptorId === miId &&
          emisorId !== miId;

        if (esParaMi) {
          const chatAbierto =
            seccion === "privado" &&
            usuarioChat &&
            Number(usuarioChat.id) === emisorId;

          // Si el chat está abierto, simplemente lo mostramos
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

          // Si NO está abierto, generar notificación
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
            mensaje.texto
          );

          return;
        }

        return;
      }

      // ================================================
      // INFORMACIÓN GENERAL
      // ================================================

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
          mensaje.texto
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
          u.id !== usuario.id
      );
    }

    if (usuario.rol === "Administrador") {
      lista = usuarios.filter(
        (u) =>
          u.rol === "Asesor" &&
          u.id !== usuario.id
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

    if (!mensajeTexto || !usuario) {
      return;
    }

    // Asesor no puede publicar en información
    if (
      seccion === "informacion" &&
      usuario.rol !== "Administrador"
    ) {
      alert(
        "Solo los administradores pueden publicar información."
      );
      return;
    }

    // Chat privado necesita contacto
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

      // Privado
      if (
        seccion === "privado" &&
        usuarioChat
      ) {
        cuerpo.receptorId =
          usuarioChat.id;
      }

      // Información
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
    setSeccion("administracion");
    setUsuarioChat(null);
    setMensajes([]);
    setTexto("");
    setBusqueda("");
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
  }

  /* =====================================================
     LOGIN
  ===================================================== */

  if (!usuario) {
    return (
      <div className="login-page" style={estilos.loginPagina}>
        <div className="login-card" style={estilos.loginCaja}>

          <img className="brand-logo login-logo" src="/digital-contact-logo.jpg" alt="Digital Contact" />

          <h1 style={estilos.loginTitulo}>
            Digital Contact
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
    <div className="app-shell" style={estilos.app}>

      {/* ================================================
          NOTIFICACIÓN
      ================================================ */}

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

      {/* ================================================
          SIDEBAR
      ================================================ */}

      <aside className="app-sidebar" style={estilos.sidebar}>

        <div className="brand-area" style={estilos.logoArea}>

          <div className="brand-mark" style={estilos.logoPequeno}>
            <img className="brand-logo-small" src="/digital-contact-logo.jpg" alt="Digital Contact" />
          </div>

          <div>
            <div style={estilos.logoTitulo}>
              Digital Contact
            </div>

            <div style={estilos.logoTexto}>
              Comunicación interna
            </div>
          </div>

        </div>

        {/* USUARIO */}

        <div className="current-user" style={estilos.usuarioActual}>

          <div className="current-avatar" style={estilos.avatar}>
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
            </div>

          </div>

        </div>

        {/* MENÚ */}

        <div className="main-menu" style={estilos.menu}>

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

          {usuario.rol ===
            "Administrador" && (
            <button
              className="menu-item"
              style={{
                ...estilos.menuBoton,
                ...(seccion ===
                "administracion"
                  ? estilos.menuActivo
                  : {}),
              }}
              onClick={
                abrirAdministracion
              }
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

      <div className="app-credit">Hecho por IngeAnjucamo</div>

      {/* ================================================
          CONTACTOS
      ================================================ */}

      <section className="contacts-panel" style={estilos.contactos}>

        <div className="contacts-heading" style={estilos.contactosTitulo}>

          <h2 className="contacts-title" style={estilos.tituloContactos}>

            {seccion === "informacion"
              ? "Información"
              : seccion === "administracion"
              ? "Administración"
              : "Conversaciones"}

          </h2>

          <p className="contacts-subtitle" style={estilos.subtituloContactos}>

            {seccion === "informacion"
              ? "Comunicados generales"
              : seccion ===
                "administracion"
              ? "Panel administrativo"
              : usuario.rol ===
                "Asesor"
              ? "Administradores disponibles"
              : "Asesores disponibles"}

          </p>

        </div>

        {/* ============================================
            INFORMACIÓN
        ============================================ */}

        {seccion === "informacion" && (
          <div className="info-card" style={estilos.infoPanel}>

            <div className="info-icon" style={estilos.infoIcono}>
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

            {usuario.rol ===
            "Administrador" ? (
              <div
                style={
                  estilos.infoPermitido
                }
              >
                ✓ Puedes publicar información
              </div>
            ) : (
              <div
                style={
                  estilos.infoSoloLectura
                }
              >
                👁 Solo lectura para asesores
              </div>
            )}

          </div>
        )}

        {/* ============================================
            BUSCADOR DE CONTACTOS
        ============================================ */}

        {seccion === "privado" && (
          <div className="search-box" style={estilos.busquedaCaja}>

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
              style={
                estilos.inputBusqueda
              }
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

        {/* ============================================
            LISTA DE CONTACTOS
        ============================================ */}

        {seccion === "privado" && (
          <div className="contacts-list"
            style={
              estilos.listaContactos
            }
          >

            {contactos.length === 0 ? (

              <div
                style={
                  estilos.sinContactos
                }
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

              contactos.map(
                (contacto) => {

                  const pendientes =
                    pendientesPorUsuario[
                      contacto.id
                    ] || 0;

                  return (
                    <button
                      key={
                        contacto.id
                      }
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

                      <div className="contact-avatar"
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

                      <div className="contact-info"
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

                      {pendientes >
                        0 && (
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
                }
              )

            )}

          </div>
        )}

      </section>

      {/* ================================================
          CHAT
      ================================================ */}

      <main className="chat-panel" style={estilos.chat}>

        {/* HEADER */}

        <header className="chat-header" style={estilos.chatHeader}>

          {seccion ===
            "privado" &&
          usuarioChat ? (

            <>

              <div
                className="chat-avatar"
                style={
                  estilos.avatarChat
                }
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
                  style={
                    estilos.chatNombre
                  }
                >
                  {usuarioChat.nombre}
                </div>

                <div
                  className="chat-status"
                  style={
                    estilos.chatEstado
                  }
                >
                  {usuarioChat.rol}
                </div>

              </div>

            </>

          ) : (

            <>

              <div
                className="chat-avatar"
                style={
                  estilos.avatarChat
                }
              >
                {seccion ===
                "informacion"
                  ? "📢"
                  : seccion ===
                    "administracion"
                  ? "⚙️"
                  : "💬"}
              </div>

              <div>

                <div
                  className="chat-name"
                  style={
                    estilos.chatNombre
                  }
                >
                  {seccion ===
                  "informacion"
                    ? "Información general"
                    : seccion ===
                      "administracion"
                    ? "Administración"
                    : "Conversaciones"}
                </div>

                <div
                  className="chat-status"
                  style={
                    estilos.chatEstado
                  }
                >
                  {seccion ===
                  "informacion"
                    ? "Comunicados para todo el equipo"
                    : "Selecciona un contacto"}
                </div>

              </div>

            </>

          )}

        </header>

        {/* ADMINISTRACIÓN */}

        {seccion ===
        "administracion" ? (

          <div
            style={
              estilos.pantallaCentro
            }
          >

            <div
              style={{
                fontSize: 60,
              }}
            >
              ⚙️
            </div>

            <h2>
              Administración
            </h2>

            <p>
              Panel de administración
              próximamente.
            </p>

          </div>

        ) : (

          <>

            {/* MENSAJES */}

            <div
              className="messages-area"
              style={
                estilos.mensajes
              }
            >

              {mensajes.length ===
              0 ? (

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

                    {seccion ===
                    "privado"
                      ? usuarioChat
                        ? "Nueva conversación"
                        : "Selecciona un contacto"
                      : "Información general"}

                  </h2>

                  <p>

                    {seccion ===
                    "privado"
                      ? usuarioChat
                        ? "Envía el primer mensaje."
                        : "Selecciona un asesor o administrador."
                      : "Aquí aparecerán los comunicados."}

                  </p>

                </div>

              ) : (

                mensajes.map(
                  (mensaje) => {

                    const propio =
                      Number(
                        mensaje.emisorId
                      ) ===
                      Number(
                        usuario.id
                      );

                    return (
                      <div
                        key={
                          mensaje.id
                        }
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
                              {
                                mensaje.nombre
                              }
                            </div>
                          )}

                          <div>
                            {
                              mensaje.texto
                            }
                          </div>

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
                  }
                )

              )}

            </div>

            {/* ==========================================
                ESCRIBIR
            ========================================== */}

            {(seccion ===
              "privado" ||
              seccion ===
                "informacion") && (

              <>
                {seccion ===
                  "informacion" &&
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
                    onSubmit={
                      enviarMensaje
                    }
                    className="message-form"
                    style={
                      estilos.formMensaje
                    }
                  >

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
                      style={
                        estilos.botonEnviar
                      }
                    >
                      ➤
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
  },

  botonEnviar: {
    width: 48,
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
