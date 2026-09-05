import React from "react";

function Login({
  loginUsuario,
  setLoginUsuario,
  loginPassword,
  setLoginPassword,
  errorLogin,
  iniciarSesion,
  estilos,
}) {
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
              setLoginUsuario(e.target.value)
            }
            style={estilos.input}
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={loginPassword}
            onChange={(e) =>
              setLoginPassword(e.target.value)
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

export default Login;
