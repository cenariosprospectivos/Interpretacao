// =========================================================
// CONFIGURAÇÃO SUPABASE - INTERPRETAÇÃO DE CENÁRIOS
// =========================================================
// Usa o mesmo projeto Supabase dos módulos anteriores.
// Não colocar senha do banco ou secret key aqui.
// =========================================================

const SUPABASE_URL = "https://fqoniziwhawgyiykpvdl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Qc7GEa3saAmjk3s0yu-qMA_ZLRZpCES";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const PESQUISA_CODIGO = "MD2036";
