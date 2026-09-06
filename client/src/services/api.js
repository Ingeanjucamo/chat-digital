import { supabase } from "../lib/supabase";

export async function iniciarLogin(usuario, password) {
  const usuarioLimpio = usuario.trim();

  // =========================================================
  // BUSCAR USUARIO
  // =========================================================

  const { data: perfil, error: errorPerfil } =
    await supabase
      .from("usuarios")
      .select("*")
      .eq("usuario", usuarioLimpio)
      .single();

  if (errorPerfil) {
    console.error(
      "ERROR REAL SUPABASE:",
      errorPerfil
    );

    throw new Error(
      "Usuario o contraseña incorrectos"
    );
  }

  if (!perfil) {
    throw new Error(
      "Usuario o contraseña incorrectos"
    );
  }

  // =========================================================
  // BLOQUEAR USUARIO DESACTIVADO
  // =========================================================

  if (perfil.activo === false) {
    throw new Error(
      "Tu usuario está desactivado. Comunícate con el administrador."
    );
  }

  // =========================================================
  // AUTENTICACIÓN SUPABASE
  // =========================================================

  const emailAuth =
    `${perfil.usuario}@chat-digital.online`;

  const {
    data: authData,
    error: errorAuth,
  } =
    await supabase.auth.signInWithPassword({
      email: emailAuth,
      password,
    });

  if (errorAuth || !authData.user) {
    throw new Error(
      "Usuario o contraseña incorrectos"
    );
  }

  // =========================================================
  // VALIDAR QUE EL AUTH CORRESPONDA AL PERFIL
  // =========================================================

  if (
    perfil.auth_user_id &&
    authData.user.id !== perfil.auth_user_id
  ) {
    await supabase.auth.signOut();

    throw new Error(
      "La sesión de Supabase no corresponde con este usuario. Cierra sesión y vuelve a ingresar."
    );
  }

  // =========================================================
  // DEVOLVER USUARIO
  // =========================================================

  return {
    usuario: perfil,
  };
}

