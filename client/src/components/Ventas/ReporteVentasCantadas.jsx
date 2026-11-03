import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Ventas.css";

const fechaLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export default function ReporteVentasCantadas({ usuario }) {
  const [fecha, setFecha] = useState(fechaLocal());
  const [sala, setSala] = useState("SALA 1");
  const [cantidad, setCantidad] = useState("0");
  const [observacion, setObservacion] = useState("");
  const [historial, setHistorial] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarHistorial() {
    if (!usuario?.id) return;
    const { data, error: err } = await supabase
      .from("ventas_cantadas_diarias")
      .select("id,fecha,sala,cantidad,observacion,updated_at")
      .eq("asesor_id", Number(usuario.id))
      .order("fecha", { ascending: false })
      .limit(30);
    if (err) {
      setError(`No se pudo cargar tu historial. Ejecuta primero el SQL de configuración. ${err.message}`);
      return;
    }
    setHistorial(data || []);
  }

  useEffect(() => { cargarHistorial(); }, [usuario?.id]);

  async function guardar(event) {
    event.preventDefault();
    setError("");
    setMensaje("");
    const valor = Number(cantidad);
    if (!usuario?.id) return setError("No se pudo identificar el usuario.");
    if (!fecha || fecha > fechaLocal()) return setError("Selecciona una fecha válida, no futura.");
    if (!Number.isInteger(valor) || valor < 0) return setError("La cantidad debe ser un número entero mayor o igual a cero.");

    setGuardando(true);
    try {
      const { error: err } = await supabase
        .from("ventas_cantadas_diarias")
        .upsert({
          asesor_id: Number(usuario.id),
          fecha,
          sala,
          cantidad: valor,
          observacion: observacion.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "asesor_id,fecha" });
      if (err) throw err;
      setMensaje("Reporte diario guardado. Si vuelves a reportar esa fecha, se actualizará el registro sin duplicarlo.");
      await cargarHistorial();
    } catch (e) {
      setError(e?.message || "No fue posible guardar el reporte.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="ventas-page">
      <div className="ventas-header">
        <div>
          <span className="ventas-kicker">GESTIÓN COMERCIAL · REPORTE DIARIO</span>
          <h1>Ventas cantadas</h1>
          <p>Reporta cuántas ventas cantaste en la fecha seleccionada. Este reporte se muestra separado del acumulado de ventas aprobadas.</p>
        </div>
      </div>

      <div className="ventas-panel" style={{maxWidth: 850, margin: "0 auto"}}>
        <form className="venta-form" onSubmit={guardar}>
          <div className="venta-form-top">
            <div>
              <strong>📊 Reporte de ventas cantadas</strong>
              <span>Un reporte por asesor y fecha. Puedes corregirlo posteriormente; no se duplicará.</span>
            </div>
          </div>
          <div className="venta-grid">
            <Field label="Fecha del reporte" required>
              <input type="date" value={fecha} max={fechaLocal()} onChange={(e) => setFecha(e.target.value)} required />
            </Field>
            <Field label="Sala" required>
              <select value={sala} onChange={(e) => setSala(e.target.value)} required>
                <option value="SALA 1">Sala 1</option>
                <option value="SALA 2">Sala 2</option>
                <option value="SALA 3">Sala 3</option>
              </select>
            </Field>
            <Field label="Cantidad de ventas cantadas" required>
              <input type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
            </Field>
            <Field label="Observación (opcional)">
              <input type="text" maxLength="500" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. ventas reportadas del turno" />
            </Field>
          </div>
          {error && <div className="dashboard-error" role="alert">{error}</div>}
          {mensaje && <div className="dashboard-success" role="status">{mensaje}</div>}
          <div className="venta-form-actions">
            <button className="venta-btn primary" type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar reporte"}</button>
          </div>
        </form>
      </div>

      <div className="ventas-panel" style={{marginTop: 18}}>
        <div className="ventas-period-title"><strong>Mis últimos reportes</strong><button className="venta-btn secondary" type="button" onClick={cargarHistorial}>↻ Actualizar</button></div>
        {historial.length === 0 ? <p>No hay reportes registrados todavía.</p> : (
          <div className="ventas-table-wrap">
            <table className="ventas-table">
              <thead><tr><th>Fecha</th><th>Sala</th><th>Cantadas reportadas</th><th>Observación</th><th>Última actualización</th></tr></thead>
              <tbody>{historial.map((row) => <tr key={row.id}><td>{row.fecha}</td><td>{row.sala}</td><td><strong>{row.cantidad}</strong></td><td>{row.observacion || "—"}</td><td>{row.updated_at ? new Date(row.updated_at).toLocaleString("es-CO") : "—"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, required = false, children }) {
  return <label className="venta-field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}
