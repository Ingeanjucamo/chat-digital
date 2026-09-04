const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());
/* =========================================================
   ARCHIVOS
========================================================= */

const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const nombreSeguro =
      path
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    cb(
      null,
      `${Date.now()}-${nombreSeguro}${extension}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
app.use(
  "/uploads",
  express.static(UPLOADS_DIR)
);

app.post("/api/archivos", upload.single("archivo"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió ningún archivo",
      });
    }

    const emisorId = Number(req.body.emisorId);
    const datos = cargarDatos();
const usuario = buscarUsuario(datos, emisorId);

    if (!usuario) {
      fs.unlinkSync(req.file.path);

      return res.status(401).json({
        error: "Usuario no válido",
      });
    }

    if (usuario.rol !== "Administrador") {
      fs.unlinkSync(req.file.path);

      return res.status(403).json({
        error: "Solo los administradores pueden subir archivos",
      });
    }

    res.json({
      ok: true,
      archivo: {
        nombre: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        tipo: req.file.mimetype,
        tamano: req.file.size,
      },
    });
  } catch (error) {
    console.error("Error subiendo archivo:", error);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Error al subir el archivo",
    });
  }
});
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

/* =========================================================
   USUARIOS
========================================================= */

const usuariosIniciales = [
  { id: 1, usuario: "adriana.gonzalez", nombre: "ADRIANA GONZALEZ BERMUDEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 2, usuario: "alejandro.ramirez", nombre: "ALEJANDRO RAMIREZ BARON", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 3, usuario: "ana.lucia.gonzalez", nombre: "ANA LUCIA GONZALEZ MANRIQUE", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 4, usuario: "anyi.perdomo", nombre: "ANYI LORENA PERDOMO DUSSAN", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 5, usuario: "astrid.tovar", nombre: "ASTRID NATALIA TOVAR MORENO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 6, usuario: "beyanir.chala", nombre: "BEYANIR CHALA SANCHEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 7, usuario: "brayan.marin", nombre: "BRAYAN ESTEBAN MARIN FERNANDEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 8, usuario: "britney.gonzalez", nombre: "BRITNEY GONZALEZ PAREDES", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 9, usuario: "dana.cuadrado", nombre: "DANA VALENTINA CUADRADO GONZALEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 10, usuario: "deicy.sanchez", nombre: "DEICY BIBIANA SANCHEZ CORTES", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 11, usuario: "deivid.montealegre", nombre: "DEIVID ALEJANDRO MONTEALEGRE AMAYA", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 12, usuario: "diana.solano", nombre: "DIANA MARCELA SOLANO NARVAEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 13, usuario: "diana.chala", nombre: "DIANA MARIA CHALA SANCHEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 14, usuario: "ingrid.molano", nombre: "INGRID GISED MOLANO DIAZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 15, usuario: "isabel.embus", nombre: "ISABEL VALENTINA EMBUS GAITAN", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 16, usuario: "jhon.montealegre", nombre: "JHON ALEXANDER MONTEALEGRE TRUJILLO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 17, usuario: "juan.otalora", nombre: "JUAN ANDRES OTALORA CARVAJAL", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 18, usuario: "katerine.cortes", nombre: "KATERINE CORTES JIMENEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 19, usuario: "laura.escobar", nombre: "LAURA STEFFANNIA ESCOBAR NINCO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 20, usuario: "linda.cardoso", nombre: "LINDA VANEZA CARDOSO PACHECO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 21, usuario: "maria.castro", nombre: "MARIA DEL PILAR CASTRO AREVALO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 22, usuario: "nathaly.rendon", nombre: "NATHALY RENDON CONDE", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 23, usuario: "nicol.pazos", nombre: "NICOL DAYANA PAZOS CHANTRE", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 24, usuario: "sara.ortiz", nombre: "SARA ALEJANDRA ORTIZ LUGO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 25, usuario: "sorani.zapata", nombre: "SORANI ZAPATA USAQUEN", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 26, usuario: "stefany.bonilla", nombre: "STEFANY BONILLA MONTOYA", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 27, usuario: "veronica.lopez", nombre: "VERONICA TATIANA LOPEZ MORALES", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 28, usuario: "yuliana.macanilla", nombre: "YULIANA ANDREA MACANILLA TRUJILLO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 29, usuario: "daniel.ramirez", nombre: "DANIEL RAMIREZ RESTREPO", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 30, usuario: "laura.castillo", nombre: "LAURA SOFIA CASTILLO SANCHEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 31, usuario: "juan.sebastian", nombre: "JUAN SEBASTIAN RAMIREZ NUÑEZ", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 32, usuario: "julian.ramos", nombre: "JULIAN ANDRES RAMOS SABOGAL", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 33, usuario: "jabber.sanchez", nombre: "JABBER STEWEN SANCHEZ MEDINA", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 34, usuario: "karen.calderon", nombre: "KAREN YISEL CALDERON CORTES", password: "1234", rol: "Asesor", funciones: ["Asesor"] },
  { id: 35, usuario: "maria.camila.zapata", nombre: "MARIA CAMILA ZAPATA BAUTISTA", password: "1234", rol: "Asesor", funciones: ["Asesor"] },

  { id: 36, usuario: "libardo.serrano", nombre: "Libardo Serrano", password: "1234", rol: "Administrador", funciones: ["Administración"] },
  { id: 37, usuario: "karen.perez", nombre: "Karen Perez", password: "1234", rol: "Administrador", funciones: ["Administración"] },
  { id: 38, usuario: "andres.barrero", nombre: "Andres Barrero", password: "1234", rol: "Administrador", funciones: ["Administración"] },
  {
  id: 39,
  usuario: "andres.cardozo",
  nombre: "Andres Cardozo",
  password: "Andres042910",
  rol: "Administrador",
  funciones: ["Administración"],
  esSuperAdmin: true
},
  { id: 40, usuario: "paola.saez", nombre: "Paola Saez", password: "1234", rol: "Administrador", funciones: ["Administración"] },
  { id: 41, usuario: "nathaly.rincon", nombre: "Nathaly Rincon", password: "1234", rol: "Administrador", funciones: ["Administración"] },
];

/* =========================================================
   CREAR DATA SI NO EXISTE
========================================================= */

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      {
        usuarios: usuariosIniciales,
        mensajes: [],
      },
      null,
      2
    )
  );
}

/* =========================================================
   FUNCIONES DE DATOS
========================================================= */

function cargarDatos() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function guardarDatos(datos) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(datos, null, 2)
  );
}

function buscarUsuario(datos, id) {
  return datos.usuarios.find(
    (usuario) => usuario.id === Number(id)
  );
}
/* =========================================================
   SEGURIDAD SUPERADMIN
========================================================= */

function esSuperAdmin(usuario) {
  return usuario && usuario.esSuperAdmin === true;
}

function obtenerUsuarioAutorizado(req) {
  const id = Number(req.headers["x-usuario-id"]);

  if (!id) {
    return null;
  }

  const datos = cargarDatos();
  return buscarUsuario(datos, id);
}

function verificarSuperAdmin(req, res) {
  const usuario = obtenerUsuarioAutorizado(req);

  if (!esSuperAdmin(usuario)) {
    res.status(403).json({
      error: "No tienes permisos de SuperAdmin",
    });

    return null;
  }

  return usuario;
}

/* =========================================================
   PERMISOS CHAT PRIVADO
========================================================= */

function puedeChatPrivado(emisor, receptor) {
  if (!emisor || !receptor) {
    return false;
  }

  if (emisor.id === receptor.id) {
    return false;
  }

  // ADMINISTRADOR -> solamente asesores
  if (emisor.rol === "Administrador") {
    return receptor.rol === "Asesor";
  }

  // ASESOR -> solamente administradores
  if (emisor.rol === "Asesor") {
    return receptor.rol === "Administrador";
  }

  return false;
}

/* =========================================================
   PERMISO INFORMACIÓN
========================================================= */

function puedePublicarInformacion(usuario) {
  return usuario && usuario.rol === "Administrador";
}

/* =========================================================
   RUTA PRINCIPAL
========================================================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensaje: "Chat Interno funcionando",
  });
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/api/login", (req, res) => {
  const { usuario, password } = req.body;

  const datos = cargarDatos();

  const user = datos.usuarios.find(
    (u) =>
      u.usuario === usuario &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Usuario o contraseña incorrectos",
    });
  }
  if (user.activo === false) {
  return res.status(403).json({
    error: "Este usuario está desactivado",
  });
}

  res.json({
    ok: true,
    usuario: {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      rol: user.rol,
      funciones: user.funciones || [],
      esSuperAdmin: user.esSuperAdmin === true,
    activo: user.activo !== false,
    },
  });
});

/* =========================================================
   LISTA DE USUARIOS
========================================================= */

app.get("/api/usuarios", (req, res) => {
  const datos = cargarDatos();

  res.json(
    datos.usuarios.map((u) => ({
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      funciones: u.funciones || [],
      activo: u.activo !== false, 
    }))
  );
});

/* =========================================================
   ADMINISTRACIÓN - SUPERADMIN
========================================================= */

// Ver todos los usuarios sin mostrar contraseñas
app.get("/api/administracion/usuarios", (req, res) => {
  const superAdmin = verificarSuperAdmin(req, res);

  if (!superAdmin) return;

  const datos = cargarDatos();

  res.json(
    datos.usuarios.map((u) => ({
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      funciones: u.funciones || [],
      esSuperAdmin: u.esSuperAdmin === true,
      activo: u.activo !== false,
    }))
  );
});


// CREAR USUARIO
app.post("/api/administracion/usuarios", (req, res) => {
  const superAdmin = verificarSuperAdmin(req, res);

  if (!superAdmin) return;

  const { usuario, nombre, password, rol } = req.body;

  if (!usuario || !nombre || !password || !rol) {
    return res.status(400).json({
      error: "Todos los campos son obligatorios",
    });
  }

  if (!["Asesor", "Administrador"].includes(rol)) {
    return res.status(400).json({
      error: "Rol no válido",
    });
  }

  const datos = cargarDatos();

  const existe = datos.usuarios.find(
    (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
  );

  if (existe) {
    return res.status(409).json({
      error: "El nombre de usuario ya existe",
    });
  }

  const nuevoId =
    datos.usuarios.length > 0
      ? Math.max(...datos.usuarios.map((u) => u.id)) + 1
      : 1;

  const nuevoUsuario = {
    id: nuevoId,
    usuario: usuario.trim(),
    nombre: nombre.trim(),
    password,
    rol,
    funciones:
      rol === "Administrador"
        ? ["Administración"]
        : ["Asesor"],
    activo: true,
  };

  datos.usuarios.push(nuevoUsuario);

  guardarDatos(datos);

  res.json({
    ok: true,
    usuario: {
      id: nuevoUsuario.id,
      usuario: nuevoUsuario.usuario,
      nombre: nuevoUsuario.nombre,
      rol: nuevoUsuario.rol,
      funciones: nuevoUsuario.funciones,
      activo: true,
    },
  });
});


// EDITAR USUARIO
app.put("/api/administracion/usuarios/:id", (req, res) => {
  const superAdmin = verificarSuperAdmin(req, res);

  if (!superAdmin) return;

  const id = Number(req.params.id);
  const datos = cargarDatos();

  const usuario = buscarUsuario(datos, id);

  if (!usuario) {
    return res.status(404).json({
      error: "Usuario no encontrado",
    });
  }

  // No permitir modificar al propio SuperAdmin desde esta ruta
  if (usuario.esSuperAdmin) {
    return res.status(403).json({
      error: "El SuperAdmin no puede modificarse desde este panel",
    });
  }

  const { usuario: nuevoUsuario, nombre, rol, activo } = req.body;

  if (nuevoUsuario !== undefined) {
    const existe = datos.usuarios.find(
      (u) =>
        u.id !== id &&
        u.usuario.toLowerCase() === nuevoUsuario.trim().toLowerCase()
    );

    if (existe) {
      return res.status(409).json({
        error: "El nombre de usuario ya existe",
      });
    }

    usuario.usuario = nuevoUsuario.trim();
  }

  if (nombre !== undefined) {
    usuario.nombre = nombre.trim();
  }

  if (rol !== undefined) {
    if (!["Asesor", "Administrador"].includes(rol)) {
      return res.status(400).json({
        error: "Rol no válido",
      });
    }

    usuario.rol = rol;
    usuario.funciones =
      rol === "Administrador"
        ? ["Administración"]
        : ["Asesor"];
  }

  if (activo !== undefined) {
    usuario.activo = Boolean(activo);
  }

  guardarDatos(datos);

  res.json({
    ok: true,
    usuario: {
      id: usuario.id,
      usuario: usuario.usuario,
      nombre: usuario.nombre,
      rol: usuario.rol,
      funciones: usuario.funciones || [],
      activo: usuario.activo !== false,
    },
  });
});


// CAMBIAR CONTRASEÑA
app.put("/api/administracion/usuarios/:id/password", (req, res) => {
  const superAdmin = verificarSuperAdmin(req, res);

  if (!superAdmin) return;

  const id = Number(req.params.id);
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      error: "La contraseña es obligatoria",
    });
  }

  const datos = cargarDatos();
  const usuario = buscarUsuario(datos, id);

  if (!usuario) {
    return res.status(404).json({
      error: "Usuario no encontrado",
    });
  }

  if (usuario.esSuperAdmin) {
    return res.status(403).json({
      error: "La contraseña del SuperAdmin no se cambia desde este panel",
    });
  }

  usuario.password = password;

  guardarDatos(datos);

  res.json({
    ok: true,
    mensaje: "Contraseña actualizada correctamente",
  });
});


// ELIMINAR USUARIO
app.delete("/api/administracion/usuarios/:id", (req, res) => {
  const superAdmin = verificarSuperAdmin(req, res);

  if (!superAdmin) return;

  const id = Number(req.params.id);
  const datos = cargarDatos();

  const usuario = buscarUsuario(datos, id);

  if (!usuario) {
    return res.status(404).json({
      error: "Usuario no encontrado",
    });
  }

  // Protección absoluta del SuperAdmin
  if (usuario.esSuperAdmin) {
    return res.status(403).json({
      error: "El SuperAdmin no puede eliminarse",
    });
  }

  datos.usuarios = datos.usuarios.filter(
    (u) => u.id !== id
  );

  guardarDatos(datos);

  res.json({
    ok: true,
    mensaje: "Usuario eliminado correctamente",
  });
});

/* =========================================================
   INFORMACIÓN
========================================================= */

app.get("/api/mensajes/informacion", (req, res) => {
  const datos = cargarDatos();

  const mensajes = datos.mensajes.filter(
    (m) =>
      m.grupo === "informacion" &&
      !m.receptorId
  );

  res.json(mensajes);
});

/* =========================================================
   CONVERSACIÓN PRIVADA
========================================================= */

app.get(
  "/api/conversacion/:usuario1/:usuario2",
  (req, res) => {
    const datos = cargarDatos();

    const usuario1 = Number(req.params.usuario1);
    const usuario2 = Number(req.params.usuario2);

    const user1 = buscarUsuario(datos, usuario1);
    const user2 = buscarUsuario(datos, usuario2);

    if (!puedeChatPrivado(user1, user2)) {
      return res.status(403).json({
        error: "No tienes permiso para esta conversación",
      });
    }

    const mensajes = datos.mensajes.filter(
      (m) =>
        (m.emisorId === usuario1 &&
          m.receptorId === usuario2) ||
        (m.emisorId === usuario2 &&
          m.receptorId === usuario1)
    );

    res.json(mensajes);
  }
);

/* =========================================================
   ENVIAR MENSAJE
========================================================= */

app.post("/api/mensajes", (req, res) => {
  try {
    const datos = cargarDatos();

    const emisor = buscarUsuario(
      datos,
      req.body.emisorId
    );

    if (!emisor) {
      return res.status(400).json({
        error: "Emisor no encontrado",
      });
    }

    const texto = String(req.body.texto || "").trim();

    const archivo = req.body.archivo || null;

    // Debe existir texto o archivo
    if (!texto && !archivo) {
      return res.status(400).json({
        error: "El mensaje debe contener texto o un archivo",
      });
    }

    const grupo = req.body.grupo || null;

    const receptor = req.body.receptorId
      ? buscarUsuario(datos, req.body.receptorId)
      : null;

    /* =====================================================
       MENSAJE DE INFORMACIÓN
    ===================================================== */

    if (grupo === "informacion") {
      if (!puedePublicarInformacion(emisor)) {
        return res.status(403).json({
          error:
            "Solo los administradores pueden publicar información",
        });
      }

      const mensaje = {
        id: Date.now(),
        grupo: "informacion",
        emisorId: emisor.id,
        receptorId: null,
        nombre: emisor.nombre,
        texto,
        archivo,
        fecha: new Date().toISOString(),
      };

      datos.mensajes.push(mensaje);
      guardarDatos(datos);

      io.to("grupo:informacion").emit(
        "mensaje:nuevo",
        mensaje
      );

      return res.json(mensaje);
    }

    /* =====================================================
       MENSAJE PRIVADO
    ===================================================== */

    if (receptor) {
      if (!puedeChatPrivado(emisor, receptor)) {
        return res.status(403).json({
          error:
            "No tienes permiso para enviar mensajes privados a este usuario",
        });
      }

      const mensaje = {
        id: Date.now(),
        grupo: null,
        emisorId: emisor.id,
        receptorId: receptor.id,
        nombre: emisor.nombre,
        texto,
        archivo,
        fecha: new Date().toISOString(),
      };

      datos.mensajes.push(mensaje);
      guardarDatos(datos);

      io.to(`usuario:${emisor.id}`).emit(
        "mensaje:nuevo",
        mensaje
      );

      io.to(`usuario:${receptor.id}`).emit(
        "mensaje:nuevo",
        mensaje
      );

      return res.json(mensaje);
    }

    /* =====================================================
       GRUPO NO PERMITIDO
    ===================================================== */

    return res.status(400).json({
      error: "Mensaje sin receptor válido",
    });

  } catch (error) {
    console.error("Error enviando mensaje:", error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
});

/* =========================================================
   SOCKET.IO
========================================================= */

io.on("connection", (socket) => {
  console.log(
    "🟢 Usuario conectado:",
    socket.id
  );

  /*
    El frontend debe enviar:
    usuario:conectar
    con el ID del usuario.
  */

  socket.on("usuario:conectar", (usuarioId) => {
    const id = Number(usuarioId);

    if (!id) {
      return;
    }

    // Sala privada del usuario
    socket.join(`usuario:${id}`);

    // Todos reciben el canal Información
    socket.join("grupo:informacion");

    console.log(
      `👤 Usuario ${id} conectado a su sala`
    );
  });

  socket.on("disconnect", () => {
    console.log(
      "🔴 Usuario desconectado:",
      socket.id
    );
  });
});

/* =========================================================
   SERVIDOR
========================================================= */

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log("=================================");
    console.log("          CHAT INTERNO");
    console.log("=================================");
    console.log("");
    console.log(
      `Servidor funcionando en puerto ${PORT}`
    );
    console.log("");
    console.log(
      `Local: http://localhost:${PORT}`
    );
    console.log("");
    console.log(
      `LAN: http://10.206.200.139:${PORT}`
    );
    console.log("");
  }
);