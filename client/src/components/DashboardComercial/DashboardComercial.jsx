import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./DashboardComercial.css";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function moneda(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numero(valor));
}

function porcentaje(valor) {
  return `${numero(valor).toFixed(1)}%`;
}

// Normaliza la vista de empresa para soportar tanto los nombres
// actuales de la vista como los nombres usados por versiones anteriores.
function normalizarEmpresa(row) {
  if (!row) return null;

  return {
    ...row,
    anio: row.anio,
    mes: row.mes,
    cantadas: numero(row.cantadas ?? row.ventas_cantadas),
    meta: numero(row.meta ?? row.meta_general),
    faltan: numero(row.faltan ?? row.faltan_para_meta),
    cumplimiento: numero(row.cumplimiento ?? row.cumplimiento_pct),
    presupuesto_diario: numero(row.presupuesto_diario),
    presupuesto_mensual: numero(row.presupuesto_mensual),
  };
}

/**
 * Supabase normalmente devuelve boolean para es_habil, pero esta función
 * también acepta 1/0 y "true"/"false" para evitar que el calendario
 * quede en cero por diferencias de serialización.
 */
function esDiaHabil(row) {
  const valor = row?.es_habil;

  return (
    valor === true ||
    valor === 1 ||
    String(valor).toLowerCase() === "true"
  );
}

/**
 * Devuelve YYYY-MM-DD usando la fecha LOCAL del computador.
 * Evita problemas de zona horaria con new Date("YYYY-MM-DD").
 */
