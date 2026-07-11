-- Tables created via the SQL Editor (rather than the Supabase table editor UI)
-- do not automatically receive the standard `authenticated` role grants that
-- Supabase normally applies. RLS policies only take effect once the role has
-- the underlying table-level privilege, so without this, every query fails
-- with "permission denied for table ..." (Postgres error 42501) even though
-- the RLS policies themselves are correct.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
