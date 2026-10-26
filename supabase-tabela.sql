-- =====================================================================
--  CONTRATOS AW — tabela no Supabase
--  Cole tudo no Supabase > SQL Editor > New query e clique em Run.
--  Não mexe nas tabelas do site de Solicitação de Compra.
-- =====================================================================

-- 1) Tabela única onde o app guarda contratos, solicitações, recebimentos e ajustes
create table if not exists public.contratos_docs (
  path       text primary key,          -- ex.: contratos/S50495, solicitacoes/s0006
  parent     text not null,             -- ex.: contratos, solicitacoes
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists contratos_docs_parent_idx on public.contratos_docs (parent);

-- 2) Quem administra (pode alterar tudo). Para incluir outra pessoa, acrescente o e-mail.
create or replace function public.contratos_admin() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') in (
    'adail.junior@doismarcos.com.br'
  );
$$;

-- 3) Segurança: só quem fez login lê; administrador altera tudo;
--    cada solicitante grava só as próprias solicitações.
alter table public.contratos_docs enable row level security;

drop policy if exists "contratos ler" on public.contratos_docs;
create policy "contratos ler" on public.contratos_docs
  for select to authenticated using (true);

drop policy if exists "contratos gravar" on public.contratos_docs;
create policy "contratos gravar" on public.contratos_docs
  for all to authenticated
  using (
    public.contratos_admin()
    or path = 'solicitacoes/' || auth.uid()::text
    or path like 'solicitacoes/' || auth.uid()::text || '/%'
  )
  with check (
    public.contratos_admin()
    or path = 'solicitacoes/' || auth.uid()::text
    or path like 'solicitacoes/' || auth.uid()::text || '/%'
  );

-- 4) Numeração das solicitações sem repetir, mesmo com várias pessoas ao mesmo tempo
create or replace function public.contratos_proximo_numero(minimo int)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  insert into public.contratos_docs (path, parent, data)
    values ('seq/sol', 'seq', jsonb_build_object('ultimo', minimo))
  on conflict (path) do update
    set data = jsonb_build_object('ultimo', greatest((public.contratos_docs.data ->> 'ultimo')::int + 1, minimo)),
        updated_at = now()
  returning (data ->> 'ultimo')::int into n;
  return n;
end $$;
grant execute on function public.contratos_proximo_numero(int) to authenticated;

-- 5) Atualização em tempo real entre as telas abertas
do $$ begin
  alter publication supabase_realtime add table public.contratos_docs;
exception when duplicate_object then null; end $$;