function fechaLocalKey(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function esMesActual(anio, mes) {
  const hoy = new Date();

  return (
    hoy.getFullYear() === Number(anio) &&
    hoy.getMonth() + 1 === Number(mes)
  );
}

function esMesPasado(anio, mes) {
  const hoy = new Date();

  const actual = hoy.getFullYear() * 100 + (hoy.getMonth() + 1);
  const seleccionado = Number(anio) * 100 + Number(mes);

  return seleccionado < actual;
}

function primerDiaMes(anio, mes) {
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}

function ultimoDiaMes(anio, mes) {
  const fecha = new Date(Number(anio), Number(mes), 0);
  return fechaLocalKey(fecha);
}

function normalizarFechaVenta(venta) {
  // Las cantadas pertenecen al día en que se gestionó/registró la venta,
  // NO al día de activación. Una venta registrada en septiembre puede activarse
  // en octubre y no debe contarse como una cantada de octubre.
  if (venta?.fecha_llamada) {
    return String(venta.fecha_llamada).slice(0, 10);
  }

  if (venta?.created_at) {
    return String(venta.created_at).slice(0, 10);
  }

  // Solo para registros antiguos que no tengan fecha de llamada ni creación.
  if (venta?.fecha_activacion) {
    return String(venta.fecha_activacion).slice(0, 10);
  }

  return null;
}

function estadoVentaAprobada(venta) {
  return String(venta?.estado || "").trim().toUpperCase() === "APROBADA";
}

// El acumulado comercial incluye toda venta cargada, independientemente
// del estado de revisión: APROBADA, PENDIENTE, RECHAZADA o POR_CORREGIR.
function contarVentasCargadas(ventas, asesorId, desde, hasta) {
  return (ventas || []).filter((venta) => {
    const fecha = normalizarFechaVenta(venta);
    return Number(venta.asesor_id) === Number(asesorId) &&
      fecha && fecha >= desde && fecha <= hasta;
  }).length;
}

function contarCantadasReportadas(reportes, asesorId, desde, hasta, salaFiltro = "TODAS") {
  return (reportes || []).filter((r) => {
    const fecha = String(r.fecha || "").slice(0, 10);
    return Number(r.asesor_id) === Number(asesorId) && fecha >= desde && fecha <= hasta &&
      (salaFiltro === "TODAS" || r.sala === salaFiltro);
  }).reduce((sum, r) => sum + numero(r.cantidad), 0);
}

export default function DashboardComercial({ usuario }) {
  const hoy = new Date();

  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [asesores, setAsesores] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [calendario, setCalendario] = useState(null);
  const [ventasCantadas, setVentasCantadas] = useState([]);
  const [reportesCantadasDiarias, setReportesCantadasDiarias] = useState([]);
  const [metasConfiguradas, setMetasConfiguradas] = useState([]);
  const [novedadesComerciales, setNovedadesComerciales] = useState([]);

  const [fechaDesde, setFechaDesde] = useState(
    primerDiaMes(hoy.getFullYear(), hoy.getMonth() + 1)
  );
  const [fechaHasta, setFechaHasta] = useState(
    esMesActual(hoy.getFullYear(), hoy.getMonth() + 1)
      ? fechaLocalKey(hoy)
      : ultimoDiaMes(hoy.getFullYear(), hoy.getMonth() + 1)
  );
  const [salaFiltro, setSalaFiltro] = useState("TODAS");
  const [asesorFiltro, setAsesorFiltro] = useState("TODOS");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const esSuperAdmin =
    usuario?.esSuperAdmin === true ||
    usuario?.es_super_admin === true;

  const esGestion =
    usuario?.rol === "Administrador" ||
    usuario?.rol === "Supervisor" ||
    esSuperAdmin;

  /**
   * ============================================================
   * CARGAR DASHBOARD
   * ============================================================
   */
  // Al cambiar de mes/año, el rango se mueve automáticamente al período elegido.
  useEffect(() => {
    const inicio = primerDiaMes(anio, mes);
    const fin = esMesActual(anio, mes) ? fechaLocalKey(new Date()) : ultimoDiaMes(anio, mes);
    setFechaDesde(inicio);
    setFechaHasta(fin);
    setSalaFiltro("TODAS");
    setAsesorFiltro("TODOS");
  }, [anio, mes]);

  async function cargarDashboard() {
    setCargando(true);
    setError("");

    try {
      /**
       * IMPORTANTE:
       * calendario_comercial tiene UNA FILA POR CADA DÍA.
       *
       * Por eso NO usamos maybeSingle().
       */
      const [asesoresResp, empresaResp, calendarioResp, ventasResp, reportesCantadasResp, metasResp, novedadesResp] =
        await Promise.all([
          supabase
            .from("vw_dashboard_asesores")
            .select("*")
            .eq("anio", anio)
            .eq("mes", mes)
            .order("nombre_asesor", { ascending: true }),

          supabase
            .from("vw_dashboard_empresa")
            .select("*")
            .eq("anio", anio)
            .eq("mes", mes)
            .maybeSingle(),

          supabase
            .from("calendario_comercial")
            .select(
              "id,fecha,anio,mes,nombre_mes,dia,dia_semana,nombre_dia,semana,es_habil,meta_diaria,presupuesto_diario,es_festivo,observacion,fecha_inicio,fecha_fin"
            )
            .eq("anio", anio)
            .eq("mes", mes)
            .order("fecha", { ascending: true }),

          supabase
            .from("ventas")
            .select("id,asesor_id,sala,fecha_activacion,fecha_llamada,created_at,producto,estado,origen")
            .order("created_at", { ascending: true }),

          supabase
            .from("ventas_cantadas_diarias")
            .select("id,asesor_id,fecha,sala,cantidad,observacion")
            .gte("fecha", primerDiaMes(anio, mes))
            .lte("fecha", ultimoDiaMes(anio, mes))
            .order("fecha", { ascending: true }),

          // Estas tablas permiten que el SuperAdmin ajuste metas y novedades
          // sin tener que modificar manualmente las vistas del dashboard.
          supabase
            .from("metas_comerciales")
            .select("id,asesor_id,anio,mes,meta,activo")
            .eq("anio", anio)
            .eq("mes", mes),

          supabase
            .from("novedades_comerciales")
            .select("id,asesor_id,fecha,tipo,motivo,descuento,observacion,activo")
            .eq("anio", anio)
            .eq("mes", mes)
            .eq("activo", true),

        ]);

      if (asesoresResp.error) {
        throw asesoresResp.error;
      }

      if (empresaResp.error) {
        throw empresaResp.error;
      }

      if (calendarioResp.error) {
        throw calendarioResp.error;
      }

      if (ventasResp.error) {
        throw ventasResp.error;
      }
      if (reportesCantadasResp.error) {
        console.warn("ventas_cantadas_diarias no disponible; ejecuta VENTAS_CANTADAS_DIARIAS.sql:", reportesCantadasResp.error.message);
      }

      // Son tablas de configuración opcionales para conservar compatibilidad
      // con instalaciones anteriores. Si aún no existen, el dashboard usa
      // las vistas actuales y no se cae.
      if (metasResp.error) console.warn("metas_comerciales no disponible:", metasResp.error.message);
      if (novedadesResp.error) console.warn("novedades_comerciales no disponible:", novedadesResp.error.message);

      let asesoresData = [...(asesoresResp.data || [])];
      const empresaData = normalizarEmpresa(empresaResp.data || null);
      const calendarioRows = calendarioResp.data || [];
      const ventasData = ventasResp.data || [];
      const reportesCantadasData = reportesCantadasResp.error ? [] : (reportesCantadasResp.data || []);
      const metasData = metasResp.error ? [] : (metasResp.data || []);
      const novedadesData = novedadesResp.error ? [] : (novedadesResp.data || []);

      // HISTORIAL POR MES:
      // - En el mes actual, los asesores retirados/archivados no aparecen en la tabla.
      // - En meses anteriores, se reconstruye su fila desde usuarios + ventas + meta,
      //   para conservar el histórico sin reactivar la cuenta ni mostrarla en Conversaciones.
      if (esGestion && esMesPasado(anio, mes)) {
        const { data: perfilesHistoricos, error: perfilesHistoricosError } = await supabase
          .from("usuarios")
          .select("id,nombre,usuario,rol,activo,eliminado")
          .eq("rol", "Asesor");

        if (perfilesHistoricosError) {
          console.warn("No fue posible consultar perfiles históricos:", perfilesHistoricosError.message);
        } else {
          const inicioPeriodo = primerDiaMes(anio, mes);
          const finPeriodo = ultimoDiaMes(anio, mes);
          const idsPresentes = new Set(asesoresData.map((a) => Number(a.asesor_id)));

          (perfilesHistoricos || []).forEach((perfil) => {
            const id = Number(perfil.id);
            const archivado = perfil.activo === false || perfil.eliminado === true;
            if (!archivado || idsPresentes.has(id)) return;

            const ventasPeriodoAsesor = ventasData.filter((v) => {
              const fecha = normalizarFechaVenta(v);
              return Number(v.asesor_id) === id && fecha && fecha >= inicioPeriodo && fecha <= finPeriodo;
            });
            const metaPeriodo = metasData.find((m) => Number(m.asesor_id) === id && Number(m.anio) === Number(anio) && Number(m.mes) === Number(mes));
            const tieneNovedad = novedadesData.some((n) => Number(n.asesor_id) === id);

            if (ventasPeriodoAsesor.length === 0 && !metaPeriodo && !tieneNovedad) return;

            asesoresData.push({
              asesor_id: id,
              nombre_asesor: perfil.nombre || perfil.usuario || "Asesor archivado",
              usuario: perfil.usuario,
              activo: false,
              eliminado: perfil.eliminado === true,
              mostrar: true,
              meta: numero(metaPeriodo?.meta),
              cantadas: ventasPeriodoAsesor.length,
              rechazadas: ventasPeriodoAsesor.filter((v) => String(v.estado || "").toUpperCase() === "RECHAZADA").length,
              pendientes: ventasPeriodoAsesor.filter((v) => String(v.estado || "").toUpperCase() === "PENDIENTE").length,
              por_corregir: ventasPeriodoAsesor.filter((v) => String(v.estado || "").toUpperCase().includes("CORREGIR")).length,
              descuento_porta: 0,
              descuento_migra: 0,
              descuento_hogar: 0,
            });
            idsPresentes.add(id);
          });
        }
      }

      // Fallback robusto: si la vista no devuelve asesores por RLS/vista,
      // consultamos directamente usuarios. Esto evita mostrar HC=0 y meta=0
      // cuando sí existen asesores activos en Administración.
      if (asesoresData.length === 0) {
        let perfilQuery = supabase
          .from("usuarios")
          .select("id,nombre,usuario,rol,activo")
          .eq("rol", "Asesor")
          .eq("activo", true)
          .order("nombre", { ascending: true });

        if (!esGestion && usuario?.id) {
          perfilQuery = perfilQuery.eq("id", Number(usuario.id));
        }

        const { data: perfilesDirectos, error: perfilesError } = await perfilQuery;
        if (!perfilesError && perfilesDirectos?.length) {
          asesoresData = perfilesDirectos.map((p) => ({
            asesor_id: p.id,
            nombre_asesor: p.nombre || p.usuario || "Asesor",
            usuario: p.usuario,
            activo: p.activo !== false,
            mostrar: true,
            meta: 0,
            cantadas: 0,
            rechazadas: 0,
            pendientes: 0,
            por_corregir: 0,
            descuento_porta: 0,
            descuento_migra: 0,
            descuento_hogar: 0,
          }));
        }
      }

      // Si es asesor y la vista sí devolvió filas pero no su propia fila,
      // intentamos completar el perfil directamente.
      if (!esGestion && usuario?.id && !asesoresData.some((a) => Number(a.asesor_id) === Number(usuario.id))) {
        const { data: perfilDirecto, error: perfilError } = await supabase
          .from("usuarios")
          .select("id,nombre,usuario,rol,activo")
          .eq("id", Number(usuario.id))
          .maybeSingle();
        if (!perfilError && perfilDirecto) {
          asesoresData.push({
            asesor_id: perfilDirecto.id,
            nombre_asesor: perfilDirecto.nombre || perfilDirecto.usuario || "Asesor",
            usuario: perfilDirecto.usuario,
            activo: perfilDirecto.activo !== false,
            mostrar: true,
            meta: 0,
            cantadas: 0,
            rechazadas: 0,
            pendientes: 0,
            por_corregir: 0,
            descuento_porta: 0,
            descuento_migra: 0,
            descuento_hogar: 0,
          });
        }
      }

      // Si Supabase devuelve cero filas aquí, no debemos convertir el
      // problema de permisos/RLS en un falso "0 días laborales".
      if (calendarioRows.length === 0) {
        throw new Error(
          `No se encontraron registros en calendario_comercial para ${mes}/${anio}. Verifica la política SELECT de la tabla para usuarios autenticados.`
        );
      }

      /**
       * ==========================================================
       * CALENDARIO
       * ==========================================================
       */

      const hoyKey = fechaLocalKey();

      const filasLaborales = calendarioRows.filter(esDiaHabil);

      const diasLaborales = filasLaborales.length;

      let diasLaborados = 0;
      let diasPendientes = 0;
      let diasDisponiblesDesdeHoy = 0;

      if (esMesPasado(anio, mes)) {
        /**
         * Mes ya terminado:
         * todos los días hábiles ya pasaron.
         */
        diasLaborados = diasLaborales;
        diasPendientes = 0;
        diasDisponiblesDesdeHoy = 0;
      } else if (esMesActual(anio, mes)) {
        /**
         * Mes actual:
         *
         * Laborados:
         * fecha <= hoy
         *
         * Pendientes:
         * fecha > hoy
         *
         * Disponibles desde hoy:
         * fecha >= hoy
         */
        diasLaborados = filasLaborales.filter(
          (d) => String(d.fecha) <= hoyKey
        ).length;

        diasPendientes = filasLaborales.filter(
          (d) => String(d.fecha) > hoyKey
        ).length;

        diasDisponiblesDesdeHoy = filasLaborales.filter(
          (d) => String(d.fecha) >= hoyKey
        ).length;
      } else {
        /**
         * Mes futuro:
         * todavía no ha comenzado.
         */
        diasLaborados = 0;
        diasPendientes = diasLaborales;
        diasDisponiblesDesdeHoy = diasLaborales;
      }

      const metaDiariaTotal = calendarioRows.reduce(
        (total, d) => total + numero(d.meta_diaria),
        0
      );

      // Presupuesto diario = valor del día seleccionado (o el promedio
      // de los días hábiles si todavía no hay una fecha concreta).
      const presupuestoDiarioTotal = calendarioRows.find(
        (d) => String(d.fecha) === hoyKey
      )?.presupuesto_diario ??
        filasLaborales[0]?.presupuesto_diario ??
        0;

      const presupuestoMensualTotal = calendarioRows.reduce(
        (total, d) => total + numero(d.presupuesto_diario),
        0
      );

      console.log("CALENDARIO COMERCIAL:", {
        anio,
        mes,
        filas: calendarioRows.length,
        diasLaborales,
        diasLaborados,
        diasPendientes,
        diasDisponiblesDesdeHoy,
      });

      setCalendario({
        dias_laborales: diasLaborales,
        dias_laborados: diasLaborados,
        dias_pendientes: diasPendientes,

        // Para calcular cuánto debe hacer por día.
        dias_disponibles_desde_hoy: diasDisponiblesDesdeHoy,

        meta_diaria: metaDiariaTotal,
        presupuesto_diario: numero(presupuestoDiarioTotal),
        presupuesto_mensual: numero(presupuestoMensualTotal),

        filas: calendarioRows,
      });

      setAsesores(asesoresData);
      setEmpresa(empresaData);
      setVentasCantadas(ventasData);
      setReportesCantadasDiarias(reportesCantadasData);
      setMetasConfiguradas(metasData);
      setNovedadesComerciales(novedadesData);

      // Ao trocar mês, o filtro diário acompanha automaticamente o mês selecionado.
      const inicioMes = primerDiaMes(anio, mes);
      const finMes = ultimoDiaMes(anio, mes);
      const hoySeleccionado = fechaLocalKey(new Date());
      const finInicial =
        esMesActual(anio, mes)
          ? hoySeleccionado
          : finMes;

      setFechaDesde((actual) =>
        actual < inicioMes || actual > finInicial ? inicioMes : actual
      );
      setFechaHasta((actual) =>
        actual < inicioMes || actual > finMes ? finInicial : actual
      );
    } catch (err) {
      console.error("Error dashboard comercial:", err);

      setError(
        err?.message ||
          "No fue posible cargar el dashboard."
      );

      setAsesores([]);
      setEmpresa(null);
      setCalendario(null);
      setVentasCantadas([]);
      setReportesCantadasDiarias([]);
      setMetasConfiguradas([]);
      setNovedadesComerciales([]);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDashboard();
  }, [anio, mes, usuario?.id]);

  /**
   * ============================================================
   * TABLA DE ASESORES + META CONFIGURADA
   * La meta que asigna SuperAdmin es la fuente de verdad.
   * ============================================================
   */

  const datosTabla = useMemo(() => {
    const metasMap = new Map(
      metasConfiguradas.map((m) => [Number(m.asesor_id), numero(m.meta)])
    );

    const novedadesMap = new Map();
    novedadesComerciales.forEach((n) => {
      const id = Number(n.asesor_id);
      novedadesMap.set(id, (novedadesMap.get(id) || 0) + Math.abs(numero(n.descuento)));
    });

    return asesores
      .filter((a) => a.mostrar !== false)
      .map((a) => {
        const id = Number(a.asesor_id);
        const metaBase = metasMap.has(id) ? metasMap.get(id) : 0;
        const descuentoVista =
          numero(a.descuento_porta) +
          numero(a.descuento_migra) +
          numero(a.descuento_hogar);
        const descuentoNovedades = novedadesMap.get(id) || 0;
        const descuento = descuentoVista + descuentoNovedades;
        const metaAjustada = Math.max(metaBase - descuento, 0);
        const inicioMesVentas = primerDiaMes(anio, mes);
        const finMesVentas = fechaHasta || ultimoDiaMes(anio, mes);
        const ventasAsesorMes = ventasCantadas.filter((v) => {
          const fechaVenta = normalizarFechaVenta(v);
          return Number(v.asesor_id) === id && fechaVenta && fechaVenta >= inicioMesVentas && fechaVenta <= finMesVentas;
        });
        const totalCargadasMes = ventasAsesorMes.length;
        const aprobadasMes = ventasAsesorMes.filter(estadoVentaAprobada).length;
        const pendientesMes = ventasAsesorMes.filter((v) => String(v.estado || "").toUpperCase() === "PENDIENTE").length;
        const rechazadasMes = ventasAsesorMes.filter((v) => String(v.estado || "").toUpperCase() === "RECHAZADA").length;
        const corregirMes = ventasAsesorMes.filter((v) => String(v.estado || "").toUpperCase() === "POR_CORREGIR").length;
        const cumplimiento =
          metaAjustada > 0
            ? (totalCargadasMes / metaAjustada) * 100
            : 0;

        return {
          ...a,
          cantadas: totalCargadasMes, // Acumulado: todas las ventas cargadas, sin importar estado.
          aprobadas: aprobadasMes,
          pendientes: pendientesMes,
          rechazadas: rechazadasMes,
          por_corregir: corregirMes,
          metaBase,
          metaAjustada,
          descuento,
          cumplimiento,
        };
      });
  }, [asesores, metasConfiguradas, novedadesComerciales, ventasCantadas, anio, mes, fechaHasta]);

  /**
   * ============================================================
   * DATOS DEL ASESOR
   * Usa la meta guardada por SuperAdmin, incluso con 0 ventas.
   * Las novedades activas reducen la meta; nunca la aumentan.
   * ============================================================
   */
  const misDatos = useMemo(() => {
    if (esGestion) return null;

    const base = datosTabla.find(
      (a) => Number(a.asesor_id) === Number(usuario?.id)
    );
    const metaConfigurada = metasConfiguradas.find(
      (m) => Number(m.asesor_id) === Number(usuario?.id) && m.activo !== false
    );

    // Para el asesor exigimos una configuración explícita del SuperAdmin.
    // Así nunca mostramos una meta genérica de la vista como si fuera oficial.
    if (!base || !metaConfigurada) return null;

    const desde = primerDiaMes(anio, mes);
    const hasta = fechaHasta || ultimoDiaMes(anio, mes);
    const cantadasReales = contarVentasCargadas(ventasCantadas, usuario?.id, desde, hasta);
    const reportadasCantadas = contarCantadasReportadas(reportesCantadasDiarias, usuario?.id, desde, hasta);

    return {
      ...base,
      cantadas: cantadasReales,
      ventas_cantadas_reportadas: reportadasCantadas,
      meta: numero(metaConfigurada.meta),
      meta_ajustada: base.metaAjustada,
      descuento_comercial: base.descuento,
    };
  }, [
    datosTabla,
    metasConfiguradas,
    esGestion,
    usuario?.id,
    ventasCantadas,
    reportesCantadasDiarias,
    anio,
    mes,
    fechaHasta,
  ]);

  /**
   * ============================================================
   * RESUMEN GENERAL
   * ============================================================
   */

  const resumen = useMemo(() => {
    const lista = datosTabla;

    const metaTabla = lista.reduce(
      (s, a) => s + a.metaAjustada,
      0
    );

    const cantadasTabla = lista.reduce(
      (s, a) => s + numero(a.cantadas),
      0
    );

    const metaBaseGeneral = lista.reduce(
      (s, a) => s + numero(a.metaBase),
      0
    );

    const descuentosGenerales = lista.reduce(
      (s, a) => s + numero(a.descuento),
      0
    );

    return {
      asesores: lista.filter(
        (a) => a.activo !== false
      ).length,

      // La suma de las metas configuradas es la meta general.
      // La meta general es exclusivamente la suma de las metas asignadas por SuperAdmin.
      meta: metaTabla,
      metaBase: metaBaseGeneral,
      descuentos: descuentosGenerales,
      cantadas: cantadasTabla,

      rechazadas: lista.reduce(
        (s, a) => s + numero(a.rechazadas),
        0
      ),

      pendientes: lista.reduce(
        (s, a) => s + numero(a.pendientes),
        0
      ),

      corregir: lista.reduce(
        (s, a) => s + numero(a.por_corregir),
        0
      ),
    };
  }, [datosTabla]);

  /**
   * ============================================================
   * VENTAS CANTADAS POR DÍA
   * Toda venta registrada cuenta como CANTADA, sin importar su estado.
   * La fecha principal es FECHA LLAMADA; si está vacía usamos created_at.
   * ============================================================
   */
  const ventasPorDia = useMemo(() => {
    const desde = fechaDesde || primerDiaMes(anio, mes);
    const hasta = fechaHasta || ultimoDiaMes(anio, mes);
    const inicioMes = primerDiaMes(anio, mes);

    const ventasFiltradas = ventasCantadas.filter((venta) => {
      if (venta.cargue_fin_semana === true) return false;
      const fecha = normalizarFechaVenta(venta);
      if (!fecha || fecha < desde || fecha > hasta) return false;
      if (salaFiltro !== "TODAS" && venta.sala !== salaFiltro) return false;
      if (asesorFiltro !== "TODOS" && Number(venta.asesor_id) !== Number(asesorFiltro)) return false;
      return true;
    });

    const porFecha = new Map();
    const porFechaMes = new Map();
    ventasCantadas.forEach((venta) => {
      if (venta.cargue_fin_semana === true) return;
      const fecha = normalizarFechaVenta(venta);
      if (!fecha || fecha < inicioMes || fecha > hasta) return;
      if (salaFiltro !== "TODAS" && venta.sala !== salaFiltro) return;
      if (asesorFiltro !== "TODOS" && Number(venta.asesor_id) !== Number(asesorFiltro)) return;
      porFechaMes.set(fecha, (porFechaMes.get(fecha) || 0) + 1);
      if (fecha >= desde) porFecha.set(fecha, (porFecha.get(fecha) || 0) + 1);
    });

    const filas = [];
    let cursor = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    let acumulado = 0;
    let cursorAcumulado = new Date(`${inicioMes}T00:00:00`);
    const limiteAcumulado = new Date(`${desde}T00:00:00`);
    while (cursorAcumulado < limiteAcumulado) {
      acumulado += porFechaMes.get(fechaLocalKey(cursorAcumulado)) || 0;
      cursorAcumulado.setDate(cursorAcumulado.getDate() + 1);
    }
    while (cursor <= fin) {
      const fecha = fechaLocalKey(cursor);
      const cargadas = porFecha.get(fecha) || 0;
      acumulado += cargadas;
      filas.push({ fecha, cantadas: cargadas, acumulado });
      cursor.setDate(cursor.getDate() + 1);
    }
    return { filas, total: ventasFiltradas.length };
  }, [ventasCantadas, fechaDesde, fechaHasta, salaFiltro, asesorFiltro, anio, mes]);

  const ventasPeriodo = useMemo(() => {
    const desde = fechaDesde || primerDiaMes(anio, mes);
    const hasta = fechaHasta || ultimoDiaMes(anio, mes);

    return ventasCantadas.filter((venta) => {
      const fecha = normalizarFechaVenta(venta);
      if (!fecha || fecha < desde || fecha > hasta) return false;
      if (salaFiltro !== "TODAS" && venta.sala !== salaFiltro) return false;
      if (asesorFiltro !== "TODOS" && Number(venta.asesor_id) !== Number(asesorFiltro)) return false;
      return true;
    });
  }, [ventasCantadas, fechaDesde, fechaHasta, salaFiltro, asesorFiltro, anio, mes]);

  // Acumulado mensual: siempre empieza en el primer día del mes y llega
  // hasta la fecha final seleccionada. Así el filtro por día no reinicia
  // el acumulado.
  const estadisticasAsesores = useMemo(() => {
    const finAcumulado = fechaHasta || ultimoDiaMes(anio, mes);
    const inicioMes = primerDiaMes(anio, mes);
    const mapa = new Map();

    ventasCantadas.forEach((venta) => {
      const fecha = normalizarFechaVenta(venta);
      if (!fecha || fecha < inicioMes || fecha > finAcumulado) return;
      if (salaFiltro !== "TODAS" && venta.sala !== salaFiltro) return;
      if (asesorFiltro !== "TODOS" && Number(venta.asesor_id) !== Number(asesorFiltro)) return;

      const id = Number(venta.asesor_id);
      const actual = mapa.get(id) || { acumulado: 0, porEstado: {} };
      const estado = String(venta.estado || "PENDIENTE").toUpperCase();
      actual.acumulado += 1; // Contar toda venta cargada, aun si está en revisión/rechazada/corrección.
      actual.porEstado[estado] = (actual.porEstado[estado] || 0) + 1;
      mapa.set(id, actual);
    });

    return mapa;
  }, [ventasCantadas, ventasPeriodo, fechaHasta, anio, mes, salaFiltro, asesorFiltro]);

  // Acumulado mensual hasta la fecha final seleccionada.
  // Se declara antes de resumenPeriodo para evitar accesos a una const
  // todavía no inicializada durante el render.
  const acumuladoSeleccion = Array.from(estadisticasAsesores.values()).reduce(
    (s, a) => s + a.acumulado,
    0
  );

  const resumenPeriodo = useMemo(() => {
    const activos = datosTabla.filter((a) => a.activo !== false);
    const cantadas = ventasPeriodo.length; // ventas realmente cargadas al sistema, sin filtrar por estado
    const rechazadas = ventasPeriodo.filter((v) => String(v.estado).toUpperCase() === "RECHAZADA").length;
    const pendientes = ventasPeriodo.filter((v) => String(v.estado).toUpperCase() === "PENDIENTE").length;
    // El cumplimiento del dashboard es acumulado hasta la fecha final
    // seleccionada. Así, si el usuario filtra un solo día, las
    // "Cantadas del día" cambian, pero el cumplimiento no pierde el
    // histórico de los días anteriores del mismo mes.
    const acumulado = acumuladoSeleccion;
    const cumplimiento = resumen.meta > 0 ? (acumulado / resumen.meta) * 100 : 0;
    return {
      activos: activos.length,
      cantadas,
      acumulado,
      rechazadas,
      pendientes,
      cumplimiento,
    };
  }, [datosTabla, ventasPeriodo, resumen.meta, estadisticasAsesores, fechaDesde, fechaHasta, anio, mes, salaFiltro, asesorFiltro]);

  useEffect(() => {
    // Si el usuario escoge un rango invertido, lo corregimos de forma segura.
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      setFechaHasta(fechaDesde);
    }
  }, [fechaDesde, fechaHasta]);

  /**
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (cargando) {
    return (
      <section className="dashboard-comercial">
        <div className="dashboard-loading">
          Cargando dashboard comercial...
        </div>
      </section>
    );
  }

  /**
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (error) {
    return (
      <section className="dashboard-comercial">
        <div className="dashboard-error">
          <b>No se pudo cargar el dashboard.</b>

          <span>{error}</span>

          <button onClick={cargarDashboard}>
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  const presupuestoSeleccionado = numero(
    calendario?.filas?.find((d) => String(d.fecha) === String(fechaHasta))?.presupuesto_diario ??
    calendario?.presupuesto_diario
  );

  // Indicadores de ritmo comercial: cuánto se debe vender por día para
  // alcanzar la meta, usando únicamente los días marcados como hábiles
  // en calendario_comercial.
  const faltanMetaTotal = Math.max(resumen.meta - acumuladoSeleccion, 0);
  const diasDisponiblesRitmo = numero(calendario?.dias_disponibles_desde_hoy);
  const metaDiariaNecesariaTotal = diasDisponiblesRitmo > 0
    ? Math.ceil(faltanMetaTotal / diasDisponiblesRitmo)
    : 0;
  const metaDiariaNecesariaAsesor = resumenPeriodo.activos > 0
    ? Math.ceil(metaDiariaNecesariaTotal / resumenPeriodo.activos)
    : 0;
  const ritmoActualTotal = numero(calendario?.dias_laborados) > 0
    ? acumuladoSeleccion / numero(calendario?.dias_laborados)
    : 0;
  const proyeccionTotal = numero(calendario?.dias_laborales) > 0 && numero(calendario?.dias_laborados) > 0
    ? Math.round(ritmoActualTotal * numero(calendario?.dias_laborales))
    : acumuladoSeleccion;

  // Reporte operativo diario: cantadas reportadas para el día seleccionado
  // y promedio por día laborado en el período (no confundir con aprobadas).
  const fechaReporteDiario = fechaHasta || fechaLocalKey(hoy);
  const ventasReportadasDia = reportesCantadasDiarias
    .filter((r) => String(r.fecha || "").slice(0, 10) === fechaReporteDiario)
    .filter((r) => salaFiltro === "TODAS" || r.sala === salaFiltro)
    .filter((r) => asesorFiltro === "TODOS" || Number(r.asesor_id) === Number(asesorFiltro))
    .reduce((sum, r) => sum + numero(r.cantidad), 0);

  const desdePeriodoReporte = fechaDesde || primerDiaMes(anio, mes);
  const reportesEnPeriodo = reportesCantadasDiarias
    .filter((r) => {
      const fecha = String(r.fecha || "").slice(0, 10);
      return fecha >= desdePeriodoReporte && fecha <= fechaReporteDiario &&
        (salaFiltro === "TODAS" || r.sala === salaFiltro) &&
        (asesorFiltro === "TODOS" || Number(r.asesor_id) === Number(asesorFiltro));
    })
    .reduce((sum, r) => sum + numero(r.cantidad), 0);

  const diasConReporte = new Set(reportesCantadasDiarias
    .filter((r) => {
      const fecha = String(r.fecha || "").slice(0, 10);
      return fecha >= desdePeriodoReporte && fecha <= fechaReporteDiario &&
        (salaFiltro === "TODAS" || r.sala === salaFiltro) &&
        (asesorFiltro === "TODOS" || Number(r.asesor_id) === Number(asesorFiltro));
    })
    .map((r) => String(r.fecha || "").slice(0, 10))).size;

  const promedioCantadasDia = diasConReporte > 0
    ? (reportesEnPeriodo / diasConReporte)
    : 0;


  /**
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <section className="dashboard-comercial">
      <header className="dashboard-header">
        <div>
          <div className="dashboard-kicker">
            GESTIÓN COMERCIAL
          </div>

          <h1>
            {esGestion
              ? "Dashboard Comercial"
              : "Mi meta comercial"}
          </h1>

          <p>
            Seguimiento de metas, ventas cantadas,
            cumplimiento y proyección.
          </p>
        </div>

        <div className="dashboard-filtros">
          <select
            value={mes}
            onChange={(e) =>
              setMes(Number(e.target.value))
            }
          >
            {MESES.map((nombre, index) => (
              <option
                key={nombre}
                value={index + 1}
              >
                {nombre}
              </option>
            ))}
          </select>

          <select
            value={anio}
            onChange={(e) =>
              setAnio(Number(e.target.value))
            }
          >
            {[2026, 2027, 2028].map((valor) => (
              <option
                key={valor}
                value={valor}
              >
                {valor}
              </option>
            ))}
          </select>

          <button onClick={cargarDashboard}>
            ↻ Actualizar
          </button>
        </div>
      </header>

      {esGestion ? (
        <>
          {/* =====================================================
              FILTROS COMERCIALES
          ===================================================== */}
          <div className="commercial-filter-panel">
            <div className="filter-heading">
              <div>
                <strong>📅 Análisis de ventas</strong>
                <span>Filtra por día, rango, sala o asesor. El acumulado siempre conserva el histórico del mes.</span>
              </div>
              <div className="filter-total">
                <small>Cantadas en selección</small>
                <b>{resumenPeriodo.cantadas}</b>
              </div>
            </div>
            <div className="commercial-filters">
              <label><span>Desde</span><input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} /></label>
              <label><span>Hasta</span><input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} /></label>
              {esGestion && <label><span>Sala</span><select value={salaFiltro} onChange={(e) => setSalaFiltro(e.target.value)}><option value="TODAS">Todas</option><option value="SALA 1">Sala 1</option><option value="SALA 2">Sala 2</option><option value="SALA 3">Sala 3</option><option value="SALA 4">Sala 4</option></select></label>}
              <label><span>Asesor</span><select value={asesorFiltro} onChange={(e) => setAsesorFiltro(e.target.value)}><option value="TODOS">Todos</option>{datosTabla.map((a) => <option key={a.asesor_id} value={a.asesor_id}>{a.nombre_asesor}</option>)}</select></label>
              <div className="filter-actions">
                <button className="filter-today" onClick={() => {
                  const hoyFiltro = new Date();
                  const hoyKey = fechaLocalKey(hoyFiltro);
                  setAnio(hoyFiltro.getFullYear());
                  setMes(hoyFiltro.getMonth() + 1);
                  setFechaDesde(hoyKey);
                  setFechaHasta(hoyKey);
                  setSalaFiltro("TODAS");
                  setAsesorFiltro("TODOS");
                }}>📅 Hoy</button>
                <button className="filter-clear" onClick={() => { setFechaDesde(primerDiaMes(anio, mes)); setFechaHasta(esMesActual(anio, mes) ? fechaLocalKey(new Date()) : ultimoDiaMes(anio, mes)); setSalaFiltro("TODAS"); setAsesorFiltro("TODOS"); }}>Limpiar filtros</button>
              </div>
            </div>
          </div>

          <div className="dashboard-cards">
            <Kpi icon="👥" label="Asesores activos" value={resumenPeriodo.activos} />
            <Kpi icon="🎯" label="Meta general" value={resumen.meta} />
            <Kpi icon="📣" label="Cantadas selección" value={resumenPeriodo.cantadas} />
            <Kpi icon="📈" label="Cantadas acumuladas" value={acumuladoSeleccion} />
            <Kpi icon="📊" label="Cumplimiento" value={porcentaje(resumenPeriodo.cumplimiento)} />
          </div>

          <div className="dashboard-main-grid">
            <div>
              <div className="dashboard-panel">
                <div className="panel-title">
                  <div><h2>Rendimiento de asesores</h2><span>{MESES[mes - 1]} {anio} · acumulado hasta {fechaHasta}</span></div>
                  <div className="table-caption">{datosTabla.length} asesores</div>
                </div>
                <div className="table-wrap">
                  <table className="dashboard-table advisor-performance-table">
                    <thead><tr><th>Asesor</th><th>Cantadas día</th><th>Acumulado</th><th>Meta</th><th>Faltan</th><th>Descuento</th><th>Cumplimiento</th></tr></thead>
                    <tbody>
                      {datosTabla.filter(a => asesorFiltro === "TODOS" || Number(a.asesor_id) === Number(asesorFiltro)).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="dashboard-empty-cell">
                            No hay asesores ni ventas para los filtros seleccionados. Ajusta el período, la sala o el asesor.
                          </td>
                        </tr>
                      ) : datosTabla.filter(a => asesorFiltro === "TODOS" || Number(a.asesor_id) === Number(asesorFiltro)).map((a) => {
                        const stats = estadisticasAsesores.get(Number(a.asesor_id)) || { acumulado: 0 };
                        const cantadasDia = contarCantadasReportadas(
                          reportesCantadasDiarias,
                          a.asesor_id,
                          fechaDesde || primerDiaMes(anio, mes),
                          fechaHasta || ultimoDiaMes(anio, mes),
                          salaFiltro
                        );
                        const faltan = Math.max(a.metaAjustada - stats.acumulado, 0);
                        const cumplimiento = a.metaAjustada > 0 ? (stats.acumulado / a.metaAjustada) * 100 : 0;
                        return <tr key={`${a.asesor_id}-${a.cedula_asesor || a.nombre_asesor}`}>
                          <td><strong>{a.nombre_asesor}</strong>{a.cedula_asesor && <small>{a.cedula_asesor}</small>}</td>
                          <td className="strong-blue">{cantadasDia}</td>
                          <td className="strong-blue"><b>{stats.acumulado}</b></td>
                          <td>{a.metaAjustada}</td>
                          <td>{faltan}</td>
                          <td className={a.descuento ? "strong-red" : "muted-value"}>{a.descuento ? `-${a.descuento}` : "0"}</td>
                          <td><div className="progress-cell"><div className="progress"><span style={{width: `${Math.min(Math.max(cumplimiento,0),100)}%`}} /></div><b>{porcentaje(cumplimiento)}</b></div></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="dashboard-side">
              <div className="dashboard-panel goal-summary-card">
                <div className="goal-summary-head">
                  <div>
                    <span className="goal-eyebrow">🎯 META DEL PERÍODO</span>
                    <h2>{resumen.meta.toLocaleString("es-CO")}</h2>
                    <p>Meta ajustada para los asesores activos.</p>
                  </div>
                  <div className="goal-ring" style={{"--progress": `${Math.min(Math.max(resumenPeriodo.cumplimiento, 0), 100)}%`}}>
                    <div><strong>{porcentaje(resumenPeriodo.cumplimiento)}</strong><span>cumplido</span></div>
                  </div>
                </div>
                <div className="goal-progress"><span style={{width: `${Math.min(Math.max(resumenPeriodo.cumplimiento,0),100)}%`}} /></div>
                <div className="goal-stats goal-stats-four">
                  <div><span>Meta base</span><b>{resumen.metaBase}</b></div>
                  <div><span>Descuentos</span><b className="goal-discount">-{resumen.descuentos}</b></div>
                  <div><span>Ejecutado</span><b>{acumuladoSeleccion}</b></div>
                  <div><span>Faltan</span><b>{Math.max(resumen.meta - acumuladoSeleccion, 0)}</b></div>
                </div>
                <div className="goal-rhythm-grid">
                  <div><span>Meta diaria total</span><b>{metaDiariaNecesariaTotal}</b><small>ventas/día</small></div>
                  <div><span>Meta diaria / asesor</span><b>{metaDiariaNecesariaAsesor}</b><small>ventas/día</small></div>
                  <div><span>Ritmo actual</span><b>{ritmoActualTotal.toFixed(1)}</b><small>ventas/día</small></div>
                  <div><span>Proyección</span><b>{proyeccionTotal}</b><small>ventas del mes</small></div>
                </div>
                <div className="goal-budget-row"><span>Presupuesto diario</span><b>{moneda(presupuestoSeleccionado)}</b></div>
              </div>

              <div className="dashboard-panel quick-metrics">
                <h2>📋 Resumen operativo</h2>
                <div className="summary-mini-grid">
                  <div><span>HC</span><b>{resumenPeriodo.activos}</b></div>
                  <div><span>Meta</span><b>{resumen.meta}</b></div>
                  <div><span>Ventas cargadas acumuladas</span><b>{resumenPeriodo.acumulado}</b></div>
                  <div><span>Avance sobre meta (cargadas)</span><b>{porcentaje(resumenPeriodo.cumplimiento)}</b></div>
                  <div><span>Ratio / asesor</span><b>{resumenPeriodo.activos ? (resumenPeriodo.acumulado / resumenPeriodo.activos).toFixed(2) : "0.00"}</b></div>
                  <div><span>Faltan</span><b>{Math.max(resumen.meta - acumuladoSeleccion, 0)}</b></div>
                </div>
              </div>

              <div className="dashboard-panel daily-target-panel">
                <div className="daily-target-head">
                  <div><span className="goal-eyebrow">📈 RITMO NECESARIO</span><h2>¿Cuánto debemos hacer?</h2></div>
                  <span className={`target-status ${proyeccionTotal >= resumen.meta ? "on-track" : "behind"}`}>{proyeccionTotal >= resumen.meta ? "En ritmo" : "Acelerar"}</span>
                </div>
                <div className="daily-target-main"><b>{metaDiariaNecesariaTotal}</b><span>ventas por día para alcanzar la meta</span></div>
                <div className="daily-target-list">
                  <div><span>Por asesor</span><b>{metaDiariaNecesariaAsesor}/día</b></div>
                  <div><span>Faltan</span><b>{faltanMetaTotal}</b></div>
                  <div><span>Días disponibles</span><b>{diasDisponiblesRitmo}</b></div>
                  <div><span>Proyección</span><b>{proyeccionTotal}</b></div>
                </div>
              </div>

              <div className="dashboard-panel">
                <h2>📅 Calendario</h2>
                <div className="calendar-stats"><div><b>{numero(calendario?.dias_laborales)}</b><span>Días laborales</span></div><div><b>{numero(calendario?.dias_laborados)}</b><span>Transcurridos</span></div><div><b>{numero(calendario?.dias_pendientes)}</b><span>Pendientes</span></div></div>
              </div>
            </div>
          </div>

          <DashboardCharts ventasPorDia={ventasPorDia.filas} ventasPeriodo={ventasPeriodo} asesores={datosTabla} />

        </>
      ) : (
        <DashboardAsesor
          datos={misDatos}
          calendario={calendario}
          empresa={empresa}
          mes={mes}
          anio={anio}
          ventasPorDia={ventasPorDia}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          setFechaDesde={setFechaDesde}
          setFechaHasta={setFechaHasta}
        />
      )}
    </section>
  );
}

