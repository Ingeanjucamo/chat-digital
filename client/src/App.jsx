import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

import Login from "./components/Login/Login";
import Sidebar from "./components/Sidebar/Sidebar";
import Contacts from "./components/Contacts/Contacts";
import Chat from "./components/Chat/Chat";
import Administration from "./components/Administration/Administration";
import Ventas from "./components/Ventas/Ventas";
import { iniciarLogin } from "./services/api";
import DashboardComercial from "./components/DashboardComercial/DashboardComercial";
import VentasCantadas from "./components/VentasCantadas/VentasCantadas";


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
  const [miChat, setMiChat] = useState(false);

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [mensajeRespondido, setMensajeRespondido] = useState(null);

  /* ARCHIVOS */
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const archivoInputRef = useRef(null);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaMensajes, setBusquedaMensajes] = useState("");
const [resultadosMensajes, setResultadosMensajes] = useState([]);
const [buscandoMensajes, setBuscandoMensajes] = useState(false);

  /* NOTIFICACIONES */
  const [notificacionesPrivadas, setNotificacionesPrivadas] = useState(0);
  const [notificacionesInfo, setNotificacionesInfo] = useState(0);

  const [pendientesPorUsuario, setPendientesPorUsuario] = useState({});
const [ultimosMensajesPorUsuario, setUltimosMensajesPorUsuario] = useState({});

  const [alerta, setAlerta] = useState(null);

  useEffect(() => {
    document.title = "AMV CRM & Software";
  }, []);

  /* =====================================================
     CARGAR USUARIOS
  ===================================================== */

  async function cargarUsuarios() {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    setUsuarios(data || []);
  } catch (error) {
    console.error("Error cargando usuarios desde Supabase:", error);
  }
}
async function cargarUltimosMensajes() {
  if (!usuario) return;

  try {
    const { data, error } = await supabase
      .from("mensajes")
      .select("emisor_id, receptor_id, created_at")
      .is("grupo", null)
      .or(
        `emisor_id.eq.${usuario.id},receptor_id.eq.${usuario.id}`
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    const ultimos = {};

    (data || []).forEach((mensaje) => {
      const otroUsuario =
        Number(mensaje.emisor_id) === Number(usuario.id)
          ? mensaje.receptor_id
          : mensaje.emisor_id;

      if (!otroUsuario) return;

      if (!ultimos[otroUsuario]) {
        ultimos[otroUsuario] = mensaje.created_at;
      }
    });

    setUltimosMensajesPorUsuario(ultimos);
  } catch (error) {
    console.error(
      "Error cargando últimos mensajes:",
      error
    );
  }
}
useEffect(() => {
  if (!usuario || seccion !== "privado") {
    return;
  }

  cargarUltimosMensajes();
}, [usuario, seccion]);

function obtenerNombreUsuario(id) {
  const encontrado = usuarios.find(
    (u) => Number(u.id) === Number(id)
  );

  return (
    encontrado?.nombre ||
    encontrado?.usuario ||
    "Usuario"
  );
}

// Cargar el historial al abrir Información General o una conversación.
useEffect(() => {
  if (!usuario || !["informacion", "privado"].includes(seccion)) return;

  let cancelado = false;

  async function cargarHistorial() {
    try {
      let consulta = supabase.from("mensajes").select("*");

      if (seccion === "informacion") {
        consulta = consulta.eq("grupo", "informacion");
      } else if (miChat) {
        consulta = consulta
          .is("grupo", null)
          .eq("emisor_id", usuario.id)
          .eq("receptor_id", usuario.id);
      } else if (usuarioChat) {
        const yo = Number(usuario.id);
        const otro = Number(usuarioChat.id);
        consulta = consulta
          .is("grupo", null)
          .or(`and(emisor_id.eq.${yo},receptor_id.eq.${otro}),and(emisor_id.eq.${otro},receptor_id.eq.${yo})`);
      } else {
        setMensajes([]);
        return;
      }

      const { data, error } = await consulta.order("created_at", { ascending: true });
      if (error) throw error;

      const mensajesConNombre = (data || []).map((m) => ({
        ...m,
        nombre: obtenerNombreUsuario(m.emisor_id),
      }));

      if (!cancelado) setMensajes(mensajesConNombre);
    } catch (error) {
      console.error("Error cargando historial de mensajes:", error);
    }
  }

  cargarHistorial();
  return () => { cancelado = true; };
}, [usuario, seccion, usuarioChat, miChat, usuarios]);

 async function optimizarImagenParaChat(archivo) {
  if (!archivo?.type?.startsWith("image/")) return archivo;

  // No procesar GIF animado ni SVG para conservar su comportamiento.
  if (archivo.type === "image/gif" || archivo.type === "image/svg+xml") return archivo;

  // Capturas de pantalla suelen ser PNG pesados; se reducen y convierten a JPEG.
  try {
    const imagen = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo procesar la imagen."));
      };
      img.src = url;
    });

    const maxDimension = 1600;
    const escala = Math.min(1, maxDimension / Math.max(imagen.width, imagen.height));
    const ancho = Math.max(1, Math.round(imagen.width * escala));
    const alto = Math.max(1, Math.round(imagen.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const contexto = canvas.getContext("2d");
    if (!contexto) return archivo;

    // Fondo blanco para evitar fondos negros al convertir capturas con transparencia.
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(imagen, 0, 0, ancho, alto);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78)
    );
    if (!blob) return archivo;

    // Si el resultado no queda más liviano, conserva el archivo original.
    if (blob.size >= archivo.size) return archivo;

    const nombreBase = archivo.name.replace(/\\.[^.]+$/, "") || "imagen";
    return new File([blob], `${nombreBase}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("No se pudo optimizar la imagen; se enviará original:", error);
    return archivo;
  }
}

 async function enviarMensaje(e) {
  e.preventDefault();

  const mensajeTexto = texto
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n")
  .trim();

  if (
    (!mensajeTexto && !archivoSeleccionado) ||
    !usuario
  ) {
    return;
  }

if (archivoSeleccionado) {
  const esImagen =
    archivoSeleccionado.type?.startsWith("image/");

  const puedeEnviarImagenPrivada =
    seccion === "privado" &&
    (
      miChat ||
      (usuarioChat && (
        Number(usuarioChat.id) === Number(usuario.id) ||
        usuarioChat.rol !== usuario.rol
      ) && esImagen)
    );

  const puedeEnviarArchivoInformacion =
    seccion === "informacion" &&
    ["Administrador", "Supervisor"].includes(usuario.rol);

  if (
    !puedeEnviarImagenPrivada &&
    !puedeEnviarArchivoInformacion
  ) {
    alert(
      "En chats privados solo se pueden enviar imágenes entre Asesor y Administrador."
    );
    return;
  }
}

  if (
    seccion === "informacion" &&
    !["Administrador", "Supervisor"].includes(usuario.rol)
  ) {
    alert(
      "Solo los administradores y supervisores pueden publicar información."
    );
    return;
  }

  if (
  seccion === "privado" &&
  !miChat &&
  !usuarioChat
) {
  alert("Selecciona un contacto primero.");
  return;
}

  try {
    const { data: { user: authUser } } =
  await supabase.auth.getUser();

console.log("AUTH USER:", authUser);
console.log("AUTH UID:", authUser?.id);
console.log("USUARIO APP:", usuario);

    let archivoData = null;

    /* =================================================
       SUBIR ARCHIVO A SUPABASE STORAGE
    ================================================= */

    if (archivoSeleccionado) {
      setSubiendoArchivo(true);

      const archivoOptimizado = await optimizarImagenParaChat(archivoSeleccionado);
      const nombreArchivo =
        `${usuario.id}_${Date.now()}_${archivoOptimizado.name}`
          .replace(/\s+/g, "_");

      const rutaArchivo =
        `mensajes/${nombreArchivo}`;

      const { error: errorArchivo } =
        await supabase.storage
          .from("archivos")
          .upload(
            rutaArchivo,
            archivoOptimizado,
            {
              upsert: true,
              contentType: archivoOptimizado.type || "application/octet-stream",
              cacheControl: "3600",
            }
          );

      if (errorArchivo) {
        throw new Error(`No se pudo subir "${archivoSeleccionado.name}" a Supabase Storage: ${errorArchivo.message || "Verifica permisos del bucket archivos."}`);
      }

      const { data: urlData } =
        supabase.storage
          .from("archivos")
          .getPublicUrl(rutaArchivo);

      archivoData = {
        nombre: archivoOptimizado.name,
        tipo: archivoOptimizado.type,
        url: urlData.publicUrl,
      };

      setSubiendoArchivo(false);
    }

    /* =================================================
       PREPARAR MENSAJE
    ================================================= */

const nuevoMensaje = {
  emisor_id: usuario.id,
  texto: mensajeTexto || null,
  grupo: seccion === "informacion" ? "informacion" : null,

  receptor_id:
    seccion === "privado"
      ? (miChat ? usuario.id : usuarioChat.id)
      : null,

  archivo: archivoData,

  mensaje_respondido_id:
    mensajeRespondido?.id || null,
};

    /* =================================================
       GUARDAR EN SUPABASE
    ================================================= */

    const { data, error } = await supabase
      .from("mensajes")
      .insert(nuevoMensaje)
      .select()
      .single();

    if (error) {
      console.error(
        "ERROR SUPABASE AL ENVIAR:",
        error
      );

      throw error;
    }

    // Actualizar posición de la conversación
if (seccion === "privado" && usuarioChat) {
  setUltimosMensajesPorUsuario((anteriores) => ({
    ...anteriores,
    [usuarioChat.id]: data.created_at,
  }));
}

    /* =================================================
       LIMPIAR
    ================================================= */

    setTexto("");
setArchivoSeleccionado(null);
setMensajeRespondido(null);

    if (archivoInputRef.current) {
      archivoInputRef.current.value = "";
    }

    /* =================================================
       MOSTRAR MENSAJE
    ================================================= */

setMensajes((anteriores) => {
  if (
    anteriores.some(
      (m) => Number(m.id) === Number(data.id)
    )
  ) {
    return anteriores;
  }

  return [
    ...anteriores,
    {
      ...data,
      nombre:
        usuario.nombre ||
        usuario.usuario ||
        "Usuario",
    },
  ];
});

  } catch (error) {
    console.error(
      "Error enviando mensaje:",
      error
    );

    setSubiendoArchivo(false);

    alert(
      error.message ||
        "No se pudo enviar el mensaje"
    );
  }
}



async function buscarMensajes() {
  const termino = busqueda.trim();

  if (!termino) {
    setResultadosMensajes([]);
    return;
  }

  setBuscandoMensajes(true);

  try {
    const { data, error } = await supabase
      .from("mensajes")
      .select("*")
      .ilike("texto", `%${termino}%`)
      .not("texto", "is", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      throw error;
    }

    const resultados = (data || []).map((mensaje) => ({
      ...mensaje,
      nombre: obtenerNombreUsuario(
        mensaje.emisor_id
      ),
    }));

    setResultadosMensajes(resultados);
  } catch (error) {
    console.error(
      "Error buscando mensajes:",
      error
    );

    setResultadosMensajes([]);
  } finally {
    setBuscandoMensajes(false);
  }
}
useEffect(() => {
  if (!usuario || seccion !== "privado") {
    return;
  }

  const termino = busqueda.trim();

  if (!termino) {
    setResultadosMensajes([]);
    return;
  }

  const temporizador = setTimeout(() => {
    buscarMensajes();
  }, 400);

  return () => clearTimeout(temporizador);
}, [
  busqueda,
  usuario,
  seccion,
]);
async function cargarNotificacionesPendientes(usuarioActual) {
  if (!usuarioActual) return;

  try {
    // Reinicio único de las notificaciones antiguas por usuario.
    const claveInicioNotificaciones = `amv_notificaciones_inicio_${usuarioActual.id}`;
    let inicioNotificaciones = null;

    try {
      inicioNotificaciones = window.localStorage.getItem(claveInicioNotificaciones);
    } catch (_) {}

    if (!inicioNotificaciones) {
      inicioNotificaciones = new Date().toISOString();

      try {
        window.localStorage.setItem(claveInicioNotificaciones, inicioNotificaciones);
      } catch (_) {}

      // Limpiar los mensajes privados que ya estaban pendientes antes del reinicio.
      const { error: limpiarError } = await supabase
        .from("mensajes")
        .update({ leido: true })
        .eq("receptor_id", usuarioActual.id)
        .neq("emisor_id", usuarioActual.id)
        .eq("leido", false)
        .lt("created_at", inicioNotificaciones);

      if (limpiarError) throw limpiarError;

      setPendientesPorUsuario({});
      setNotificacionesPrivadas(0);
      setNotificacionesInfo(0);
      return;
    }

    // Desde el punto de limpieza solo se cuentan mensajes nuevos aún no leídos.
    const { data, error } = await supabase
      .from("mensajes")
      .select("id, emisor_id, receptor_id")
      .eq("receptor_id", usuarioActual.id)
      .neq("emisor_id", usuarioActual.id)
      .eq("leido", false)
      .gt("created_at", inicioNotificaciones);

    if (error) throw error;

    const pendientes = {};
    (data || []).forEach((mensaje) => {
      pendientes[mensaje.emisor_id] = (pendientes[mensaje.emisor_id] || 0) + 1;
    });

    setPendientesPorUsuario(pendientes);
    setNotificacionesPrivadas((data || []).length);
    setNotificacionesInfo(0);
  } catch (error) {
    console.error("Error limpiando/cargando notificaciones pendientes:", error);
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
     SUPABASE REALTIME - NOTIFICACIONES
  ===================================================== */

  
useEffect(() => {
  if (!usuario) return;

  const canal = supabase
    .channel(`notificaciones-${usuario.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mensajes",
      },
      async (payload) => {
        const mensaje = payload.new;

if (
  Number(mensaje.emisor_id) ===
  Number(usuario.id)
) {
  return;
}

const sonidoNotificacion = new Audio("/notificacion.mp3");

sonidoNotificacion.volume = 0.5;

sonidoNotificacion.play().catch(() => {});

        // Buscar quién envió el mensaje
        const { data: emisor } = await supabase
          .from("usuarios")
          .select("id, nombre, usuario")
          .eq("id", mensaje.emisor_id)
          .single();

        const nombreEmisor =
          emisor?.nombre ||
          emisor?.usuario ||
          "Usuario";

        const mensajeConNombre = {
          ...mensaje,
          nombre: nombreEmisor,
        };

        // Actualizar el orden de conversaciones
if (
  mensaje.receptor_id &&
  Number(mensaje.receptor_id) === Number(usuario.id)
) {
  setUltimosMensajesPorUsuario((anteriores) => ({
    ...anteriores,
    [mensaje.emisor_id]: mensaje.created_at,
  }));
}

        // =====================================================
        // MENSAJE PRIVADO
        // =====================================================

        if (mensaje.receptor_id) {
          const esParaMi =
            Number(mensaje.receptor_id) ===
            Number(usuario.id);

          if (!esParaMi) {
            return;
          }

          const chatAbierto =
            seccion === "privado" &&
            usuarioChat &&
            Number(usuarioChat.id) ===
              Number(mensaje.emisor_id);

          // Si estoy dentro del chat con esa persona,
          // mostrar el mensaje directamente.
          if (chatAbierto) {
            setMensajes((anteriores) => {
              if (
                anteriores.some(
                  (m) =>
                    Number(m.id) ===
                    Number(mensaje.id)
                )
              ) {
                return anteriores;
              }

              return [
                ...anteriores,
                mensajeConNombre,
              ];
            });

            return;
          }

          // =====================================================
          // SI EL CHAT NO ESTÁ ABIERTO
          // AUMENTAR CONTADOR: 1, 2, 3...
          // =====================================================

          setNotificacionesPrivadas(
            (cantidad) => cantidad + 1
          );

          setPendientesPorUsuario(
            (anteriores) => ({
              ...anteriores,

              [mensaje.emisor_id]:
                (anteriores[mensaje.emisor_id] ||
                  0) + 1,
            })
          );

          mostrarNotificacion(
            "💬 Nuevo mensaje",
            `${nombreEmisor}: ${
              mensaje.texto ||
              "📎 Archivo adjunto"
            }`
          );

          return;
        }

        // =====================================================
        // INFORMACIÓN GENERAL
        // =====================================================

        if (
          mensaje.grupo ===
          "informacion"
        ) {
          if (
            seccion === "informacion"
          ) {
            setMensajes((anteriores) => {
              if (
                anteriores.some(
                  (m) =>
                    Number(m.id) ===
                    Number(mensaje.id)
                )
              ) {
                return anteriores;
              }

              return [
                ...anteriores,
                mensajeConNombre,
              ];
            });

            return;
          }

          setNotificacionesInfo(
            (cantidad) => cantidad + 1
          );

          mostrarNotificacion(
            "📢 Nueva información",
            `${nombreEmisor}: ${
              mensaje.texto ||
              "Hay un nuevo comunicado."
            }`
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}, [
  usuario,
  seccion,
  usuarioChat,
]);



  /* =====================================================
     NAVEGACIÓN PRINCIPAL
  ===================================================== */

  function abrirInformacion() {
    setSeccion("informacion");
    setMiChat(false);
    setUsuarioChat(null);
  }

  function abrirConversaciones() {
    setSeccion("privado");
    setMiChat(false);
    setUsuarioChat(null);
    setMensajes([]);
  }

  function abrirVentas() {
    setSeccion("ventas");
    setMiChat(false);
    setUsuarioChat(null);
  }

  function abrirVentasCantadas() {
    setSeccion("ventasCantadas");
    setMiChat(false);
    setUsuarioChat(null);
  }

  function abrirDashboard() {
    setSeccion("dashboard");
    setMiChat(false);
    setUsuarioChat(null);
  }

  function abrirAdministracion() {
    setSeccion("administracion");
    setMiChat(false);
    setUsuarioChat(null);
    cargarUsuariosAdministracion();
  }

  function abrirMiChat() {
    setSeccion("privado");
    setMiChat(true);
    setUsuarioChat(null);
    setMensajes([]);
  }

  async function abrirChatPrivado(contacto) {
    setSeccion("privado");
    setMiChat(false);
    setUsuarioChat(contacto);
    setMensajes([]);

    // Abrir el chat marca los mensajes recibidos como leídos y limpia su badge.
    if (usuario && contacto?.id) {
      try {
        const cantidadPendiente = pendientesPorUsuario[contacto.id] || 0;
        const { error } = await supabase
          .from("mensajes")
          .update({ leido: true })
          .eq("receptor_id", usuario.id)
          .eq("emisor_id", contacto.id)
          .eq("leido", false);

        if (error) throw error;

        setPendientesPorUsuario((anteriores) => {
          const actualizado = { ...anteriores };
          delete actualizado[contacto.id];
          return actualizado;
        });
        setNotificacionesPrivadas((cantidad) =>
          Math.max(0, cantidad - cantidadPendiente)
        );
      } catch (error) {
        console.error("No se pudieron marcar los mensajes como leídos:", error);
      }
    }
  }

  function cerrarSesion() {
    setUsuario(null);
    setLoginUsuario("");
    setLoginPassword("");
    setErrorLogin("");
    setSeccion("informacion");
    setUsuarioChat(null);
    setMiChat(false);
    setMensajes([]);
    setBusqueda("");
    setBusquedaMensajes("");
  }

  /* =====================================================
     ADMINISTRACIÓN - CARGAR USUARIOS
  ===================================================== */

  async function cargarUsuariosAdministracion() {
  if (
    !usuario?.esSuperAdmin &&
    usuario?.usuario !== "andres.cardozo"
  ) {
    return;
  }

  try {
    setCargandoAdmin(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    setUsuariosAdmin(data || []);
  } catch (error) {
    console.error(
      "ERROR CARGANDO USUARIOS:",
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
    await cargarNotificacionesPendientes(datos.usuario);

    await cargarUsuarios();
   

    solicitarNotificaciones();
  } catch (error) {
    console.error(error);

    setErrorLogin(
      error.message || "No se pudo conectar con el servidor"
    );
  }
}



 /* =====================================================
   CONTACTOS
===================================================== */

const contactos = useMemo(() => {
  if (!usuario) return [];
  let lista = [];
  if (usuario.rol === "Asesor") {
    // El asesor puede iniciar chats con administradores y supervisores.
    lista = usuarios.filter((u) => ["Administrador", "Supervisor"].includes(u.rol) && u.id !== usuario.id && u.activo !== false);
  }
  if (usuario.rol === "Supervisor") {
    // Supervisor: conversaciones únicamente con asesores.
    lista = usuarios.filter((u) => u.rol === "Asesor" && u.id !== usuario.id && u.activo !== false);
  }
  if (usuario.rol === "Administrador") {
    // Administrador: conversaciones únicamente con asesores.
    lista = usuarios.filter((u) => u.rol === "Asesor" && u.id !== usuario.id && u.activo !== false);
  }
  if (busqueda.trim() !== "") {
    const textoBusqueda = busqueda.toLowerCase().trim();
    lista = lista.filter((u) => (u.nombre || "").toLowerCase().includes(textoBusqueda) || (u.usuario || "").toLowerCase().includes(textoBusqueda));
  }
  // Orden tipo WhatsApp: conversaciones con actividad reciente primero.
  lista = [...lista].sort((a, b) => {
    const fechaA = new Date(ultimosMensajesPorUsuario[a.id] || 0).getTime() || 0;
    const fechaB = new Date(ultimosMensajesPorUsuario[b.id] || 0).getTime() || 0;
    return fechaB - fechaA;
  });
  return lista;
}, [usuarios, usuario, busqueda, ultimosMensajesPorUsuario]);

function limpiarFormularioUsuario() {
  setMostrarFormularioUsuario(false);
  setUsuarioEditando(null);
  setFormUsuario({ usuario: "", nombre: "", password: "", rol: "Asesor" });
}

const vistaApp = (() => {
  if (!usuario) {
    return (
      <Login
        loginUsuario={loginUsuario}
        setLoginUsuario={setLoginUsuario}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        errorLogin={errorLogin}
        iniciarSesion={iniciarSesion}
        estilos={estilos}
      />
    );
  }

  /* =====================================================
     INTERFAZ PRINCIPAL
  ===================================================== */

  return (
    <div
      className={`app-shell ${seccion === "administracion" ? "app-shell-admin" : ""}`}
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
  notificacionesInfo={notificacionesInfo}
  notificacionesPrivadas={notificacionesPrivadas}
  abrirInformacion={abrirInformacion}
  abrirConversaciones={abrirConversaciones}
  abrirVentas={abrirVentas}
  abrirVentasCantadas={abrirVentasCantadas}
  abrirDashboard={abrirDashboard}
  abrirAdministracion={abrirAdministracion}
  cerrarSesion={cerrarSesion}
  estilos={estilos}
/>

      {/* =================================================
          CONTACTOS
          Solo se muestran en CONVERSACIONES.
          Información y Administración usan todo el espacio.
      ================================================= */}

      {seccion === "privado" && (
        <Contacts
          usuario={usuario}
          seccion={seccion}
          miChat={miChat}
          abrirMiChat={abrirMiChat}
          setMiChat={setMiChat}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          busquedaMensajes={busquedaMensajes}
          setBusquedaMensajes={setBusquedaMensajes}
          resultadosMensajes={resultadosMensajes}
          buscarMensajes={buscarMensajes}
          buscandoMensajes={buscandoMensajes}
          contactos={contactos}
          pendientesPorUsuario={pendientesPorUsuario}
          usuarioChat={usuarioChat}
          abrirChatPrivado={abrirChatPrivado}
          estilos={estilos}
        />
      )}

      {/* =================================================
          PANEL PRINCIPAL
      ================================================= */}

      {seccion === "dashboard" ? (
        <main
          className="chat-panel dashboard-main-scroll"
          style={{
            ...estilos.chat,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <DashboardComercial usuario={usuario} />
        </main>
      ) : seccion === "administracion" ? (
        <main
          className="chat-panel administration-main"
          style={estilos.chat}
        >
          <Administration
            usuario={usuario}
            onUsuariosActualizados={cargarUsuariosAdministracion}
          />
        </main>
      ) : seccion === "ventas" ? (
        <main
          className="chat-panel"
          style={estilos.chat}
        >
          <Ventas usuario={usuario} />
        </main>
      ) : seccion === "ventasCantadas" ? (
        <main className="chat-panel dashboard-main-scroll" style={{...estilos.chat, overflowY:"auto", minHeight:0}}>
          <VentasCantadas usuario={usuario} />
        </main>
      ) : (
        <Chat
          usuario={usuario}
          seccion={seccion}
          usuarioChat={usuarioChat}
          miChat={miChat}
          mensajes={mensajes}
          texto={texto}
          setTexto={setTexto}
          enviarMensaje={enviarMensaje}
            mensajeRespondido={mensajeRespondido}
  setMensajeRespondido={setMensajeRespondido}
          archivoInputRef={archivoInputRef}
          archivoSeleccionado={archivoSeleccionado}
          setArchivoSeleccionado={
            setArchivoSeleccionado
          }
          subiendoArchivo={subiendoArchivo}
          estilos={estilos}
          API=""
        />
      )}


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

                <option value="Supervisor">
                  Supervisor
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
})();

  return vistaApp;
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
      "radial-gradient(circle at 15% 20%, #0b3d80 0%, #04152f 48%, #020817 100%)",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    padding: 20,
  },

  loginCaja: {
    width: 460,
    maxWidth: "100%",
    padding: 36,
    borderRadius: 24,
    background: "linear-gradient(145deg, #fafdff 0%, #eaf6ff 100%)",
    boxShadow: "0 30px 90px rgba(0, 10, 40, 0.48)",
  },

  loginTitulo: {
    textAlign: "center",
    margin: "15px 0 5px",
    color: "#071d49",
    fontSize: 30,
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
      "1px solid #c8dff5",
    fontSize: 14,
    outline: "none",
    background: "#ffffff",
    color: "#08204a",
  },

  botonLogin: {
    width: "100%",
    padding: 14,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow:
      "0 10px 26px rgba(0,145,255,.32)",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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
    background: "transparent",
    color: "rgba(255,255,255,.76)",
    boxShadow: "none",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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
      "1px solid #c8dff5",
    borderRadius: 11,
    outline: "none",
    fontSize: 13,
    minWidth: 0,
    background: "#ffffff",
    color: "#08204a",
  },

  botonAdjuntar: {
    width: 43,
    height: 43,
    flexShrink: 0,
    border:
      "1px solid #c8dff5",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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
      "1px solid #c8dff5",
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
      "1px solid #c8dff5",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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
      "linear-gradient(135deg, #00c9f2, #0878ff 58%, #0644c7)",
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