import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Administration.css";

function Administration({ usuario, onUsuariosActualizados }) {
  const [usuariosAdmin, setUsuariosAdmin] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoAdmin, setCargandoAdmin] = useState(true);
  const [mostrarUsuariosAdmin, setMostrarUsuariosAdmin] = useState(false);
  const [mostrarControlComercial, setMostrarControlComercial] = useState(true);

  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioPassword, setUsuarioPassword] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState("");

  // =========================================================
  // CONFIGURACIÓN COMERCIAL (SOLO SUPERADMIN)
  // =========================================================
  const [metasComerciales, setMetasComerciales] = useState([]);
  const [novedadesComerciales, setNovedadesComerciales] = useState([]);
  const [anioComercial, setAnioComercial] = useState(new Date().getFullYear());
  const [mesComercial, setMesComercial] = useState(new Date().getMonth() + 1);
  const [metaForm, setMetaForm] = useState({ asesor_id: "", meta: "45" });
  const [asesoresMetaSeleccionados, setAsesoresMetaSeleccionados] = useState([]);
  const [busquedaMeta, setBusquedaMeta] = useState("");
  const [novedadForm, setNovedadForm] = useState({
    asesor_id: "",
    venta_id: "",
    fecha: new Date().toISOString().slice(0, 10),
    tipo: "Caída por titular",
    motivo: "",
    descuento: "1",
    observacion: ""
  });
  const [ventasParaDescuento, setVentasParaDescuento] = useState([]);
  const [cargandoVentasDescuento, setCargandoVentasDescuento] = useState(false);
  const [cargandoComercial, setCargandoComercial] = useState(false);

  const esSuperAdmin = usuario?.esSuperAdmin === true || usuario?.es_super_admin === true || usuario?.usuario === "andres.cardozo";

  const cargarConfiguracionComercial = async () => {
    if (!esSuperAdmin) return;
    setCargandoComercial(true);
    try {
      const [metasResp, novedadesResp] = await Promise.all([
        supabase.from("metas_comerciales").select("*").eq("anio", anioComercial).eq("mes", mesComercial).order("asesor_id"),
        supabase.from("novedades_comerciales").select("*").eq("anio", anioComercial).eq("mes", mesComercial).eq("activo", true).order("fecha", { ascending: false }),
      ]);
      if (metasResp.error) throw metasResp.error;
      if (novedadesResp.error) throw novedadesResp.error;
      setMetasComerciales(metasResp.data || []);
      setNovedadesComerciales(novedadesResp.data || []);
    } catch (error) {
      console.error("ERROR CARGANDO CONFIGURACIÓN COMERCIAL:", error);
      alert(`No se pudo cargar metas/novedades. Ejecuta primero el SQL comercial incluido en el ZIP.\n\n${error.message}`);
    } finally {
      setCargandoComercial(false);
    }
  };

  useEffect(() => {
    cargarConfiguracionComercial();
  }, [usuario?.id, anioComercial, mesComercial]);

  const asesoresActivos = usuariosAdmin.filter((u) => u.rol === "Asesor" && u.activo !== false);
  const asesoresMetaFiltrados = asesoresActivos.filter((u) =>
    String(u.nombre || "").toLowerCase().includes(busquedaMeta.trim().toLowerCase()) ||
    String(u.usuario || "").toLowerCase().includes(busquedaMeta.trim().toLowerCase())
  );

  const alternarAsesorMeta = (id) => {
    const value = Number(id);

    // Al seleccionar un asesor React vuelve a pintar la tabla.
    // Conservamos la posición del scroll para evitar que el navegador
    // salte al espacio vacío inferior.
    const main = document.querySelector(".administration-main");
    const tabla = document.querySelector(".commercial-meta-table-body");
    const mainScroll = main ? main.scrollTop : 0;
    const tablaScroll = tabla ? tabla.scrollTop : 0;

    setAsesoresMetaSeleccionados((prev) =>
      prev.includes(value)
        ? prev.filter((x) => x !== value)
        : [...prev, value]
    );

    requestAnimationFrame(() => {
      if (main) main.scrollTop = mainScroll;
      if (tabla) tabla.scrollTop = tablaScroll;
    });
  };

  const seleccionarTodosMeta = () => {
    const idsVisibles = asesoresMetaFiltrados.map((u) => Number(u.id));
    setAsesoresMetaSeleccionados((prev) => {
      const todosVisibles = idsVisibles.length > 0 && idsVisibles.every((id) => prev.includes(id));
      if (todosVisibles) return prev.filter((id) => !idsVisibles.includes(id));
      return Array.from(new Set([...prev, ...idsVisibles]));
    });
  };

  const seleccionarTodosAsesoresMeta = () => {
    setAsesoresMetaSeleccionados(asesoresActivos.map((u) => Number(u.id)));
  };

  const limpiarSeleccionMeta = () => setAsesoresMetaSeleccionados([]);

  const guardarMetasSeleccionadas = async () => {
    try {
      const meta = Number(metaForm.meta);
      if (!asesoresMetaSeleccionados.length || !Number.isFinite(meta) || meta < 0) {
        alert("Selecciona uno o varios asesores y define una meta válida.");
        return;
      }

      const registros = asesoresMetaSeleccionados.map((asesorId) => ({
        asesor_id: Number(asesorId),
        anio: anioComercial,
        mes: mesComercial,
        meta,
        activo: true,
        actualizado_por: usuario?.id || null,
      }));

      const { error } = await supabase
        .from("metas_comerciales")
        .upsert(registros, { onConflict: "asesor_id,anio,mes" });
      if (error) throw error;

      await cargarConfiguracionComercial();
      alert(`Meta de ${meta} ventas aplicada a ${registros.length} asesor${registros.length === 1 ? "" : "es"}.`);
    } catch (error) {
      console.error(error);
      alert(`No se pudieron guardar las metas: ${error.message}`);
    }
  };

  const cargarVentasParaDescuento = async (asesorId = novedadForm.asesor_id) => {
    if (!asesorId) {
      setVentasParaDescuento([]);
      return;
    }

    setCargandoVentasDescuento(true);
    try {
      const inicio = `${anioComercial}-${String(mesComercial).padStart(2, "0")}-01`;
      const siguiente = mesComercial === 12
        ? `${anioComercial + 1}-01-01`
        : `${anioComercial}-${String(mesComercial + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("ventas")
        .select("id,asesor_id,nombre_cliente,numero_portar,fecha_activacion,fecha_llamada,producto,estado,sala")
        .eq("asesor_id", Number(asesorId))
        .order("fecha_activacion", { ascending: false, nullsFirst: false })
        .order("fecha_llamada", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });

      if (error) throw error;

      const idsYaDescontados = new Set(
        novedadesComerciales
          .filter((n) => n.activo !== false && n.venta_id)
          .map((n) => Number(n.venta_id))
      );

      const ventasDelMes = (data || []).filter((v) => {
        const fecha = String(v.fecha_activacion || v.fecha_llamada || "").slice(0, 10);
        return fecha >= inicio && fecha < siguiente;
      });

      setVentasParaDescuento(
        ventasDelMes.filter((v) => !idsYaDescontados.has(Number(v.id)))
      );
    } catch (error) {
      console.error("ERROR CARGANDO VENTAS PARA DESCUENTO:", error);
      setVentasParaDescuento([]);
      alert(`No se pudieron cargar las ventas del asesor: ${error.message}`);
    } finally {
      setCargandoVentasDescuento(false);
    }
  };

  useEffect(() => {
    if (esSuperAdmin && novedadForm.asesor_id) {
      cargarVentasParaDescuento(novedadForm.asesor_id);
    } else {
      setVentasParaDescuento([]);
    }
  }, [esSuperAdmin, novedadForm.asesor_id, anioComercial, mesComercial, novedadesComerciales]);

  const seleccionarVentaParaDescuento = (ventaId) => {
    const venta = ventasParaDescuento.find((v) => Number(v.id) === Number(ventaId));
    if (!venta) {
      setNovedadForm((prev) => ({ ...prev, venta_id: "" }));
      return;
    }

    setNovedadForm((prev) => ({
      ...prev,
      venta_id: String(venta.id),
      fecha: venta.fecha_activacion || venta.fecha_llamada || prev.fecha,
      descuento: "1",
      tipo: "Caída por titular",
      motivo: prev.motivo || "Venta caída por titular",
    }));
  };

  const guardarNovedadComercial = async () => {
    try {
      if (!novedadForm.asesor_id || !novedadForm.venta_id || !novedadForm.motivo.trim()) {
        alert("Selecciona el asesor, la venta que se va a descontar y escribe el motivo.");
        return;
      }

      const venta = ventasParaDescuento.find((v) => Number(v.id) === Number(novedadForm.venta_id));
      if (!venta) {
        alert("La venta seleccionada ya no está disponible para descuento. Actualiza la lista.");
        return;
      }

      const fecha = novedadForm.fecha;
      const { error } = await supabase.from("novedades_comerciales").insert({
        asesor_id: Number(novedadForm.asesor_id),
        venta_id: Number(venta.id),
        cliente_nombre: venta.nombre_cliente || null,
        cliente_numero: venta.numero_portar || null,
        fecha,
        anio: Number(fecha.slice(0, 4)),
        mes: Number(fecha.slice(5, 7)),
        tipo: "Caída por titular",
        motivo: novedadForm.motivo.trim(),
        descuento: 1,
        observacion: novedadForm.observacion.trim() || null,
        activo: true,
        creado_por: usuario?.id || null,
      });

      if (error) throw error;

      setNovedadForm({
        asesor_id: "",
        venta_id: "",
        fecha: new Date().toISOString().slice(0, 10),
        tipo: "Caída por titular",
        motivo: "",
        descuento: "1",
        observacion: ""
      });
      setVentasParaDescuento([]);
      await cargarConfiguracionComercial();
      alert("Venta descontada correctamente de la meta.");
    } catch (error) {
      console.error(error);
      const mensaje = error.code === "23505"
        ? "Esta venta ya tiene un descuento activo."
        : error.message;
      alert(`No se pudo descontar la venta: ${mensaje}`);
    }
  };

  const eliminarNovedadComercial = async (id) => {
    if (!window.confirm("¿Eliminar esta novedad? El descuento dejará de aplicarse.")) return;
    try {
      const { error } = await supabase.from("novedades_comerciales").update({ activo: false }).eq("id", id);
      if (error) throw error;
      await cargarConfiguracionComercial();
    } catch (error) {
      alert(`No se pudo eliminar la novedad: ${error.message}`);
    }
  };

  const nombreAsesor = (id) => usuariosAdmin.find((u) => Number(u.id) === Number(id))?.nombre || `Asesor #${id}`;

  const [mostrarFormularioUsuario, setMostrarFormularioUsuario] =
    useState(false);

  const [formUsuario, setFormUsuario] = useState({
    usuario: "",
    nombre: "",
    password: "",
    rol: "Asesor",
    cedula: "",
    sala: "Sala 1",
  });

  // =========================================================
  // CARGAR USUARIOS
  // =========================================================

  const cargarUsuarios = async () => {
    try {
      setCargandoAdmin(true);

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        // Los usuarios antiguos pueden tener eliminado = NULL.
        // Solo ocultamos los retirados explícitamente (eliminado = true).
        .or("eliminado.is.null,eliminado.eq.false")
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      setUsuariosAdmin(data || []);
    } catch (error) {
      console.error("ERROR CARGANDO USUARIOS:", error);

      alert(
        error.message ||
          "No se pudieron cargar los usuarios."
      );
    } finally {
      setCargandoAdmin(false);
    }
  };

  useEffect(() => {
    if (usuario?.id) {
      cargarUsuarios();
    }
  }, [usuario?.id]);

  // =========================================================
  // NUEVO USUARIO
  // =========================================================

  const abrirNuevoUsuario = () => {
    setUsuarioEditando(null);

    setFormUsuario({
      usuario: "",
      nombre: "",
      password: "",
      rol: "Asesor",
      cedula: "",
      sala: "Sala 1",
    });

    setMostrarFormularioUsuario(true);
  };

  // =========================================================
  // CERRAR FORMULARIO
  // =========================================================

  const cerrarFormulario = () => {
    setMostrarFormularioUsuario(false);
    setUsuarioEditando(null);

    setFormUsuario({
      usuario: "",
      nombre: "",
      password: "",
      rol: "Asesor",
      cedula: "",
      sala: "Sala 1",
    });
  };

  // =========================================================
  // CREAR / EDITAR USUARIO
  // =========================================================

  const guardarUsuario = async () => {
    if (!esSuperAdmin) {
      alert("Solo el SuperAdmin puede asignar asesores a salas.");
      return;
    }
    try {
      if (
        !formUsuario.usuario.trim() ||
        !formUsuario.nombre.trim()
      ) {
        alert("Usuario y nombre son obligatorios.");
        return;
      }

      if (formUsuario.rol === "Asesor" && !formUsuario.cedula.trim()) {
        alert("La cédula es obligatoria para los asesores.");
        return;
      }

      if (
        !usuarioEditando &&
        !formUsuario.password.trim()
      ) {
        alert("La contraseña es obligatoria.");
        return;
      }

      // -----------------------------------------------------
      // CREAR USUARIO
      // -----------------------------------------------------

      if (!usuarioEditando) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error(
            "La sesión no es válida."
          );
        }

        const respuesta = await fetch(
          "https://frghtzsodaivkxbzzbnk.supabase.co/functions/v1/admin-create-user",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer " + session.access_token,
            },
            body: JSON.stringify({
              usuario:
                formUsuario.usuario.trim(),
              nombre:
                formUsuario.nombre.trim(),
              password:
                formUsuario.password,
              // Compatibilidad con la Edge Function actual: Supervisor
              // se crea inicialmente como Administrador y luego se corrige
              // en el perfil de usuarios.
              rol:
                formUsuario.rol === "Supervisor"
                  ? "Administrador"
                  : formUsuario.rol,
              cedula: formUsuario.cedula.trim(),
            }),
          }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ||
              "No se pudo crear el usuario."
          );
        }

        // La Edge Function actual puede no conocer todavía el rol Supervisor.
        // En ese caso se crea como Administrador y, al ser el SuperAdmin quien
        // ejecuta esta acción, se corrige inmediatamente el perfil.
        if (formUsuario.rol === "Supervisor") {
          const { error: rolError } = await supabase
            .from("usuarios")
            .update({
              rol: "Supervisor",
              funciones: ["Ventas", "Revisión"],
            })
            .eq("usuario", formUsuario.usuario.trim());

          if (rolError) {
            throw new Error(
              `El usuario fue creado, pero no se pudo asignar Supervisor: ${rolError.message}`
            );
          }
        }

        // La Edge Function crea el usuario de Auth y el perfil.
        // La cédula se completa después desde el perfil público.
        if (formUsuario.cedula.trim()) {
          const { error: cedulaError } = await supabase
            .from("usuarios")
            .update({ cedula: formUsuario.cedula.trim() })
            .eq("usuario", formUsuario.usuario.trim());

          if (cedulaError) {
            throw new Error(
              `El usuario fue creado, pero no se pudo guardar la cédula: ${cedulaError.message}`
            );
          }
        }

        if (formUsuario.rol === "Asesor") {
          const { error: salaError } = await supabase
            .from("usuarios")
            .update({ sala: formUsuario.sala })
            .eq("usuario", formUsuario.usuario.trim());
          if (salaError) throw new Error(`Usuario creado, pero no se pudo asignar la sala: ${salaError.message}`);
        }

        cerrarFormulario();

        await cargarUsuarios();

        if (onUsuariosActualizados) {
          await onUsuariosActualizados();
        }

        alert(
          "Usuario creado correctamente."
        );

        return;
      }

      // -----------------------------------------------------
      // EDITAR USUARIO
      // -----------------------------------------------------

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "La sesión no es válida."
        );
      }

      const respuesta = await fetch(
        "https://frghtzsodaivkxbzzbnk.supabase.co/functions/v1/admin-edit-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer " + session.access_token,
          },
          body: JSON.stringify({
            usuario_id:
              usuarioEditando.id,
            usuario:
              formUsuario.usuario.trim(),
            nombre:
              formUsuario.nombre.trim(),
            rol:
              formUsuario.rol === "Supervisor"
                ? "Administrador"
                : formUsuario.rol,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo editar el usuario."
        );
      }

      if (formUsuario.rol === "Supervisor") {
        const { error: rolError } = await supabase
          .from("usuarios")
          .update({
            rol: "Supervisor",
            funciones: ["Ventas", "Revisión"],
          })
          .eq("id", usuarioEditando.id);

        if (rolError) {
          throw new Error(
            `El usuario se actualizó, pero no se pudo asignar Supervisor: ${rolError.message}`
          );
        }
      }

      if (formUsuario.cedula.trim()) {
        const { error: cedulaError } = await supabase
          .from("usuarios")
          .update({ cedula: formUsuario.cedula.trim() })
          .eq("id", usuarioEditando.id);

        if (cedulaError) {
          throw new Error(
            `El usuario se actualizó, pero no se pudo guardar la cédula: ${cedulaError.message}`
          );
        }
      }

      if (formUsuario.rol === "Asesor") {
        const { error: salaError } = await supabase
          .from("usuarios")
          .update({ sala: formUsuario.sala })
          .eq("id", usuarioEditando.id);
        if (salaError) throw new Error(`Usuario actualizado, pero no se pudo asignar la sala: ${salaError.message}`);
      }

      cerrarFormulario();

      await cargarUsuarios();

      if (onUsuariosActualizados) {
        await onUsuariosActualizados();
      }

      alert(
        "Usuario actualizado correctamente."
      );
    } catch (error) {
      console.error(
        "ERROR GUARDANDO USUARIO:",
        error
      );

      alert(
        error.message ||
          "No se pudo guardar el usuario."
      );
    }
  };
    // =========================================================
  // Eliminar usuario
  // =========================================================
  const eliminarUsuario = async (u) => {
    if (!esSuperAdmin) {
      alert("Solo el Super Admin puede eliminar usuarios.");
      return;
    }
    if (u.es_super_admin || u.esSuperAdmin) {
      alert("El Super Admin no puede ser eliminado.");
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas retirar definitivamente del listado a ${u.nombre}?\n\n` +
      "Se bloqueará su acceso y dejará de aparecer entre los usuarios activos. " +
      "Sus ventas, revisiones y mensajes históricos se conservarán."
    );
    if (!confirmar) return;

    try {
      const { data, error } = await supabase.rpc("superadmin_archivar_usuario", {
        p_usuario_id: Number(u.id),
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.mensaje || "No se pudo archivar el usuario.");

      await cargarUsuarios();
      if (onUsuariosActualizados) await onUsuariosActualizados();
      alert("Usuario retirado correctamente. Se conservaron sus ventas y su historial.");
    } catch (error) {
      console.error("ERROR ARCHIVANDO USUARIO:", error);
      alert(error.message || "No se pudo retirar el usuario. Ejecuta el SQL de corrección incluido en el ZIP.");
    }
  };

  // =========================================================
  // ACTIVAR / DESACTIVAR USUARIO
  // =========================================================

  const cambiarEstadoUsuario = async (u) => {
    const nuevoEstado = u.activo === false;

    const confirmar = window.confirm(
      nuevoEstado
        ? `¿Deseas activar a ${u.nombre}?`
        : `¿Deseas desactivar a ${u.nombre}?`
    );

    if (!confirmar) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "La sesión no es válida."
        );
      }

      const respuesta = await fetch(
        "https://frghtzsodaivkxbzzbnk.supabase.co/functions/v1/admin-toggle-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer " + session.access_token,
          },
          body: JSON.stringify({
            usuario_id: u.id,
            activo: nuevoEstado,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo cambiar el estado del usuario."
        );
      }

      await cargarUsuarios();

      if (onUsuariosActualizados) {
        await onUsuariosActualizados();
      }

      alert(
        nuevoEstado
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente."
      );
    } catch (error) {
      console.error(
        "ERROR CAMBIANDO ESTADO:",
        error
      );

      alert(
        error.message ||
          "No se pudo cambiar el estado del usuario."
      );
    }
  };

  // =========================================================
  // CAMBIAR CONTRASEÑA
  // =========================================================

  const cambiarPassword = async () => {
    if (!nuevaPassword.trim()) {
      alert(
        "Escribe una nueva contraseña"
      );
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "La sesión no es válida."
        );
      }

      const respuesta = await fetch(
        "https://frghtzsodaivkxbzzbnk.supabase.co/functions/v1/admin-update-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer " + session.access_token,
          },
          body: JSON.stringify({
            usuario_id:
              usuarioPassword.id,
            password:
              nuevaPassword,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo cambiar la contraseña."
        );
      }

      setUsuarioPassword(null);
      setNuevaPassword("");

      alert(
        "Contraseña cambiada correctamente."
      );
    } catch (error) {
      console.error(
        "ERROR CAMBIANDO CONTRASEÑA:",
        error
      );

      alert(
        error.message ||
          "No se pudo cambiar la contraseña."
      );
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="administration-page">

      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <div className="administration-header">

        <div>
          <h1>
            Administración
          </h1>

          <p>
            Panel administrativo · Gestión de usuarios
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={abrirNuevoUsuario}
        >
          + Nuevo usuario
        </button>

      </div>

      {/* =====================================================
          TARJETA DE USUARIOS
      ====================================================== */}

      <div className="administration-card">

        <div className="administration-card-header">

          <div>

            <h2>
              Administración de usuarios
            </h2>

            <p>
              Gestiona asesores, supervisores y administradores
            </p>

          </div>

          <div className="administration-card-header-actions">
            <span className="users-count">
              {usuariosAdmin.length} usuarios
            </span>
            <button
              type="button"
              className={`users-toggle-btn ${mostrarUsuariosAdmin ? "open" : ""}`}
              onClick={() => setMostrarUsuariosAdmin((prev) => !prev)}
            >
              {mostrarUsuariosAdmin ? "▲ Ocultar usuarios" : "▼ Ver / gestionar usuarios"}
            </button>
          </div>

        </div>

        {/* ===================================================
            PANEL DESPLEGABLE DE USUARIOS
        ==================================================== */}

        {mostrarUsuariosAdmin && (cargandoAdmin ? (

          <div className="administration-loading">
            Cargando usuarios...
          </div>

        ) : (

          <div className="users-table">

            {/* ===============================================
                BUSCADOR
            ================================================ */}

            <div className="admin-search">

              <span className="admin-search-icon">
                🔎
              </span>

              <input
                type="text"
                placeholder="Buscar usuario por nombre o usuario..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
              />

            </div>

            {/* ===============================================
                ENCABEZADOS
            ================================================ */}

            <div className="users-table-head">

              <span>
                USUARIO
              </span>

              <span>
                ROL
              </span>

              <span>
                ESTADO
              </span>

              <span>
                ACCIONES
              </span>

            </div>

            {/* ===============================================
                LISTA DE USUARIOS
            ================================================ */}

            {usuariosAdmin
              .filter((u) => {

                const texto =
                  busqueda
                    .trim()
                    .toLowerCase();

                if (!texto) {
                  return true;
                }

                return (
                  u.nombre
                    ?.toLowerCase()
                    .includes(texto) ||
                  u.usuario
                    ?.toLowerCase()
                    .includes(texto)
                );
              })
              .map((u) => (

                <div
                  className="users-table-row"
                  key={u.id}
                >

                  {/* =======================================
                      INFORMACIÓN
                  ======================================== */}

                  <div className="user-info">

                    <div
                      className={
                        "user-avatar " +
                        (
                          u.rol === "Administrador"
                            ? "admin"
                            : u.rol === "Supervisor"
                              ? "supervisor"
                              : "advisor"
                        )
                      }
                    >
                      {u.nombre
                        ? u.nombre
                            .charAt(0)
                            .toUpperCase()
                        : "U"}
                    </div>

                    <div>

                      <strong>
                        {u.nombre}
                      </strong>

                      <small>
                        @{u.usuario}
                      </small>

                      {u.cedula && (
                        <small>
                          C.C. {u.cedula}
                        </small>
                      )}

                    </div>

                  </div>

                  {/* =======================================
                      ROL
                  ======================================== */}

                  <div>

                    <span
                      className={
                        "role-badge " +
                        (
                          u.rol === "Administrador"
                            ? "admin"
                            : u.rol === "Supervisor"
                              ? "supervisor"
                              : "advisor"
                        )
                      }
                    >
                      {u.rol}
                    </span>

                  </div>

                  {/* =======================================
                      ESTADO
                  ======================================== */}

                  <div>

                    <span
                      className={
                        "status-badge " +
                        (
                          u.activo
                            ? "active"
                            : "inactive"
                        )
                      }
                    >

                      <span className="status-dot"></span>

                      {u.activo
                        ? "Activo"
                        : "Desactivado"}

                    </span>

                  </div>

                  {/* =======================================
                      ACCIONES
                  ======================================== */}

                  <div className="user-actions">

                    {!(u.es_super_admin || u.esSuperAdmin) ? (

                      <>

                        {/* EDITAR */}

                        <button
                          className="btn-action edit"
                          onClick={() => {

                            setUsuarioEditando(
                              u
                            );

                            setFormUsuario({
                              usuario:
                                u.usuario,
                              nombre:
                                u.nombre,
                              password:
                                "",
                              rol:
                                u.rol,
                              cedula:
                                u.cedula || "",
                            });

                            setMostrarFormularioUsuario(
                              true
                            );

                          }}
                        >
                          ✏️ Editar
                        </button>

                        {/* CONTRASEÑA */}

                        <button
                          className="btn-action password"
                          onClick={() => {

                            setUsuarioPassword(
                              u
                            );

                            setNuevaPassword(
                              ""
                            );

                          }}
                        >
                          🔑 Contraseña
                        </button>

                        {/* ACTIVAR / DESACTIVAR */}

                        <button
                          className={
                            "btn-action " +
                            (
                              u.activo
                                ? "deactivate"
                                : "activate"
                            )
                          }
                          onClick={() =>
                            cambiarEstadoUsuario(
                              u
                            )
                          }
                        >
                          {u.activo
                            ? "🚫 Desactivar"
                            : "✅ Activar"}
                        </button>

                        {esSuperAdmin && (
                          <button
                            className="btn-action delete"
                            onClick={() => eliminarUsuario(u)}
                          >
                            🗑️ Retirar
                          </button>
                        )}

                      </>

                    ) : (

                      <span className="superadmin-badge">
                        👑 SuperAdmin
                      </span>

                    )}

                  </div>

                </div>

              ))}

            {/* ===============================================
                SIN USUARIOS
            ================================================ */}

            {usuariosAdmin.length === 0 && (

              <div className="administration-empty">
                No hay usuarios registrados.
              </div>

            )}

          </div>

        ))}

      </div>

      {esSuperAdmin && (
        <div className="commercial-admin-section">
          <div className="commercial-admin-header">
            <div>
              <span className="commercial-admin-kicker">CONTROL COMERCIAL</span>
              <h2>🎯 Metas y novedades</h2>
              <p>Configura metas por grupo, controla descuentos y consulta el histórico mensual.</p>
            </div>
            <div className="commercial-admin-period">
              <button type="button" className="commercial-collapse-btn" onClick={() => setMostrarControlComercial((v) => !v)}>
                {mostrarControlComercial ? "▲ Ocultar control" : "▼ Mostrar control"}
              </button>
              <select value={mesComercial} onChange={(e) => setMesComercial(Number(e.target.value))}>
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i)=><option key={m} value={i+1}>{m}</option>)}
              </select>
              <select value={anioComercial} onChange={(e) => setAnioComercial(Number(e.target.value))}>
                {[2026,2027,2028].map((y)=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {mostrarControlComercial && (
            <div className="commercial-overview-cards">
              <div><span>👥 ASESORES ACTIVOS</span><strong>{asesoresActivos.length}</strong><small>Disponibles para asignar meta</small></div>
              <div><span>🎯 METAS CONFIGURADAS</span><strong>{metasComerciales.length}</strong><small>Para este período</small></div>
              <div><span>📌 SELECCIONADOS</span><strong>{asesoresMetaSeleccionados.length}</strong><small>Listos para aplicar</small></div>
              <div><span>🧾 NOVEDADES</span><strong>{novedadesComerciales.length}</strong><small>Descuentos activos</small></div>
            </div>
          )}

          {mostrarControlComercial && (
            <>
            <div className="commercial-admin-grid">
            <div className="commercial-admin-card commercial-meta-card">
              <div className="commercial-card-heading-row">
                <div>
                  <h3>🎯 Presupuesto / meta de ventas</h3>
                  <p className="commercial-helper">Selecciona exactamente las personas a las que quieres asignar la misma meta. Puedes escoger una, varias o todas.</p>
                </div>
                <span className="commercial-selection-count">{asesoresMetaSeleccionados.length} seleccionados</span>
              </div>

              <div className="commercial-meta-commandbar">
                <label className="commercial-meta-value-field">
                  <span>Meta / presupuesto de ventas</span>
                  <input type="number" min="0" step="1" value={metaForm.meta} onChange={(e)=>setMetaForm({...metaForm, meta:e.target.value})}/>
                </label>
                <div className="commercial-meta-actions">
                  <button type="button" className="commercial-secondary-btn" onClick={seleccionarTodosAsesoresMeta}>☑ Seleccionar todos</button>
                  <button type="button" className="commercial-secondary-btn" onClick={limpiarSeleccionMeta}>✕ Limpiar</button>
                </div>
              </div>

              <div className="commercial-meta-helpbox">
                <div><b>1.</b><span>Busca los asesores</span></div>
                <div><b>2.</b><span>Marca varias personas</span></div>
                <div><b>3.</b><span>Define la meta</span></div>
                <div><b>4.</b><span>Aplica una sola vez</span></div>
              </div>

              <div className="commercial-meta-search-row">
                <input
                  type="text"
                  value={busquedaMeta}
                  onChange={(e)=>setBusquedaMeta(e.target.value)}
                  placeholder="🔎 Buscar por nombre o usuario..."
                />
                <button type="button" className="commercial-secondary-btn" onClick={seleccionarTodosMeta}>
                  {asesoresMetaFiltrados.length > 0 && asesoresMetaFiltrados.every((u) => asesoresMetaSeleccionados.includes(Number(u.id))) ? "Quitar visibles" : "Seleccionar visibles"}
                </button>
              </div>

              <div className="commercial-meta-table-wrap">
                <div className="commercial-meta-table-head">
                  <span>SELECCIONAR</span><span>ASESOR</span><span>META ACTUAL</span><span>DESCUENTOS</span><span>META AJUSTADA</span>
                </div>
                <div className="commercial-meta-table-body">
                  {asesoresMetaFiltrados.map((u) => {
                    const id = Number(u.id);
                    const seleccionado = asesoresMetaSeleccionados.includes(id);
                    const metaActual = Number(metasComerciales.find((m) => Number(m.asesor_id) === id)?.meta ?? 0);
                    const descuentos = novedadesComerciales
                      .filter((n) => Number(n.asesor_id) === id && n.activo !== false)
                      .reduce((sum, n) => sum + Number(n.descuento || 0), 0);
                    const metaAjustada = Math.max(0, metaActual - descuentos);
                    return (
                      <div
                        className={`commercial-meta-row ${seleccionado ? "selected" : ""}`}
                        key={u.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => alternarAsesorMeta(id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            alternarAsesorMeta(id);
                          }
                        }}
                      >
                        <span className="commercial-meta-selector">
                          <button
                            type="button"
                            className={`commercial-meta-check-button ${seleccionado ? "checked" : ""}`}
                            aria-label={seleccionado ? `Quitar ${u.nombre}` : `Seleccionar ${u.nombre}`}
                            aria-pressed={seleccionado}
                            onClick={(e) => {
                              e.stopPropagation();
                              alternarAsesorMeta(id);
                            }}
                          >
                            {seleccionado ? "✓" : ""}
                          </button>
                        </span>
                        <span className="commercial-meta-person">
                          <b>{u.nombre}</b><small>@{u.usuario || "sin usuario"}</small>
                        </span>
                        <span className="commercial-meta-number">{metaActual}</span>
                        <span className="commercial-meta-discount">-{descuentos}</span>
                        <span className="commercial-meta-adjusted">{metaAjustada}</span>
                      </div>
                    );
                  })}
                  {asesoresMetaFiltrados.length === 0 && <div className="commercial-empty">No se encontraron asesores.</div>}
                </div>
              </div>

              <div className="commercial-meta-selection-footer">
                <div>
                  <strong>{asesoresMetaSeleccionados.length}</strong> asesores seleccionados
                  <span> · Se aplicará la meta de <b>{Number(metaForm.meta) || 0}</b> ventas a todos los seleccionados.</span>
                </div>
                <button className="btn-primary commercial-save-btn" onClick={guardarMetasSeleccionadas} disabled={!asesoresMetaSeleccionados.length}>
                  💾 Aplicar meta a {asesoresMetaSeleccionados.length || 0} {asesoresMetaSeleccionados.length === 1 ? "asesor" : "asesores"}
                </button>
              </div>

              <div className="commercial-list commercial-meta-summary">
                <div className="commercial-meta-summary-head"><span>Configuración de {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mesComercial]} {anioComercial}</span><b>{metasComerciales.length} asesores</b></div>
                {cargandoComercial ? <small>Cargando...</small> : metasComerciales.slice(0, 8).map((m)=><div className="commercial-list-row" key={m.id}><span>{nombreAsesor(m.asesor_id)}</span><b>{m.meta} ventas</b></div>)}
                {!cargandoComercial && metasComerciales.length > 8 && <small>+ {metasComerciales.length - 8} asesores más configurados.</small>}
              </div>
            </div>

            <div className="commercial-admin-card">
              <h3>🧾 Descontar venta caída por titular</h3>
              <p className="commercial-helper">Selecciona la venta real. Se guarda el nombre y número del cliente y se descuenta exactamente <strong>1 venta</strong> de la meta del asesor.</p>
              <div className="commercial-form-two">
                <label>Asesor<select value={novedadForm.asesor_id} onChange={(e)=>setNovedadForm({...novedadForm, asesor_id:e.target.value, venta_id:""})}>
                  <option value="">Seleccionar asesor</option>
                  {usuariosAdmin.filter((u)=>u.rol === 'Asesor').map((u)=><option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select></label>
                <label>Fecha de la venta<input type="date" value={novedadForm.fecha} readOnly /></label>
              </div>
              <label>Venta a descontar
                <select value={novedadForm.venta_id} onChange={(e)=>seleccionarVentaParaDescuento(e.target.value)} disabled={!novedadForm.asesor_id || cargandoVentasDescuento}>
                  <option value="">{cargandoVentasDescuento ? "Cargando ventas..." : "Seleccionar venta del asesor"}</option>
                  {ventasParaDescuento.map((v)=>(
                    <option key={v.id} value={v.id}>
                      #{v.id} · {v.nombre_cliente} · {v.numero_portar || "Sin número"} · {v.fecha_activacion || ""}
                    </option>
                  ))}
                </select>
              </label>
              {novedadForm.venta_id && (() => {
                const venta = ventasParaDescuento.find((v) => Number(v.id) === Number(novedadForm.venta_id));
                return venta ? (
                  <div className="commercial-sale-preview">
                    <div><span>CLIENTE</span><strong>{venta.nombre_cliente || "—"}</strong></div>
                    <div><span>NÚMERO</span><strong>{venta.numero_portar || "—"}</strong></div>
                    <div><span>PRODUCTO</span><strong>{venta.producto || "—"}</strong></div>
                    <div><span>ESTADO</span><strong>{venta.estado || "—"}</strong></div>
                  </div>
                ) : null;
              })()}
              <div className="commercial-form-two">
                <label>Tipo<select value={novedadForm.tipo} disabled><option>Caída por titular</option></select></label>
                <label>Descuento<input type="number" value="1" readOnly /></label>
              </div>
              <label>Motivo del descuento<input type="text" placeholder="Ej. Venta caída por titular" value={novedadForm.motivo} onChange={(e)=>setNovedadForm({...novedadForm, motivo:e.target.value})}/></label>
              <label>Observación<textarea rows="2" placeholder="Detalle adicional de la caída, si aplica" value={novedadForm.observacion} onChange={(e)=>setNovedadForm({...novedadForm, observacion:e.target.value})}/></label>
              <button className="btn-primary commercial-save-btn" onClick={guardarNovedadComercial}>↘ Descontar 1 venta</button>
            </div>
          </div>

          <div className="commercial-admin-card commercial-novelties-card">
            <div className="commercial-card-title"><div><h3>📋 Novedades registradas</h3><span>Los descuentos activos se reflejan automáticamente en la meta ajustada.</span></div><b>{novedadesComerciales.length}</b></div>
            <div className="commercial-novelties-table">
              <div className="commercial-novelties-head"><span>ASESOR</span><span>CLIENTE</span><span>NÚMERO</span><span>FECHA</span><span>MOTIVO</span><span>DESCUENTO</span><span></span></div>
              {novedadesComerciales.map((n)=><div className="commercial-novelties-row" key={n.id}><span>{nombreAsesor(n.asesor_id)}</span><span className="commercial-client-cell">{n.cliente_nombre || "—"}</span><span>{n.cliente_numero || "—"}</span><span>{n.fecha}</span><span title={n.motivo}>{n.motivo}</span><span className="discount-value">-{n.descuento}</span><button onClick={()=>eliminarNovedadComercial(n.id)}>Eliminar</button></div>)}
              {novedadesComerciales.length === 0 && <div className="commercial-empty">No hay novedades para este mes.</div>}
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================
          MODAL CREAR / EDITAR USUARIO
      ====================================================== */}

      {mostrarFormularioUsuario && (

        <div className="modal-overlay">

          <div className="modal-box">

            <div className="modal-header">

              <div>

                <h2>
                  {usuarioEditando
                    ? "Editar usuario"
                    : "Nuevo usuario"}
                </h2>

                <p>
                  {usuarioEditando
                    ? "Actualiza la información del usuario"
                    : "Crea un nuevo usuario para el sistema"}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={
                  cerrarFormulario
                }
              >
                ×
              </button>

            </div>

            <div className="modal-body">

              <label>
                Usuario
              </label>

              <input
                type="text"
                placeholder="Ej: juan.perez"
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
              />

              <label>
                Nombre completo
              </label>

              <input
                type="text"
                placeholder="Nombre completo"
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
              />

              {/* CONTRASEÑA SOLO AL CREAR */}

              {!usuarioEditando && (

                <>

                  <label>
                    Contraseña
                  </label>

                  <input
                    type="password"
                    placeholder="Contraseña"
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
                  />

                </>

              )}

              <label>
                Cédula del usuario
              </label>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 1075318490"
                value={formUsuario.cedula}
                onChange={(e) =>
                  setFormUsuario({
                    ...formUsuario,
                    cedula: e.target.value.replace(/\D/g, ""),
                  })
                }
              />

              <label>
                Rol
              </label>

              <select
                value={
                  formUsuario.rol
                }
                onChange={(e) =>
                  setFormUsuario({
                    ...formUsuario,
                    rol:
                      e.target.value,
                  })
                }
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

              {esSuperAdmin && formUsuario.rol === "Asesor" && (
                <>
                  <label>Sala asignada al asesor</label>
                  <select
                    value={formUsuario.sala || "Sala 1"}
                    onChange={(e) => setFormUsuario({ ...formUsuario, sala: e.target.value })}
                  >
                    <option value="Sala 1">Sala 1</option>
                    <option value="Sala 2">Sala 2</option>
                    <option value="Sala 3">Sala 3</option>
                    <option value="Sala 4">Sala 4</option>
                  </select>
                </>
              )}

            </div>

            <div className="modal-footer">

              <button
                className="btn-secondary"
                onClick={
                  cerrarFormulario
                }
              >
                Cancelar
              </button>

              <button
                className="btn-primary"
                onClick={
                  guardarUsuario
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
      ====================================================== */}

      {usuarioPassword && (

        <div className="modal-overlay">

          <div className="modal-box password-modal">

            <div className="modal-header">

              <div>

                <h2>
                  Cambiar contraseña
                </h2>

                <p>
                  Actualiza la contraseña del usuario
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() => {

                  setUsuarioPassword(
                    null
                  );

                  setNuevaPassword(
                    ""
                  );

                }}
              >
                ×
              </button>

            </div>

            {/* USUARIO */}

            <div className="password-user">

              <div className="user-avatar advisor">

                {usuarioPassword.nombre
                  ? usuarioPassword.nombre
                      .charAt(0)
                      .toUpperCase()
                  : "U"}

              </div>

              <div>

                <strong>
                  {usuarioPassword.nombre}
                </strong>

                <small>
                  @{usuarioPassword.usuario}
                </small>

              </div>

            </div>

            {/* NUEVA CONTRASEÑA */}

            <div className="modal-body">

              <label>
                Nueva contraseña
              </label>

              <input
                type="password"
                placeholder="Nueva contraseña"
                value={
                  nuevaPassword
                }
                onChange={(e) =>
                  setNuevaPassword(
                    e.target.value
                  )
                }
                autoFocus
              />

            </div>

            {/* BOTONES */}

            <div className="modal-footer">

              <button
                className="btn-secondary"
                onClick={() => {

                  setUsuarioPassword(
                    null
                  );

                  setNuevaPassword(
                    ""
                  );

                }}
              >
                Cancelar
              </button>

              <button
                className="btn-primary"
                onClick={
                  cambiarPassword
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

export default Administration;

