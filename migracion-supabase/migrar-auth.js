const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://frghtzsodaivkxbzzbnk.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const DATA_FILE = path.join(
  __dirname,
  "..",
  "server",
  "data.json"
);

async function migrar() {
  console.log("Leyendo data.json...");

  if (!fs.existsSync(DATA_FILE)) {
    console.error("❌ No encuentro:");
    console.error(DATA_FILE);
    process.exit(1);
  }

  const data = JSON.parse(
    fs.readFileSync(DATA_FILE, "utf8")
  );

  const usuarios = data.usuarios || [];

  console.log(`Usuarios encontrados: ${usuarios.length}`);
  console.log("");

  for (const usuario of usuarios) {
    try {
      if (!usuario.usuario || !usuario.password) {
        console.log(
          `⚠️ ID ${usuario.id}: falta usuario o contraseña`
        );
        continue;
      }

      const email =
        `${usuario.usuario}@chat-digital.online`;

      console.log(
        `Procesando ${usuario.id} - ${usuario.usuario}...`
      );

      // Buscar si ya existe
      const { data: lista, error: errorLista } =
        await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (errorLista) {
        throw errorLista;
      }

      const existente = lista.users.find(
        (u) => u.email === email
      );

      let authUser;

      if (existente) {
        console.log("  → Ya existe en Auth");

        const { data: actualizado, error } =
          await supabase.auth.admin.updateUserById(
            existente.id,
            {
              password: String(usuario.password),
              email_confirm: true,
              user_metadata: {
                usuario: usuario.usuario,
                usuario_id: usuario.id,
                nombre: usuario.nombre,
              },
            }
          );

        if (error) throw error;

        authUser = actualizado.user;
      } else {
        console.log("  → Creando en Auth");

        const { data: creado, error } =
          await supabase.auth.admin.createUser({
            email,
            password: String(usuario.password),
            email_confirm: true,
            user_metadata: {
              usuario: usuario.usuario,
              usuario_id: usuario.id,
              nombre: usuario.nombre,
            },
          });

        if (error) throw error;

        authUser = creado.user;
      }

      // Vincular con public.usuarios
      const { error: errorUpdate } =
        await supabase
          .from("usuarios")
          .update({
            auth_user_id: authUser.id,
          })
          .eq("id", usuario.id);

      if (errorUpdate) {
        throw errorUpdate;
      }

      console.log(
        `  ✅ Vinculado correctamente: ${authUser.id}`
      );
      console.log("");
    } catch (error) {
      console.error(
        `  ❌ Error en ${usuario.usuario}:`,
        error.message || error
      );
      console.log("");
    }
  }

  console.log("================================");
  console.log("MIGRACIÓN TERMINADA");
  console.log("================================");
}

migrar();