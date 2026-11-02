import { createClient } from "@supabase/supabase-js";

// Vite solo expone variables que comienzan por VITE_.
// Se aceptan ambos nombres para evitar el error "supabaseUrl is required"
// cuando un entorno antiguo todavía usa VITE_SUPABASE_ANON_KEY.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY en client/.env. Reinicia Vite después de modificar .env."
  );
}

console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY: CARGADA");

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
