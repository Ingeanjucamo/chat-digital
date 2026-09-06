import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Administration.css";

function Administration({ usuario, onUsuariosActualizados }) {
  const [usuariosAdmin, setUsuariosAdmin] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoAdmin, setCargandoAdmin] = useState(true);

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

  // =========================================================
  // CARGAR USUARIOS
  // =========================================================

  const cargarUsuarios = async () => {
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
    });
  };

  // =========================================================
  // CREAR / EDITAR USUARIO
  // =========================================================

  const guardarUsuario = async () => {
    try {
      if (
        !formUsuario.usuario.trim() ||
        !formUsuario.nombre.trim()
      ) {
        alert("Usuario y nombre son obligatorios.");
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
              rol: formUsuario.rol,
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
            rol: formUsuario.rol,
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
  if (u.esSuperAdmin) {
    alert("El SuperAdmin no puede ser eliminado.");
    return;
  }

  const confirmar = window.confirm(
    `¿Seguro que deseas ELIMINAR a ${u.nombre}?\n\n` +
    `El usuario perderá completamente el acceso al sistema.\n` +
    `Los mensajes del chat se conservarán.`
  );

  if (!confirmar) {
    return;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("La sesión no es válida.");
    }

    const respuesta = await fetch(
      "https://frghtzsodaivkxbzzbnk.supabase.co/functions/v1/admin-delete-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " + session.access_token,
        },
        body: JSON.stringify({
          usuario_id: u.id,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
          "No se pudo eliminar el usuario."
      );
    }

    await cargarUsuarios();

    if (onUsuariosActualizados) {
      await onUsuariosActualizados();
    }

    alert("Usuario eliminado correctamente.");
  } catch (error) {
    console.error(
      "ERROR ELIMINANDO USUARIO:",
      error
    );

    alert(
      error.message ||
        "No se pudo eliminar el usuario."
    );
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
              Gestiona asesores y administradores
            </p>

          </div>

          <span className="users-count">
            {usuariosAdmin.length} usuarios
          </span>

        </div>

        {/* ===================================================
            CARGANDO
        ==================================================== */}

        {cargandoAdmin ? (

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
                          u.rol ===
                          "Administrador"
                            ? "admin"
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
                          u.rol ===
                          "Administrador"
                            ? "admin"
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

                    {!u.esSuperAdmin ? (

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

                        <button
  className="btn-action delete"
  onClick={() => eliminarUsuario(u)}
>
  🗑️ Eliminar
</button>

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

        )}

      </div>

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

                <option value="Administrador">
                  Administrador
                </option>

              </select>

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

