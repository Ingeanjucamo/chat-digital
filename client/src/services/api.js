const API = `http://${window.location.hostname}:3000`;

export async function obtenerUsuarios() {
  const respuesta = await fetch(`${API}/api/usuarios`);

  if (!respuesta.ok) {
    throw new Error("No se pudieron cargar los usuarios");
  }

  return respuesta.json();
}

export async function iniciarLogin(usuario, password) {
  const respuesta = await fetch(`${API}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      usuario: usuario.trim(),
      password,
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || "Usuario o contraseña incorrectos");
  }

  return datos;
}

export async function obtenerUsuariosAdministracion(usuarioId) {
  const respuesta = await fetch(
    `${API}/api/administracion/usuarios`,
    {
      headers: {
        "x-usuario-id": String(usuarioId),
      },
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error || "No se pudieron cargar los usuarios"
    );
  }

  return datos;
}

export { API };