function VentasCantadasPorDia({
  filas,
  total,
  fechaDesde,
  fechaHasta,
  setFechaDesde,
  setFechaHasta,
  salaFiltro,
  setSalaFiltro,
  asesorFiltro,
  setAsesorFiltro,
  asesores,
  soloAsesor = false,
  puedeFiltrarSala = true,
}) {
  return (
    <div className="dashboard-panel daily-sales-panel">
      <div className="panel-title daily-sales-header">
        <div>
          <h2>📊 Ventas cantadas por día</h2>
          <span>
Reporte diario: cuenta las ventas normales cargadas cada día (excluye cargues de fin de semana), sin importar si están aprobadas, pendientes, rechazadas o por corregir.
          </span>
        </div>

        <div className="daily-total">
          <small>Total del período</small>
          <strong>{total}</strong>
        </div>
      </div>

      <div className="daily-filters">
        <label>
          <span>Desde</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </label>

        <label>
          <span>Hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </label>

        {!soloAsesor && (
          <>
            <label>
              <span>Sala</span>
              <select
                value={salaFiltro}
                onChange={(e) => setSalaFiltro(e.target.value)}
              >
                <option value="TODAS">Todas</option>
                <option value="SALA 1">Sala 1</option>
                <option value="SALA 2">Sala 2</option>
                <option value="SALA 3">Sala 3</option><option value="SALA 4">Sala 4</option>
              </select>
            </label>

            <label>
              <span>Asesor</span>
              <select
                value={asesorFiltro}
                onChange={(e) => setAsesorFiltro(e.target.value)}
              >
                <option value="TODOS">Todos</option>
                {asesores.map((asesor) => (
                  <option
                    key={asesor.asesor_id}
                    value={asesor.asesor_id}
                  >
                    {asesor.nombre_asesor}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="table-wrap">
        <table className="dashboard-table daily-sales-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cantadas del día</th>
              <th>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.fecha}>
                <td>{fila.fecha}</td>
                <td className="strong-blue">{fila.cantadas}</td>
                <td><strong>{fila.acumulado}</strong></td>
              </tr>
            ))}

            {filas.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", padding: "25px" }}>
                  No hay días para el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardCharts({ ventasPorDia, ventasPeriodo, asesores }) {
  const maxDia = Math.max(...ventasPorDia.map((f) => f.cantadas), 1);
  const porSala = new Map();
  ventasPeriodo.forEach((v) => { const sala = v.sala || "SIN SALA"; porSala.set(sala, (porSala.get(sala) || 0) + 1); });
  const salas = Array.from(porSala.entries()).sort((a,b) => b[1]-a[1]);
  const total = ventasPeriodo.length || 1;
  const activos = asesores.filter(a => a.activo !== false).length || 1;

  return <div className="charts-grid">
    <div className="dashboard-panel chart-card">
      <div className="panel-title"><div><h2>📊 Cantadas por día</h2><span>Ventas registradas en cada fecha</span></div><b>{ventasPeriodo.length}</b></div>
      <div className="bar-chart">
        {ventasPorDia.map((f) => <div className="bar-item" key={f.fecha} title={`${f.fecha}: ${f.cantadas} cantadas`}><div className="bar-value">{f.cantadas}</div><div className="bar"><span style={{height: `${Math.max((f.cantadas / maxDia) * 100, f.cantadas ? 8 : 2)}%`}} /></div><small>{f.fecha.slice(8,10)}</small></div>)}
      </div>
    </div>
    <div className="dashboard-panel chart-card">
      <div className="panel-title"><div><h2>🥧 Cantadas por sala</h2><span>Distribución del período filtrado</span></div></div>
      <div className="room-bars">{salas.length ? salas.map(([sala, count]) => <div className="room-row" key={sala}><div><b>{sala}</b><span>{count} ventas</span></div><div className="room-track"><span style={{width:`${(count/total)*100}%`}} /></div><strong>{Math.round((count/total)*100)}%</strong></div>) : <div className="empty-chart">Sin ventas para el filtro.</div>}</div>
      <div className="active-vs-sales"><div><b>{activos}</b><span>Activos</span></div><div><b>{ventasPeriodo.length}</b><span>Cantadas</span></div><div><b>{(ventasPeriodo.length/activos).toFixed(2)}</b><span>Por asesor</span></div></div>
    </div>
  </div>;
}

/**
 * ================================================================
 * DASHBOARD DEL ASESOR
 * ================================================================
 */

function DashboardAsesor({
  datos,
  calendario,
  empresa,
  mes,
  anio,
  ventasPorDia,
  fechaDesde,
  fechaHasta,
  setFechaDesde,
  setFechaHasta,
}) {
  if (!datos) {
    return (
      <div className="dashboard-empty dashboard-empty-enhanced">
        <div className="dashboard-empty-icon">🎯</div>
        <span className="dashboard-kicker">GESTIÓN COMERCIAL</span>
        <h2>No hay configuración comercial para este período</h2>
        <p>La meta se configura por asesor y por mes desde Administración.
        No necesitas registrar una venta para que la meta aparezca.</p>
        <div className="dashboard-empty-tip">
          <strong>Período seleccionado:</strong> {MESES[mes - 1]} {anio}
        </div>
      </div>
    );
  }

  const meta = numero(datos.meta);
  const cantadas = numero(datos.cantadas);
  const rechazadas = numero(datos.rechazadas);
  const pendientes = numero(datos.pendientes);
  const corregir = numero(datos.por_corregir);

  const descuento = numero(datos.descuento_comercial ?? datos.descuento ?? 0);

  // Los descuentos representan ventas que ya no deben contar dentro
  // de la meta. Por eso la meta ajustada siempre se reduce.
  const metaAjustada = Math.max(
    numero(datos.meta_ajustada ?? (meta - descuento)),
    0
  );

  const faltan = Math.max(
    metaAjustada - cantadas,
    0
  );

  /**
   * ============================================================
   * DÍAS
   * ============================================================
   */

  const diasLaborales = numero(
    calendario?.dias_laborales
  );

  const diasLaborados = numero(
    calendario?.dias_laborados
  );

  const diasPendientes = numero(
    calendario?.dias_pendientes
  );

  /**
   * Este valor incluye HOY cuando hoy es
   * un día laboral.
   *
   * Así podemos calcular correctamente
   * cuánto debe hacer por día desde hoy.
   */
  const diasDisponiblesDesdeHoy = numero(
    calendario?.dias_disponibles_desde_hoy
  );

  /**
   * ============================================================
   * POR DÍA
   * ============================================================
   */

  const porDia =
    faltan > 0 &&
    diasDisponiblesDesdeHoy > 0
      ? Math.ceil(
          faltan / diasDisponiblesDesdeHoy
        )
      : 0;

  /**
   * ============================================================
   * RITMO ACTUAL
   * ============================================================
   */

  const ritmoActual =
    diasLaborados > 0
      ? cantadas / diasLaborados
      : 0;

  /**
   * ============================================================
   * PROYECCIÓN
   *
   * Cantadas actuales / días transcurridos
   * multiplicado por días laborales totales.
   * ============================================================
   */

  const proyeccion =
    diasLaborales > 0 && diasLaborados > 0
      ? Math.round(
          ritmoActual * diasLaborales
        )
      : cantadas;

  /**
   * ============================================================
   * CUMPLIMIENTO
   * ============================================================
   */

  const cumplimiento =
    metaAjustada > 0
      ? (cantadas / metaAjustada) * 100
      : 0;

  /**
   * ============================================================
   * DIFERENCIA CONTRA PROYECCIÓN
   * ============================================================
   */

  const vaACumplir =
    proyeccion >= metaAjustada;

  return (
    <>
      {/* ========================================================
          HERO
      ======================================================== */}

      <div className="advisor-hero">
        <div>
          <div className="dashboard-kicker">
            MI PROYECCIÓN
          </div>

          <h2>
            {datos.nombre_asesor}
          </h2>

          <p>
            {MESES[mes - 1]} {anio} · Meta {metaAjustada} ventas
          </p>
          <div className="advisor-meta-status">
            <span>✓ Meta configurada por SuperAdmin</span>
            {descuento > 0 && <span>• {descuento} descuento{descuento === 1 ? "" : "s"}</span>}
          </div>
        </div>

        <div className="hero-percent">
          {porcentaje(cumplimiento)}

          <small>
            cumplimiento
          </small>
        </div>
      </div>

      {/* ========================================================
          KPIs
      ======================================================== */}

      <div className="dashboard-cards advisor-cards">
        <Kpi
          icon="🎯"
          label="Meta"
          value={metaAjustada}
        />

        <Kpi
          icon="📣"
          label="Ventas cargadas"
          value={cantadas}
        />

        <Kpi
          icon="📌"
          label="Me faltan"
          value={faltan}
        />

        <Kpi
          icon="📅"
          label="Hoy debo hacer"
          value={porDia}
        />

        <Kpi
          icon="📈"
          label="Proyección"
          value={proyeccion}
        />

        <Kpi
          icon="💰"
          label="Bono / comisión"
          value="Ver"
        />
      </div>

      {/* ========================================================
          AVANCE + PROYECCIÓN
      ======================================================== */}

      <div className="advisor-grid">
        <div className="dashboard-panel">
          <h2>
            📊 Mi avance
          </h2>

          <div className="large-progress">
            <div
              style={{
                width: `${Math.min(
                  Math.max(
                    cumplimiento,
                    0
                  ),
                  100
                )}%`,
              }}
            />
          </div>

          <div className="progress-labels">
            <span>
              {cantadas} cantadas
            </span>

            <strong>
              {porcentaje(cumplimiento)}
            </strong>

            <span>
              {metaAjustada} meta
            </span>
          </div>

          <div className="mini-grid mini-grid-three">
            <Mini
              label="Pendientes"
              value={pendientes}
              cls="yellow"
            />

            <Mini
              label="Rechazadas"
              value={rechazadas}
              cls="red"
            />

            <Mini
              label="Por corregir"
              value={corregir}
              cls="blue"
            />
          </div>
        </div>

        {/* ======================================================
            PROYECCIÓN
        ====================================================== */}

        <div className="dashboard-panel">
          <h2>
            🚀 Proyección
          </h2>

          <div className="projection-message">
            {vaACumplir ? (
              <>
                <strong>
                  Vas proyectado para cumplir
                  la meta.
                </strong>

                <span>
                  Mantén tu ritmo actual y
                  revisa diariamente cuánto
                  te falta.
                </span>
              </>
            ) : (
              <>
                <strong>
                  Necesitas aumentar el ritmo.
                </strong>

                <span>
                  Debes realizar
                  aproximadamente{" "}
                  {porDia} ventas por cada
                  día disponible desde hoy.
                </span>
              </>
            )}
          </div>

          <div className="projection-row">
            <span>
              Ritmo actual
            </span>

            <b>
              {ritmoActual.toFixed(1)}
              {" "}
              ventas/día
            </b>
          </div>

          <div className="projection-row">
            <span>
              Días laborales
            </span>

            <b>
              {diasLaborales}
            </b>
          </div>

          <div className="projection-row">
            <span>
              Días transcurridos
            </span>

            <b>
              {diasLaborados}
            </b>
          </div>

          <div className="projection-row">
            <span>
              Días restantes
            </span>

            <b>
              {diasPendientes}
            </b>
          </div>

          <div className="projection-row">
            <span>
              Días disponibles desde hoy
            </span>

            <b>
              {diasDisponiblesDesdeHoy}
            </b>
          </div>

          <div className="projection-row">
            <span>
              Descuentos
            </span>

            <b>
              {descuento}
            </b>
          </div>

          <div className="discount-breakdown">
            <div>
              <span>Portabilidad</span>
              <b>{numero(datos.descuento_porta)}</b>
            </div>
            <div>
              <span>Migración</span>
              <b>{numero(datos.descuento_migra)}</b>
            </div>
            <div>
              <span>Hogar</span>
              <b>{numero(datos.descuento_hogar)}</b>
            </div>
          </div>
        </div>
      </div>



      {/* ========================================================
          NOTA
      ======================================================== */}


    </>
  );
}

/**
 * ================================================================
 * KPI
 * ================================================================
 */

function Kpi({ icon, label, value }) {
  return (
    <div className="dashboard-kpi">
      <div className="kpi-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

/**
 * ================================================================
 * MINI CARD
 * ================================================================
 */

function Mini({
  label,
  value,
  cls,
}) {
  return (
    <div
      className={`mini-card ${cls}`}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}