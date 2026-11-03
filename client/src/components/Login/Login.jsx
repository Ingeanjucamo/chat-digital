import React, { useState } from "react";

function Login({
  loginUsuario,
  setLoginUsuario,
  loginPassword,
  setLoginPassword,
  errorLogin,
  iniciarSesion,
  estilos,
}) {
  const [mostrarPassword, setMostrarPassword] = useState(false);

  return (
    <main className="login-page amv-login-screen" style={estilos.loginPagina}>
      <section className="login-showcase amv-login-brand">
        <div className="login-logo-wrap amv-logo-transparent">
          <img src="/amv-logo.png" alt="Logo AMV" className="login-logo" />
        </div>
        <div className="login-showcase-title">AMV</div>
        <div className="login-showcase-subtitle">CRM &amp; SOFTWARE</div>
        <p className="login-showcase-slogan">Gestiona, conecta y haz crecer tu negocio.</p>
      </section>

      <section className="login-card amv-login-panel" style={estilos.loginCaja}>
        <div className="login-heading amv-login-heading">
          <h1 style={estilos.loginTitulo}>Iniciar sesión</h1>
        </div>
        <form onSubmit={iniciarSesion} className="amv-login-form">
          <label className="amv-visually-hidden" htmlFor="amv-username">Usuario</label>
          <div className="amv-input-wrap">
            <span className="amv-input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/></svg>
            </span>
            <input id="amv-username" type="text" placeholder="Usuario" value={loginUsuario}
              onChange={(e) => setLoginUsuario(e.target.value)} style={{ ...estilos.input, paddingLeft: "48px", paddingRight: "14px", textAlign: "left", background: "rgba(39,79,124,.88)", color: "#f5fbff", border: "1px solid rgba(170,223,255,.82)", marginBottom: 0, boxShadow: "inset 0 1px 5px rgba(0,0,0,.18)" }}
              autoComplete="username" required />
          </div>

          <label className="amv-visually-hidden" htmlFor="amv-password">Contraseña</label>
          <div className="amv-input-wrap">
            <span className="amv-input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/></svg>
            </span>
            <input id="amv-password" type={mostrarPassword ? "text" : "password"} placeholder="Contraseña"
              value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
              style={{ ...estilos.input, paddingLeft: "48px", paddingRight: "42px", textAlign: "left", background: "rgba(39,79,124,.88)", color: "#f5fbff", border: "1px solid rgba(170,223,255,.82)", marginBottom: 0, boxShadow: "inset 0 1px 5px rgba(0,0,0,.18)" }} autoComplete="current-password" required />
            <button type="button" className="amv-password-toggle" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setMostrarPassword((v) => !v)}>
              <svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>

          {errorLogin && <div className="amv-login-error" role="alert" style={estilos.error}>{errorLogin}</div>}
          <button type="submit" className="amv-login-submit" style={estilos.botonLogin}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3m12-9h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>
            INGRESAR
          </button>
        </form>
        <div className="login-copyright amv-login-footer">AMV CRM &amp; SOFTWARE</div>
      </section>
    </main>
  );
}

export default Login;
