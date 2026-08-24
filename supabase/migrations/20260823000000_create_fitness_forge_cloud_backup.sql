create table public.fitness_forge_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  schema_version smallint not null default 1,
  build_profile jsonb,
  active_build_workout jsonb,
  current_forge_workout jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_data_schema_version_positive check (schema_version > 0),
  constraint build_profile_is_object check (build_profile is null or jsonb_typeof(build_profile) = 'object'),
  constraint active_build_workout_is_object check (active_build_workout is null or jsonb_typeof(active_build_workout) = 'object'),
  constraint current_forge_workout_is_object check (current_forge_workout is null or jsonb_typeof(current_forge_workout) = 'object')
);

create table public.fitness_forge_workout_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  source text not null,
  completed_at timestamptz not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint workout_sessions_source check (source in ('BUILD', 'FORGE')),
  constraint workout_sessions_data_is_object check (jsonb_typeof(data) = 'object')
);

create index fitness_forge_workout_sessions_user_completed_at_idx
  on public.fitness_forge_workout_sessions (user_id, completed_at desc);

create function public.fitness_forge_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_user_data_updated_at
before update on public.fitness_forge_user_data
for each row execute function public.fitness_forge_set_updated_at();

create trigger set_workout_sessions_updated_at
before update on public.fitness_forge_workout_sessions
for each row execute function public.fitness_forge_set_updated_at();

alter table public.fitness_forge_user_data enable row level security;
alter table public.fitness_forge_workout_sessions enable row level security;

revoke all on table public.fitness_forge_user_data from anon;
revoke all on table public.fitness_forge_workout_sessions from anon;
grant select, insert, update, delete on table public.fitness_forge_user_data to authenticated;
grant select, insert, update, delete on table public.fitness_forge_workout_sessions to authenticated;

create policy "Users manage their own state"
on public.fitness_forge_user_data
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own workout sessions"
on public.fitness_forge_workout_sessions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
