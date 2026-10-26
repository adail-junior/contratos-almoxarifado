// =====================================================================
//  CONFIGURAÇÃO DO SITE — preencha uma vez
// =====================================================================
// Use o MESMO projeto Supabase do site de Solicitação de Compra.
// Copie os dois valores do config.js daquele repositório, ou pegue em
// Supabase > Project Settings > API (Project URL e chave "anon public").
window.SUPABASE_URL = "COLE_AQUI";        // ex.: https://abcdefgh.supabase.co
window.SUPABASE_ANON_KEY = "COLE_AQUI";   // chave longa que começa com eyJ...

// E-mails de quem administra o site (importa ERP, registra recebimentos,
// envia ao Compras). Precisa ser o mesmo e-mail que está no supabase-tabela.sql.
window.ADMINS = [
  "adail.junior@doismarcos.com.br"
];
