-- Flowboard MVP schema. Run once in a Supabase SQL editor or as a migration.
create extension if not exists pgcrypto;

create type public.workspace_kind as enum ('personal', 'team');
create type public.workspace_role as enum ('owner', 'member');
create type public.invitation_state as enum ('active', 'pending');
create type public.task_priority as enum ('urgent', 'high', 'medium', 'low');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  kind public.workspace_kind not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  state public.invitation_state not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, email),
  check ((state = 'active' and user_id is not null) or (state = 'pending' and user_id is null))
);

create unique index workspace_members_user_unique
  on public.workspace_members(workspace_id, user_id) where user_id is not null;
create index workspace_members_user_lookup on public.workspace_members(user_id, workspace_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  color text not null default '#58d6c8',
  due_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index projects_workspace_lookup on public.projects(workspace_id, created_at);

create table public.project_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 60),
  color text not null default '#a3adbd',
  position integer not null check (position >= 0),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, position) deferrable initially deferred,
  unique (project_id, id)
);
create index project_columns_project_order on public.project_columns(project_id, position);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  column_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 240),
  description text not null default '',
  assignee_id uuid references auth.users(id) on delete set null,
  priority public.task_priority not null default 'medium',
  due_date date,
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, column_id) references public.project_columns(project_id, id) on delete restrict
);
create index tasks_project_column_position on public.tasks(project_id, column_id, position);
create index tasks_assignee_due_date on public.tasks(assignee_id, due_date);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index task_comments_task_time on public.task_comments(task_id, created_at);

-- Security-definer helpers avoid recursive membership RLS checks.
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace and m.user_id = auth.uid() and m.state = 'active'
  );
$$;

create or replace function public.is_workspace_owner(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace and m.user_id = auth.uid()
      and m.role = 'owner' and m.state = 'active'
  );
$$;

create or replace function public.add_workspace_owner_membership()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, email, role, state)
  select new.id, new.created_by, coalesce(u.email, 'owner@flowboard.local'), 'owner', 'active'
  from auth.users u where u.id = new.created_by;
  return new;
end;
$$;

create trigger workspace_owner_membership_after_insert
  after insert on public.workspaces
  for each row execute function public.add_workspace_owner_membership();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

create policy "members can read workspaces" on public.workspaces for select
  using (public.is_workspace_member(id));
create policy "signed-in users can create workspaces" on public.workspaces for insert
  with check (created_by = auth.uid());
create policy "owners can update workspaces" on public.workspaces for update
  using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));

create policy "members can read membership" on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));
create policy "owners can manage membership" on public.workspace_members for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "members can read projects" on public.projects for select
  using (public.is_workspace_member(workspace_id));
create policy "members can create projects" on public.projects for insert
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "members can update projects" on public.projects for update
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "owners can delete projects" on public.projects for delete
  using (public.is_workspace_owner(workspace_id));

create policy "members can read project columns" on public.project_columns for select
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)));
create policy "members can manage project columns" on public.project_columns for all
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)));

create policy "members can read tasks" on public.tasks for select
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)));
create policy "members can create tasks" on public.tasks for insert
  with check (created_by = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)));
create policy "members can update tasks" on public.tasks for update
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)));
create policy "owners can delete tasks" on public.tasks for delete
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_workspace_owner(p.workspace_id)));

create policy "members can read task comments" on public.task_comments for select
  using (exists (
    select 1 from public.tasks t join public.projects p on p.id = t.project_id
    where t.id = task_id and public.is_workspace_member(p.workspace_id)
  ));
create policy "members can add task comments" on public.task_comments for insert
  with check (author_id = auth.uid() and exists (
    select 1 from public.tasks t join public.projects p on p.id = t.project_id
    where t.id = task_id and public.is_workspace_member(p.workspace_id)
  ));
