import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

import Login from "./components/Login/Login";
import Sidebar from "./components/Sidebar/Sidebar";
import Contacts from "./components/Contacts/Contacts";
import Chat from "./components/Chat/Chat";
import Administration from "./components/Administration/Administration";

import {
  obtenerUsuarios,
  iniciarLogin,
  obtenerUsuariosAdministracion,
} from "./services/api";

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
      const datos = await obtenerUsuarios();

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
    if (!usuario?.esSuperAdmin) {
      return;
    }

    try {
      setCargandoAdmin(true);

      const datos = await obtenerUsuariosAdministracion(usuario.id);

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
      const datos = await iniciarLogin(
        loginUsuario,
        loginPassword
      );

      setUsuario(datos.usuario);

      await cargarUsuarios();

      solicitarNotificaciones();

      socket.emit("usuario:conectar", datos.usuario.id);
    } catch (error) {
      console.error(error);

      setErrorLogin(
        error.message || "No se pudo conectar con el servidor"
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

    socket.on("mensaje:nuevo", recibirMensaje);

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
        const nombre = u.nombre
          ? u.nombre.toLowerCase()
          : "";

        const usuarioNombre = u.usuario
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
    if (!usuario?.esSuperAdmin) {
      return;
    }

    setSeccion("administracion");
    setUsuarioChat(null);
    setMensajes([]);
    setBusqueda("");

    cargarUsuariosAdministracion();
  }

  function limpiarFormularioUsuario() {
    setMostrarFormularioUsuario(false);
    setUsuarioEditando(null);

    setFormUsuario({
      usuario: "",
      nombre: "",
      password: "",
      rol: "Asesor",
    });
  }

  function editarUsuario(u) {
    setUsuarioEditando(u);

    setFormUsuario({
      usuario: u.usuario || "",
      nombre: u.nombre || "",
      password: "",
      rol: u.rol || "Asesor",
    });

    setMostrarFormularioUsuario(true);
  }

  async function guardarUsuario() {
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

      const url = usuarioEditando
        ? `${API}/api/administracion/usuarios/${usuarioEditando.id}`
        : `${API}/api/administracion/usuarios`;

      const metodo = usuarioEditando
        ? "PUT"
        : "POST";

      const cuerpo = usuarioEditando
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

      const respuesta = await fetch(
        url,
        {
          method: metodo,
          headers: {
            "Content-Type":
              "application/json",
            "x-usuario-id":
              String(usuario.id),
          },
          body: JSON.stringify(cuerpo),
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        alert(
          datos.error ||
            "No se pudo guardar el usuario."
        );

        return;
      }

      limpiarFormularioUsuario();

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
  }

  async function cambiarPassword() {
    if (!nuevaPassword.trim()) {
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
                String(usuario.id),
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
      alert(error.message);
    }
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
      {/* =================================================
          NOTIFICACIÓN
      ================================================= */}

      {alerta && (
        <div
          className="app-notification"
          style={estilos.alerta}
        >
          <div style={estilos.alertaIcono}>
            🔔
          </div>

          <div
            style={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={estilos.alertaTitulo}
            >
              {alerta.titulo}
            </div>

            <div
              style={estilos.alertaMensaje}
            >
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

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <Sidebar
        usuario={usuario}
        seccion={seccion}
        notificacionesInfo={
          notificacionesInfo
        }
        notificacionesPrivadas={
          notificacionesPrivadas
        }
        abrirInformacion={
          abrirInformacion
        }
        abrirConversaciones={
          abrirConversaciones
        }
        abrirAdministracion={
          abrirAdministracion
        }
        cerrarSesion={cerrarSesion}
        estilos={estilos}
      />

      {/* =================================================
          CONTACTOS
      ================================================= */}

      <Contacts
        usuario={usuario}
        seccion={seccion}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        contactos={contactos}
        pendientesPorUsuario={
          pendientesPorUsuario
        }
        usuarioChat={usuarioChat}
        abrirChatPrivado={
          abrirChatPrivado
        }
        estilos={estilos}
      />

      {/* =================================================
          PANEL PRINCIPAL
      ================================================= */}

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
                style={estilos.avatarChat}
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
                    : seccion ===
                      "administracion"
                    ? "Gestión de usuarios"
                    : "Selecciona un contacto"}
                </div>
              </div>
            </>
          )}
        </header>

        {/* =================================================
            ADMINISTRACIÓN
        ================================================= */}

   {seccion === "administracion" ? (
  <Administration
    usuario={usuario}
    usuarios={usuariosAdmin}
    cargando={cargandoAdmin}
    usuarioEditando={usuarioEditando}
    setUsuarioEditando={setUsuarioEditando}
    usuarioPassword={usuarioPassword}
    setUsuarioPassword={setUsuarioPassword}
    nuevaPassword={nuevaPassword}
    setNuevaPassword={setNuevaPassword}
    mostrarFormularioUsuario={mostrarFormularioUsuario}
    setMostrarFormularioUsuario={
      setMostrarFormularioUsuario
    }
    formUsuario={formUsuario}
    setFormUsuario={setFormUsuario}
    cargarUsuariosAdministracion={
      cargarUsuariosAdministracion
    }
    limpiarFormularioUsuario={
      limpiarFormularioUsuario
    }
    editarUsuario={editarUsuario}
    guardarUsuario={guardarUsuario}
    cambiarPassword={cambiarPassword}
    estilos={estilos}
  />
) : (
  <>
          
            {/* =================================================
                MENSAJES
            ================================================= */}

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
                      ...estilos.centroIcono,
                      background:
                        seccion ===
                        "informacion"
                          ? "#eaf4ff"
                          : "#edf2ff",
                    }}
                  >
                    {seccion ===
                    "informacion"
                      ? "📢"
                      : "💬"}
                  </div>

                  <h2
                    style={
                      estilos.centroTitulo
                    }
                  >
                    {seccion ===
                    "privado"
                      ? usuarioChat
                        ? "Nueva conversación"
                        : "Selecciona un contacto"
                      : "Información general"}
                  </h2>

                  <p
                    style={
                      estilos.centroTexto
                    }
                  >
                    {seccion ===
                    "privado"
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
                                    borderRadius: 10,
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
                                    : "#1769e8",
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

            {/* =================================================
                ESCRIBIR
            ================================================= */}

            {(seccion === "privado" ||
              seccion === "informacion") && (
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

      {/* =====================================================
          MODAL CREAR / EDITAR USUARIO
      ===================================================== */}

      {mostrarFormularioUsuario && (
        <div
          className="modal-overlay"
          style={estilos.modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              limpiarFormularioUsuario();
            }
          }}
        >
          <div
            className="admin-modal"
            style={estilos.modal}
          >
            <div
              style={
                estilos.modalHeader
              }
            >
              <div>
                <div
                  style={
                    estilos.modalKicker
                  }
                >
                  {usuarioEditando
                    ? "ACTUALIZACIÓN"
                    : "NUEVO REGISTRO"}
                </div>

                <h2
                  style={
                    estilos.modalTitulo
                  }
                >
                  {usuarioEditando
                    ? "Editar usuario"
                    : "Nuevo usuario"}
                </h2>

                <p
                  style={
                    estilos.modalSubtitulo
                  }
                >
                  {usuarioEditando
                    ? "Actualiza los datos del usuario."
                    : "Registra un nuevo usuario en Chat Digital."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  limpiarFormularioUsuario
                }
                style={
                  estilos.modalCerrar
                }
              >
                ✕
              </button>
            </div>

            <div
              style={
                estilos.modalBody
              }
            >
              <label
                style={
                  estilos.modalLabel
                }
              >
                Usuario
              </label>

              <input
                type="text"
                placeholder="Ej. juan.perez"
                value={
                  formUsuario.usuario
                }
                onChange={(e) =>
                  setFormUsuario({
                    ...formUsuario,
                    usuario:
                      e.target.value,
                  })
                }
                style={
                  estilos.modalInput
                }
              />

              <label
                style={
                  estilos.modalLabel
                }
              >
                Nombre completo
              </label>

              <input
                type="text"
                placeholder="Nombre y apellidos"
                value={
                  formUsuario.nombre
                }
                onChange={(e) =>
                  setFormUsuario({
                    ...formUsuario,
                    nombre:
                      e.target.value,
                  })
                }
                style={
                  estilos.modalInput
                }
              />

              {!usuarioEditando && (
                <>
                  <label
                    style={
                      estilos.modalLabel
                    }
                  >
                    Contraseña
                  </label>

                  <input
                    type="password"
                    placeholder="Contraseña inicial"
                    value={
                      formUsuario.password
                    }
                    onChange={(e) =>
                      setFormUsuario({
                        ...formUsuario,
                        password:
                          e.target.value,
                      })
                    }
                    style={
                      estilos.modalInput
                    }
                  />
                </>
              )}

              <label
                style={
                  estilos.modalLabel
                }
              >
                Rol
              </label>

              <select
                value={
                  formUsuario.rol
                }
                onChange={(e) =>
                  setFormUsuario({
                    ...formUsuario,
                    rol: e.target.value,
                  })
                }
                style={{
                  ...estilos.modalInput,
                  background:
                    "#ffffff",
                  cursor:
                    "pointer",
                }}
              >
                <option value="Asesor">
                  Asesor
                </option>

                <option value="Administrador">
                  Administrador
                </option>
              </select>
            </div>

            <div
              style={
                estilos.modalFooter
              }
            >
              <button
                type="button"
                onClick={
                  limpiarFormularioUsuario
                }
                style={
                  estilos.botonCancelar
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  guardarUsuario
                }
                style={
                  estilos.botonGuardar
                }
              >
                {usuarioEditando
                  ? "Guardar cambios"
                  : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL CAMBIAR CONTRASEÑA
      ===================================================== */}

      {usuarioPassword && (
        <div
          className="modal-overlay"
          style={estilos.modalOverlay}
        >
          <div
            className="admin-modal password-modal"
            style={estilos.modal}
          >
            <div
              style={
                estilos.modalHeader
              }
            >
              <div>
                <div
                  style={
                    estilos.modalKicker
                  }
                >
                  SEGURIDAD
                </div>

                <h2
                  style={
                    estilos.modalTitulo
                  }
                >
                  Cambiar contraseña
                </h2>

                <p
                  style={
                    estilos.modalSubtitulo
                  }
                >
                  Actualiza la contraseña del usuario.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUsuarioPassword(
                    null
                  );

                  setNuevaPassword("");
                }}
                style={
                  estilos.modalCerrar
                }
              >
                ✕
              </button>
            </div>

            <div
              style={
                estilos.passwordUsuario
              }
            >
              <div
                style={
                  estilos.passwordAvatar
                }
              >
                {usuarioPassword.nombre
                  ? usuarioPassword.nombre
                      .charAt(0)
                      .toUpperCase()
                  : "U"}
              </div>

              <div>
                <div
                  style={
                    estilos.passwordNombre
                  }
                >
                  {usuarioPassword.nombre}
                </div>

                <div
                  style={
                    estilos.passwordUsername
                  }
                >
                  @{usuarioPassword.usuario}
                </div>
              </div>
            </div>

            <div
              style={
                estilos.modalBody
              }
            >
              <label
                style={
                  estilos.modalLabel
                }
              >
                Nueva contraseña
              </label>

              <input
                type="password"
                placeholder="Escribe la nueva contraseña"
                value={nuevaPassword}
                onChange={(e) =>
                  setNuevaPassword(
                    e.target.value
                  )
                }
                style={
                  estilos.modalInput
                }
                autoFocus
              />
            </div>

            <div
              style={
                estilos.modalFooter
              }
            >
              <button
                type="button"
                onClick={() => {
                  setUsuarioPassword(
                    null
                  );

                  setNuevaPassword("");
                }}
                style={
                  estilos.botonCancelar
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  cambiarPassword
                }
                style={
                  estilos.botonGuardar
                }
              >
                Cambiar contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const estilos = {
  /* =====================================================
     LOGIN
  ===================================================== */

  loginPagina: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #061b35 0%, #0a3158 50%, #1769e8 100%)",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    padding: 20,
  },

  loginCaja: {
    width: 400,
    maxWidth: "100%",
    padding: 40,
    borderRadius: 22,
    background: "#ffffff",
    boxShadow:
      "0 25px 70px rgba(0, 20, 50, 0.30)",
  },

  loginTitulo: {
    textAlign: "center",
    margin: "15px 0 5px",
    color: "#142033",
    fontSize: 28,
    fontWeight: 800,
  },

  loginSubtitulo: {
    textAlign: "center",
    color: "#718096",
    margin:
      "0 0 28px",
    fontSize: 13,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 15px",
    marginBottom: 14,
    borderRadius: 11,
    border:
      "1px solid #d8e0ea",
    fontSize: 14,
    outline: "none",
    background: "#fbfcfe",
    color: "#142033",
  },

  botonLogin: {
    width: "100%",
    padding: 14,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow:
      "0 8px 20px rgba(23,105,232,.25)",
  },

  error: {
    background: "#fff1f2",
    color: "#be123c",
    padding: 11,
    borderRadius: 9,
    marginBottom: 14,
    fontSize: 13,
    border:
      "1px solid #fecdd3",
  },

  /* =====================================================
     APP
  ===================================================== */

  app: {
    height: "100vh",
    width: "100%",
    display: "flex",
    overflow: "hidden",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    background: "#f4f7fb",
    color: "#142033",
  },

  /* =====================================================
     NOTIFICACIÓN
  ===================================================== */

  alerta: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 9999,
    width: 370,
    maxWidth:
      "calc(100vw - 40px)",
    background: "#ffffff",
    borderRadius: 15,
    padding: 15,
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow:
      "0 18px 45px rgba(9,31,53,.18)",
    border:
      "1px solid #e3e9f1",
  },

  alertaIcono: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: 12,
    background: "#eaf4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  alertaTitulo: {
    fontWeight: 700,
    color: "#142033",
    fontSize: 13,
  },

  alertaMensaje: {
    color: "#718096",
    fontSize: 12,
    marginTop: 4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 240,
  },

  alertaCerrar: {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: "#98a2b3",
    cursor: "pointer",
    fontSize: 15,
  },

  /* =====================================================
     SIDEBAR
  ===================================================== */

  sidebar: {
    width: 255,
    minWidth: 255,
    height: "100vh",
    background:
      "linear-gradient(180deg, #061b35 0%, #08294b 100%)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: 18,
    boxSizing: "border-box",
    boxShadow:
      "4px 0 20px rgba(6,27,53,.10)",
    position: "relative",
    zIndex: 10,
  },

  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    marginBottom: 24,
    padding:
      "4px 4px 16px",
    borderBottom:
      "1px solid rgba(255,255,255,.10)",
  },

  logoTitulo: {
    fontWeight: 800,
    fontSize: 17,
    letterSpacing: "-.2px",
  },

  logoTexto: {
    fontSize: 10,
    color:
      "rgba(255,255,255,.55)",
    marginTop: 3,
  },

  usuarioActual: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderRadius: 13,
    background:
      "rgba(255,255,255,.075)",
    border:
      "1px solid rgba(255,255,255,.07)",
    marginBottom: 22,
  },

  avatar: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: 12,
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    boxShadow:
      "0 5px 15px rgba(23,105,232,.25)",
  },

  nombreUsuario: {
    fontSize: 13,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 155,
  },

  rolUsuario: {
    fontSize: 10,
    color:
      "rgba(255,255,255,.55)",
    marginTop: 4,
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  menuBoton: {
    border: "none",
    background: "transparent",
    color:
      "rgba(255,255,255,.68)",
    padding: "12px 12px",
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    gap: 11,
    textAlign: "left",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },

  menuActivo: {
    background:
      "linear-gradient(90deg, #1769e8, #2480ee)",
    color: "#ffffff",
    boxShadow:
      "0 6px 18px rgba(23,105,232,.25)",
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
    fontWeight: 800,
  },

  botonCerrar: {
    marginTop: "auto",
    border:
      "1px solid rgba(255,255,255,.10)",
    background:
      "rgba(239,68,68,.13)",
    color: "#ffb4b4",
    padding: 12,
    borderRadius: 11,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },

  /* =====================================================
     CONTACTOS
  ===================================================== */

  contactos: {
    width: 315,
    minWidth: 315,
    background: "#ffffff",
    borderRight:
      "1px solid #e3e9f1",
    display: "flex",
    flexDirection: "column",
  },

  contactosTitulo: {
    padding:
      "24px 20px 12px",
  },

  tituloContactos: {
    margin: 0,
    fontSize: 20,
    color: "#142033",
    fontWeight: 800,
  },

  subtituloContactos: {
    margin:
      "5px 0 0",
    color: "#8490a3",
    fontSize: 11,
  },

  busquedaCaja: {
    margin:
      "10px 16px 14px",
    padding:
      "10px 12px",
    background: "#f5f7fa",
    border:
      "1px solid #e7ecf2",
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  inputBusqueda: {
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    fontSize: 12,
    color: "#344054",
  },

  botonLimpiarBusqueda: {
    border: "none",
    background: "transparent",
    color: "#98a2b3",
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
    padding:
      "12px 17px",
    display: "flex",
    alignItems: "center",
    gap: 11,
    textAlign: "left",
    cursor: "pointer",
    borderBottom:
      "1px solid #f1f4f7",
  },

  contactoActivo: {
    background: "#eef6ff",
    boxShadow:
      "inset 3px 0 #1769e8",
  },

  avatarContacto: {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: 11,
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 13,
  },

  infoContacto: {
    minWidth: 0,
    flex: 1,
  },

  nombreContacto: {
    fontSize: 12,
    fontWeight: 700,
    color: "#263448",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  funcionesContacto: {
    marginTop: 4,
    fontSize: 10,
    color: "#8490a3",
  },

  badgeContacto: {
    minWidth: 21,
    height: 21,
    padding: "0 6px",
    borderRadius: 11,
    background: "#ef4444",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 800,
  },

  sinContactos: {
    textAlign: "center",
    padding: 30,
    color: "#98a2b3",
  },

  infoPanel: {
    padding: 25,
    textAlign: "center",
    color: "#718096",
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

  /* =====================================================
     CHAT
  ===================================================== */

  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    background: "#f4f7fb",
  },

  chatHeader: {
    height: 76,
    minHeight: 76,
    background: "#ffffff",
    borderBottom:
      "1px solid #e3e9f1",
    display: "flex",
    alignItems: "center",
    padding:
      "0 25px",
    gap: 13,
    boxShadow:
      "0 1px 5px rgba(15,35,60,.02)",
  },

  avatarChat: {
    width: 44,
    height: 44,
    minWidth: 44,
    borderRadius: 12,
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  chatNombre: {
    fontWeight: 800,
    fontSize: 16,
    color: "#142033",
  },

  chatEstado: {
    fontSize: 11,
    color: "#8490a3",
    marginTop: 4,
  },

  mensajes: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    background:
      "linear-gradient(180deg, #f7f9fc 0%, #f2f5f9 100%)",
  },

  mensajeFila: {
    display: "flex",
    marginBottom: 10,
  },

  mensaje: {
    maxWidth: "65%",
    padding:
      "10px 13px",
    borderRadius: 13,
    fontSize: 13,
    lineHeight: 1.5,
    wordBreak: "break-word",
  },

  mensajePropio: {
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    borderBottomRightRadius: 3,
    boxShadow:
      "0 4px 12px rgba(23,105,232,.16)",
  },

  mensajeOtro: {
    background: "#ffffff",
    color: "#263448",
    border:
      "1px solid #e3e9f1",
    borderBottomLeftRadius: 3,
    boxShadow:
      "0 3px 10px rgba(20,40,70,.04)",
  },

  nombreMensaje: {
    fontWeight: 800,
    fontSize: 10,
    marginBottom: 4,
    color: "#1769e8",
  },

  horaMensaje: {
    marginTop: 5,
    fontSize: 9,
    opacity: 0.65,
    textAlign: "right",
  },

  formMensaje: {
    padding:
      "12px 16px",
    background: "#ffffff",
    borderTop:
      "1px solid #e3e9f1",
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  inputMensaje: {
    flex: 1,
    padding:
      "12px 14px",
    border:
      "1px solid #d8e0ea",
    borderRadius: 11,
    outline: "none",
    fontSize: 13,
    minWidth: 0,
    background: "#fbfcfe",
    color: "#142033",
  },

  botonAdjuntar: {
    width: 43,
    height: 43,
    flexShrink: 0,
    border:
      "1px solid #d8e0ea",
    borderRadius: 11,
    background: "#ffffff",
    color: "#475467",
    fontSize: 18,
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
    padding:
      "8px 10px",
    borderRadius: 8,
    background: "#eaf4ff",
    color: "#1769e8",
    fontSize: 10,
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
    width: 46,
    height: 43,
    flexShrink: 0,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    fontSize: 19,
    cursor: "pointer",
    boxShadow:
      "0 5px 15px rgba(23,105,232,.20)",
  },

  soloLectura: {
    padding: 13,
    background: "#eef6ff",
    color: "#1769e8",
    borderTop:
      "1px solid #d7eaff",
    textAlign: "center",
    fontSize: 11,
  },

  pantallaCentro: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#718096",
    textAlign: "center",
  },

  centroIcono: {
    width: 75,
    height: 75,
    borderRadius: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    marginBottom: 16,
  },

  centroTitulo: {
    margin: 0,
    color: "#344054",
    fontSize: 20,
  },

  centroTexto: {
    margin:
      "7px 0 0",
    color: "#98a2b3",
    fontSize: 12,
  },

  /* =====================================================
     ADMINISTRACIÓN
     
     
  ===================================================== */

  administracion: {
    flex: 1,
    overflowY: "auto",
    padding: "28px 30px",
    background:
      "linear-gradient(180deg, #f7f9fc 0%, #f3f6fa 100%)",
  },

  adminEncabezado: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
  },

  adminKicker: {
    color: "#1769e8",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "1.1px",
    marginBottom: 5,
  },

  adminTitulo: {
    margin: 0,
    color: "#142033",
    fontSize: 25,
    fontWeight: 800,
    letterSpacing: "-.5px",
  },

  adminSubtitulo: {
    margin:
      "6px 0 0",
    color: "#718096",
    fontSize: 12,
  },

  botonNuevoUsuario: {
    border: "none",
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    padding:
      "12px 17px",
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 7,
    whiteSpace: "nowrap",
    boxShadow:
      "0 7px 18px rgba(23,105,232,.20)",
  },

  adminResumen: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 20,
  },

  adminResumenCard: {
    background: "#ffffff",
    border:
      "1px solid #e3e9f1",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow:
      "0 5px 18px rgba(20,40,70,.04)",
  },

  adminResumenIconoAzul: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: "#eaf4ff",
    color: "#1769e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  adminResumenIconoVerde: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: "#ecfdf3",
    color: "#20a464",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  adminResumenIconoMorado: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: "#f3efff",
    color: "#6941c6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  adminResumenNumero: {
    fontSize: 20,
    fontWeight: 800,
    color: "#142033",
  },

  adminResumenTexto: {
    marginTop: 2,
    color: "#8490a3",
    fontSize: 10,
  },

  adminTabla: {
    background: "#ffffff",
    border:
      "1px solid #e3e9f1",
    borderRadius: 15,
    overflow: "hidden",
    boxShadow:
      "0 7px 25px rgba(20,40,70,.05)",
  },

  adminTablaHeader: {
    padding:
      "18px 20px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    borderBottom:
      "1px solid #edf0f4",
  },

  adminTablaTitulo: {
    margin: 0,
    color: "#263448",
    fontSize: 15,
    fontWeight: 800,
  },

  adminTablaTexto: {
    margin:
      "4px 0 0",
    color: "#98a2b3",
    fontSize: 10,
  },

  adminContador: {
    padding:
      "6px 10px",
    borderRadius: 8,
    background: "#f4f7fb",
    color: "#667085",
    fontSize: 10,
    fontWeight: 700,
  },

  adminFilaCabecera: {
    display: "grid",
    gridTemplateColumns:
      "minmax(230px, 1.8fr) minmax(120px, .8fr) minmax(120px, .8fr) minmax(220px, 1.2fr)",
    gap: 15,
    padding:
      "11px 20px",
    background: "#f8fafc",
    color: "#98a2b3",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: ".7px",
  },

  adminFila: {
    display: "grid",
    gridTemplateColumns:
      "minmax(230px, 1.8fr) minmax(120px, .8fr) minmax(120px, .8fr) minmax(220px, 1.2fr)",
    gap: 15,
    alignItems: "center",
    padding:
      "13px 20px",
    borderTop:
      "1px solid #edf0f4",
    background: "#ffffff",
  },

  adminUsuario: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    minWidth: 0,
  },

  adminAvatar: {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: 11,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 13,
  },

  adminNombre: {
    color: "#263448",
    fontSize: 12,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  adminUsername: {
    color: "#98a2b3",
    fontSize: 10,
    marginTop: 3,
  },

  adminRol: {
    display: "inline-flex",
    padding:
      "5px 9px",
    borderRadius: 7,
    fontSize: 9,
    fontWeight: 800,
  },

  adminRolAdmin: {
    background: "#f3efff",
    color: "#6941c6",
  },

  adminRolAsesor: {
    background: "#eaf4ff",
    color: "#1769e8",
  },

  adminEstado: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding:
      "5px 9px",
    borderRadius: 7,
    fontSize: 9,
    fontWeight: 800,
  },

  adminEstadoActivo: {
    background: "#ecfdf3",
    color: "#16864b",
  },

  adminEstadoInactivo: {
    background: "#fff1f2",
    color: "#be123c",
  },

  puntoEstado: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "currentColor",
  },

  adminAcciones: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },

  adminBotonEditar: {
    border:
      "1px solid #dce3eb",
    background: "#ffffff",
    color: "#344054",
    padding:
      "7px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 700,
  },

  adminBotonPassword: {
    border:
      "1px solid #dce3eb",
    background: "#ffffff",
    color: "#344054",
    padding:
      "7px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 700,
  },

  superAdminBadge: {
    padding:
      "7px 10px",
    borderRadius: 8,
    background: "#f3efff",
    color: "#6941c6",
    fontSize: 9,
    fontWeight: 800,
  },

  adminLoading: {
    minHeight: 260,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: "#718096",
  },

  adminVacio: {
    padding: 55,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    color: "#718096",
    textAlign: "center",
  },

  /* =====================================================
     MODALES
  ===================================================== */

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(6,27,53,.55)",
    backdropFilter:
      "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6000,
    padding: 20,
  },

  modal: {
    width: 450,
    maxWidth: "100%",
    background: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow:
      "0 25px 70px rgba(0,20,50,.25)",
  },

  modalHeader: {
    padding:
      "22px 24px 17px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    borderBottom:
      "1px solid #edf0f4",
  },

  modalKicker: {
    color: "#1769e8",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "1px",
    marginBottom: 5,
  },

  modalTitulo: {
    margin: 0,
    color: "#142033",
    fontSize: 20,
    fontWeight: 800,
  },

  modalSubtitulo: {
    margin:
      "5px 0 0",
    color: "#8490a3",
    fontSize: 11,
  },

  modalCerrar: {
    width: 32,
    height: 32,
    border: "none",
    borderRadius: 9,
    background: "#f4f7fb",
    color: "#667085",
    cursor: "pointer",
  },

  modalBody: {
    padding:
      "20px 24px 8px",
  },

  modalLabel: {
    display: "block",
    marginBottom: 6,
    color: "#344054",
    fontSize: 11,
    fontWeight: 700,
  },

  modalInput: {
    width: "100%",
    boxSizing: "border-box",
    padding:
      "12px 13px",
    marginBottom: 15,
    border:
      "1px solid #d8e0ea",
    borderRadius: 10,
    outline: "none",
    fontSize: 13,
    color: "#142033",
    background: "#fbfcfe",
  },

  modalFooter: {
    padding:
      "15px 24px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: 9,
    borderTop:
      "1px solid #edf0f4",
  },

  botonCancelar: {
    padding:
      "10px 15px",
    border:
      "1px solid #d8e0ea",
    borderRadius: 9,
    background: "#ffffff",
    color: "#475467",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  },

  botonGuardar: {
    padding:
      "10px 16px",
    border: "none",
    borderRadius: 9,
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    boxShadow:
      "0 5px 14px rgba(23,105,232,.20)",
  },

  passwordUsuario: {
    margin:
      "20px 24px 0",
    padding: 13,
    borderRadius: 12,
    background: "#f7f9fc",
    border:
      "1px solid #e7ecf2",
    display: "flex",
    alignItems: "center",
    gap: 11,
  },

  passwordAvatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background:
      "linear-gradient(135deg, #1769e8, #2b7cff)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  passwordNombre: {
    fontSize: 12,
    fontWeight: 800,
    color: "#263448",
  },

  passwordUsername: {
    fontSize: 10,
    color: "#98a2b3",
    marginTop: 3,
  },
};

export default App;