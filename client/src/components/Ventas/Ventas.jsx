import React, { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../../lib/supabase";

import * as XLSX from "xlsx";

import "./Ventas.css";



const MOVIL_COLUMNS = [

  "FECHA LLAMADA",

  "HORA LLAMADA",

  "AGENTE ID",

  "AGENTE",

  "CEDULA CLIENTE",

  "NOMBRE CLIENTE",

  "NUMERO A PORTAR",

  "TIPO DE VENTA",

  "CIUDAD",

  "PLAN GENERAL",

  "CODIGO DEL PLAN ADQUIRIDO",

  "CFM (CARGO FIJO MENSUAL)",

  "ENVIO LOGISTICO",

  "OPERADOR DONANTE",

  "CLIENTE TODO CLARO",

  "FECHA ACTIVACION",

  "ESTADO",

  "TIPO DE CONTRATO",

  "ORIGEN",

  "TIPO DE VALIDACION DE IDENTIDAD",

];



const HOGAR_COLUMNS = [

  "FECHA LLAMADA",

  "HORA LLAMADA",

  "AGENTE ID",

  "AGENTE",

  "NOMBRE CLIENTE",

  "CEDULA CLIENTE",

  "CIUDAD",

  "DEPARTAMENTO",

  "CANTIDAD DE SERVICIOS",

  "TODO CLARO",

  "TELEFONIA",

  "TV",

  "INTERNET",

  "ULTRA WIFI",

  "CANTIDAD DE DECOS",

  "INSTALACION",

  "FECHA DE INSTALACION",

  "ESTADO",

  "SERVICIOS ADICIONALES",

  "TIPO DE VENTA",

  "OT",

  "OTT ADICIONAL",

  "OTT INCLUIDAS",

  "POLITICA",

  "CUENTA",

  "TIPO DE VALIDACION DE IDENTIDAD",

  "ORIGEN",

  "SEGMENTO",

  "OFERTA",

  "RENTA",

  "CANTIDAD DE DECOS ADICIONALES",

];



const initialForm = {

  tipo_cargue: "NORMAL",
  fecha_real_venta: "",

  // Comunes

  tipo_cedula: "",

  sala: "",

  origen: "",

  cedula_cliente: "",

  nombre_cliente: "",

  ciudad: "",

  tipo_validacion: "",



  // Móvil

  numero_portar: "",

  nip: "",

  email: "",

  iccid: "",

  direccion: "",

  sim_adquirida: "",

  tipo_venta: "",

  operador_donante: "",

  codigo_plan: "",

  id_descuento_oferta: "",

  fecha_activacion: "",

  cfm: "",

  cliente_todo_claro: "",

  tipo_contrato: "",

  numero_grabacion: "",

  observacion: "",

  plan_general: "",

  envio_logistico: "",



  // Hogar

  departamento: "",

  cantidad_servicios: "",

  todo_claro: "",

  telefonia: "",

  tv: "NO APLICA",

  internet: "",

  ultra_wifi: "0",

  cantidad_decos: "0",

  instalacion: "",

  fecha_instalacion: "",

  servicios_adicionales: "",

  tipo_venta_hogar: "CABLEADO",

  ot: "",

  ott_adicional: "",

  ott_incluidas: "",

  politica: "",

  cuenta: "",

  segmento: "RESIDENCIAL",

  oferta: "",

  renta: "",

  cantidad_decos_adicionales: "0",



  rectificacion_plan: null,

  validacion_imagen: null,

  habeas_data: null,

  habeas_data_2: null,

};



function Ventas({ usuario }) {

  const [tipoProducto, setTipoProducto] = useState("MOVIL");

  const [vista, setVista] = useState("lista");

  const [ventas, setVentas] = useState([]);

  const [form, setForm] = useState(initialForm);

  const [cargando, setCargando] = useState(false);

  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  const ahoraPeriodo = new Date();
  const [periodoAnio, setPeriodoAnio] = useState(ahoraPeriodo.getFullYear());
  const [periodoMes, setPeriodoMes] = useState(ahoraPeriodo.getMonth() + 1);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const [ventaEditando, setVentaEditando] = useState(null);

  const [revision, setRevision] = useState("");

  const [soportesRevision, setSoportesRevision] = useState([]);
  const [soportesExistentesCorreccion, setSoportesExistentesCorreccion] = useState({});

  const [cargandoSoportes, setCargandoSoportes] = useState(false);

  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  const [exportando, setExportando] = useState(false);
  const [eliminandoVentas, setEliminandoVentas] = useState(false);
  const [ventasSeleccionadas, setVentasSeleccionadas] = useState([]);

  const inputRefs = {

    rectificacion_plan: useRef(null),

    validacion_imagen: useRef(null),

    habeas_data: useRef(null),

    habeas_data_2: useRef(null),

  };



  // Solo Supervisor y SuperAdmin pueden revisar, aprobar o rechazar.

  // Administrador puede consultar todas las ventas y descargar reportes,

  // pero no puede cambiar su estado.

  const esSuperAdmin = usuario?.esSuperAdmin === true || usuario?.es_super_admin === true;



  const puedeRevisar =

    usuario?.rol === "Supervisor" ||

    esSuperAdmin;



  const puedeVerTodas =

    usuario?.rol === "Supervisor" ||

    usuario?.rol === "Administrador" ||

    esSuperAdmin;



  const puedeExportar =

    usuario?.rol === "Supervisor" ||

    usuario?.rol === "Administrador" ||

    esSuperAdmin;



  const MESES_VENTAS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  // El período de ventas se basa en la fecha de gestión/registro. La fecha de activación
  // es independiente y no debe mover una cantada a un mes posterior.
  const fechaReferenciaVenta = (venta) => String(venta?.fecha_llamada || venta?.created_at || venta?.fecha_activacion || "").slice(0, 10);
  const perteneceAlPeriodo = (venta) => {
    if (mostrarHistorico) return true;
    return fechaReferenciaVenta(venta).startsWith(`${periodoAnio}-${String(periodoMes).padStart(2, "0")}-`);
  };

  useEffect(() => {
    if (usuario?.rol === "Asesor") {
      const ahora = new Date();
      setPeriodoAnio(ahora.getFullYear());
      setPeriodoMes(ahora.getMonth() + 1);
      setMostrarHistorico(false);
    }
  }, [usuario?.rol]);

  async function eliminarVentasSeleccionadas() {
    if (!esSuperAdmin || eliminandoVentas || ventasSeleccionadas.length === 0) return;
    const ids = [...ventasSeleccionadas];
    const confirmacion = window.confirm(
      `Se eliminarán ${ids.length} venta(s) seleccionada(s) de Supabase permanentemente. ¿Deseas continuar?`
    );
    if (!confirmacion) return;
    const confirmacionFinal = window.prompt('Escribe exactamente ELIMINAR para confirmar:');
    if (confirmacionFinal !== "ELIMINAR") {
      window.alert("Operación cancelada. No se eliminó ninguna venta.");
      return;
    }
    setEliminandoVentas(true);
    setError("");
    try {
      const { data: soportesExistentes, error: consultaSoportesError } = await supabase
        .from("venta_soportes").select("ruta_storage").in("venta_id", ids);
      if (consultaSoportesError) throw consultaSoportesError;
      const rutas = (soportesExistentes || []).map((s) => s.ruta_storage).filter(Boolean);
      if (rutas.length) {
        const { error: storageError } = await supabase.storage.from("venta-soportes").remove(rutas);
        if (storageError) throw storageError;
      }
      const { error: soportesError } = await supabase
        .from("venta_soportes").delete().in("venta_id", ids);
      if (soportesError) throw soportesError;
      const { data: eliminadas, error: ventasError } = await supabase
        .from("ventas").delete().in("id", ids).select("id");
      if (ventasError) throw ventasError;
      const cantidad = eliminadas?.length || 0;
      if (cantidad === 0) {
        throw new Error("Supabase no confirmó la eliminación de registros. Revisa la política RLS DELETE para la tabla ventas (SuperAdmin).");
      }
      setVentasSeleccionadas([]);
      await cargarVentas();
      window.alert(`Supabase confirmó la eliminación de ${cantidad} venta(s) seleccionada(s).`);
    } catch (err) {
      console.error("Error eliminando ventas seleccionadas:", err);
      setError(err?.message || "No fue posible eliminar las ventas. Verifica los permisos de Supabase.");
      window.alert("No se pudo completar la eliminación: " + (err?.message || "Error desconocido"));
    } finally {
      setEliminandoVentas(false);
    }
  }

  function alternarVentaSeleccionada(id) {
    setVentasSeleccionadas((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function alternarSeleccionVisible() {
    const idsVisibles = ventasFiltradas.map((venta) => venta.id);
    const todosSeleccionados = idsVisibles.length > 0 && idsVisibles.every((id) => ventasSeleccionadas.includes(id));
    setVentasSeleccionadas((prev) => todosSeleccionados
      ? prev.filter((id) => !idsVisibles.includes(id))
      : [...new Set([...prev, ...idsVisibles])]);
  }

  async function cargarVentas() {

    setCargando(true);

    setError("");



    try {

      let query = supabase

        .from("ventas")

        .select(`*, asesor:usuarios!ventas_asesor_id_fkey (id, nombre)`)

        .order("created_at", { ascending: false });



      if (!puedeVerTodas && usuario?.id) {

        query = query.eq("asesor_id", usuario.id);

      }



      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      setVentas(data || []);

    } catch (err) {

      console.error("Error cargando ventas:", err);

      setError(

        err?.message ||

          "No se pudieron cargar las ventas. Verifica que la tabla ventas exista en Supabase."

      );

      setVentas([]);

    } finally {

      setCargando(false);

    }

  }



  useEffect(() => {

    cargarVentas();

  }, [usuario?.id, usuario?.rol]);



  function actualizarCampo(campo, valor) {

    setForm((prev) => ({ ...prev, [campo]: valor }));

  }



  function validarFormulario() {

    const comunes = [

      ["tipo_cedula", "Tipo de cédula"],

      ["sala", "Sala"],

      ["origen", "Origen"],

      ["cedula_cliente", "Cédula cliente"],

      ["nombre_cliente", "Nombre cliente"],

      ["ciudad", "Ciudad"],

      ["tipo_validacion", "Tipo de validación de identidad"],

    ];



    const movil = [

      ["numero_portar", "Número a portar"],

      ["email", "Email"],

      ["iccid", "ICCID"],

      ["direccion", "Dirección"],

      ["sim_adquirida", "SIM adquirida"],

      ["tipo_venta", "Tipo de venta"],

      ["operador_donante", "Operador donante"],

      ["codigo_plan", "Código del plan"],

      ["id_descuento_oferta", "ID descuento de la oferta"],

      ["fecha_activacion", "Fecha de activación"],

      ["cfm", "CFM"],

      ["cliente_todo_claro", "Cliente Todo Claro"],

      ["tipo_contrato", "Tipo de contrato"],

      ["numero_grabacion", "# Grabación"],

      ["observacion", "Observación"],

      ["plan_general", "Plan general"],

      ["envio_logistico", "Envío logístico"],

    ];



    const hogar = [

      ["departamento", "Departamento"],

      ["cantidad_servicios", "Cantidad de servicios"],

      ["todo_claro", "Todo Claro"],

      ["telefonia", "Telefonía"],

      ["tv", "TV"],

      ["internet", "Internet"],

      ["ultra_wifi", "Ultra WiFi"],

      ["cantidad_decos", "Cantidad de decos"],

      ["instalacion", "Instalación"],

      ["fecha_instalacion", "Fecha de instalación"],

      ["tipo_venta_hogar", "Tipo de venta"],

      ["ot", "OT"],

      ["ott_adicional", "OTT adicional"],

      ["ott_incluidas", "OTT incluidas"],

      ["politica", "Política"],

      ["cuenta", "Cuenta"],

      ["segmento", "Segmento"],

      ["oferta", "Oferta"],

      ["renta", "Renta"],

      ["cantidad_decos_adicionales", "Cantidad de decos adicionales"],

    ];



    const soportes = [
      ["rectificacion_plan", "Rectificación de plan adquirido"],
      ["validacion_imagen", "Validación"],
      ["habeas_data", "Habeas Data"],
    ];

    const obligatorios =

      tipoProducto === "HOGAR"

        ? [...comunes, ...hogar, ...soportes]

        : [...comunes, ...movil, ...soportes];



    if (form.tipo_cargue === "FIN_SEMANA" && !form.fecha_real_venta) {
      return 'Selecciona la fecha real de la venta de fin de semana.';
    }

    const tipoSoportePorCampo = {
      rectificacion_plan: "RECTIFICACION_PLAN",
      validacion_imagen: "VALIDACION",
      habeas_data: "HABEAS_DATA",
    };

    for (const [campo, nombre] of obligatorios) {
      const esSoporte = Boolean(tipoSoportePorCampo[campo]);
      const yaExisteSoporte = esSoporte && Boolean(soportesExistentesCorreccion[tipoSoportePorCampo[campo]]);
      if (
        (!form[campo] && !(ventaEditando && yaExisteSoporte)) ||
        (typeof form[campo] === "string" && !form[campo].trim())
      ) {
        return `El campo "${nombre}" es obligatorio.`;
      }
    }



    if (

      tipoProducto === "MOVIL" &&

      form.tipo_venta === "PORTABILIDAD" &&

      !form.nip.trim()

    ) {

      return 'El campo "NIP" es obligatorio para portabilidad.';

    }



    if (tipoProducto === "MOVIL" && Number.isNaN(Number(form.cfm))) {

      return "CFM debe ser un número válido.";

    }



    if (tipoProducto === "HOGAR" && Number.isNaN(Number(form.renta))) {

      return "Renta debe ser un número válido.";

    }



    return "";

  }





  async function subirSoporte(ventaId, archivo, tipo) {

    if (!archivo) return;



    const extension = archivo.name.includes(".")

      ? archivo.name.split(".").pop()

      : "bin";



    const ruta = `${ventaId}/${tipo}-${Date.now()}.${extension}`;



    const { error: uploadError } = await supabase.storage

      .from("venta-soportes")

      .upload(ruta, archivo, {

        upsert: false,

        contentType: archivo.type || "application/octet-stream",

      });



    if (uploadError) throw uploadError;



    const { error: insertError } = await supabase

      .from("venta_soportes")

      .insert({

        venta_id: ventaId,

        tipo,

        nombre_archivo: archivo.name,

        ruta_storage: ruta,

        tipo_archivo: archivo.type || null,

        tamano: archivo.size || null,

      });



    if (insertError) throw insertError;

  }



  async function reemplazarSoporteSiSeSelecciono(ventaId, archivo, tipo) {

    if (!archivo) return;



    const { data: existentes, error: existentesError } = await supabase

      .from("venta_soportes")

      .select("id, ruta_storage")

      .eq("venta_id", ventaId)

      .eq("tipo", tipo);



    if (existentesError) throw existentesError;



    for (const existente of existentes || []) {

      if (existente.ruta_storage) {

        await supabase.storage.from("venta-soportes").remove([existente.ruta_storage]);

      }

    }



    if ((existentes || []).length) {

      const { error: deleteError } = await supabase

        .from("venta_soportes")

        .delete()

        .eq("venta_id", ventaId)

        .eq("tipo", tipo);

      if (deleteError) throw deleteError;

    }



    await subirSoporte(ventaId, archivo, tipo);

  }



    async function eliminarTodosLosSoportes(ventaId) {
    const { data: existentes, error: consultaError } = await supabase
      .from("venta_soportes")
      .select("id, ruta_storage")
      .eq("venta_id", ventaId);

    if (consultaError) throw consultaError;

    const rutas = (existentes || []).map((s) => s.ruta_storage).filter(Boolean);

    if (rutas.length) {
      const { error: storageError } = await supabase.storage
        .from("venta-soportes")
        .remove(rutas);
      if (storageError) throw storageError;
    }

    if ((existentes || []).length) {
      const { error: deleteError } = await supabase
        .from("venta_soportes")
        .delete()
        .eq("venta_id", ventaId);
      if (deleteError) throw deleteError;
    }
  }

  async function notificarAsesorRechazo(venta, observacion) {
    if (!venta?.asesor_id || !observacion?.trim()) return;

    const { error: mensajeError } = await supabase
      .from("mensajes")
      .insert({
        emisor_id: usuario.id,
        receptor_id: venta.asesor_id,
        texto: `❌ Venta #${venta.id} fue RECHAZADA. Motivo: ${observacion.trim()}`,
        grupo: null,
        leido: false,
      });

    if (mensajeError) throw mensajeError;
  }

  async function notificarSupervisores(texto) {
    const { data: supervisores, error: supervisoresError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol", "Supervisor")
      .eq("activo", true);

    if (supervisoresError) throw supervisoresError;

    const receptores = (supervisores || [])
      .filter((s) => Number(s.id) !== Number(usuario?.id))
      .map((s) => ({
        emisor_id: usuario.id,
        receptor_id: s.id,
        texto,
        grupo: null,
        leido: false,
      }));

    if (!receptores.length) return;

    const { error: mensajeError } = await supabase
      .from("mensajes")
      .insert(receptores);
    if (mensajeError) throw mensajeError;
  }

async function prepararCorreccion(venta) {

    setError("");

    setSoportesExistentesCorreccion({});
    setVentaSeleccionada(null);

    setVentaEditando(venta);

    try {
      const { data: supports, error: supportsError } = await supabase
        .from("venta_soportes")
        .select("tipo, nombre_archivo, ruta_storage")
        .eq("venta_id", venta.id);
      if (supportsError) throw supportsError;
      const existentes = {};
      for (const soporte of supports || []) {
        const { data: signed, error: signedError } = await supabase.storage
          .from("venta-soportes")
          .createSignedUrl(soporte.ruta_storage, 60 * 60);
        existentes[soporte.tipo] = {
          nombre: soporte.nombre_archivo,
          url: signedError ? null : signed?.signedUrl || null,
        };
      }
      setSoportesExistentesCorreccion(existentes);
    } catch (supportsErr) {
      console.error("No se pudieron cargar los soportes existentes:", supportsErr);
      setError("No se pudieron recuperar los soportes existentes. Si persiste, revisa permisos de Supabase Storage.");
    }

    setTipoProducto(venta.producto || "MOVIL");

    setVista("formulario");

    setForm({

      ...initialForm,

      tipo_cargue: venta.tipo_cargue || "NORMAL",
      fecha_real_venta: venta.tipo_cargue === "FIN_SEMANA" ? String(venta.fecha_llamada || "").slice(0, 10) : "",
      tipo_cedula: venta.tipo_cedula || "C.C",

      sala: venta.sala || "SALA 1",

      origen: venta.origen || "CRM",

      cedula_cliente: venta.cedula_cliente || "",

      nombre_cliente: venta.nombre_cliente || "",

      ciudad: venta.ciudad || "",

      tipo_validacion: venta.tipo_validacion || "POLIEDRO OTP",

      numero_portar: venta.numero_portar || "",

      nip: venta.nip || "",

      email: venta.email || "",

      iccid: venta.iccid || "",

      direccion: venta.direccion || "",

      sim_adquirida: venta.sim_adquirida || "SI",

      tipo_venta: venta.tipo_venta || "PORTABILIDAD",

      operador_donante: venta.operador_donante || "TIGO",

      codigo_plan: venta.codigo_plan || "",

      id_descuento_oferta: venta.id_descuento_oferta || "",

      fecha_activacion: venta.fecha_activacion || "",

      cfm: venta.cfm ?? "",

      plan_general: venta.plan_general || "",

      envio_logistico: venta.envio_logistico || "",

      cliente_todo_claro: venta.cliente_todo_claro || "SI",

      tipo_contrato: venta.tipo_contrato || "DIGITAL",

      numero_grabacion: venta.numero_grabacion || "",

      observacion: venta.observacion || "",

      departamento: venta.departamento || "",

      cantidad_servicios: venta.cantidad_servicios ?? "",

      todo_claro: venta.todo_claro || "NO",

      telefonia: venta.telefonia || "NO",

      tv: venta.tv || "NO APLICA",

      internet: venta.internet || "NO",

      ultra_wifi: venta.ultra_wifi ?? "0",

      cantidad_decos: venta.cantidad_decos ?? "0",

      instalacion: venta.instalacion || "MAÑANA",

      fecha_instalacion: venta.fecha_instalacion || "",

      servicios_adicionales: venta.servicios_adicionales || "",

      tipo_venta_hogar: venta.tipo_venta_hogar || venta.tipo_venta || "CABLEADO",

      ot: venta.ot || "",

      ott_adicional: venta.ott_adicional || "",

      ott_incluidas: venta.ott_incluidas || "",

      politica: venta.politica || "",

      cuenta: venta.cuenta || "",

      segmento: venta.segmento || "RESIDENCIAL",

      oferta: venta.oferta || "",

      renta: venta.renta ?? "",

      cantidad_decos_adicionales: venta.cantidad_decos_adicionales ?? "0",

      rectificacion_plan: null,

      validacion_imagen: null,

      habeas_data: null,

      habeas_data_2: null,

    });

  }



  async function guardarVenta(event) {

    event.preventDefault();

    setError("");



    const validacion = validarFormulario();

    if (validacion) {

      setError(validacion);

      return;

    }



    if (!usuario?.id) {

      setError("No se pudo identificar al asesor actual.");

      return;

    }



    if (usuario?.rol === "Asesor" && !String(usuario?.cedula || "").trim()) {

      setError(

        "Tu usuario no tiene una cédula registrada. Comunícate con el administrador antes de registrar una venta."

      );

      return;

    }



    const cedulaAgente = String(usuario?.cedula || "").trim();

    const agenteId = cedulaAgente ? Number(cedulaAgente) : null;



    if (usuario?.rol === "Asesor" && (!cedulaAgente || !Number.isInteger(agenteId))) {

      setError(

        "La cédula del asesor no es válida. Comunícate con el administrador."

      );

      return;

    }



    setGuardando(true);



    try {

      if (ventaEditando) {

        const basePayload =

          tipoProducto === "HOGAR"

            ? {

                tipo_cedula: form.tipo_cedula,

                sala: form.sala,

                origen: form.origen,

                cedula_cliente: form.cedula_cliente.trim(),

                nombre_cliente: form.nombre_cliente.trim(),

                ciudad: form.ciudad.trim(),

                tipo_validacion: form.tipo_validacion,

                tipo_cargue: form.tipo_cargue || "NORMAL",

                fecha_llamada: (form.tipo_cargue === "FIN_SEMANA" && form.fecha_real_venta) ? form.fecha_real_venta : new Date().toISOString().slice(0, 10),

                departamento: form.departamento.trim(),

                cantidad_servicios: form.cantidad_servicios,

                todo_claro: form.todo_claro,

                telefonia: form.telefonia,

                tv: form.tv,

                internet: form.internet,

                ultra_wifi: form.ultra_wifi,

                cantidad_decos: Number(form.cantidad_decos),

                instalacion: form.instalacion,

                fecha_instalacion: form.fecha_instalacion,

                servicios_adicionales: form.servicios_adicionales.trim(),

                tipo_venta_hogar: form.tipo_venta_hogar,

                ot: form.ot.trim(),

                ott_adicional: form.ott_adicional.trim(),

                ott_incluidas: form.ott_incluidas.trim(),

                politica: form.politica.trim(),

                cuenta: form.cuenta.trim(),

                segmento: form.segmento,

                oferta: form.oferta.trim(),

                renta: Number(form.renta),

                cantidad_decos_adicionales: Number(form.cantidad_decos_adicionales),

                numero_portar: "", nip: null, email: "N/A", iccid: "N/A", direccion: "N/A",

                sim_adquirida: "NO", tipo_venta: form.tipo_venta_hogar, operador_donante: "N/A",

                codigo_plan: form.ot.trim() || "HOGAR", id_descuento_oferta: form.oferta.trim() || "N/A",

                fecha_activacion: form.fecha_instalacion, cfm: Number(form.renta),

                cliente_todo_claro: form.todo_claro, tipo_contrato: "DIGITAL",

                numero_grabacion: form.cuenta.trim() || "N/A", observacion: form.servicios_adicionales.trim() || "N/A",

                plan_general: form.oferta.trim(), envio_logistico: form.instalacion,

                estado: "PENDIENTE", updated_at: new Date().toISOString(),

              }

            : {

                tipo_cedula: form.tipo_cedula,

                sala: form.sala,

                origen: form.origen,

                cedula_cliente: form.cedula_cliente.trim(),

                nombre_cliente: form.nombre_cliente.trim(),

                numero_portar: form.numero_portar.trim(),

                nip: form.nip.trim() || null,

                email: form.email.trim(),

                iccid: form.iccid.trim(),

                direccion: form.direccion.trim(),

                ciudad: form.ciudad.trim(),

                sim_adquirida: form.sim_adquirida,

                tipo_venta: form.tipo_venta,

                operador_donante: form.operador_donante,

                tipo_validacion: form.tipo_validacion,

                tipo_cargue: form.tipo_cargue || "NORMAL",

                fecha_llamada: (form.tipo_cargue === "FIN_SEMANA" && form.fecha_real_venta) ? form.fecha_real_venta : new Date().toISOString().slice(0, 10),

                codigo_plan: form.codigo_plan.trim(),

                id_descuento_oferta: form.id_descuento_oferta.trim(),

                fecha_activacion: form.fecha_activacion,

                cfm: Number(form.cfm),

                cliente_todo_claro: form.cliente_todo_claro,

                tipo_contrato: form.tipo_contrato,

                numero_grabacion: form.numero_grabacion.trim(),

                observacion: form.observacion.trim(),

                plan_general: form.plan_general.trim(),

                envio_logistico: form.envio_logistico.trim(),

                estado: "PENDIENTE", updated_at: new Date().toISOString(),

              };



        // Conserva los soportes existentes. Solo reemplaza los que el asesor seleccionó de nuevo.
        await reemplazarSoporteSiSeSelecciono(ventaEditando.id, form.rectificacion_plan, "RECTIFICACION_PLAN");
        await reemplazarSoporteSiSeSelecciono(ventaEditando.id, form.validacion_imagen, "VALIDACION");
        await reemplazarSoporteSiSeSelecciono(ventaEditando.id, form.habeas_data, "HABEAS_DATA");
        await reemplazarSoporteSiSeSelecciono(ventaEditando.id, form.habeas_data_2, "HABEAS_DATA_2");

        const { error: updateError } = await supabase

          .from("ventas")

          .update(basePayload)

          .eq("id", ventaEditando.id)

          .eq("asesor_id", usuario.id);

        if (updateError) throw updateError;



        const { error: revisionError } = await supabase.from("venta_revisiones").insert({

          venta_id: ventaEditando.id,

          revisor_id: usuario.id,

          estado_anterior: "POR_CORREGIR",

          estado_nuevo: "PENDIENTE",

          observacion: "El asesor corrigió la venta y la devolvió a revisión.",

        });

        if (revisionError) throw revisionError;

        await notificarSupervisores(
          `🔄 Venta #${ventaEditando.id} fue corregida por ${usuario.nombre || usuario.usuario || "el asesor"} y está lista para nueva revisión.`
        );



        setVentaEditando(null);

        setForm(initialForm);

        await cargarVentas();

        setVista("lista");

        alert("Venta corregida correctamente y enviada nuevamente a revisión.");

        return;

      }



      const payload =

        tipoProducto === "HOGAR"

          ? {

              asesor_id: usuario.id,

              agente_id: agenteId,

              agente: usuario.nombre || usuario.usuario || "",

              fecha_llamada: (form.tipo_cargue === "FIN_SEMANA" && form.fecha_real_venta) ? form.fecha_real_venta : new Date().toISOString().slice(0, 10),
              tipo_cargue: form.tipo_cargue || "NORMAL",

              hora_llamada: new Date().toTimeString().slice(0, 8),

              producto: "HOGAR",



              tipo_cedula: form.tipo_cedula,

              sala: form.sala,

              origen: form.origen,

              cedula_cliente: form.cedula_cliente.trim(),

              nombre_cliente: form.nombre_cliente.trim(),

              ciudad: form.ciudad.trim(),

              tipo_validacion: form.tipo_validacion,



              departamento: form.departamento.trim(),

              cantidad_servicios: form.cantidad_servicios,

              todo_claro: form.todo_claro,

              telefonia: form.telefonia,

              tv: form.tv,

              internet: form.internet,

              ultra_wifi: form.ultra_wifi,

              cantidad_decos: Number(form.cantidad_decos),

              instalacion: form.instalacion,

              fecha_instalacion: form.fecha_instalacion,

              servicios_adicionales: form.servicios_adicionales.trim(),

              tipo_venta_hogar: form.tipo_venta_hogar,

              ot: form.ot.trim(),

              ott_adicional: form.ott_adicional.trim(),

              ott_incluidas: form.ott_incluidas.trim(),

              politica: form.politica.trim(),

              cuenta: form.cuenta.trim(),

              segmento: form.segmento,

              oferta: form.oferta.trim(),

              renta: Number(form.renta),

              cantidad_decos_adicionales: Number(form.cantidad_decos_adicionales),



              // Compatibilidad con columnas comunes actuales de ventas.

              numero_portar: "",

              nip: null,

              email: "N/A",

              iccid: "N/A",

              direccion: "N/A",

              sim_adquirida: "NO",

              tipo_venta: form.tipo_venta_hogar,

              operador_donante: "N/A",

              codigo_plan: form.ot.trim() || "HOGAR",

              id_descuento_oferta: form.oferta.trim() || "N/A",

              fecha_activacion: form.fecha_instalacion,

              cfm: Number(form.renta),

              cliente_todo_claro: form.todo_claro,

              tipo_contrato: "DIGITAL",

              numero_grabacion: form.cuenta.trim() || "N/A",

              observacion: form.servicios_adicionales.trim() || "N/A",

              plan_general: form.oferta.trim(),

              envio_logistico: form.instalacion,



              estado: "PENDIENTE",

            }

          : {

              asesor_id: usuario.id,

              agente_id: agenteId,

              agente: usuario.nombre || usuario.usuario || "",

              fecha_llamada: (form.tipo_cargue === "FIN_SEMANA" && form.fecha_real_venta) ? form.fecha_real_venta : new Date().toISOString().slice(0, 10),
              tipo_cargue: form.tipo_cargue || "NORMAL",

              hora_llamada: new Date().toTimeString().slice(0, 8),

              producto: "MOVIL",

              tipo_cedula: form.tipo_cedula,

              sala: form.sala,

              origen: form.origen,

              cedula_cliente: form.cedula_cliente.trim(),

              nombre_cliente: form.nombre_cliente.trim(),

              numero_portar: form.numero_portar.trim(),

              nip: form.nip.trim() || null,

              email: form.email.trim(),

              iccid: form.iccid.trim(),

              direccion: form.direccion.trim(),

              sim_adquirida: form.sim_adquirida,

              tipo_venta: form.tipo_venta,

              operador_donante: form.operador_donante,

              tipo_validacion: form.tipo_validacion,

              codigo_plan: form.codigo_plan.trim(),

              id_descuento_oferta: form.id_descuento_oferta.trim(),

              fecha_activacion: form.fecha_activacion,

              cfm: Number(form.cfm),

              cliente_todo_claro: form.cliente_todo_claro,

              tipo_contrato: form.tipo_contrato,

              numero_grabacion: form.numero_grabacion.trim(),

              observacion: form.observacion.trim(),

              ciudad: form.ciudad.trim(),

              plan_general: form.plan_general.trim(),

              envio_logistico: form.envio_logistico.trim(),

              estado: "PENDIENTE",

            };



      const { data, error: insertError } = await supabase

        .from("ventas")

        .insert(payload)

        .select()

        .single();



      if (insertError) throw insertError;



      await subirSoporte(data.id, form.rectificacion_plan, "RECTIFICACION_PLAN");

      await subirSoporte(data.id, form.validacion_imagen, "VALIDACION");

      await subirSoporte(data.id, form.habeas_data, "HABEAS_DATA");

      await subirSoporte(data.id, form.habeas_data_2, "HABEAS_DATA_2");



      setForm(initialForm);

      setVentaEditando(null);

      await cargarVentas();

      setVista("lista");

      alert(`Venta ${tipoProducto === "HOGAR" ? "Hogar" : "Móvil"} registrada correctamente y enviada a revisión.`);

    } catch (err) {

      console.error("Error guardando venta:", err);

      setError(

        err?.message ||

          "No fue posible guardar la venta. Revisa Supabase y Storage."

      );

    } finally {

      setGuardando(false);

    }

  }



  function prepararNuevaVenta() {

    setError("");

    setVentaEditando(null);

    setForm(initialForm);

    setVista("formulario");

  }



  function cancelarNuevaVenta() {

    setForm(initialForm);

    setError("");

    setVista("lista");

  }



  function nombreArchivoSeguro(nombre) {

    return String(nombre || "")

      .replace(/[**\\\**/:*?"<>|]/g, "_")

      .trim();

  }



  async function exportarProducto(producto) {

    setExportando(true);

    setError("");



    try {

      let query = supabase

        .from("ventas")

        .select("*")

        .eq("producto", producto)

        .order("created_at", { ascending: true });



      if (!puedeVerTodas && usuario?.id) {

        query = query.eq("asesor_id", usuario.id);

      }



      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;



      const datosExportar = (data || []).filter((v) => mostrarHistorico || perteneceAlPeriodo(v));

      const filas =

        producto === "HOGAR"

          ? datosExportar.map((v) => ({

              "FECHA LLAMADA": v.fecha_llamada || v.created_at?.slice(0, 10) || "",

              "HORA LLAMADA": v.hora_llamada || "",

              "AGENTE ID": v.agente_id ?? "",

              "AGENTE": v.agente || "",

              "NOMBRE CLIENTE": v.nombre_cliente || "",

              "CEDULA CLIENTE": v.cedula_cliente || "",

              "CIUDAD": v.ciudad || "",

              "DEPARTAMENTO": v.departamento || "",

              "CANTIDAD DE SERVICIOS": v.cantidad_servicios || "",

              "TODO CLARO": v.todo_claro || "",

              "TELEFONIA": v.telefonia || "",

              "TV": v.tv || "",

              "INTERNET": v.internet || "",

              "ULTRA WIFI": v.ultra_wifi ?? "",

              "CANTIDAD DE DECOS": v.cantidad_decos ?? "",

              "INSTALACION": v.instalacion || "",

              "FECHA DE INSTALACION": v.fecha_instalacion || "",

              "ESTADO": v.estado || "",

              "SERVICIOS ADICIONALES": v.servicios_adicionales || "",

              "TIPO DE VENTA": v.tipo_venta_hogar || "",

              "OT": v.ot || "",

              "OTT ADICIONAL": v.ott_adicional || "",

              "OTT INCLUIDAS": v.ott_incluidas || "",

              "POLITICA": v.politica || "",

              "CUENTA": v.cuenta || "",

              "TIPO DE VALIDACION DE IDENTIDAD": v.tipo_validacion || "",

              "ORIGEN": v.origen || "",

              "SEGMENTO": v.segmento || "",

              "OFERTA": v.oferta || "",

              "RENTA": v.renta ?? "",

              "CANTIDAD DE DECOS ADICIONALES": v.cantidad_decos_adicionales ?? "",

            }))

          : datosExportar.map((v) => ({

              "FECHA LLAMADA": v.fecha_llamada || v.created_at?.slice(0, 10) || "",

              "HORA LLAMADA": v.hora_llamada || "",

              "AGENTE ID": v.agente_id ?? "",

              "AGENTE": v.agente || "",

              "CEDULA CLIENTE": v.cedula_cliente || "",

              "NOMBRE CLIENTE": v.nombre_cliente || "",

              "NUMERO A PORTAR": v.numero_portar || "",

              "TIPO DE VENTA": v.tipo_venta || "",

              "CIUDAD": v.ciudad || "",

              "PLAN GENERAL": v.plan_general || "",

              "CODIGO DEL PLAN ADQUIRIDO": v.codigo_plan || "",

              "CFM (CARGO FIJO MENSUAL)": v.cfm ?? "",

              "ENVIO LOGISTICO": v.envio_logistico || "",

              "OPERADOR DONANTE": v.operador_donante || "",

              "CLIENTE TODO CLARO": v.cliente_todo_claro || "",

              "FECHA ACTIVACION": v.fecha_activacion || "",

              "ESTADO": v.estado || "",

              "TIPO DE CONTRATO": v.tipo_contrato || "",

              "ORIGEN": v.origen || "",

              "TIPO DE VALIDACION DE IDENTIDAD": v.tipo_validacion || "",

            }));



      const columnas = producto === "HOGAR" ? HOGAR_COLUMNS : MOVIL_COLUMNS;

      const hoja = XLSX.utils.json_to_sheet(filas, { header: columnas });



      hoja["!cols"] = columnas.map((col) => ({

        wch: Math.max(14, Math.min(34, col.length + 2)),

      }));



      const libro = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(

        libro,

        hoja,

        producto === "HOGAR" ? "Hogar" : "Movil"

      );



      const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      XLSX.writeFile(

        libro,

        `General_${producto === "HOGAR" ? "Hogar" : "Movil"}_${fecha}.xlsx`

      );

    } catch (err) {

      console.error("Error exportando:", err);

      setError(err?.message || `No fue posible generar el Excel de ${producto}.`);

    } finally {

      setExportando(false);

    }

  }



  async function exportarMovil() {

    return exportarProducto("MOVIL");

  }



  async function exportarHogar() {

    return exportarProducto("HOGAR");

  }





  async function abrirRevision(venta) {

    setVentaSeleccionada(venta);

    setRevision("");

    setSoportesRevision([]);

    setImagenAmpliada(null);

    setCargandoSoportes(true);

    setError("");



    try {

      const { data, error: soportesError } = await supabase

        .from("venta_soportes")

        .select("id, venta_id, tipo, nombre_archivo, ruta_storage, tipo_archivo, tamano, created_at")

        .eq("venta_id", venta.id)

        .order("created_at", { ascending: true });



      if (soportesError) throw soportesError;



      const soportesConUrl = await Promise.all(

        (data || []).map(async (soporte) => {

          const { data: signed, error: signedError } = await supabase.storage

            .from("venta-soportes")

            .createSignedUrl(soporte.ruta_storage, 60 * 60);



          return {

            ...soporte,

            url: signedError ? null : signed?.signedUrl || null,

            error: signedError?.message || null,

          };

        })

      );



      setSoportesRevision(soportesConUrl);

    } catch (err) {

      console.error("Error cargando soportes de revisión:", err);

      setError(err?.message || "No se pudieron cargar los soportes de la venta.");

    } finally {

      setCargandoSoportes(false);

    }

  }



  function etiquetaSoporte(tipo) {

    const etiquetas = {

      RECTIFICACION_PLAN: "RECTIFICACIÓN DE PLAN ADQUIRIDO",

      VALIDACION: "VALIDACIÓN",

      HABEAS_DATA: "HABEAS DATA",

      HABEAS_DATA_2: "HABEAS DATA 2",

    };

    return etiquetas[tipo] || tipo || "SOPORTE";

  }




  async function devolverParaCorreccion(venta) {
    if (!puedeRevisar) return;

    const detalleCorreccion = revision.trim();
    if (!detalleCorreccion) {
      setError("Para devolver una venta a corrección debes indicar qué debe corregir el asesor.");
      return;
    }

    // El supervisor solo describe qué debe corregir. El asesor selecciona el tipo de cargue al editar.
    const observacion = detalleCorreccion;

    try {
      // El supervisor solo cambia el estado y registra la observación.
      // Los soportes existentes se conservan para que el asesor no tenga que volver a cargarlos.
      const { error: updateError } = await supabase
        .from("ventas")
        .update({
          estado: "POR_CORREGIR",
          updated_at: new Date().toISOString(),
        })
        .eq("id", venta.id);

      if (updateError) throw updateError;

      const { error: historialError } = await supabase
        .from("venta_revisiones")
        .insert({
          venta_id: venta.id,
          revisor_id: usuario.id,
          estado_anterior: venta.estado,
          estado_nuevo: "POR_CORREGIR",
          observacion,
        });

      if (historialError) throw historialError;

      const { error: mensajeError } = await supabase
        .from("mensajes")
        .insert({
          emisor_id: usuario.id,
          receptor_id: venta.asesor_id,
          texto: `⚠️ Venta #${venta.id} debe corregirse. ${observacion}`,
          grupo: null,
          leido: false,
        });

      if (mensajeError) throw mensajeError;

      setRevision("");
      setVentaSeleccionada(null);
      setSoportesRevision([]);
      setImagenAmpliada(null);
      await cargarVentas();
    } catch (err) {
      console.error("Error devolviendo venta a corrección:", err);
      setError(err?.message || "No se pudo devolver la venta para corrección.");
    }
  }

  async function cambiarEstado(venta, estado) {

    if (!puedeRevisar) return;



    let observacion = revision.trim();



    if (estado === "RECHAZADA" && !observacion) {

      setError("Para rechazar una venta debes escribir la observación.");

      return;

    }



    try {

      const { error: updateError } = await supabase

        .from("ventas")

        .update({

          estado,

          updated_at: new Date().toISOString(),

        })

        .eq("id", venta.id);



      if (updateError) throw updateError;



      const { error: historialError } = await supabase

        .from("venta_revisiones")

        .insert({

          venta_id: venta.id,

          revisor_id: usuario.id,

          estado_anterior: venta.estado,

          estado_nuevo: estado,

          observacion: observacion || null,

        });



      if (historialError) throw historialError;

      // Notificar al asesor el motivo exacto del rechazo.
      if (estado === "RECHAZADA") {
        await notificarAsesorRechazo(venta, observacion);
      }



      setRevision("");

      setVentaSeleccionada(null);

      await cargarVentas();

    } catch (err) {

      console.error("Error actualizando venta:", err);

      setError(err?.message || "No se pudo actualizar la venta.");

    }

  }



  const ventasPeriodo = useMemo(() => ventas.filter((v) => perteneceAlPeriodo(v)), [ventas, periodoAnio, periodoMes, mostrarHistorico]);

  const ventasFiltradas = useMemo(() => {
    const termino = filtroBusqueda.trim().toLowerCase();
    return ventasPeriodo.filter((v) => {
      const coincideProducto = v.producto === tipoProducto;
      const coincideEstado = filtroEstado === "TODOS" || v.estado === filtroEstado;
      const texto = [v.nombre_cliente, v.cedula_cliente, v.numero_portar, v.codigo_plan, v.ot, v.cuenta, v.agente].filter(Boolean).join(" ").toLowerCase();
      return coincideProducto && coincideEstado && (!termino || texto.includes(termino));
    });
  }, [ventasPeriodo, filtroEstado, filtroBusqueda, tipoProducto]);

  const estadisticas = useMemo(() => ({
    total: ventasPeriodo.filter((v) => v.producto === tipoProducto).length,
    pendientes: ventasPeriodo.filter((v) => v.producto === tipoProducto && v.estado === "PENDIENTE").length,
    aprobadas: ventasPeriodo.filter((v) => v.producto === tipoProducto && v.estado === "APROBADA").length,
    rechazadas: ventasPeriodo.filter((v) => v.producto === tipoProducto && v.estado === "RECHAZADA").length,
    porCorregir: ventasPeriodo.filter((v) => v.producto === tipoProducto && v.estado === "POR_CORREGIR").length,
  }), [ventasPeriodo, tipoProducto]);

  function inputFile(campo, etiqueta, obligatorio, tipo) {

    return (

      <div className="venta-file-card">

        <label>

          <span>{etiqueta}</span>

          {obligatorio ? <b>*</b> : <small>Opcional</small>}

        </label>

        <input

          ref={inputRefs[campo]}

          type="file"

          accept="image/*"

          onChange={(e) =>

            actualizarCampo(campo, e.target.files?.[0] || null)

          }

        />

        {form[campo] && (
          <div className="venta-file-name">📎 {form[campo].name} (nuevo; reemplazará el soporte anterior)</div>
        )}
        {ventaEditando && !form[campo] && soportesExistentesCorreccion[({
          rectificacion_plan: "RECTIFICACION_PLAN",
          validacion_imagen: "VALIDACION",
          habeas_data: "HABEAS_DATA",
          habeas_data_2: "HABEAS_DATA_2",
        })[campo]] && (
          <div className="venta-file-name">
            📎 Soporte existente: {soportesExistentesCorreccion[({
              rectificacion_plan: "RECTIFICACION_PLAN",
              validacion_imagen: "VALIDACION",
              habeas_data: "HABEAS_DATA",
              habeas_data_2: "HABEAS_DATA_2",
            })[campo]].nombre}
            {soportesExistentesCorreccion[({
              rectificacion_plan: "RECTIFICACION_PLAN",
              validacion_imagen: "VALIDACION",
              habeas_data: "HABEAS_DATA",
              habeas_data_2: "HABEAS_DATA_2",
            })[campo]].url && (
              <a href={soportesExistentesCorreccion[({
                rectificacion_plan: "RECTIFICACION_PLAN",
                validacion_imagen: "VALIDACION",
                habeas_data: "HABEAS_DATA",
                habeas_data_2: "HABEAS_DATA_2",
              })[campo]].url} target="_blank" rel="noreferrer"> Ver imagen</a>
            )}
          </div>
        )}

      </div>

    );

  }



  if (tipoProducto === "HOGAR" && vista === "formulario") {

    return (

      <section className="ventas-page">

        <div className="ventas-header">

          <div>

            <div className="ventas-kicker">NUEVA VENTA</div>

            <h1>🏠 Nueva venta Hogar</h1>

            <p>El formulario usa exactamente las columnas de la hoja Hogar de tu plantilla de Power BI.</p>

          </div>

          <button className="venta-btn secondary" onClick={cancelarNuevaVenta}>

            Volver

          </button>

        </div>



        {error && <div className="ventas-error">⚠️ {error}</div>}



        <form className="venta-form" onSubmit={guardarVenta}>

          <div className="venta-form-top">

            <div>

              <strong>🏠 {ventaEditando ? `Corregir venta Hogar #${ventaEditando.id}` : "Datos de la venta Hogar"}</strong>

              <span>{ventaEditando ? "Corrige los datos indicados por el supervisor. Los soportes existentes se conservan; solo adjunta imágenes nuevas si necesitas reemplazarlas." : "Los asesores deben diligenciar todos los campos. Habeas Data 2 queda opcional."}</span>

            </div>

            <button type="button" className="venta-btn secondary" onClick={cancelarNuevaVenta}>

              Cancelar

            </button>

          </div>



          

          <div className="venta-grid">
            <Field label="Tipo de cargue" required>
              <select value={form.tipo_cargue || "NORMAL"} onChange={(e) => actualizarCampo("tipo_cargue", e.target.value)}>
                <option value="NORMAL">Hoy</option>
                <option value="FIN_SEMANA">FIN DE SEMANA</option>
              </select>
            </Field>
            {form.tipo_cargue === "FIN_SEMANA" && (
              <Field label="Fecha real de la venta (sábado, domingo o festivo)" required>
                <input type="date" value={form.fecha_real_venta || ""} onChange={(e) => actualizarCampo("fecha_real_venta", e.target.value)} />
              </Field>
            )}
          </div>
<div className="venta-grid">

            <Field label="Tipo de cédula" required>

              <select value={form.tipo_cedula} onChange={(e) => actualizarCampo("tipo_cedula", e.target.value)}><option value="">Seleccionar</option>

                <option>C.C</option><option>C.E</option>

              </select>

            </Field>

            <Field label="Sala" required>

              <select value={form.sala} onChange={(e) => actualizarCampo("sala", e.target.value)}><option value="">Seleccionar</option>

                <option>SALA 1</option><option>SALA 2</option><option>SALA 3</option>

              </select>

            </Field>

            <Field label="Origen" required>

              <select value={form.origen} onChange={(e) => actualizarCampo("origen", e.target.value)}><option value="">Seleccionar</option>

                <option>CRM</option><option>BASE</option>

              </select>

            </Field>

            <Field label="Nombre cliente" required><input value={form.nombre_cliente} onChange={(e) => actualizarCampo("nombre_cliente", e.target.value)} /></Field>

            <Field label="Cédula cliente" required><input value={form.cedula_cliente} onChange={(e) => actualizarCampo("cedula_cliente", e.target.value)} /></Field>

            <Field label="Ciudad" required><input value={form.ciudad} onChange={(e) => actualizarCampo("ciudad", e.target.value)} /></Field>

            <Field label="Departamento" required><input value={form.departamento} onChange={(e) => actualizarCampo("departamento", e.target.value)} /></Field>



            <Field label="Cantidad de servicios" required><input type="number" min="1" value={form.cantidad_servicios} onChange={(e) => actualizarCampo("cantidad_servicios", e.target.value)} /></Field>

            <Field label="Todo Claro" required><select value={form.todo_claro} onChange={(e) => actualizarCampo("todo_claro", e.target.value)}><option value="">Seleccionar</option><option>SI</option><option>NO</option></select></Field>

            <Field label="Telefonía" required><select value={form.telefonia} onChange={(e) => actualizarCampo("telefonia", e.target.value)}><option value="">Seleccionar</option><option>SI</option><option>NO</option></select></Field>

            <Field label="TV" required><input value={form.tv} onChange={(e) => actualizarCampo("tv", e.target.value)} placeholder="Ej. INTERMEDIO PLUS / NO APLICA" /></Field>

            <Field label="Internet" required><select value={form.internet} onChange={(e) => actualizarCampo("internet", e.target.value)}><option value="">Seleccionar</option><option>SI</option><option>NO</option></select></Field>

            <Field label="Ultra WiFi" required><input type="number" min="0" value={form.ultra_wifi} onChange={(e) => actualizarCampo("ultra_wifi", e.target.value)} /></Field>

            <Field label="Cantidad de decos" required><input type="number" min="0" value={form.cantidad_decos} onChange={(e) => actualizarCampo("cantidad_decos", e.target.value)} /></Field>

            <Field label="Instalación" required><select value={form.instalacion} onChange={(e) => actualizarCampo("instalacion", e.target.value)}><option value="">Seleccionar</option><option>MAÑANA</option><option>TARDE</option></select></Field>

            <Field label="Fecha de instalación" required><input type="date" value={form.fecha_instalacion} onChange={(e) => actualizarCampo("fecha_instalacion", e.target.value)} /></Field>

            <Field label="Servicios adicionales" required><input value={form.servicios_adicionales} onChange={(e) => actualizarCampo("servicios_adicionales", e.target.value)} /></Field>

            <Field label="Tipo de venta" required><input value={form.tipo_venta_hogar} onChange={(e) => actualizarCampo("tipo_venta_hogar", e.target.value)} /></Field>

            <Field label="OT" required><input value={form.ot} onChange={(e) => actualizarCampo("ot", e.target.value)} /></Field>

            <Field label="OTT adicional" required><input value={form.ott_adicional} onChange={(e) => actualizarCampo("ott_adicional", e.target.value)} /></Field>

            <Field label="OTT incluidas" required><input value={form.ott_incluidas} onChange={(e) => actualizarCampo("ott_incluidas", e.target.value)} /></Field>

            <Field label="Política" required><input value={form.politica} onChange={(e) => actualizarCampo("politica", e.target.value)} /></Field>

            <Field label="Cuenta" required><input value={form.cuenta} onChange={(e) => actualizarCampo("cuenta", e.target.value)} /></Field>

            <Field label="Tipo de validación de identidad" required>

              <select value={form.tipo_validacion} onChange={(e) => actualizarCampo("tipo_validacion", e.target.value)}><option value="">Seleccionar</option>

                <option>POLIEDRO OTP</option><option>POLIEDRO BIOMETRIA FACIAL</option><option>BIOMETRIA EXTERNA</option><option>ID VISION</option><option>SAFE</option><option>VISOR OTP</option><option>SIN VALIDACION</option>

              </select>

            </Field>

            <Field label="Segmento" required><input value={form.segmento} onChange={(e) => actualizarCampo("segmento", e.target.value)} /></Field>

            <Field label="Oferta" required><input value={form.oferta} onChange={(e) => actualizarCampo("oferta", e.target.value)} /></Field>

            <Field label="Renta" required><input type="number" min="0" step="0.01" value={form.renta} onChange={(e) => actualizarCampo("renta", e.target.value)} /></Field>

            <Field label="Cantidad de decos adicionales" required><input type="number" min="0" value={form.cantidad_decos_adicionales} onChange={(e) => actualizarCampo("cantidad_decos_adicionales", e.target.value)} /></Field>

          </div>



          <div className="venta-supports">

            <h2>📷 Soportes UMG</h2>

            <p>{ventaEditando ? "Los soportes anteriores se conservan. No necesitas volver a subirlos; si seleccionas una imagen nueva, reemplazará solo ese soporte." : "Se mantienen los mismos soportes del flujo de ventas. Habeas Data 2 queda opcional."}</p>

            <div className="venta-files-grid">

              {inputFile("rectificacion_plan", "RECTIFICACIÓN DE PLAN ADQUIRIDO", true)}

              {inputFile("validacion_imagen", "VALIDACIÓN", true)}

              {inputFile("habeas_data", "HABEAS DATA", true)}

              {inputFile("habeas_data_2", "HABEAS DATA 2", false)}

            </div>

          </div>



          <div className="venta-form-footer">

            <span>La venta se guardará como <b>🟡 PENDIENTE</b>.</span>

            <button className="venta-btn primary" disabled={guardando}>

              {guardando ? "Guardando..." : ventaEditando ? "Guardar corrección" : "Guardar venta Hogar"}

            </button>

          </div>

        </form>

      </section>

    );

  }



  return (

    <section className="ventas-page">

      <div className="ventas-header">

        <div>

          <div className="ventas-kicker">GESTIÓN COMERCIAL</div>

          <h1>📊 Ventas {tipoProducto === "HOGAR" ? "Hogar" : "Móvil"}</h1>

          <p>Registra, consulta y revisa las ventas sin mezclar Móvil con Hogar.</p>

        </div>



        <div className="ventas-header-actions">

          <button

            className={`producto-tab ${tipoProducto === "MOVIL" ? "active" : ""}`}

            onClick={() => setTipoProducto("MOVIL")}

          >

            📱 Móvil

          </button>

          <button

            className={`producto-tab ${tipoProducto === "HOGAR" ? "active" : ""}`}

            onClick={() => {

              setTipoProducto("HOGAR");

              setVista("lista");

            }}

          >

            🏠 Hogar

          </button>

          {puedeExportar && (

            <button

              className="venta-btn excel"

              onClick={tipoProducto === "HOGAR" ? exportarHogar : exportarMovil}

              disabled={exportando}

            >

              {exportando ? "Generando..." : `📥 Excel ${tipoProducto === "HOGAR" ? "Hogar" : "Móvil"}`}

            </button>

          )}

          <button

            className="venta-btn primary"

            onClick={prepararNuevaVenta}

          >

            + Nueva venta {tipoProducto === "HOGAR" ? "Hogar" : "Móvil"}

          </button>

        </div>

      </div>



      {error && <div className="ventas-error">⚠️ {error}</div>}



      {vista === "formulario" ? (

        <form className="venta-form" onSubmit={guardarVenta}>

          <div className="venta-form-top">

            <div>

              <strong>📱 {ventaEditando ? `Corregir venta #${ventaEditando.id}` : "Nueva venta Móvil"}</strong>

              <span>{ventaEditando ? "Corrige los datos indicados por el supervisor. Los soportes existentes se conservan; solo adjunta imágenes nuevas si necesitas reemplazarlas." : "Todos los campos son obligatorios excepto Habeas Data 2."}</span>

            </div>

            <button type="button" className="venta-btn secondary" onClick={cancelarNuevaVenta}>

              Cancelar

            </button>

          </div>



          

          <div className="venta-grid">
            <Field label="Tipo de cargue" required>
              <select value={form.tipo_cargue || "NORMAL"} onChange={(e) => actualizarCampo("tipo_cargue", e.target.value)}>
                <option value="NORMAL">Hoy</option>
                <option value="FIN_SEMANA">FIN DE SEMANA</option>
              </select>
            </Field>
            {form.tipo_cargue === "FIN_SEMANA" && (
              <Field label="Fecha real de la venta (sábado, domingo o festivo)" required>
                <input type="date" value={form.fecha_real_venta || ""} onChange={(e) => actualizarCampo("fecha_real_venta", e.target.value)} />
              </Field>
            )}
          </div>
<div className="venta-grid">

            <Field label="Tipo de cédula" required>

              <select value={form.tipo_cedula} onChange={(e) => actualizarCampo("tipo_cedula", e.target.value)}><option value="">Seleccionar</option>

                <option>C.C</option><option>C.E</option>

              </select>

            </Field>

            <Field label="Sala" required>

              <select value={form.sala} onChange={(e) => actualizarCampo("sala", e.target.value)}><option value="">Seleccionar</option>

                <option>SALA 1</option><option>SALA 2</option><option>SALA 3</option>

              </select>

            </Field>

            <Field label="Origen" required>

              <select value={form.origen} onChange={(e) => actualizarCampo("origen", e.target.value)}><option value="">Seleccionar</option>

                <option>CRM</option><option>BASE</option>

              </select>

            </Field>

            <Field label="Cédula cliente" required><input value={form.cedula_cliente} onChange={(e) => actualizarCampo("cedula_cliente", e.target.value)} /></Field>

            <Field label="Nombre cliente" required><input value={form.nombre_cliente} onChange={(e) => actualizarCampo("nombre_cliente", e.target.value)} /></Field>

            <Field label="Número a portar" required><input type="text" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="Debe ingresar exactamente 10 números" value={form.numero_portar} onChange={(e) => actualizarCampo("numero_portar", e.target.value.replace(/\\D/g, "").slice(0, 10))} /></Field>

            <Field label="NIP" required={form.tipo_venta === "PORTABILIDAD"}><input type="text" inputMode="numeric" maxLength={5} pattern="[0-9]{5}" title="El NIP debe contener exactamente 5 números" value={form.nip} onChange={(e) => actualizarCampo("nip", e.target.value.replace(/\\D/g, "").slice(0, 5))} /></Field>

            <Field label="Email" required><input type="email" value={form.email} onChange={(e) => actualizarCampo("email", e.target.value)} /></Field>

            <Field label="ICCID" required><input type="text" inputMode="numeric" maxLength={12} pattern="[0-9]{12}" title="El ICCID debe contener exactamente 12 números" value={form.iccid} onChange={(e) => actualizarCampo("iccid", e.target.value.replace(/\\D/g, "").slice(0, 12))} /></Field>

            <Field label="Dirección" required><input value={form.direccion} onChange={(e) => actualizarCampo("direccion", e.target.value)} /></Field>

            <Field label="Ciudad" required><input value={form.ciudad} onChange={(e) => actualizarCampo("ciudad", e.target.value)} /></Field>

            <Field label="SIM adquirida" required>

              <select value={form.sim_adquirida} onChange={(e) => actualizarCampo("sim_adquirida", e.target.value)}><option value="">Seleccionar</option><option>SI</option><option>NO</option></select>

            </Field>

            <Field label="Tipo de venta" required>

              <select value={form.tipo_venta} onChange={(e) => actualizarCampo("tipo_venta", e.target.value)}><option value="">Seleccionar</option>

                <option>PORTABILIDAD</option><option>MIGRACION</option>

              </select>

            </Field>

            <Field label="Operador donante" required>

              <select value={form.operador_donante} onChange={(e) => actualizarCampo("operador_donante", e.target.value)}><option value="">Seleccionar</option>

                <option>TIGO</option><option>MOVISTAR</option><option>WOM</option><option>ETB</option><option>VIRGIN</option><option>OTRO</option><option>MIGRACION</option>

              </select>

            </Field>

            <Field label="Tipo de validación" required>

              <select value={form.tipo_validacion} onChange={(e) => actualizarCampo("tipo_validacion", e.target.value)}><option value="">Seleccionar</option>

                <option>POLIEDRO OTP</option><option>POLIEDRO BIOMETRIA FACIAL</option><option>BIOMETRIA EXTERNA</option><option>ID VISION</option><option>SAFE</option><option>SIN VALIDACION</option>

              </select>

            </Field>

            <Field label="Código del plan" required><input value={form.codigo_plan} onChange={(e) => actualizarCampo("codigo_plan", e.target.value)} /></Field>

            <Field label="Plan general" required><select value={form.plan_general} onChange={(e) => actualizarCampo("plan_general", e.target.value)}><option value="">Seleccionar</option><option value="">Seleccionar</option><option value="CONECTADOS">CONECTADOS</option><option value="POWER">POWER</option><option value="PREPAGO">PREPAGO</option></select></Field>

            <Field label="ID descuento de la oferta" required><input value={form.id_descuento_oferta} onChange={(e) => actualizarCampo("id_descuento_oferta", e.target.value)} /></Field>

            <Field label="Fecha de activación" required><input type="date" value={form.fecha_activacion} onChange={(e) => actualizarCampo("fecha_activacion", e.target.value)} /></Field>

            <Field label="CFM (Cargo fijo mensual)" required><input type="number" min="0" step="0.01" value={form.cfm} onChange={(e) => actualizarCampo("cfm", e.target.value)} /></Field>

            <Field label="Envío logístico" required><select value={form.envio_logistico} onChange={(e) => actualizarCampo("envio_logistico", e.target.value)}><option value="">Seleccionar</option><option value="">Seleccionar</option><option value="CLIENTE COMPRA SIM">CLIENTE COMPRA SIM</option><option value="ENTREGA LOGISTICA">ENTREGA LOGISTICA</option><option value="N/A (MIGRACIÓN)">N/A (MIGRACIÓN)</option></select></Field>

            <Field label="Cliente Todo Claro" required>

              <select value={form.cliente_todo_claro} onChange={(e) => actualizarCampo("cliente_todo_claro", e.target.value)}><option value="">Seleccionar</option><option>SI</option><option>NO</option></select>

            </Field>

            <Field label="Tipo de contrato" required>

              <select value={form.tipo_contrato} onChange={(e) => actualizarCampo("tipo_contrato", e.target.value)}><option value="">Seleccionar</option><option>DIGITAL</option><option>GRABADO</option></select>

            </Field>

            <Field label="# Grabación" required><input value={form.numero_grabacion} onChange={(e) => actualizarCampo("numero_grabacion", e.target.value)} /></Field>

            <Field label="Observación" required><textarea value={form.observacion} onChange={(e) => actualizarCampo("observacion", e.target.value)} /></Field>

          </div>



          <div className="venta-supports">

            <h2>📷 Soportes UMG</h2>

            <p>{ventaEditando ? "Los soportes anteriores se conservan. No necesitas volver a subirlos; si seleccionas una imagen nueva, reemplazará solo ese soporte." : "Sube las evidencias de la venta. Habeas Data 2 es opcional."}</p>

            <div className="venta-files-grid">

              {inputFile("rectificacion_plan", "RECTIFICACIÓN DE PLAN ADQUIRIDO", true)}

              {inputFile("validacion_imagen", "VALIDACIÓN", true)}

              {inputFile("habeas_data", "HABEAS DATA", true)}

              {inputFile("habeas_data_2", "HABEAS DATA 2", false)}

            </div>

          </div>



          <div className="venta-form-footer">

            <span>La venta se guardará como <b>🟡 PENDIENTE</b>.</span>

            <button className="venta-btn primary" disabled={guardando}>

              {guardando ? "Guardando..." : ventaEditando ? "Guardar corrección" : "Guardar venta Móvil"}

            </button>

          </div>

        </form>

      ) : (

        <>

          <div className="ventas-cards">

            <Stat title="Total" value={estadisticas.total} icon="📊" />

            <Stat title="Pendientes" value={estadisticas.pendientes} icon="🟡" />

            <Stat title="Aprobadas" value={estadisticas.aprobadas} icon="✅" />

            <Stat title="Rechazadas" value={estadisticas.rechazadas} icon="❌" />

            <Stat title="Por corregir" value={estadisticas.porCorregir} icon="✏️" />

          </div>



          <div className="ventas-period-toolbar">
            <div className="ventas-period-title">
              <span>📅 PERÍODO DE TRABAJO</span>
              <strong>{mostrarHistorico ? "Histórico completo" : `${MESES_VENTAS[periodoMes - 1]} ${periodoAnio}`}</strong>
              <small>{mostrarHistorico ? "Consulta acumulada; las ventas anteriores no se eliminan." : "Solo se muestran y contabilizan las ventas de este mes."}</small>
            </div>
            <div className="ventas-period-controls">
              {!mostrarHistorico && <select value={periodoMes} disabled={usuario?.rol === "Asesor"} onChange={(e) => setPeriodoMes(Number(e.target.value))}>{MESES_VENTAS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>}
              {!mostrarHistorico && <select value={periodoAnio} disabled={usuario?.rol === "Asesor"} onChange={(e) => setPeriodoAnio(Number(e.target.value))}>{[2026,2027,2028].map((y)=><option key={y} value={y}>{y}</option>)}</select>}
              {puedeVerTodas && <button type="button" className={`venta-period-toggle ${mostrarHistorico ? "active" : ""}`} onClick={() => setMostrarHistorico((v) => !v)}>{mostrarHistorico ? "↩ Volver al mes" : "🗂 Ver histórico"}</button>}
              {esSuperAdmin && mostrarHistorico && <button type="button" className="venta-period-toggle" style={{ borderColor: "#dc2626", color: "#dc2626" }} onClick={eliminarVentasSeleccionadas} disabled={eliminandoVentas || ventasSeleccionadas.length === 0}>{eliminandoVentas ? "Eliminando..." : `🗑️ Eliminar seleccionadas (${ventasSeleccionadas.length})`}</button>}
            </div>
          </div>

          <div className="ventas-toolbar">

            <input

              placeholder={tipoProducto === "HOGAR"

                ? "Buscar cliente, cédula, OT, cuenta o agente..."

                : "Buscar cliente, cédula, número o plan..."}

              value={filtroBusqueda}

              onChange={(e) => setFiltroBusqueda(e.target.value)}

            />

            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>

              <option value="TODOS">Todos los estados</option>

              <option value="PENDIENTE">Pendiente</option>

              <option value="APROBADA">Aprobada</option>

              <option value="RECHAZADA">Rechazada</option>

              <option value="POR_CORREGIR">Por corregir</option>

            </select>

            <button className="venta-btn secondary" onClick={cargarVentas}>↻ Actualizar</button>

            {puedeExportar && (

              <button

                className="venta-btn excel"

                onClick={tipoProducto === "HOGAR" ? exportarHogar : exportarMovil}

                disabled={exportando}

              >

                {exportando

                  ? "Generando..."

                  : `📥 Descargar Excel ${tipoProducto === "HOGAR" ? "Hogar" : "Móvil"}`}

              </button>

            )}

          </div>



          <div className="ventas-table-wrap">

            {cargando ? (

              <div className="venta-empty">Cargando ventas...</div>

            ) : ventasFiltradas.length === 0 ? (

              <div className="venta-empty">

                <div className="venta-empty-icon">{tipoProducto === "HOGAR" ? "🏠" : "📱"}</div>

                <h2>No hay ventas {tipoProducto === "HOGAR" ? "de Hogar" : "móviles"}</h2>

                <p>{mostrarHistorico ? "No hay ventas registradas en el histórico." : `No hay ventas registradas en ${MESES_VENTAS[periodoMes - 1]} ${periodoAnio}.`}</p>

              </div>

            ) : (

              <table className="ventas-table">

                <thead>

                  <tr>

                    {esSuperAdmin && mostrarHistorico && (
                      <th style={{ width: "42px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todas las ventas visibles"
                          checked={ventasFiltradas.length > 0 && ventasFiltradas.every((venta) => ventasSeleccionadas.includes(venta.id))}
                          onChange={alternarSeleccionVisible}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                      </th>
                    )}

                    <th>Nombre</th>

                    <th>Cédula</th>

                    <th>Número a portar</th>
                    {puedeRevisar && <th>Asesor</th>}

                    <th>Fecha de activación</th>

                    <th>Tipo de cargue</th>

                    <th>Estado</th>

                    {(puedeRevisar || usuario?.rol === "Asesor") && <th>Acción</th>}

                  </tr>

                </thead>

                <tbody>

                  {ventasFiltradas.map((v) => (

                    <tr key={v.id}>

                      {esSuperAdmin && mostrarHistorico && (
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar venta ${v.id}`}
                            checked={ventasSeleccionadas.includes(v.id)}
                            onChange={() => alternarVentaSeleccionada(v.id)}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                          />
                        </td>
                      )}

                      <td><strong>{v.nombre_cliente}</strong></td>

                      <td>{v.cedula_cliente || "—"}</td>

                      <td>{v.numero_portar || "—"}</td>
                      {puedeRevisar && (
                        <td><strong>{v.asesor?.nombre || "—"}</strong></td>
                      )}

                      <td>{v.fecha_activacion || v.created_at?.slice(0, 10) || "—"}</td>

                      <td>
                        {v.tipo_cargue === "FIN_SEMANA" ? (
                          <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: "999px", background: "#fff1d6", color: "#92400e", fontWeight: 700, fontSize: "12px" }}>FIN DE SEMANA</span>
                        ) : (
                          <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: "999px", background: "#e8f5e9", color: "#166534", fontWeight: 700, fontSize: "12px" }}>NORMAL</span>
                        )}
                      </td>

                      <td><Status estado={v.estado} /></td>

                      {puedeRevisar ? (

                        <td><button className="table-action" onClick={() => abrirRevision(v)}>Revisar</button></td>

                      ) : usuario?.rol === "Asesor" ? (

                        <td>

                          {v.estado === "POR_CORREGIR" ? (

                            <button className="table-action correction" onClick={() => prepararCorreccion(v)}>✏️ Corregir</button>

                          ) : (

                            <span className="table-action-disabled">—</span>

                          )}

                        </td>

                      ) : null}

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>

        </>

      )}



      {ventaSeleccionada && (

        <div className="venta-modal-overlay" onClick={() => setVentaSeleccionada(null)}>

          <div className="venta-modal" onClick={(e) => e.stopPropagation()}>

            <div className="venta-modal-head">

              <div>

                <span>REVISIÓN DE VENTA</span>

                <h2>Venta #{ventaSeleccionada.id}</h2>

              </div>

              <button onClick={() => setVentaSeleccionada(null)}>✕</button>

            </div>

            <div className="venta-modal-body">

              <div className="revision-info-grid">

                {[

                  ["Cliente", ventaSeleccionada.nombre_cliente],

                  ["Cédula", ventaSeleccionada.cedula_cliente],

                  ["Número", ventaSeleccionada.numero_portar],

                  ["Asesor", ventaSeleccionada.agente],

                  ["Fecha activación", ventaSeleccionada.fecha_activacion],

                  ["Tipo", ventaSeleccionada.tipo_venta_hogar || ventaSeleccionada.tipo_venta],

                  ["Plan", ventaSeleccionada.codigo_plan || ventaSeleccionada.oferta],

                  ["Estado", ventaSeleccionada.estado],

                ].map(([label, value]) => (

                  <div key={label}><small>{label}</small><strong>{value || "—"}</strong></div>

                ))}

              </div>



              <div className="revision-supports">

                <div className="revision-supports-head">

                  <div>

                    <strong>📷 Soportes UMG</strong>

                    <span>Revisa las imágenes cargadas por el asesor antes de aprobar o rechazar.</span>

                  </div>

                  <span className="revision-support-count">{soportesRevision.length} soporte(s)</span>

                </div>



                {cargandoSoportes ? (

                  <div className="revision-supports-loading">Cargando soportes...</div>

                ) : soportesRevision.length === 0 ? (

                  <div className="revision-supports-empty">⚠️ Esta venta no tiene soportes registrados.</div>

                ) : (

                  <div className="revision-supports-grid">

                    {soportesRevision.map((soporte) => (

                      <div className="revision-support-card" key={soporte.id}>

                        <div className="revision-support-title">

                          <strong>{etiquetaSoporte(soporte.tipo)}</strong>

                        </div>

                        {soporte.url ? (

                          <button

                            type="button"

                            className="revision-image-button"

                            onClick={() => setImagenAmpliada(soporte)}

                            title="Ver imagen completa"

                          >

                            <img src={soporte.url} alt={etiquetaSoporte(soporte.tipo)} />

                            <span>🔍 Ver imagen</span>

                          </button>

                        ) : (

                          <div className="revision-image-error">No se pudo cargar la imagen.</div>

                        )}

                        <small className="revision-file-name">{soporte.nombre_archivo}</small>

                      </div>

                    ))}

                  </div>

                )}

              </div>



              <label className="revision-label">Observación de revisión</label>

              <textarea value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="Escribe qué debe corregir el asesor. Para devolver o rechazar es obligatoria." />

            </div>

            <div className="venta-modal-footer">

              <button className="venta-btn secondary" onClick={() => setVentaSeleccionada(null)}>Cerrar</button>


              {ventaSeleccionada.estado === "PENDIENTE" && (

                <>

                  <button className="venta-btn warning" onClick={() => devolverParaCorreccion(ventaSeleccionada)}>↩️ Devolver para corregir</button>

                  <button className="venta-btn danger" onClick={() => cambiarEstado(ventaSeleccionada, "RECHAZADA")}>❌ Rechazar</button>

                  <button className="venta-btn success" onClick={() => cambiarEstado(ventaSeleccionada, "APROBADA")}>✅ Aprobar</button>

                </>

              )}

            </div>

          </div>

        </div>

      )}



      {imagenAmpliada && (

        <div className="revision-image-overlay" onClick={() => setImagenAmpliada(null)}>

          <button type="button" className="revision-image-close" onClick={() => setImagenAmpliada(null)}>✕</button>

          <div className="revision-image-viewer" onClick={(e) => e.stopPropagation()}>

            <div className="revision-image-viewer-title">{etiquetaSoporte(imagenAmpliada.tipo)}</div>

            <img src={imagenAmpliada.url} alt={etiquetaSoporte(imagenAmpliada.tipo)} />

          </div>

        </div>

      )}

    </section>

  );

}



function Field({ label, required, children }) {

  return (

    <label className="venta-field">

      <span>{label} {required && <b>*</b>}</span>

      {children}

    </label>

  );

}



function Stat({ title, value, icon }) {

  return (

    <div className="venta-stat">

      <div className="venta-stat-icon">{icon}</div>

      <div><strong>{value}</strong><span>{title}</span></div>

    </div>

  );

}



function Status({ estado }) {

  const cls =

    estado === "APROBADA"

      ? "approved"

      : estado === "RECHAZADA"

      ? "rejected"

      : estado === "POR_CORREGIR"

      ? "correction"

      : "pending";

  const label =

    estado === "APROBADA"

      ? "Aprobada"

      : estado === "RECHAZADA"

      ? "Rechazada"

      : estado === "POR_CORREGIR"

      ? "Por corregir"

      : "Pendiente";

  return <span className={`venta-status ${cls}`}>{label}</span>;

}



export default Ventas;
