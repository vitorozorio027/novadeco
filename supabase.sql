--- Esse é script executado no banco de dados (supabase)



-- ================================
-- 1) Remove tabelas antigas
-- ================================

-- Se já existir, apaga a tabela game_state
drop table if exists game_state cascade;

-- Se já existir, apaga a tabela players
drop table if exists players cascade;


-- ================================
-- 2) Habilita a extensão UUID
-- ================================

create extension if not exists "uuid-ossp";


-- ================================
-- 3) Cria a tabela players
-- ================================

create table players (
    id uuid primary key default uuid_generate_v4(),
    username text unique not null,
    score integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_active timestamp with time zone default timezone('utc'::text, now()) not null,
    total_games integer default 0,
    games_won integer default 0,
    highest_score integer default 0,
    current_streak integer default 0,
    best_streak integer default 0,
    answered_challenges text[] default array[]::text[]
);


-- ================================
-- 4) Cria a tabela game_state
-- ================================

create table game_state (
    id integer primary key default 1,
    state text not null,
    challenge jsonb,
    time_left integer,
    host_id uuid not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settings jsonb default '{
        "timeLimit": 30,
        "minPlayers": 2,
        "maxPlayers": 50,
        "difficulty": "medium"
    }'::jsonb
);


-- ================================
-- 5) Trigger para atualizar updated_at
-- ================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_game_state_updated_at
    before update on game_state
    for each row
    execute function update_updated_at_column();


-- ================================
-- 6) Habilita Row Level Security
-- ================================

alter table players      enable row level security;
alter table game_state   enable row level security;


-- ================================
-- 7) Políticas para players
-- ================================

-- Leitura para todos (incluindo anônimos)
create policy "Permitir leitura para todos"
  on players for select
  to anon, authenticated
  using (true);

-- Inserção para todos (incluindo anônimos)
create policy "Permitir inserção para todos"
  on players for insert
  to anon, authenticated
  with check (true);

-- Atualização apenas para o próprio jogador (UUID = UUID)
create policy "Permitir atualização apenas para o próprio jogador"
  on players for update
  to anon, authenticated
  using (true);

-- Deleção apenas para o próprio jogador
create policy "Permitir deleção apenas para o próprio jogador"
  on players for delete
  to anon, authenticated
  using (true);


-- ================================
-- 8) Políticas para game_state
-- ================================

-- Leitura para todos (incluindo anônimos)
create policy "Permitir leitura para todos"
  on game_state for select
  to anon, authenticated
  using (true);

-- Atualização para todos (incluindo anônimos)
create policy "Permitir atualização para todos"
  on game_state for update
  to anon, authenticated
  using (true);

-- Inserção para todos (incluindo anônimos)
create policy "Permitir inserção para todos"
  on game_state for insert
  to anon, authenticated
  with check (true);

-- Deleção para todos (incluindo anônimos)
create policy "Permitir deleção para todos"
  on game_state for delete
  to anon, authenticated
  using (true);


-- ================================
-- 9) Insere estado inicial
-- ================================

insert into game_state (id, state, host_id)
values (1, 'waiting', '00000000-0000-0000-0000-000000000000')
on conflict (id) do nothing;


-- ================================
-- 10) Índices para otimização
-- ================================

create index if not exists idx_players_username on players(username);
create index if not exists idx_players_score    on players(score);
create index if not exists idx_players_last_active on players(last_active);
create index if not exists idx_game_state_state on game_state(state);
create index if not exists idx_game_state_host on game_state(host_id);


-- ================================
-- 11) Função para resetar o jogo
-- ================================

create or replace function reset_game()
returns void as $$
begin
    -- Reseta o estado do jogo
    update game_state
    set state = 'waiting',
        challenge = null,
        time_left = null,
        updated_at = timezone('utc'::text, now())
    where host_id = '00000000-0000-0000-0000-000000000000';

    -- Reseta pontuação dos jogadores
    update players
    set score = 0,
        current_streak = 0;
end;
$$ language plpgsql;

-- ================================
-- 12) Função para atualizar estatísticas do jogador
-- ================================

create or replace function update_player_stats(
    p_player_id uuid,
    p_score integer,
    p_won boolean
)
returns void as $$
begin
    update players
    set total_games = total_games + 1,
        games_won = games_won + case when p_won then 1 else 0 end,
        highest_score = greatest(highest_score, p_score),
        current_streak = case when p_won then current_streak + 1 else 0 end,
        best_streak = greatest(best_streak, case when p_won then current_streak + 1 else 0 end),
        last_active = timezone('utc'::text, now())
    where id = p_player_id;
end;
$$ language plpgsql;