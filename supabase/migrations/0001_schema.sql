-- FlowGuide AI — Sprint 1 schema
create extension if not exists "pgcrypto";

create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table client_companies (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- A partner_admin has admin rights over every client_company under their partner.
create table partner_admins (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (partner_id, user_id)
);

-- Per-company role for a user. role determines what they can do within that company.
create table user_client_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_company_id uuid not null references client_companies(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer', 'aprendiz')),
  created_at timestamptz not null default now(),
  unique (user_id, client_company_id)
);

-- Sprint 1 only produces knowledge_sources of type 'text'; url/document/video are later phases.
create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  client_company_id uuid not null references client_companies(id) on delete cascade,
  type text not null default 'text' check (type in ('text', 'url', 'document', 'video')),
  raw_content text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table guides (
  id uuid primary key default gen_random_uuid(),
  client_company_id uuid not null references client_companies(id) on delete cascade,
  knowledge_source_id uuid references knowledge_sources(id) on delete set null,
  title text not null,
  language text not null check (language in ('es', 'en')),
  module text,
  status text not null default 'published' check (status in ('draft', 'published')),
  current_version_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table guide_versions (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  version_number int not null,
  objetivo text,
  precondiciones text,
  pasos jsonb not null default '[]',
  advertencias text,
  resultado_esperado text,
  quick_guide text,
  faq jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (guide_id, version_number)
);

alter table guides
  add constraint guides_current_version_fk
  foreign key (current_version_id) references guide_versions(id) on delete set null;

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  guide_version_id uuid not null references guide_versions(id) on delete cascade,
  questions jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_company_id uuid not null references client_companies(id) on delete cascade,
  answers jsonb not null default '[]',
  score numeric not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create table guide_reads (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  client_company_id uuid not null references client_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now()
);

create index on client_companies (partner_id);
create index on partner_admins (user_id);
create index on user_client_access (user_id);
create index on user_client_access (client_company_id);
create index on knowledge_sources (client_company_id);
create index on guides (client_company_id);
create index on guide_versions (guide_id);
create index on quizzes (guide_version_id);
create index on quiz_attempts (quiz_id);
create index on quiz_attempts (client_company_id);
create index on quiz_attempts (user_id);
create index on guide_reads (guide_id);
create index on guide_reads (client_company_id);
create index on guide_reads (user_id);
